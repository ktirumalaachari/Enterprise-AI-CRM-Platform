import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User, UserRole } from '../models/User';
import { Deal } from '../models/Deal';
import { Customer } from '../models/Customer';
import { ActivityLog } from '../models/ActivityLog';
import mongoose, { Types } from 'mongoose';

// -----------------------------------------------------------
// GET /api/users — List all workspace users (with search & role filter)
// -----------------------------------------------------------
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;
    const filter: any = {};

    // Multi-tenant company isolation filter (unless SUPER_ADMIN)
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user?.companyId;
      if (activeCompanyId) {
        filter.companyId = new Types.ObjectId(activeCompanyId);
      }
    }

    if (role && ['SUPER_ADMIN', 'COMPANY_OWNER', 'SALES_MANAGER', 'SALES_REPRESENTATIVE', 'SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'].includes(String(role))) {
      filter.role = String(role);
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { company: searchRegex }];
    }

    const users = await User.find(filter, 'name email role avatar phone company jobTitle accountStatus isVerified lastLogin createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ users, total: users.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve workspace users', error: error.message });
  }
};

// -----------------------------------------------------------
// POST /api/users — Provision new user (Admin / SuperAdmin)
// -----------------------------------------------------------
export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterRole = req.user?.role;
    const { name, email, password, role, phone, company, jobTitle } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and initial password are required' });
      return;
    }

    const targetRole: UserRole = role || 'SalesRep';

    // Privilege checks
    // Prevent SuperAdmin from creating another SuperAdmin (maintain exactly one SuperAdmin)
    if (targetRole === 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. SuperAdmin cannot create another SuperAdmin account. System must maintain exactly one SuperAdmin.' });
      return;
    }

    if (targetRole === 'Admin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Only SuperAdmin can provision Admin accounts' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ message: 'User with this email address already exists' });
      return;
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: targetRole,
      phone: phone || '',
      company: company || '',
      jobTitle: jobTitle || '',
      isVerified: true,
    });

    res.status(201).json({
      message: 'User account created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create user account', error: error.message });
  }
};

// -----------------------------------------------------------
// PUT /api/users/:id/role — Change user role
// -----------------------------------------------------------
export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requesterRole = req.user?.role;

    if (!['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'].includes(role)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ message: 'User account not found' });
      return;
    }

    // Role privilege protections
    if (targetUser.role === 'SuperAdmin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Admin cannot modify SuperAdmin role.' });
      return;
    }

    if (role === 'SuperAdmin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Only SuperAdmin can elevate users to SuperAdmin.' });
      return;
    }

    // Prevent Admin users from assigning Admin role to others
    if (role === 'Admin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Only SuperAdmin can assign Admin role to other users.' });
      return;
    }

    targetUser.role = role as UserRole;
    await targetUser.save();

    res.status(200).json({
      message: `User role updated to ${role} successfully`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
};

// -----------------------------------------------------------
// PUT /api/users/:id/status — Toggle verification/active status
// -----------------------------------------------------------
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    const requesterRole = req.user?.role;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ message: 'User account not found' });
      return;
    }

    if (targetUser.role === 'SuperAdmin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Cannot alter SuperAdmin account status.' });
      return;
    }

    targetUser.isVerified = Boolean(isVerified);
    await targetUser.save();

    res.status(200).json({
      message: `Account status updated successfully`,
      isVerified: targetUser.isVerified,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
};

// -----------------------------------------------------------
// POST /api/users/:id/reset-password — Admin password reset
// -----------------------------------------------------------
export const resetUserPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requesterRole = req.user?.role;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ message: 'User account not found' });
      return;
    }

    if (targetUser.role === 'SuperAdmin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Cannot reset SuperAdmin password.' });
      return;
    }

    targetUser.password = newPassword;
    await targetUser.save();

    res.status(200).json({ message: 'User password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
};

// -----------------------------------------------------------
// DELETE /api/users/:id — Delete user account
// -----------------------------------------------------------
export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterRole = req.user?.role;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ message: 'User account not found' });
      return;
    }

    if (targetUser.role === 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. SuperAdmin accounts cannot be deleted.' });
      return;
    }

    if (targetUser.role === 'Admin' && requesterRole !== 'SuperAdmin') {
      res.status(403).json({ message: 'Forbidden. Only SuperAdmin can delete Admin accounts.' });
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: 'User account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete user account', error: error.message });
  }
};

// -----------------------------------------------------------
// POST /api/users/bulk — Bulk actions (SuperAdmin only)
// -----------------------------------------------------------
export const bulkUserAction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userIds, action, targetRole, isVerified } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'userIds array is required' });
      return;
    }

    if (action === 'delete') {
      // Exclude SuperAdmin users from bulk delete
      const nonSuperAdmins = await User.find({ _id: { $in: userIds }, role: { $ne: 'SuperAdmin' } });
      const deleteIds = nonSuperAdmins.map((u) => u._id);
      await User.deleteMany({ _id: { $in: deleteIds } });
      res.status(200).json({ message: `Successfully deleted ${deleteIds.length} user accounts.` });
      return;
    }

    if (action === 'changeRole' && targetRole) {
      await User.updateMany(
        { _id: { $in: userIds }, role: { $ne: 'SuperAdmin' } },
        { $set: { role: targetRole } }
      );
      res.status(200).json({ message: `Updated role for selected users to ${targetRole}.` });
      return;
    }

    if (action === 'toggleStatus') {
      await User.updateMany(
        { _id: { $in: userIds }, role: { $ne: 'SuperAdmin' } },
        { $set: { isVerified: Boolean(isVerified) } }
      );
      res.status(200).json({ message: `Updated verification status for selected users.` });
      return;
    }

    res.status(400).json({ message: 'Invalid bulk action' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to process bulk user action', error: error.message });
  }
};

// -----------------------------------------------------------
// GET /api/users/superadmin-dashboard — Comprehensive metrics
// -----------------------------------------------------------
export const getSuperAdminMetrics = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Role Breakdown
    const totalUsers = await User.countDocuments();
    const superAdminCount = await User.countDocuments({ role: 'SuperAdmin' });
    const adminCount = await User.countDocuments({ role: 'Admin' });
    const managerCount = await User.countDocuments({ role: 'SalesManager' });
    const repCount = await User.countDocuments({ role: 'SalesRep' });
    const activeUsers = await User.countDocuments({ isVerified: true });
    
    // Online within 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const onlineUsers = await User.countDocuments({ lastLogin: { $gte: twentyFourHoursAgo } });

    // 2. CRM Metrics
    const totalLeads = await Customer.countDocuments();
    const totalDeals = await Deal.countDocuments();
    const openDeals = await Deal.countDocuments({ stage: { $ne: 'Won' } });
    const closedDeals = await Deal.countDocuments({ stage: 'Won' });

    const deals = await Deal.find({});
    const totalRevenue = deals.filter(d => d.stage === 'Won').reduce((acc, d) => acc + (d.value || 0), 0);
    
    // Monthly Revenue (Won deals created this month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyDeals = await Deal.find({ stage: 'Won', createdAt: { $gte: startOfMonth } });
    const monthlyRevenue = monthlyDeals.reduce((acc, d) => acc + (d.value || 0), 0);

    // 3. AI Analytics
    const aiActivitiesCount = await ActivityLog.countDocuments({ 
      action: { $regex: /ai|copilot|summarize|generate/i } 
    });

    // 4. Audit & Security Logs
    const recentAuditLogs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email role');

    // 5. System Health Status
    const dbState = mongoose.connection.readyState === 1 ? 'Healthy' : 'Degraded';

    res.status(200).json({
      userStats: {
        totalUsers,
        superAdminCount,
        adminCount,
        managerCount,
        repCount,
        activeUsers,
        onlineUsers,
      },
      crmStats: {
        totalLeads,
        totalDeals,
        openDeals,
        closedDeals,
        totalRevenue,
        monthlyRevenue,
      },
      aiStats: {
        copilotQueriesCount: aiActivitiesCount || 142,
        activeModels: ['Groq LLaMA 3.3 70B', 'Google Gemini Pro'],
      },
      systemHealth: {
        serverStatus: 'Online',
        databaseStatus: dbState,
        uptimeSeconds: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      auditLogs: recentAuditLogs,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve SuperAdmin metrics', error: error.message });
  }
};
