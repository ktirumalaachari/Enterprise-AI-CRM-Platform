import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export interface RbacPermissionEntry {
  id: string;
  module: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  allowedRoles: ('SuperAdmin' | 'Admin' | 'SalesManager' | 'SalesRep')[];
}

export const RBAC_PERMISSION_CATALOG: RbacPermissionEntry[] = [
  // ── 1. SuperAdmin Management Hub ──
  {
    id: 'sa-metrics',
    module: 'SuperAdmin Hub',
    endpoint: '/api/users/superadmin-metrics',
    method: 'GET',
    description: 'View cross-tenant metrics, system health, and global analytics',
    allowedRoles: ['SuperAdmin'],
  },
  {
    id: 'sa-companies',
    module: 'SuperAdmin Hub',
    endpoint: '/api/companies',
    method: 'GET',
    description: 'List and inspect all registered enterprise company tenants',
    allowedRoles: ['SuperAdmin'],
  },
  {
    id: 'sa-company-subscriptions',
    module: 'SuperAdmin Hub',
    endpoint: '/api/companies/subscriptions',
    method: 'GET',
    description: 'Manage tenant plan tier upgrades and manual payment overrides',
    allowedRoles: ['SuperAdmin'],
  },
  {
    id: 'sa-packages',
    module: 'SuperAdmin Hub',
    endpoint: '/api/packages/admin',
    method: 'GET',
    description: 'Create and configure SaaS pricing plan feature packages',
    allowedRoles: ['SuperAdmin'],
  },
  {
    id: 'sa-bulk-users',
    module: 'SuperAdmin Hub',
    endpoint: '/api/users/bulk',
    method: 'POST',
    description: 'Execute bulk deletion, verification, or role updates on workspace users',
    allowedRoles: ['SuperAdmin'],
  },

  // ── 2. Company & Workspace Administration ──
  {
    id: 'usr-provision',
    module: 'User & Workspace Admin',
    endpoint: '/api/users',
    method: 'POST',
    description: 'Provision new workspace user accounts and assign roles',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },
  {
    id: 'usr-change-role',
    module: 'User & Workspace Admin',
    endpoint: '/api/users/:id/role',
    method: 'PUT',
    description: 'Update existing user role level within company tenant',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },
  {
    id: 'usr-delete',
    module: 'User & Workspace Admin',
    endpoint: '/api/users/:id',
    method: 'DELETE',
    description: 'Delete user account and revoke API tokens',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },
  {
    id: 'cmp-join-code',
    module: 'User & Workspace Admin',
    endpoint: '/api/companies/join-code/generate',
    method: 'POST',
    description: 'Generate or rotate company invite join codes',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },
  {
    id: 'cmp-update',
    module: 'User & Workspace Admin',
    endpoint: '/api/companies/my-company',
    method: 'PUT',
    description: 'Update company settings, branding logo, and domain defaults',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },
  {
    id: 'rep-update-kpis',
    module: 'User & Workspace Admin',
    endpoint: '/api/reports/kpis',
    method: 'PUT',
    description: 'Configure corporate sales KPI targets and revenue quotas',
    allowedRoles: ['SuperAdmin', 'Admin'],
  },

  // ── 3. Team & Sales Management ──
  {
    id: 'tm-create',
    module: 'Team & Reports Management',
    endpoint: '/api/teams',
    method: 'POST',
    description: 'Create sales teams and assign territory structures',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },
  {
    id: 'tm-invite',
    module: 'Team & Reports Management',
    endpoint: '/api/teams/:id/invite',
    method: 'POST',
    description: 'Invite members to sales teams and assign team roles',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },
  {
    id: 'rep-summary',
    module: 'Team & Reports Management',
    endpoint: '/api/reports/summary',
    method: 'GET',
    description: 'View executive sales report summaries and performance metrics',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },
  {
    id: 'rep-export',
    module: 'Team & Reports Management',
    endpoint: '/api/reports/export',
    method: 'GET',
    description: 'Export sales reports to CSV / PDF formats',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },
  {
    id: 'cust-delete',
    module: 'Team & Reports Management',
    endpoint: '/api/customers/:id',
    method: 'DELETE',
    description: 'Delete customer contacts and remove lead records',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },
  {
    id: 'deal-delete',
    module: 'Team & Reports Management',
    endpoint: '/api/deals/:id',
    method: 'DELETE',
    description: 'Delete sales deals and pipeline opportunities',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager'],
  },

  // ── 4. Core Sales Execution ──
  {
    id: 'cust-view',
    module: 'Sales & Execution',
    endpoint: '/api/customers',
    method: 'GET',
    description: 'View customer lead contacts',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'cust-create',
    module: 'Sales & Execution',
    endpoint: '/api/customers',
    method: 'POST',
    description: 'Create new customer lead contact',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'deal-view',
    module: 'Sales & Execution',
    endpoint: '/api/deals',
    method: 'GET',
    description: 'View sales deal pipeline',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'deal-create',
    module: 'Sales & Execution',
    endpoint: '/api/deals',
    method: 'POST',
    description: 'Create sales deal opportunity',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'deal-stage',
    module: 'Sales & Execution',
    endpoint: '/api/deals/:id/stage',
    method: 'PATCH',
    description: 'Update Kanban stage of a deal',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'task-manage',
    module: 'Sales & Execution',
    endpoint: '/api/tasks',
    method: 'GET',
    description: 'Manage sales tasks and follow-up action items',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
  {
    id: 'ai-copilot',
    module: 'Sales & Execution',
    endpoint: '/api/ai/copilot-chat',
    method: 'POST',
    description: 'Use LLaMA-3 AI Sales Copilot assistant',
    allowedRoles: ['SuperAdmin', 'Admin', 'SalesManager', 'SalesRep'],
  },
];

const normalizeRole = (role: string): string => {
  if (role === 'SuperAdmin') return 'SUPER_ADMIN';
  if (role === 'Admin') return 'COMPANY_OWNER';
  if (role === 'SalesManager') return 'SALES_MANAGER';
  if (role === 'SalesRep') return 'SALES_REPRESENTATIVE';
  return role;
};

// GET /api/rbac/matrix
export const getRbacMatrix = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || 'SalesRep';
    res.status(200).json({
      success: true,
      userRole,
      permissions: RBAC_PERMISSION_CATALOG,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to load RBAC permissions matrix', error: err.message });
  }
};

// POST /api/rbac/test-access
export const testEndpointAccess = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { endpointId } = req.body;
    const permission = RBAC_PERMISSION_CATALOG.find((p) => p.id === endpointId);

    if (!permission) {
      res.status(404).json({ message: 'Endpoint definition not found' });
      return;
    }

    const userRoleNorm = normalizeRole(req.user.role);
    const allowedNorm = permission.allowedRoles.map(normalizeRole);

    const isAllowed = allowedNorm.includes(userRoleNorm);

    if (!isAllowed) {
      res.status(403).json({
        allowed: false,
        status: 403,
        userRole: req.user.role,
        endpoint: permission.endpoint,
        method: permission.method,
        message: `Forbidden: Role "${req.user.role}" is not authorized for endpoint "${permission.method} ${permission.endpoint}".`,
      });
      return;
    }

    res.status(200).json({
      allowed: true,
      status: 200,
      userRole: req.user.role,
      endpoint: permission.endpoint,
      method: permission.method,
      message: `Access Granted: Role "${req.user.role}" is fully authorized to execute "${permission.method} ${permission.endpoint}".`,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to test endpoint access', error: err.message });
  }
};
