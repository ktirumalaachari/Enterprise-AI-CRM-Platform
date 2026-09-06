import { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { User } from "../models/User";
import Company from "../models/Company";
import { RefreshToken } from "../models/RefreshToken";
import { TokenService } from "../services/tokenService";
import { OAuth2Client } from "google-auth-library";
import emailService from "../services/emailService";
import { OTPService } from "../services/otpService";
import { connectDB } from "../config/db";
import SubscriptionService from "../services/subscriptionService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),
  role: z
    .enum([
      "SUPER_ADMIN",
      "COMPANY_OWNER",
      "SALES_MANAGER",
      "SALES_REPRESENTATIVE",
      "SuperAdmin",
      "Admin",
      "SalesManager",
      "SalesRep",
    ])
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Forgot Password Validation Schemas ───────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const conn = await connectDB();
    if (!conn && mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message:
          "Database connection unavailable. Please try again in a moment.",
      });
      return;
    }

    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password, role } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    let userRole = role || "SALES_REPRESENTATIVE";
    if (userRole === "SalesRep") userRole = "SALES_REPRESENTATIVE";
    if (userRole === "SalesManager") userRole = "SALES_MANAGER";
    if (userRole === "Admin") userRole = "COMPANY_OWNER";
    if (userRole === "SuperAdmin") userRole = "SUPER_ADMIN";

    const isCompanyOwnerOrSuperAdmin =
      userRole === "COMPANY_OWNER" || userRole === "SUPER_ADMIN";

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: userRole as any,
      accountStatus: isCompanyOwnerOrSuperAdmin ? "ACTIVE" : "PENDING_COMPANY",
      isVerified: false,
    });

    const userId = newUser.id || (newUser._id as any).toString();

    const accessToken = TokenService.generateAccessToken({
      id: userId,
      role: userRole,
    });
    const refreshToken = await TokenService.generateRefreshToken(userId);

    TokenService.setRefreshTokenCookie(res, refreshToken);

    const subStatus = SubscriptionService.getSubscriptionStatus(newUser);

    res.status(201).json({
      success: true,
      message: isCompanyOwnerOrSuperAdmin
        ? "Registration successful"
        : "Account created. Please enter your company join code to continue.",
      accessToken,
      requiresJoinCode: !isCompanyOwnerOrSuperAdmin,
      user: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        role: userRole,
        avatar: newUser.avatar || "",
        accountStatus: newUser.accountStatus,
        subscription: subStatus,
      },
    });
  } catch (error: any) {
    console.error("[AUTH] Registration error:", error);

    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }
    if (error.name === "ValidationError") {
      res
        .status(400)
        .json({ success: false, message: error.message, errors: error.errors });
      return;
    }
    if (
      error.message?.includes("RefreshToken") ||
      error.message?.includes("MongoDB")
    ) {
      res.status(500).json({
        success: false,
        message: "Session creation failed. Please try again.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Registration failed due to server error. Please try again.",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const conn = await connectDB();
    if (!conn && mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message:
          "Database connection unavailable. Please try again in a moment.",
      });
      return;
    }

    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    if (!user) {
      res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res
          .status(400)
          .json({ success: false, message: "Invalid email or password" });
        return;
      }
    }

    const userId = user.id || (user._id as any).toString();
    let normalizedRole = user.role || "SALES_REPRESENTATIVE";
    if (normalizedRole === "SuperAdmin") normalizedRole = "SUPER_ADMIN";
    if (normalizedRole === "Admin") normalizedRole = "COMPANY_OWNER";
    if (normalizedRole === "SalesManager") normalizedRole = "SALES_MANAGER";
    if (normalizedRole === "SalesRep") normalizedRole = "SALES_REPRESENTATIVE";

    User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {});

    if (normalizedRole === "SUPER_ADMIN") {
      const accessToken = TokenService.generateAccessToken({
        id: userId,
        role: "SUPER_ADMIN",
      });
      const refreshToken = await TokenService.generateRefreshToken(userId);
      TokenService.setRefreshTokenCookie(res, refreshToken);

      const subStatus = SubscriptionService.getSubscriptionStatus(user);

      res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken,
        user: {
          id: userId,
          name: user.name || normalizedEmail.split("@")[0],
          email: user.email || normalizedEmail,
          role: "SUPER_ADMIN",
          avatar: user.avatar || "",
          accountStatus: "ACTIVE",
          subscription: subStatus,
        },
      });
      return;
    }

    if (user.accountStatus === "REJECTED") {
      res.status(403).json({
        success: false,
        message:
          "Your join request was rejected by the company admin. Please contact them for access.",
        accountStatus: "REJECTED",
      });
      return;
    }

    if (user.accountStatus === "PENDING_COMPANY") {
      const accessToken = TokenService.generateAccessToken({
        id: userId,
        role: normalizedRole,
      });
      const refreshToken = await TokenService.generateRefreshToken(userId);
      TokenService.setRefreshTokenCookie(res, refreshToken);
      res.status(200).json({
        success: true,
        message: "Please enter your company join code to continue.",
        accessToken,
        requiresJoinCode: true,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: normalizedRole,
          avatar: user.avatar || "",
          accountStatus: "PENDING_COMPANY",
        },
      });
      return;
    }

    if (user.accountStatus === "PENDING_APPROVAL") {
      const accessToken = TokenService.generateAccessToken({
        id: userId,
        role: normalizedRole,
      });
      const refreshToken = await TokenService.generateRefreshToken(userId);
      TokenService.setRefreshTokenCookie(res, refreshToken);
      res.status(200).json({
        success: true,
        message:
          "Your join request is awaiting approval from the Company Admin.",
        accessToken,
        requiresPendingApproval: true,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: normalizedRole,
          avatar: user.avatar || "",
          accountStatus: "PENDING_APPROVAL",
        },
      });
      return;
    }

    let companyMemberships: Array<{
      id: string;
      companyName: string;
      role: string;
      status: string;
    }> = [];

    if (user.companyId) {
      const mainComp = await Company.findById(user.companyId);
      if (mainComp) {
        companyMemberships.push({
          id: mainComp.id,
          companyName: mainComp.companyName,
          role: normalizedRole,
          status: mainComp.status,
        });
      }
    }

    if (user.companies && user.companies.length > 0) {
      for (const mem of user.companies) {
        if (
          !companyMemberships.some((c) => c.id === mem.companyId.toString())
        ) {
          const comp = await Company.findById(mem.companyId);
          if (comp) {
            companyMemberships.push({
              id: comp.id,
              companyName: comp.companyName,
              role: mem.role || normalizedRole,
              status: comp.status,
            });
          }
        }
      }
    }

    const ownedCompanies = await Company.find({ ownerId: user._id });
    for (const comp of ownedCompanies) {
      if (!companyMemberships.some((c) => c.id === comp.id)) {
        companyMemberships.push({
          id: comp.id,
          companyName: comp.companyName,
          role: "COMPANY_OWNER",
          status: comp.status,
        });
      }
    }

    if (companyMemberships.length === 0) {
      res.status(200).json({
        success: true,
        noCompany: true,
        message: "No company is associated with your account.",
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: normalizedRole,
        },
      });
      return;
    }

    if (companyMemberships.length > 1) {
      const tempToken = TokenService.generateAccessToken({
        id: userId,
        role: normalizedRole,
      });
      res.status(200).json({
        success: true,
        requiresCompanySelection: true,
        message: "Please select a company to continue.",
        accessToken: tempToken,
        companies: companyMemberships,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: normalizedRole,
        },
      });
      return;
    }

    const singleComp = companyMemberships[0];

    const accessToken = TokenService.generateAccessToken({
      id: userId,
      role: singleComp.role as any,
      companyId: singleComp.id,
    });
    const refreshToken = await TokenService.generateRefreshToken(userId);
    TokenService.setRefreshTokenCookie(res, refreshToken);

    const subStatus = SubscriptionService.getSubscriptionStatus(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: userId,
        name: user.name || normalizedEmail.split("@")[0],
        email: user.email || normalizedEmail,
        role: singleComp.role,
        avatar: user.avatar || "",
        companyId: singleComp.id,
        companyName: singleComp.companyName,
        companyStatus: singleComp.status,
        accountStatus: user.accountStatus,
        subscription: subStatus,
      },
    });
  } catch (error: any) {
    console.error("[AUTH] Login error:", error?.message || error);
    if (
      error.message?.includes("RefreshToken") ||
      error.message?.includes("MongoDB")
    ) {
      res.status(500).json({
        success: false,
        message: "Session creation failed. Please try again.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Login failed due to server error. Please try again.",
    });
  }
};

export const selectCompany = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { companyId } = req.body;
    if (!companyId) {
      res.status(400).json({ message: "Company ID is required" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ message: "Selected company not found" });
      return;
    }

    const isOwner = company.ownerId.toString() === user._id.toString();
    const isMember =
      user.companyId?.toString() === companyId ||
      user.companies?.some((c) => c.companyId.toString() === companyId);

    if (
      !isOwner &&
      !isMember &&
      user.role !== "SUPER_ADMIN" &&
      user.role !== "SuperAdmin"
    ) {
      res.status(403).json({ message: "You are not a member of this company" });
      return;
    }

    let activeRole = user.role;
    if (isOwner) activeRole = "COMPANY_OWNER";

    user.companyId = company._id as any;
    await user.save();

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      role: activeRole,
      companyId: company.id,
    });

    const subStatus = SubscriptionService.getSubscriptionStatus(user);

    res.status(200).json({
      success: true,
      message: `Active company switched to ${company.companyName}`,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: activeRole,
        avatar: user.avatar || "",
        companyId: company.id,
        companyName: company.companyName,
        companyStatus: company.status,
        subscription: subStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to select company context",
      error: error.message,
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await RefreshToken.findOneAndDelete({ token: refreshToken }).catch(
        () => {},
      );
    }

    TokenService.clearRefreshTokenCookie(res);
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error: any) {
    console.error("[AUTH] Logout error:", error?.message || error);
    TokenService.clearRefreshTokenCookie(res);
    res.status(200).json({ success: true, message: "Logout completed" });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(200).json({
        success: false,
        authenticated: false,
        message: "No active session",
      });
      return;
    }

    const decoded = TokenService.verifyRefreshToken(token);

    if (!decoded || (!decoded.userId && !decoded.id)) {
      TokenService.clearRefreshTokenCookie(res);
      res.status(200).json({
        success: false,
        authenticated: false,
        message: "Session invalid or expired",
      });
      return;
    }

    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      TokenService.clearRefreshTokenCookie(res);
      res.status(200).json({
        success: false,
        authenticated: false,
        message: "User account no longer exists",
      });
      return;
    }

    if (
      user.accountStatus === "REJECTED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      TokenService.clearRefreshTokenCookie(res);
      res.status(200).json({
        success: false,
        authenticated: false,
        message: "Your account access has been suspended or rejected.",
        accountStatus: user.accountStatus,
      });
      return;
    }

    let normalizedRole = user.role || "SALES_REPRESENTATIVE";
    if (normalizedRole === "SuperAdmin") normalizedRole = "SUPER_ADMIN";
    if (normalizedRole === "Admin") normalizedRole = "COMPANY_OWNER";
    if (normalizedRole === "SalesManager") normalizedRole = "SALES_MANAGER";
    if (normalizedRole === "SalesRep") normalizedRole = "SALES_REPRESENTATIVE";

    const userIdStr = user.id || (user._id as any).toString();
    const activeCompanyId = user.companyId?.toString();

    let companyName = "";
    let companyStatus = "ACTIVE";
    if (activeCompanyId) {
      const comp = await Company.findById(activeCompanyId);
      if (comp) {
        companyName = comp.companyName;
        companyStatus = comp.status;
      }
    }

    const newAccessToken = TokenService.generateAccessToken({
      id: userIdStr,
      role: normalizedRole as any,
      companyId: activeCompanyId,
    });

    const newRefreshToken = await TokenService.generateRefreshToken(userIdStr);
    TokenService.setRefreshTokenCookie(res, newRefreshToken);

    const subStatus = SubscriptionService.getSubscriptionStatus(user);
    const isSuperAdmin = normalizedRole === "SUPER_ADMIN";

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      user: {
        id: userIdStr,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        avatar: user.avatar || "",
        companyId: activeCompanyId,
        companyName,
        companyStatus,
        accountStatus: isSuperAdmin ? "ACTIVE" : user.accountStatus || "ACTIVE",
        subscription: subStatus,
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Server error during token refresh" });
  }
};

export const googleLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const conn = await connectDB();
    if (!conn && mongoose.connection.readyState !== 1) {
      res.status(503).json({
        success: false,
        message:
          "Database connection unavailable. Please try again in a moment.",
      });
      return;
    }
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      res.status(400).json({
        success: false,
        message: "Google credential (idToken) or accessToken is required",
      });
      return;
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(500).json({
        success: false,
        message: "Google OAuth not configured on server",
      });
      return;
    }

    interface GoogleUserInfo {
      email: string;
      name?: string;
      picture?: string;
      sub?: string;
    }

    let googleUser: GoogleUserInfo | null = null;

    if (credential) {
      let idTokenPayload:
        | {
            email?: string | null;
            name?: string;
            picture?: string;
            sub?: string;
          }
        | undefined;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const p = ticket.getPayload();
        if (p) {
          idTokenPayload = {
            email: p.email,
            name: p.name,
            picture: p.picture,
            sub: p.sub,
          };
        }
      } catch (verifyErr: any) {
        if (
          process.env.NODE_ENV === "development" &&
          credential.startsWith("mock-google-token-")
        ) {
          const mockEmail =
            credential.replace("mock-google-token-", "") + "@gmail.com";
          idTokenPayload = {
            email: mockEmail,
            name: credential.replace("mock-google-token-", ""),
            picture:
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
            sub: "google-sub-id-" + credential,
          };
        } else {
          res.status(400).json({
            success: false,
            message: "Failed to verify Google ID token",
            error:
              process.env.NODE_ENV === "development"
                ? verifyErr.message
                : undefined,
          });
          return;
        }
      }

      if (!idTokenPayload || !idTokenPayload.email) {
        res
          .status(400)
          .json({ message: "Invalid payload from Google verification" });
        return;
      }

      googleUser = {
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        picture: idTokenPayload.picture,
        sub: idTokenPayload.sub,
      };
    } else if (accessToken) {
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!userInfoRes.ok) {
        res.status(400).json({
          success: false,
          message:
            "Failed to fetch Google user info. Invalid or expired access token.",
        });
        return;
      }

      const rawInfo = (await userInfoRes.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      if (!rawInfo.email) {
        res
          .status(400)
          .json({ message: "Could not retrieve email from Google account" });
        return;
      }

      googleUser = {
        email: rawInfo.email,
        name: rawInfo.name,
        picture: rawInfo.picture,
        sub: rawInfo.sub,
      };
    }

    if (!googleUser) {
      res.status(400).json({
        success: false,
        message: "Could not extract user info from Google response",
      });
      return;
    }

    const { email, name, picture, sub: googleId } = googleUser;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || "Google User",
        email,
        avatar: picture || "",
        googleId,
        isVerified: true,
        role: "SALES_REPRESENTATIVE",
        accountStatus: "PENDING_COMPANY",
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    user.lastLogin = new Date();
    await user.save();

    if (user.accountStatus === "REJECTED") {
      res.status(403).json({
        success: false,
        message:
          "Your join request was rejected. Please contact the company admin.",
        accountStatus: "REJECTED",
      });
      return;
    }

    const jwtAccessToken = TokenService.generateAccessToken({
      id: user.id,
      role: user.role,
      companyId: user.companyId?.toString(),
    });
    const refreshToken = await TokenService.generateRefreshToken(user.id);
    TokenService.setRefreshTokenCookie(res, refreshToken);

    const subStatus = SubscriptionService.getSubscriptionStatus(user);

    if (
      user.accountStatus === "PENDING_COMPANY" ||
      (!user.companyId && user.accountStatus !== "ACTIVE")
    ) {
      res.status(200).json({
        success: true,
        message: "Please enter your company join code to continue.",
        accessToken: jwtAccessToken,
        requiresJoinCode: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          accountStatus: "PENDING_COMPANY",
          subscription: subStatus,
        },
      });
      return;
    }

    if (user.accountStatus === "PENDING_APPROVAL") {
      res.status(200).json({
        success: true,
        message:
          "Your join request is awaiting approval from the Company Admin.",
        accessToken: jwtAccessToken,
        requiresPendingApproval: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          accountStatus: "PENDING_APPROVAL",
          subscription: subStatus,
        },
      });
      return;
    }

    let companyName = "";
    let companyStatus = "ACTIVE";
    if (user.companyId) {
      const comp = await Company.findById(user.companyId);
      if (comp) {
        companyName = comp.companyName;
        companyStatus = comp.status;
      }
    }

    res.status(200).json({
      success: true,
      message: "Google login successful",
      accessToken: jwtAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        companyId: user.companyId?.toString(),
        companyName,
        companyStatus,
        accountStatus: user.accountStatus,
        subscription: subStatus,
      },
    });

    const clientIp = (
      (req.headers["x-forwarded-for"] as string) ||
      req.ip ||
      "127.0.0.1"
    )
      .split(",")[0]
      .trim();
    const userAgent = req.headers["user-agent"] || "Unknown Browser";

    setImmediate(() => {
      emailService
        .sendGoogleLoginSecurityNotification({
          email: user.email,
          name: user.name,
          ipAddress: clientIp,
          userAgent,
          dateTime: new Date().toUTCString(),
        })
        .catch((err) =>
          console.warn(
            "[Background Email Notification Ignored]:",
            err?.message,
          ),
        );
    });
  } catch (error: any) {
    console.error("[AUTH] Google login error:", error?.message || error);
    if (
      error.message?.includes("RefreshToken") ||
      error.message?.includes("MongoDB")
    ) {
      res.status(500).json({
        success: false,
        message: "Session creation failed. Please try again.",
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD FLOW
// ─────────────────────────────────────────────────────────────

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
        expiresIn: 120,
      });
      return;
    }

    let otp: string;
    try {
      otp = await OTPService.createOTP(user._id.toString(), normalizedEmail);
    } catch (cooldownError: any) {
      res.status(429).json({
        success: false,
        message:
          cooldownError.message || "Please wait before requesting a new code.",
      });
      return;
    }

    try {
      await emailService.sendForgotPasswordOtp({
        email: normalizedEmail,
        name: user.name,
        otp,
      });
    } catch (emailError: any) {
      await OTPService.deleteOTP(normalizedEmail);
      res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again later.",
      });
      return;
    }

    const response: any = {
      success: true,
      message: "Verification code sent successfully.",
      expiresIn: 120,
    };

    if (process.env.NODE_ENV === "development") {
      response.devModeCode = otp;
    }

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

export const verifyResetOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = verifyOTPSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, otp } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const result = await OTPService.validateOTP(normalizedEmail, otp);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const resetToken = OTPService.generatePasswordResetToken(normalizedEmail);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Verification process encountered an error.",
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawNewPassword = req.body.newPassword || req.body.password;
    const rawResetToken = req.body.resetToken || req.body.token;
    const rawEmail = req.body.email;

    if (!rawNewPassword) {
      res.status(400).json({
        success: false,
        message: "New password is required.",
      });
      return;
    }

    if (rawNewPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    let normalizedEmail = rawEmail ? String(rawEmail).toLowerCase().trim() : "";

    if (rawResetToken) {
      const tokenEmail = OTPService.verifyPasswordResetToken(rawResetToken);
      if (tokenEmail) {
        normalizedEmail = tokenEmail.toLowerCase().trim();
      }
    }

    if (!normalizedEmail) {
      res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset authorization. Please request a new OTP.",
      });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Account not found.",
      });
      return;
    }

    user.password = rawNewPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[AUTH] Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
};
