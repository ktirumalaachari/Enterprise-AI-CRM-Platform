import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  RefreshCw,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import RbacPermissionConsole from '../components/admin/RbacPermissionConsole';

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
  company?: string;
  companyId?: string;
  jobTitle?: string;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

export const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'users' | 'rbac'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Selected User IDs for Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserRecord | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserRecord | null>(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'SuperAdmin' | 'Admin' | 'SalesManager' | 'SalesRep'>('SalesRep');
  const [isCreating, setIsCreating] = useState(false);

  // Reset Password State
  const [resetPasswordText, setResetPasswordText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = async (showFullLoading = false) => {
    if (showFullLoading || users.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await api.get('/users', {
        params: {
          role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
          search: searchQuery.trim() || undefined,
        },
      });
      setUsers(res.data.users || []);
    } catch (err: any) {
      error('Failed to fetch workspace users.');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant In-Memory Search Filtering (0ms Latency, Zero Flickering)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedRoleFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      success(`User account created successfully with role ${newRole}`);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('SalesRep');
      fetchUsers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create user account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, targetRole: string) => {
    try {
      await api.put(`/users/${userId}/role`, { role: targetRole });
      success(`User role updated to ${targetRole}`);
      // Update local state instead of refreshing entire table
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? { ...user, role: targetRole as any } : user
        )
      );
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleStatusToggle = async (userRec: UserRecord) => {
    try {
      await api.put(`/users/${userRec._id}/status`, { isVerified: !userRec.isVerified });
      success(`Account ${userRec.isVerified ? 'deactivated' : 'activated'} successfully`);
      // Update local state instead of refreshing entire table
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userRec._id ? { ...user, isVerified: !userRec.isVerified } : user
        )
      );
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setIsResetting(true);
    try {
      await api.post(`/users/${targetUser._id}/reset-password`, { newPassword: resetPasswordText });
      success(`Password reset successfully for ${targetUser.name}`);
      setIsResetModalOpen(false);
      setTargetUser(null);
      setResetPasswordText('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async (userRec: UserRecord) => {
    if (!window.confirm(`Are you sure you want to delete user ${userRec.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/users/${userRec._id}`);
      success('User account deleted');
      // Update local state instead of refreshing entire table
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userRec._id));
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleBulkAction = async (action: 'delete' | 'changeRole' | 'toggleStatus', targetRole?: string) => {
    if (selectedUserIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedUserIds.length} users?`)) {
      return;
    }
    try {
      await api.post('/users/bulk', { userIds: selectedUserIds, action, targetRole });
      success(`Bulk operation performed on ${selectedUserIds.length} users`);
      // Update local state instead of refreshing entire table
      if (action === 'delete') {
        setUsers(prevUsers => prevUsers.filter(user => !selectedUserIds.includes(user._id)));
      } else if (action === 'changeRole' && targetRole) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            selectedUserIds.includes(user._id) ? { ...user, role: targetRole as any } : user
          )
        );
      } else if (action === 'toggleStatus') {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            selectedUserIds.includes(user._id) ? { ...user, isVerified: !user.isVerified } : user
          )
        );
      }
      setSelectedUserIds([]);
    } catch (err: any) {
      error(err.response?.data?.message || 'Bulk operation failed');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'Admin':
      case 'COMPANY_OWNER':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'SalesManager':
      case 'SALES_MANAGER':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'Admin' || role === 'COMPANY_OWNER') return 'Company Owner';
    if (role === 'SalesManager' || role === 'SALES_MANAGER') return 'Sales Manager';
    if (role === 'SalesRep' || role === 'SALES_REPRESENTATIVE') return 'Sales Rep';
    if (role === 'SuperAdmin' || role === 'SUPER_ADMIN') return 'Super Admin';
    return role;
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-primary via-indigo-600 to-blue-700 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Shield className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-xl font-bold">User Management &amp; Enterprise RBAC</h1>
          </div>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Provision users, assign granular roles (SuperAdmin, Admin, SalesManager, SalesRep), manage security permissions, and reset user credentials.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(true)} className="bg-white text-brand-primary border-transparent hover:bg-slate-100 font-semibold shadow-xs">
          <UserPlus className="w-4 h-4 mr-2" />
          Provision New User
        </Button>
      </div>

      {/* Navigation Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Workspace Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rbac'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          RBAC Permission Console
        </button>
      </div>

      {activeTab === 'rbac' ? (
        <RbacPermissionConsole />
      ) : (
        <>
      {/* Filter & Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {[
              { key: 'ALL', label: 'ALL' },
              { key: 'SuperAdmin', label: 'SuperAdmin' },
              { key: 'Admin', label: 'Company Owner' },
              { key: 'SalesManager', label: 'Sales Manager' },
              { key: 'SalesRep', label: 'Sales Rep' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedRoleFilter(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedRoleFilter === r.key
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-primary focus:bg-white dark:focus:bg-zinc-800 transition-all"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Bulk Action Bar (if users selected and SuperAdmin) */}
      {selectedUserIds.length > 0 && currentUser?.role === 'SuperAdmin' && (
        <div className="bg-slate-900 dark:bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg text-xs">
          <span>{selectedUserIds.length} user(s) selected for bulk action</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Bulk Delete
            </Button>
            <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20" onClick={() => setSelectedUserIds([])}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* User Records Table */}
      <Card>
        <CardHeader className="flex items-center justify-between py-3">
          <h3 className="font-bold text-xs text-brand-textPrimary dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-primary" />
            Workspace Accounts ({users.length})
          </h3>
          <Button variant="outline" size="sm" onClick={() => fetchUsers(true)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </CardHeader>

        <CardBody className="p-0 overflow-x-auto w-full scrollbar-thin">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 italic flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
              Loading user registry...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 italic">No users found matching current filters.</div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#18181B] border-b border-brand-border dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold">
                  {currentUser?.role === 'SuperAdmin' && (
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.map((u) => u._id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                        checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                        className="rounded text-brand-primary"
                      />
                    </th>
                  )}
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {filteredUsers.map((u) => {
                  const avatarSrc =
                    u.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff&size=80`;

                  const isSuperAdminUser = u.role === 'SuperAdmin' || u.role === 'SUPER_ADMIN';
                  const isRequesterAdmin =
                    currentUser?.role === 'SuperAdmin' ||
                    currentUser?.role === 'SUPER_ADMIN' ||
                    currentUser?.role === 'Admin' ||
                    currentUser?.role === 'COMPANY_OWNER';

                  const canModifyUser =
                    isRequesterAdmin &&
                    (!isSuperAdminUser || currentUser?.role === 'SuperAdmin' || currentUser?.role === 'SUPER_ADMIN');

                  return (
                    <tr
                      key={u._id}
                      onClick={() => {
                        if (window.innerWidth < 768) setSelectedUserDetail(u);
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      {currentUser?.role === 'SuperAdmin' && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            disabled={isSuperAdminUser}
                            checked={selectedUserIds.includes(u._id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, u._id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== u._id));
                              }
                            }}
                            className="rounded text-brand-primary"
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={avatarSrc} alt={u.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 object-cover" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                            <p className="text-slate-400 dark:text-zinc-400 text-[11px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {canModifyUser && !isSuperAdminUser ? (
                          <select
                            value={u.role}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-[10px] font-bold border outline-none cursor-pointer ${getRoleBadgeStyle(
                              u.role
                            )}`}
                          >
                            {/* SuperAdmin cannot assign SuperAdmin role to others */}
                            {/* Only SuperAdmin can assign Admin role */}
                            {currentUser?.role === 'SuperAdmin' && <option value="Admin">Admin</option>}
                            <option value="SalesManager">SalesManager</option>
                            <option value="SalesRep">SalesRep</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          disabled={!canModifyUser || isSuperAdminUser}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusToggle(u);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            u.isVerified
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 hover:opacity-90'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 hover:opacity-90'
                          }`}
                        >
                          {u.isVerified ? <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                          <span>{u.isVerified ? 'Active' : 'Suspended'}</span>
                        </button>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-zinc-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canModifyUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetUser(u);
                                setIsResetModalOpen(true);
                              }}
                              title="Reset Password"
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-brand-primary transition-all cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          {canModifyUser && !isSuperAdminUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(u);
                              }}
                              title="Delete Account"
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg text-slate-400 dark:text-rose-400 hover:text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
      </>
      )}

      {/* Provision User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-brand-border dark:border-zinc-800 flex flex-col gap-4">
            <h3 className="font-bold text-base text-brand-textPrimary dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-primary" />
              Provision New Workspace Account
            </h3>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-3 text-xs">
              <Input label="Full Name" placeholder="e.g. Alex Mercer" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <Input label="Email Address" type="email" placeholder="alex@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              <Input label="Initial Password" type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-brand-textPrimary dark:text-zinc-300 select-none">Enterprise Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-lg outline-none text-brand-textPrimary dark:text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/40 transition-all appearance-none cursor-pointer"
                >
                  {/* SuperAdmin cannot create another SuperAdmin */}
                  {currentUser?.role === 'SuperAdmin' && <option value="Admin">Admin (Workspace Admin)</option>}
                  <option value="SalesManager">SalesManager (Team Lead)</option>
                  <option value="SalesRep">SalesRep (Sales Representative)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isCreating}>
                  Provision Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && targetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-brand-border dark:border-zinc-800 flex flex-col gap-4">
            <h3 className="font-bold text-base text-brand-textPrimary dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-brand-primary" />
              Reset Password for {targetUser.name}
            </h3>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3 text-xs">
              <Input label="New Password" type="password" placeholder="Enter new password" value={resetPasswordText} onChange={(e) => setResetPasswordText(e.target.value)} required />
              <div className="flex justify-end gap-2 mt-3">
                <Button type="button" variant="outline" onClick={() => setIsResetModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isResetting}>
                  Confirm Reset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile User Detail Popup Modal (Mobile Devices Only — Premium iOS Card Sheet) */}
      {selectedUserDetail && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[9999]">
          <div className="bg-white dark:bg-[#121212] rounded-3xl max-w-md w-full border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col animate-in slide-in-from-bottom-5 duration-200">
            {/* Top iOS Sheet Drag Pill Bar — Tap to Close Modal */}
            <button
              type="button"
              onClick={() => setSelectedUserDetail(null)}
              title="Tap to Close Modal"
              className="w-14 h-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-zinc-600 dark:hover:bg-zinc-500 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer transition-colors block"
            />

            {/* User Profile Header (Seamless Dark/White Theme - No Top Right X Button) */}
            <div className="px-4 sm:px-5 py-3 flex items-center gap-3.5 border-b border-slate-100 dark:border-zinc-800/80">
              <img
                src={
                  selectedUserDetail.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetail.name)}&background=09090b&color=fff&size=96`
                }
                alt={selectedUserDetail.name}
                className="w-12 h-12 rounded-full ring-2 ring-slate-100 dark:ring-zinc-800 object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight truncate">{selectedUserDetail.name}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{selectedUserDetail.email}</p>
              </div>
            </div>

            {/* Modal Body — Vertically Stacked Data Layout */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Status & Role Pill Cards */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-zinc-900/70 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Status</span>
                  <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border self-start ${
                    selectedUserDetail.isVerified
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                  }`}>
                    {selectedUserDetail.isVerified ? 'Active Verified' : 'Suspended'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Assigned Role</span>
                  <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-[11px] font-bold border self-start ${getRoleBadgeStyle(selectedUserDetail.role)}`}>
                    {getRoleLabel(selectedUserDetail.role)}
                  </span>
                </div>
              </div>

              {/* Data Properties — Vertically Stacked List */}
              <div className="space-y-3 bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60 flex flex-col">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">User ID</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 text-[11px] mt-0.5 break-all">{selectedUserDetail._id}</span>
                </div>

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Company ID</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100 text-[11px] mt-0.5 break-all">{selectedUserDetail.companyId || 'N/A'}</span>
                </div>

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Joined Date</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">
                    {new Date(selectedUserDetail.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Modal Footer Action Buttons */}
              {currentUser?.role === 'SuperAdmin' && selectedUserDetail.role !== 'SuperAdmin' && selectedUserDetail.role !== 'SUPER_ADMIN' && (
                <div className="pt-2 flex justify-end">
                  <Button variant="danger" size="sm" onClick={() => { handleDeleteUser(selectedUserDetail); setSelectedUserDetail(null); }} className="rounded-xl px-4 w-full sm:w-auto">
                    Delete Account
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
