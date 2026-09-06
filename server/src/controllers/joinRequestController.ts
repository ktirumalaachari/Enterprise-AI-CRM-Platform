import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import Company from '../models/Company';
import JoinRequest from '../models/JoinRequest';
import ActivityLog from '../models/ActivityLog';
import sseService from '../services/sseService';

// ─── Validation ───────────────────────────────────────────────────────────────

const submitJoinSchema = z.object({
  joinCode: z
    .string()
    .min(6, 'Join code must be at least 6 characters')
    .max(20, 'Join code too long')
    .trim(),
});

// =============================================================================
// POST /api/join-requests
// New user submits a company join code → creates a pending join request
// =============================================================================
export const submitJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const validation = submitJoinSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid join code',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { joinCode } = validation.data;

    // Load user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Block already-active users
    if (user.accountStatus === 'ACTIVE' && user.companyId) {
      res.status(400).json({
        success: false,
        message: 'You already belong to a company. Cannot submit another join request.',
      });
      return;
    }

    // Block rejected users
    if (user.accountStatus === 'REJECTED') {
      res.status(403).json({
        success: false,
        message: 'Your join request was previously rejected. Contact the company admin.',
      });
      return;
    }

    // Find company by join code (case-insensitive match)
    const company = await Company.findOne({
      joinCode: joinCode.toUpperCase(),
      joinCodeActive: true,
    });

    if (!company) {
      res.status(400).json({
        success: false,
        message: 'Invalid or inactive join code. Please check the code and try again.',
      });
      return;
    }

    // Check for an existing PENDING request for this user+company
    const existingPending = await JoinRequest.findOne({
      userId,
      companyId: company._id,
      status: 'PENDING',
    });

    if (existingPending) {
      res.status(400).json({
        success: false,
        message: 'You already have a pending join request for this company.',
      });
      return;
    }

    // Create the join request
    const joinRequest = await JoinRequest.create({
      userId,
      companyId: company._id,
      email: user.email,
      name: user.name,
      status: 'PENDING',
      requestedAt: new Date(),
    });

    // Update user status to PENDING_APPROVAL
    user.accountStatus = 'PENDING_APPROVAL';
    await user.save();

    // Broadcast real-time event to all connected company admins
    sseService.broadcastToCompany(company._id.toString(), 'join_request_created', {
      id: joinRequest.id,
      userId: user._id,
      email: joinRequest.email,
      name: joinRequest.name,
      status: joinRequest.status,
      requestedAt: joinRequest.requestedAt,
    });

    res.status(201).json({
      success: true,
      message: 'Join request submitted. Please wait for the Company Admin to approve your request.',
      joinRequestId: joinRequest.id,
      companyName: company.companyName,
    });
  } catch (error: any) {
    console.error('[JoinRequest] submitJoinRequest error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit join request', error: error.message });
  }
};

// =============================================================================
// GET /api/join-requests/my
// Current user retrieves their latest join request
// =============================================================================
export const getMyJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const joinRequest = await JoinRequest.findOne({ userId })
      .populate('companyId', 'companyName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      joinRequest: joinRequest
        ? {
            id: joinRequest.id,
            status: joinRequest.status,
            companyName: (joinRequest.companyId as any)?.companyName || '',
            requestedAt: joinRequest.requestedAt,
            rejectionReason: joinRequest.rejectionReason,
          }
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to get join request', error: error.message });
  }
};

// =============================================================================
// GET /api/join-requests
// Admin: list all join requests for their company (or all for SuperAdmin)
// =============================================================================
export const getCompanyJoinRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let companyId = req.companyId || req.user?.companyId || (req.query.companyId as string) || (req.headers['x-company-id'] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'SuperAdmin';
    const { status } = req.query;
    const filter: any = {};

    if (companyId) {
      filter.companyId = companyId;
    } else if (!isSuperAdmin) {
      // Non-superadmin with no company yet returns clean empty list
      res.status(200).json({
        success: true,
        count: 0,
        joinRequests: [],
      });
      return;
    }

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status as string)) {
      filter.status = status;
    }

    const joinRequests = await JoinRequest.find(filter)
      .populate('userId', 'email avatar')
      .populate('reviewedBy', 'name email')
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: joinRequests.length,
      joinRequests: joinRequests.map((jr) => ({
        id: jr.id,
        userId: jr.userId,
        email: jr.email,
        name: jr.name,
        status: jr.status,
        requestedAt: jr.requestedAt,
        reviewedAt: jr.reviewedAt,
        rejectionReason: jr.rejectionReason,
      })),
    });
  } catch (error: any) {
    console.error('[JoinRequest] getCompanyJoinRequests error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get join requests', error: error.message });
  }
};

// =============================================================================
// POST /api/join-requests/:id/approve
// Admin approves a join request — sets user as ACTIVE with SALES_REPRESENTATIVE role
// =============================================================================
export const approveJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    let companyId = req.companyId || req.user?.companyId || (req.headers['x-company-id'] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const { id } = req.params;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'SuperAdmin';

    // Load request — SuperAdmin can approve any, admin can only approve their own company's requests
    const query: any = { _id: id };
    if (!isSuperAdmin && companyId) {
      query.companyId = companyId;
    }

    const joinRequest = await JoinRequest.findOne(query);
    if (!joinRequest) {
      res.status(404).json({ success: false, message: 'Join request not found or unauthorized' });
      return;
    }

    const targetCompanyId = (joinRequest.companyId || companyId) as any;

    if (joinRequest.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot approve a request with status: ${joinRequest.status}`,
      });
      return;
    }

    // Load user to activate
    const user = await User.findById(joinRequest.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    // Set user as ACTIVE with SALES_REPRESENTATIVE role — companyId comes from DB, NOT frontend
    user.companyId = targetCompanyId;
    user.role = 'SALES_REPRESENTATIVE';
    user.accountStatus = 'ACTIVE';
    await user.save();

    // Mark request as approved
    joinRequest.status = 'APPROVED';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = adminId as any;
    await joinRequest.save();

    // Log activity
    await ActivityLog.create({
      userId: adminId,
      companyId: targetCompanyId,
      action: 'JOIN_REQUEST_APPROVED',
      details: { approvedUser: user.email, approvedUserId: user.id },
    });

    // Broadcast real-time update
    sseService.broadcastToCompany(targetCompanyId.toString(), 'join_request_updated', {
      id: joinRequest.id,
      status: 'APPROVED',
      reviewedAt: joinRequest.reviewedAt,
      email: user.email,
      name: user.name,
    });

    res.status(200).json({
      success: true,
      message: `${user.name} (${user.email}) has been approved and granted CRM access as Sales Representative.`,
    });
  } catch (error: any) {
    console.error('[JoinRequest] approveJoinRequest error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to approve join request', error: error.message });
  }
};

// =============================================================================
// POST /api/join-requests/:id/reject
// Admin rejects a join request
// =============================================================================
export const rejectJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    let companyId = req.companyId || req.user?.companyId || (req.headers['x-company-id'] as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const { id } = req.params;
    const { reason } = req.body;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'SuperAdmin';

    // Enforce company isolation
    const query: any = { _id: id };
    if (!isSuperAdmin && companyId) {
      query.companyId = companyId;
    }

    const joinRequest = await JoinRequest.findOne(query);
    if (!joinRequest) {
      res.status(404).json({ success: false, message: 'Join request not found or unauthorized' });
      return;
    }

    const targetCompanyId = (joinRequest.companyId || companyId) as any;

    if (joinRequest.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: `Cannot reject a request with status: ${joinRequest.status}`,
      });
      return;
    }

    const user = await User.findById(joinRequest.userId);
    if (user) {
      user.accountStatus = 'REJECTED';
      await user.save();
    }

    joinRequest.status = 'REJECTED';
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = adminId as any;
    joinRequest.rejectionReason = reason?.trim() || 'Not specified';
    await joinRequest.save();

    await ActivityLog.create({
      userId: adminId,
      companyId: targetCompanyId,
      action: 'JOIN_REQUEST_REJECTED',
      details: { rejectedUser: joinRequest.email, reason: joinRequest.rejectionReason },
    });

    // Broadcast real-time update
    sseService.broadcastToCompany(targetCompanyId.toString(), 'join_request_updated', {
      id: joinRequest.id,
      status: 'REJECTED',
      reviewedAt: joinRequest.reviewedAt,
      rejectionReason: joinRequest.rejectionReason,
      email: joinRequest.email,
      name: joinRequest.name,
    });

    res.status(200).json({
      success: true,
      message: `Join request from ${joinRequest.email} has been rejected.`,
    });
  } catch (error: any) {
    console.error('[JoinRequest] rejectJoinRequest error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject join request', error: error.message });
  }
};

// =============================================================================
// GET /api/join-requests/events
// Server-Sent Events stream for real-time join request updates
// =============================================================================
export const streamJoinRequestEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    let companyId = req.companyId || req.user?.companyId || (req.query.companyId as string);

    if (!companyId && req.user?.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser?.companyId) {
        companyId = dbUser.companyId.toString();
      } else {
        const owned = await Company.findOne({ ownerId: req.user.id });
        if (owned) companyId = owned.id;
      }
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'SuperAdmin';
    if (!companyId && isSuperAdmin) {
      companyId = 'GLOBAL_SUPERADMIN';
    }

    if (!userId || !companyId) {
      res.status(200).json({ success: false, message: 'No active company stream context' });
      return;
    }

    sseService.addClient(companyId.toString(), userId.toString(), res);
  } catch (error: any) {
    console.error('[JoinRequest] streamJoinRequestEvents error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to establish event stream' });
  }
};
