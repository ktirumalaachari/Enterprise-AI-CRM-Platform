import { Response } from "express";
import sharp from "sharp";
import { z } from "zod";
import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { Notification } from "../models/Notification";
import { ActivityLog } from "../models/ActivityLog";
import Company from "../models/Company";
import Package from "../models/Package";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import emailService from "../services/emailService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import {
  uploadAvatarToCloudinary,
  deleteAvatarFromCloudinary,
  extractPublicId,
  isCloudinaryConfigured,
} from "../services/cloudinaryService";
import { createAuditLog } from "../services/auditService";

// ─── Validation Schemas ────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const requestEmailChangeSchema = z.object({
  newEmail: z.string().email("Invalid new email address"),
  password: z.string().optional(),
});

const verifyEmailChangeSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

const deleteAccountSchema = z.object({
  confirmText: z.literal("DELETE", {
    errorMap: () => ({ message: "You must type DELETE to confirm" }),
  }),
  password: z.string().optional(),
});

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    let activeSessionsCount = 1;
    try {
      activeSessionsCount = await RefreshToken.countDocuments({
        userId: user._id,
      });
    } catch {
      activeSessionsCount = 1;
    }

    // Fetch company subscription & AI credit data
    let subscriptionInfo: any = null;
    try {
      const companyId = req.companyId || req.user.companyId || user.companyId;
      if (companyId) {
        const company = await Company.findById(companyId);
        if (company && company.subscription) {
          const sub = company.subscription;

          // Load package for AI credit limit
          let pkg: any = null;
          if (sub.packageId) {
            pkg = await Package.findById(sub.packageId);
          } else if (sub.plan) {
            pkg = await Package.findOne({ slug: sub.plan });
          }

          const aiQueryLimit =
            pkg?.limits?.aiQueryLimit || sub.usageLimits?.aiQueryLimit || 100;
          const currentAiUsage = sub.currentAiUsage || 0;
          const aiCreditsRemaining = Math.max(0, aiQueryLimit - currentAiUsage);

          // Determine plan display name
          const planDisplayMap: Record<string, string> = {
            trial: "AI CRM Lite",
            basic: "AI CRM Plus",
            medium: "AI CRM Pro",
            premium: "AI CRM Ultra",
          };
          const planDisplayName =
            pkg?.name || planDisplayMap[sub.plan] || sub.plan || "AI CRM Lite";

          // Compute days remaining
          const now = new Date();
          let daysRemaining = 0;
          let periodEnd = sub.endDate || sub.trialEndDate;
          if (sub.status === "trial" && sub.trialEndDate) {
            periodEnd = sub.trialEndDate;
          }
          if (periodEnd) {
            const diffMs = new Date(periodEnd).getTime() - now.getTime();
            daysRemaining = Math.max(
              0,
              Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
            );
          }

          subscriptionInfo = {
            plan: sub.plan,
            planDisplayName,
            status: sub.status,
            startDate: sub.startDate || sub.trialStartDate || null,
            endDate: sub.endDate || sub.trialEndDate || null,
            trialStartDate: sub.trialStartDate || null,
            trialEndDate: sub.trialEndDate || null,
            daysRemaining,
            aiQueryLimit,
            currentAiUsage,
            aiCreditsRemaining,
            aiCreditUsagePercent:
              aiQueryLimit > 0
                ? Math.min(
                    100,
                    Math.round((currentAiUsage / aiQueryLimit) * 100),
                  )
                : 0,
            aiFeaturesEnabled: sub.aiFeaturesEnabled,
            billingCycle: sub.billingCycle,
            amountPaid: sub.amountPaid,
          };
        }
      }
    } catch {
      // Subscription data is non-critical; continue without it
    }

    sendSuccess(res, {
      user: {
        id: user.id || user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone || "",
        company: user.company || "",
        jobTitle: user.jobTitle || "",
        isVerified: user.isVerified,
        googleId: user.googleId || null,
        isGoogleConnected: !!user.googleId,
        hasPassword: !!user.password,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin || user.updatedAt,
      },
      security: {
        twoFactorEnabled: false,
        activeSessions: activeSessionsCount,
        authProvider: user.googleId ? "Google OAuth" : "Email/Password",
      },
      subscription: subscriptionInfo,
    });
  } catch (error: any) {
    console.error("[profileController] getProfile:", error.message);
    sendError(res, "Failed to retrieve profile", 500);
  }
};

// ─── PUT /api/profile ─────────────────────────────────────────────────────────

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors,
      );
      return;
    }

    const { name, phone, company, jobTitle } = parsed.data;
    const user = await User.findById(req.user.id);
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;

    await user.save();

    createAuditLog(user.id, "profile_updated", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      details: "Profile information updated",
    });

    sendSuccess(
      res,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone || "",
        company: user.company || "",
        jobTitle: user.jobTitle || "",
      },
      "Profile updated successfully",
    );
  } catch (error: any) {
    console.error("[profileController] updateProfile:", error.message);
    sendError(res, "Failed to update profile", 500);
  }
};

// ─── POST /api/profile/upload-avatar ─────────────────────────────────────────

export const uploadAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    if (!req.file) {
      sendError(
        res,
        "No image file provided. Please select a JPG, PNG, or WEBP image.",
        400,
      );
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const processedBuffer = await sharp(req.file.buffer)
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();

    let avatarUrl: string;

    if (isCloudinaryConfigured()) {
      if (user.avatar && user.avatar.includes("cloudinary.com")) {
        const oldPublicId = extractPublicId(user.avatar);
        if (oldPublicId) await deleteAvatarFromCloudinary(oldPublicId);
      }

      const { url } = await uploadAvatarToCloudinary(processedBuffer, user.id);
      avatarUrl = url;
    } else {
      const base64 = processedBuffer.toString("base64");
      avatarUrl = `data:image/webp;base64,${base64}`;
    }

    user.avatar = avatarUrl;
    await user.save();

    createAuditLog(user.id, "avatar_upload", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      details: "Profile avatar updated",
    });

    sendSuccess(
      res,
      { avatar: user.avatar },
      "Profile picture updated successfully",
    );
  } catch (error: any) {
    console.error("[profileController] uploadAvatar:", error.message);
    sendError(res, error.message || "Failed to upload avatar", 500);
  }
};

// ─── DELETE /api/profile/avatar ───────────────────────────────────────────────

export const deleteAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.avatar && user.avatar.includes("cloudinary.com")) {
      const publicId = extractPublicId(user.avatar);
      if (publicId) await deleteAvatarFromCloudinary(publicId);
    }

    user.avatar = "";
    await user.save();

    createAuditLog(user.id, "avatar_delete", {
      ip: req.ip,
      details: "Avatar removed",
    });

    sendSuccess(res, { avatar: "" }, "Profile picture removed successfully");
  } catch (error: any) {
    console.error("[profileController] deleteAvatar:", error.message);
    sendError(res, "Failed to remove avatar", 500);
  }
};

// ─── POST /api/profile/request-email-change ───────────────────────────────────

export const requestEmailChange = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const parsed = requestEmailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        "Invalid request data",
        400,
        parsed.error.flatten().fieldErrors,
      );
      return;
    }

    const { newEmail, password } = parsed.data;

    const user = await User.findById(req.user.id).select(
      "+password +emailOtp +emailOtpExpires +pendingEmail",
    );
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      sendError(
        res,
        "New email address must be different from your current email",
        400,
      );
      return;
    }

    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      sendError(res, "An account with this email address already exists", 400);
      return;
    }

    // If password was provided in the request, verify it; otherwise rely on authenticated JWT token
    if (password && user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        sendError(res, "Incorrect password. Please try again.", 400);
        return;
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailOtp = otp;
    user.emailOtpExpires = otpExpires;
    user.pendingEmail = newEmail.toLowerCase();
    await user.save();

    emailService.sendEmailChangeOtp({
      email: newEmail.toLowerCase(),
      name: user.name,
      otp,
    });

    createAuditLog(user.id, "email_change_requested", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      details: `Email change requested to ${newEmail}`,
    });

    sendSuccess(
      res,
      { pendingEmail: newEmail.toLowerCase() },
      `Verification code sent to ${newEmail}. It expires in 10 minutes.`,
    );
  } catch (error: any) {
    console.error("[profileController] requestEmailChange:", error.message);
    sendError(res, "Failed to send verification email", 500);
  }
};

// ─── PUT /api/profile/verify-email-change ────────────────────────────────────

export const verifyEmailChange = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const parsed = verifyEmailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      const msgs = parsed.error.flatten().fieldErrors.otp;
      sendError(
        res,
        msgs?.[0] || "Please enter a valid 6-digit verification code",
        400,
      );
      return;
    }

    const { otp } = parsed.data;

    const user = await User.findById(req.user.id).select(
      "+emailOtp +emailOtpExpires +pendingEmail",
    );
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (!user.emailOtp || !user.emailOtpExpires || !user.pendingEmail) {
      sendError(
        res,
        "No pending email change request found. Please start the process again.",
        400,
      );
      return;
    }

    if (new Date() > new Date(user.emailOtpExpires)) {
      await User.findByIdAndUpdate(user.id, {
        $unset: { emailOtp: "", emailOtpExpires: "", pendingEmail: "" },
      });
      sendError(
        res,
        "Verification code has expired. Please request a new code.",
        400,
      );
      return;
    }

    if (user.emailOtp.trim() !== otp.trim()) {
      sendError(
        res,
        "Incorrect verification code. Please check and try again.",
        400,
      );
      return;
    }

    const newEmail = user.pendingEmail;

    await User.findByIdAndUpdate(user.id, {
      email: newEmail,
      $unset: { emailOtp: "", emailOtpExpires: "", pendingEmail: "" },
    });

    createAuditLog(user.id, "email_change_verified", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      details: `Email changed to ${newEmail}`,
    });

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: newEmail,
          role: user.role,
          avatar: user.avatar,
        },
      },
      "Email address updated successfully!",
    );
  } catch (error: any) {
    console.error("[profileController] verifyEmailChange:", error.message);
    sendError(res, "Failed to verify email change", 500);
  }
};

// ─── PUT /api/profile/change-password ────────────────────────────────────────

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors,
      );
      return;
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (!user.password) {
      sendError(
        res,
        "Google Sign-In accounts do not have a password. Use Google to sign in.",
        400,
      );
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, "Current password is incorrect", 400);
      return;
    }

    user.password = newPassword;
    await user.save();

    createAuditLog(user.id, "password_changed", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      details: "Password changed successfully",
    });

    sendSuccess(res, null, "Password updated successfully");
  } catch (error: any) {
    console.error("[profileController] changePassword:", error.message);
    sendError(res, "Failed to change password", 500);
  }
};

// ─── POST /api/profile/logout-all ────────────────────────────────────────────

export const logoutAllDevices = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    await RefreshToken.deleteMany({ userId: req.user.id });

    createAuditLog(req.user.id, "logout_all_devices", {
      ip: req.ip,
      details: "Logged out from all devices",
    });

    sendSuccess(res, null, "Successfully logged out from all active devices");
  } catch (error: any) {
    console.error("[profileController] logoutAllDevices:", error.message);
    sendError(res, "Failed to terminate sessions", 500);
  }
};

// ─── DELETE /api/profile/account ─────────────────────────────────────────────

export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Not authenticated", 401);
      return;
    }

    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        parsed.error.flatten().fieldErrors.confirmText?.[0] ||
          "Type DELETE to confirm",
        400,
      );
      return;
    }

    const { password } = parsed.data;
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.password && password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        sendError(res, "Incorrect password. Account deletion cancelled.", 400);
        return;
      }
    }

    const userId = user.id;

    if (user.avatar && user.avatar.includes("cloudinary.com")) {
      const publicId = extractPublicId(user.avatar);
      if (publicId) await deleteAvatarFromCloudinary(publicId);
    }

    await RefreshToken.deleteMany({ userId });
    await Notification.deleteMany({ user: userId });
    await ActivityLog.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    sendSuccess(
      res,
      null,
      "Your account has been permanently deleted. We hope to see you again.",
    );
  } catch (error: any) {
    console.error("[profileController] deleteAccount:", error.message);
    sendError(res, "Failed to delete account. Please try again.", 500);
  }
};
