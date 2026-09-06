import { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import Company from "../models/Company";
import User from "../models/User";
import Customer from "../models/Customer";
import Deal from "../models/Deal";
import ActivityLog from "../models/ActivityLog";
import JoinRequest from "../models/JoinRequest";
import Package from "../models/Package";
import SubscriptionHistory from "../models/SubscriptionHistory";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const registerCompanySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  businessEmail: z.string().email("Invalid business email"),
  phone: z.string().optional().default(""),
  industry: z.string().optional().default("Technology"),
  companySize: z.string().optional().default("1-10"),
  country: z.string().optional().default(""),
  state: z.string().optional().default(""),
  city: z.string().optional().default(""),
  website: z.string().optional().default(""),

  ownerName: z.string().min(2, "Owner name is required"),
  ownerEmail: z.string().email("Invalid owner email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// -----------------------------------------------------------------------------
// POST /api/companies/register — Public endpoint to register new company & owner
// -----------------------------------------------------------------------------
export const registerCompany = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validation = registerCompanySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const data = validation.data;
    const normalizedOwnerEmail = data.ownerEmail.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedOwnerEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "An account with this owner email address already exists.",
      });
      return;
    }

    // 1. Create Owner User record with status PENDING & role COMPANY_OWNER
    const newOwner = await User.create({
      name: data.ownerName,
      email: normalizedOwnerEmail,
      password: data.password,
      role: "COMPANY_OWNER",
      accountStatus: "PENDING",
      isVerified: true,
      company: data.companyName,
    });

    // 2. Create Company record with status PENDING
    const newCompany = await Company.create({
      companyName: data.companyName,
      ownerId: newOwner._id,
      businessEmail: data.businessEmail.toLowerCase().trim(),
      phone: data.phone,
      industry: data.industry,
      companySize: data.companySize,
      country: data.country,
      state: data.state,
      city: data.city,
      website: data.website,
      status: "PENDING",
      subscription: {
        plan: "trial",
        status: "trial",
        startDate: new Date(),
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        aiFeaturesEnabled: true,
      },
    });

    // 3. Link Company back to Owner
    newOwner.companyId = newCompany._id as any;
    newOwner.companies = [
      { companyId: newCompany._id as any, role: "COMPANY_OWNER" },
    ];
    await newOwner.save();

    // 4. Log initial activity
    await ActivityLog.create({
      userId: newOwner._id,
      companyId: newCompany._id,
      action: "COMPANY_REGISTERED",
      details: { companyName: newCompany.companyName },
    });

    res.status(201).json({
      success: true,
      message:
        "Your company registration has been submitted and is pending Super Admin approval.",
      company: {
        id: newCompany.id,
        companyName: newCompany.companyName,
        status: newCompany.status,
      },
      owner: {
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
        role: newOwner.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to register company due to server error.",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/companies — Super Admin List all companies with counters
// -----------------------------------------------------------------------------
export const getAllCompanies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, search, limit = "50", page = "1" } = req.query;

    const query: any = {};
    if (status && status !== "ALL") {
      query.status = String(status).toUpperCase();
    }

    if (search) {
      const searchRegex = new RegExp(String(search), "i");
      query.$or = [
        { companyName: searchRegex },
        { businessEmail: searchRegex },
        { industry: searchRegex },
      ];
    }

    const parsedLimit = Math.max(1, parseInt(String(limit), 10));
    const parsedPage = Math.max(1, parseInt(String(page), 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const companies = await Company.find(query)
      .populate("ownerId", "name email phone avatar lastLogin")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Company.countDocuments(query);

    // Compute metrics
    const totalCompanies = await Company.countDocuments();
    const pendingCompanies = await Company.countDocuments({
      status: "PENDING",
    });
    const activeCompanies = await Company.countDocuments({ status: "ACTIVE" });
    const suspendedCompanies = await Company.countDocuments({
      status: "SUSPENDED",
    });
    const rejectedCompanies = await Company.countDocuments({
      status: "REJECTED",
    });
    const trialCompanies = await Company.countDocuments({
      "subscription.plan": "trial",
    });
    const premiumCompanies = await Company.countDocuments({
      "subscription.plan": "premium",
    });

    // Enrich each company with counts
    const enrichedCompanies = await Promise.all(
      companies.map(async (comp) => {
        const compId = comp._id;
        const totalUsers = await User.countDocuments({ companyId: compId });
        const salesManagers = await User.countDocuments({
          companyId: compId,
          role: { $in: ["SALES_MANAGER", "SalesManager"] },
        });
        const salesReps = await User.countDocuments({
          companyId: compId,
          role: { $in: ["SALES_REPRESENTATIVE", "SalesRep"] },
        });
        const totalLeads = await Customer.countDocuments({
          companyId: compId,
          status: "Lead",
        });
        const totalCustomers = await Customer.countDocuments({
          companyId: compId,
          status: { $ne: "Lead" },
        });
        const totalDeals = await Deal.countDocuments({ companyId: compId });

        return {
          id: comp.id,
          companyName: comp.companyName,
          businessEmail: comp.businessEmail,
          phone: comp.phone,
          industry: comp.industry,
          companySize: comp.companySize,
          status: comp.status,
          rejectionReason: comp.rejectionReason,
          owner: comp.ownerId,
          subscription: comp.subscription,
          userCounts: {
            totalUsers,
            salesManagers,
            salesReps,
          },
          crmCounts: {
            totalLeads,
            totalCustomers,
            totalDeals,
          },
          createdAt: comp.createdAt,
          updatedAt: comp.updatedAt,
        };
      }),
    );

    res.status(200).json({
      success: true,
      stats: {
        totalCompanies,
        pendingCompanies,
        activeCompanies,
        suspendedCompanies,
        rejectedCompanies,
        trialCompanies,
        premiumCompanies,
      },
      companies: enrichedCompanies,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to retrieve companies", error: error.message });
  }
};

// -----------------------------------------------------------------------------
// GET /api/companies/:id — Super Admin Company Detail View with full tab metrics
// -----------------------------------------------------------------------------
export const getCompanyById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id).populate(
      "ownerId",
      "name email phone avatar role lastLogin createdAt",
    );
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    const companyId = company._id;

    // 1. Users list
    const users = await User.find(
      { companyId },
      "name email role accountStatus phone avatar lastLogin createdAt",
    ).sort({ role: 1, name: 1 });

    // Enriched users with assigned counts
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const assignedLeads = await Customer.countDocuments({
          companyId,
          assignedTo: u._id,
          status: "Lead",
        });
        const assignedCustomers = await Customer.countDocuments({
          companyId,
          assignedTo: u._id,
          status: { $ne: "Lead" },
        });
        const assignedDeals = await Deal.countDocuments({
          companyId,
          assignedTo: u._id,
        });
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          accountStatus: u.accountStatus,
          phone: u.phone,
          avatar: u.avatar,
          lastLogin: u.lastLogin,
          assignedLeads,
          assignedCustomers,
          assignedDeals,
        };
      }),
    );

    // 2. Leads metrics
    const totalLeads = await Customer.countDocuments({
      companyId,
      status: "Lead",
    });
    const leadsByStatus = {
      Lead: totalLeads,
      Contacted: await Customer.countDocuments({
        companyId,
        status: "Contacted",
      }),
      Proposal: await Customer.countDocuments({
        companyId,
        status: "Proposal",
      }),
    };

    // 3. Customers metrics
    const totalCustomers = await Customer.countDocuments({
      companyId,
      status: { $ne: "Lead" },
    });
    const customers = await Customer.find({
      companyId,
      status: { $ne: "Lead" },
    })
      .limit(20)
      .populate("assignedTo", "name email");

    // 4. Deals metrics
    const totalDeals = await Deal.countDocuments({ companyId });
    const deals = await Deal.find({ companyId });
    const totalDealValue = deals.reduce((acc, d) => acc + (d.value || 0), 0);

    // 5. AI usage
    const aiLogCount = await ActivityLog.countDocuments({
      companyId,
      action: { $regex: /ai|copilot|summarize|generate/i },
    });

    // 6. Audit logs
    const auditLogs = await ActivityLog.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "name email role");

    res.status(200).json({
      success: true,
      company: {
        id: company.id,
        companyName: company.companyName,
        businessEmail: company.businessEmail,
        phone: company.phone,
        industry: company.industry,
        companySize: company.companySize,
        country: company.country,
        state: company.state,
        city: company.city,
        website: company.website,
        status: company.status,
        rejectionReason: company.rejectionReason,
        joinCode: company.joinCode,
        joinCodeActive: company.joinCodeActive,
        joinCodeGeneratedAt: company.joinCodeGeneratedAt,
        owner: company.ownerId,
        subscription: company.subscription,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
      users: enrichedUsers,
      leads: {
        totalLeads,
        leadsByStatus,
      },
      customers: {
        totalCustomers,
        list: customers,
      },
      deals: {
        totalDeals,
        totalDealValue,
        list: deals.slice(0, 20),
      },
      aiUsage: {
        totalQueries: aiLogCount,
        enabled: company.subscription.aiFeaturesEnabled,
        limit: company.subscription.usageLimits?.aiQueryLimit || 5000,
      },
      auditLogs,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to retrieve company details",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/companies/:id/status — Super Admin Approve / Reject / Suspend / Activate
// -----------------------------------------------------------------------------
export const updateCompanyStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"].includes(status)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid status specified." });
      return;
    }

    const company = await Company.findById(id);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    company.status = status;
    if (status === "REJECTED" && rejectionReason) {
      company.rejectionReason = rejectionReason;
    }
    await company.save();

    // Update associated users' accountStatus accordingly
    const targetUserStatus = status === "ACTIVE" ? "ACTIVE" : status;
    await User.updateMany(
      { companyId: company._id },
      { $set: { accountStatus: targetUserStatus } },
    );

    // Log admin action
    if (req.user) {
      await ActivityLog.create({
        userId: req.user.id,
        companyId: company._id,
        action: `COMPANY_STATUS_UPDATED_${status}`,
        details: { status, rejectionReason },
      });
    }

    res.status(200).json({
      success: true,
      message: `Company status updated to ${status} successfully.`,
      company: {
        id: company.id,
        companyName: company.companyName,
        status: company.status,
        rejectionReason: company.rejectionReason,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update company status",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// PATCH /api/companies/:id/subscription — Super Admin Update Subscription
// -----------------------------------------------------------------------------
export const updateCompanySubscription = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      plan,
      status,
      aiFeaturesEnabled,
      maxUsers,
      maxLeads,
      aiQueryLimit,
    } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found." });
      return;
    }

    if (plan) company.subscription.plan = plan;
    if (status) company.subscription.status = status;
    if (typeof aiFeaturesEnabled === "boolean")
      company.subscription.aiFeaturesEnabled = aiFeaturesEnabled;

    if (!company.subscription.usageLimits) {
      company.subscription.usageLimits = {};
    }
    if (maxUsers) company.subscription.usageLimits.maxUsers = maxUsers;
    if (maxLeads) company.subscription.usageLimits.maxLeads = maxLeads;
    if (aiQueryLimit)
      company.subscription.usageLimits.aiQueryLimit = aiQueryLimit;

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company subscription updated successfully.",
      subscription: company.subscription,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to update subscription", error: error.message });
  }
};

// -----------------------------------------------------------------------------
// GET /api/companies/my-company — Company Owner Profile & Settings
// -----------------------------------------------------------------------------
export const getMyCompany = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    let companyId =
      req.companyId ||
      req.user?.companyId ||
      (req.query.companyId as string) ||
      (req.headers["x-company-id"] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin =
      req.user?.role === "SUPER_ADMIN" || req.user?.role === "SuperAdmin";
    if (!companyId) {
      if (isSuperAdmin) {
        const anyComp = await Company.findOne()
          .sort({ createdAt: -1 })
          .populate("ownerId", "name email phone avatar");
        if (anyComp) {
          const totalUsers = await User.countDocuments({
            companyId: anyComp.id,
          });
          const pendingJoinRequests = await JoinRequest.countDocuments({
            companyId: anyComp.id,
            status: "PENDING",
          });
          res.status(200).json({
            success: true,
            company: {
              id: anyComp.id,
              companyName: anyComp.companyName,
              businessEmail: anyComp.businessEmail,
              phone: anyComp.phone,
              industry: anyComp.industry,
              companySize: anyComp.companySize,
              country: anyComp.country,
              state: anyComp.state,
              city: anyComp.city,
              website: anyComp.website,
              status: anyComp.status,
              joinCode: anyComp.joinCode,
              joinCodeActive: anyComp.joinCodeActive,
              joinCodeGeneratedAt: anyComp.joinCodeGeneratedAt,
              owner: anyComp.ownerId,
              subscription: anyComp.subscription,
              stats: {
                totalUsers,
                pendingJoinRequests,
              },
            },
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        company: null,
        message: "No company associated with this account.",
      });
      return;
    }

    const company = await Company.findById(companyId).populate(
      "ownerId",
      "name email phone avatar",
    );

    if (!company) {
      res.status(200).json({
        success: true,
        company: null,
        message: "Company record not found.",
      });
      return;
    }

    // Get team stats
    const totalUsers = await User.countDocuments({ companyId });
    const pendingJoinRequests = await JoinRequest.countDocuments({
      companyId,
      status: "PENDING",
    });

    res.status(200).json({
      success: true,
      company: {
        id: company.id,
        companyName: company.companyName,
        businessEmail: company.businessEmail,
        phone: company.phone,
        industry: company.industry,
        companySize: company.companySize,
        country: company.country,
        state: company.state,
        city: company.city,
        website: company.website,
        status: company.status,
        joinCode: company.joinCode,
        joinCodeActive: company.joinCodeActive,
        joinCodeGeneratedAt: company.joinCodeGeneratedAt,
        owner: company.ownerId,
        subscription: company.subscription,
        stats: {
          totalUsers,
          pendingJoinRequests,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to retrieve company settings",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// PUT /api/companies/my-company — Company Owner Update Settings
// -----------------------------------------------------------------------------
export const updateMyCompany = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    let companyId =
      req.companyId ||
      req.user?.companyId ||
      (req.body?.companyId as string) ||
      (req.headers["x-company-id"] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin =
      req.user?.role === "SUPER_ADMIN" || req.user?.role === "SuperAdmin";
    if (!companyId && isSuperAdmin) {
      const anyComp = await Company.findOne().sort({ createdAt: -1 });
      if (anyComp) companyId = anyComp.id;
    }

    if (!companyId) {
      res.status(400).json({ message: "No active company context" });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ message: "Company record not found" });
      return;
    }

    const {
      companyName,
      businessEmail,
      phone,
      industry,
      companySize,
      country,
      state,
      city,
      website,
    } = req.body;

    if (companyName) company.companyName = companyName;
    if (businessEmail) company.businessEmail = businessEmail;
    if (phone !== undefined) company.phone = phone;
    if (industry) company.industry = industry;
    if (companySize) company.companySize = companySize;
    if (country !== undefined) company.country = country;
    if (state !== undefined) company.state = state;
    if (city !== undefined) company.city = city;
    if (website !== undefined) company.website = website;

    await company.save();

    res.status(200).json({
      success: true,
      message: "Company settings updated successfully.",
      company,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update company settings",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/companies/subscriptions — Super Admin List Company Subscriptions
// -----------------------------------------------------------------------------
export const getCompanySubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { status, plan, search } = req.query;
    const filter: any = {};

    if (status && status !== "ALL") {
      filter["subscription.status"] = String(status).toLowerCase();
    }
    if (plan && plan !== "ALL") {
      filter["subscription.plan"] = String(plan);
    }
    if (search) {
      filter.$or = [
        { companyName: { $regex: String(search), $options: "i" } },
        { businessEmail: { $regex: String(search), $options: "i" } },
      ];
    }

    const companies = await Company.find(filter)
      .populate("ownerId", "name email phone")
      .populate(
        "subscription.packageId",
        "name monthlyPrice yearlyPrice limits aiFeatures",
      )
      .sort({ createdAt: -1 });

    const now = new Date();

    let totalActive = 0;
    let totalTrial = 0;
    let totalExpired = 0;
    let expiringSoon = 0; // within 7 days
    let paymentPending = 0;

    const list = await Promise.all(
      companies.map(async (comp) => {
        const sub = (comp.subscription || {}) as any;
        const subStatus = sub.status || "trial";

        if (subStatus === "active") totalActive++;
        if (subStatus === "trial") totalTrial++;
        if (subStatus === "expired") totalExpired++;
        if (subStatus === "payment_pending") paymentPending++;

        const endDate = sub.endDate || sub.trialEndDate;
        if (endDate) {
          const diffDays = Math.ceil(
            (new Date(endDate).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          if (diffDays >= 0 && diffDays <= 7 && subStatus !== "expired") {
            expiringSoon++;
          }
        }

        const userCount = await User.countDocuments({ companyId: comp._id });
        const leadCount = await Customer.countDocuments({
          companyId: comp._id,
          status: "Lead",
        });
        const customerCount = await Customer.countDocuments({
          companyId: comp._id,
          status: "Customer",
        });
        const dealCount = await Deal.countDocuments({ companyId: comp._id });

        const maxUsers = sub.usageLimits?.maxUsers || 25;
        const maxLeads = sub.usageLimits?.maxLeads || 5000;
        const aiLimit = sub.usageLimits?.aiQueryLimit || 1000;
        const aiUsed = sub.currentAiUsage || 0;

        return {
          id: comp.id,
          companyName: comp.companyName,
          businessEmail: comp.businessEmail,
          owner: comp.ownerId,
          subscription: {
            plan: sub.plan,
            status: sub.status,
            billingCycle: sub.billingCycle || "trial",
            amountPaid: sub.amountPaid || 0,
            startDate: sub.startDate,
            endDate: sub.endDate || sub.trialEndDate,
            renewalDate: sub.renewalDate || sub.endDate,
            autoRenew: sub.autoRenew ?? true,
            currentAiUsage: aiUsed,
            aiQueryLimit: aiLimit,
            aiUsagePercentage:
              aiLimit > 0
                ? Math.min(100, Math.round((aiUsed / aiLimit) * 100))
                : 0,
            limits: {
              maxUsers,
              currentUsers: userCount,
              usersPercentage: Math.min(
                100,
                Math.round((userCount / maxUsers) * 100),
              ),
              maxLeads,
              currentLeads: leadCount,
              leadsPercentage: Math.min(
                100,
                Math.round((leadCount / maxLeads) * 100),
              ),
              currentCustomers: customerCount,
              currentDeals: dealCount,
            },
          },
          createdAt: comp.createdAt,
        };
      }),
    );

    res.status(200).json({
      success: true,
      stats: {
        totalActive,
        totalTrial,
        totalExpired,
        expiringSoon,
        paymentPending,
      },
      subscriptions: list,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch company subscriptions",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// GET /api/companies/user-subscriptions — Super Admin User & Subscription Overview
// -----------------------------------------------------------------------------
export const getUserSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { search, role } = req.query;
    const filter: any = {};

    if (role && role !== "ALL") {
      filter.role = String(role);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: "i" } },
        { email: { $regex: String(search), $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .populate("companyId", "companyName status subscription")
      .sort({ createdAt: -1 });

    const list = users.map((u) => {
      const company: any = u.companyId;
      const sub = company?.subscription || {};
      const now = new Date();

      let aiAccess = true;
      if (company?.status !== "ACTIVE") aiAccess = false;
      if (sub.status === "expired" || sub.status === "suspended")
        aiAccess = false;
      if (
        sub.trialEndDate &&
        sub.status === "trial" &&
        now > new Date(sub.trialEndDate)
      )
        aiAccess = false;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus || "ACTIVE",
        companyId: company?._id || null,
        companyName: company?.companyName || "No Company",
        companyStatus: company?.status || "N/A",
        inheritedSubscription: {
          plan: sub.plan || "N/A",
          status: sub.status || "N/A",
          billingCycle: sub.billingCycle || "N/A",
          aiAccess,
          aiQueryLimit: sub.usageLimits?.aiQueryLimit || 1000,
          currentAiUsage: sub.currentAiUsage || 0,
        },
        lastLogin: (u as any).updatedAt || u.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      users: list,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch user subscription overview",
      error: error.message,
    });
  }
};

// -----------------------------------------------------------------------------
// POST /api/companies/:id/subscription — Super Admin Manual Package Assignment
// -----------------------------------------------------------------------------
export const updateCompanySubscriptionManual = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { plan, status, billingCycle = "monthly", amountPaid = 0 } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }

    let pkg = await Package.findOne({ slug: plan });

    if (!pkg) {
      pkg = await Package.findById(plan);
    }
    const startDate = new Date();
    const durationMonths = billingCycle === "yearly" ? 12 : 1;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const oldPlan = company.subscription.plan;
    company.subscription.packageId = pkg?._id as any;
    company.subscription.plan = pkg?.name || plan;
    company.subscription.status = status || "active";
    company.subscription.billingCycle = billingCycle;
    company.subscription.amountPaid = amountPaid;
    company.subscription.startDate = startDate;
    company.subscription.endDate = endDate;
    company.subscription.renewalDate = endDate;

    if (pkg) {
      company.subscription.usageLimits = {
        maxSalesManagers: pkg.limits.maxSalesManagers,
        maxSalesReps: pkg.limits.maxSalesReps,
        maxUsers: pkg.limits.maxTotalUsers,
        maxLeads: pkg.limits.maxLeads,
        maxCustomers: pkg.limits.maxCustomers,
        maxDeals: pkg.limits.maxDeals,
        aiQueryLimit: pkg.limits.aiQueryLimit,
      };
    }

    await company.save();

    // Log Subscription History
    await SubscriptionHistory.create({
      companyId: company._id,
      packageId: pkg?._id,
      packageName: pkg?.name || plan,
      billingCycle,
      amountPaid,
      currency: pkg?.currency || "INR",
      startDate,
      endDate,
      paymentReference: "SUPER_ADMIN_MANUAL_OVERRIDE",
      changedBy: req.user?.id,
    });

    if (req.user) {
      const LoggerService = (await import("../services/loggerService.js"))
        .LoggerService;
      await LoggerService.log(req.user.id, "SUBSCRIPTION_UPDATE", {
        companyId: company.id,
        previousPlan: oldPlan,
        newPlan: company.subscription.plan,
        status: company.subscription.status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Subscription for ${company.companyName} updated to ${company.subscription.plan}.`,
      subscription: company.subscription,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update company subscription",
      error: error.message,
    });
  }
};

// =============================================================================
// POST /api/companies/join-code/generate — Generate or regenerate a company join code
// Company Owner / Admin only
// =============================================================================
export const generateJoinCode = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    let companyId =
      req.companyId ||
      req.user?.companyId ||
      req.body?.companyId ||
      (req.headers["x-company-id"] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin =
      req.user?.role === "SUPER_ADMIN" || req.user?.role === "SuperAdmin";
    if (!companyId && isSuperAdmin) {
      const anyComp =
        (await Company.findOne({ status: "ACTIVE" })) ||
        (await Company.findOne().sort({ createdAt: -1 }));
      if (anyComp) companyId = anyComp.id;
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: "Please select a company to generate a join code.",
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    // Generate a cryptographically secure 8-char uppercase alphanumeric code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0,O,I,1
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }

    company.joinCode = code;
    company.joinCodeActive = true;
    company.joinCodeGeneratedAt = new Date();
    await company.save();

    await ActivityLog.create({
      userId: req.user!.id,
      companyId,
      action: "JOIN_CODE_GENERATED",
      details: { code },
    });

    res.status(200).json({
      success: true,
      message: "Company join code generated successfully.",
      joinCode: code,
      joinCodeActive: true,
      joinCodeGeneratedAt: company.joinCodeGeneratedAt,
    });
  } catch (error: any) {
    console.error("[Company] generateJoinCode error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate join code",
      error: error.message,
    });
  }
};

// =============================================================================
// POST /api/companies/join-code/deactivate — Deactivate the join code
// =============================================================================
export const deactivateJoinCode = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    let companyId =
      req.companyId ||
      req.user?.companyId ||
      req.body?.companyId ||
      (req.headers["x-company-id"] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin =
      req.user?.role === "SUPER_ADMIN" || req.user?.role === "SuperAdmin";
    if (!companyId && isSuperAdmin) {
      const anyComp =
        (await Company.findOne({ status: "ACTIVE" })) ||
        (await Company.findOne().sort({ createdAt: -1 }));
      if (anyComp) companyId = anyComp.id;
    }

    if (!companyId) {
      res.status(400).json({
        success: false,
        message: "Please select a company to deactivate a join code.",
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: "Company not found" });
      return;
    }

    company.joinCodeActive = false;
    await company.save();

    await ActivityLog.create({
      userId: req.user!.id,
      companyId,
      action: "JOIN_CODE_DEACTIVATED",
      details: {},
    });

    res.status(200).json({
      success: true,
      message:
        "Company join code has been deactivated. No new join requests can be submitted.",
    });
  } catch (error: any) {
    console.error("[Company] deactivateJoinCode error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate join code",
      error: error.message,
    });
  }
};
