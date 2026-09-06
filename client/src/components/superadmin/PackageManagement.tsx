import React, { useState, useEffect } from 'react';
import {
  Package as PackageIcon,
  Plus,
  Edit2,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Archive,
  RefreshCw,
  Zap,
  Sliders,
  DollarSign,
  Users,
  Database,
  Layers,
} from 'lucide-react';
import api from '../../services/api';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface PackageItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  displayOrder: number;
  limits: {
    maxSalesManagers: number;
    maxSalesReps: number;
    maxTotalUsers: number;
    maxLeads: number;
    maxCustomers: number;
    maxDeals: number;
    aiQueryLimit: number;
    storageLimitMb?: number;
  };
  aiFeatures: {
    emailGenerator: boolean;
    followupGenerator: boolean;
    meetingSummary: boolean;
    copilotChat: boolean;
    leadAnalysis: boolean;
    salesAssistance: boolean;
  };
  createdAt: string;
}

export const PackageManagement = () => {
  const { success, error } = useToast();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'INR',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    displayOrder: 0,
    limits: {
      maxSalesManagers: 5,
      maxSalesReps: 20,
      maxTotalUsers: 25,
      maxLeads: 5000,
      maxCustomers: 1000,
      maxDeals: 1000,
      aiQueryLimit: 1000,
      storageLimitMb: 5000,
    },
    aiFeatures: {
      emailGenerator: true,
      followupGenerator: true,
      meetingSummary: false,
      copilotChat: false,
      leadAnalysis: false,
      salesAssistance: false,
    },
  });

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/packages/admin');
      setPackages(res.data.packages || []);
    } catch (err: any) {
      error('Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      monthlyPrice: 1999,
      yearlyPrice: 19990,
      currency: 'INR',
      status: 'ACTIVE',
      displayOrder: packages.length + 1,
      limits: {
        maxSalesManagers: 5,
        maxSalesReps: 20,
        maxTotalUsers: 25,
        maxLeads: 5000,
        maxCustomers: 1000,
        maxDeals: 1000,
        aiQueryLimit: 1000,
        storageLimitMb: 5000,
      },
      aiFeatures: {
        emailGenerator: true,
        followupGenerator: true,
        meetingSummary: true,
        copilotChat: false,
        leadAnalysis: false,
        salesAssistance: false,
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      monthlyPrice: pkg.monthlyPrice,
      yearlyPrice: pkg.yearlyPrice,
      currency: pkg.currency || 'INR',
      status: pkg.status,
      displayOrder: pkg.displayOrder || 0,
      limits: {
        maxSalesManagers: pkg.limits.maxSalesManagers || 5,
        maxSalesReps: pkg.limits.maxSalesReps || 20,
        maxTotalUsers: pkg.limits.maxTotalUsers || 25,
        maxLeads: pkg.limits.maxLeads || 5000,
        maxCustomers: pkg.limits.maxCustomers || 1000,
        maxDeals: pkg.limits.maxDeals || 1000,
        aiQueryLimit: pkg.limits.aiQueryLimit || 1000,
        storageLimitMb: pkg.limits.storageLimitMb || 5000,
      },
      aiFeatures: { ...pkg.aiFeatures },
    });
    setIsModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingPackage) {
        await api.put(`/packages/${editingPackage._id}`, formData);
        success(`Package '${formData.name}' updated successfully!`);
      } else {
        await api.post('/packages', formData);
        success(`Package '${formData.name}' created successfully!`);
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to save package.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/packages/${id}/status`, { status: newStatus });
      success(`Package status set to ${newStatus}`);
      fetchPackages();
    } catch (err: any) {
      error('Failed to change package status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-blue-600" />
            Subscription Packages &amp; AI Entitlement Control
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic plans, monthly/yearly pricing, employee quotas, and AI feature toggles.
          </p>
        </div>

        <Button onClick={handleOpenCreateModal} variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-1.5" />
          Create New Package
        </Button>
      </div>

      {/* Package Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          Loading packages...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <Card
              key={pkg._id}
              className={`bg-white dark:bg-[#121212] border transition-all shadow-xs relative overflow-hidden flex flex-col justify-between ${
                pkg.status === 'ACTIVE'
                  ? 'border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500'
                  : pkg.status === 'INACTIVE'
                  ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20'
                  : 'border-slate-300 dark:border-zinc-800 opacity-60'
              }`}
            >
              <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      pkg.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 dark:border dark:border-emerald-800'
                        : pkg.status === 'INACTIVE'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 dark:border dark:border-amber-800'
                        : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {pkg.status}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">Order: #{pkg.displayOrder}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{pkg.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      ₹{pkg.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">/ Month</span>
                  </div>
                  {pkg.yearlyPrice > 0 && (
                    <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                      ₹{pkg.yearlyPrice.toLocaleString()} / Year (Annual Billing)
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardBody className="p-5 text-xs space-y-3 flex-1">
                <div className="space-y-2 font-medium text-slate-700 dark:text-zinc-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">Max Total Users:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{pkg.limits?.maxTotalUsers}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">Sales Mgr / Rep:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {pkg.limits?.maxSalesManagers} / {pkg.limits?.maxSalesReps}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">Max Leads:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{pkg.limits?.maxLeads?.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-zinc-400">AI Query Quota:</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{pkg.limits?.aiQueryLimit?.toLocaleString()} credits</strong>
                  </div>
                </div>

                {/* AI Entitlements List */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                    AI Feature Entitlements:
                  </span>
                  {Object.entries(pkg.aiFeatures || {}).map(([feat, enabled]) => (
                    <div key={feat} className="flex items-center justify-between text-[11px]">
                      <span className="capitalize text-slate-600 dark:text-zinc-300">{feat.replace(/([A-Z])/g, ' $1')}</span>
                      {enabled ? (
                        <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-slate-300 dark:text-zinc-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>

              <div className="p-4 bg-slate-50 dark:bg-[#18181B] border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(pkg)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>

                <div className="flex items-center gap-1">
                  {pkg.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(pkg._id, 'INACTIVE')}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-400 text-[11px] font-bold rounded cursor-pointer"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(pkg._id, 'ACTIVE')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-400 text-[11px] font-bold rounded cursor-pointer"
                    >
                      Activate
                    </button>
                  )}

                  {pkg.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(pkg._id, 'ARCHIVED')}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Archive Package"
                    >
                      <Archive size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-slate-900 dark:bg-zinc-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-zinc-800">
              <h3 className="text-lg font-bold">
                {editingPackage ? `Edit Package: ${editingPackage.name}` : 'Create New Package'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      }))
                    }
                    placeholder="e.g. Starter Plan"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief overview of package benefits"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, monthlyPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.yearlyPrice}
                    onChange={(e) => setFormData((p) => ({ ...p, yearlyPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <hr className="border-slate-100 dark:border-zinc-800" />

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">Resource &amp; User Quotas</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Max Managers</label>
                    <input
                      type="number"
                      value={formData.limits.maxSalesManagers}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxSalesManagers: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Max Sales Reps</label>
                    <input
                      type="number"
                      value={formData.limits.maxSalesReps}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxSalesReps: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Total Users</label>
                    <input
                      type="number"
                      value={formData.limits.maxTotalUsers}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxTotalUsers: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Max Leads</label>
                    <input
                      type="number"
                      value={formData.limits.maxLeads}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxLeads: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Max Customers</label>
                    <input
                      type="number"
                      value={formData.limits.maxCustomers}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxCustomers: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">Max Deals</label>
                    <input
                      type="number"
                      value={formData.limits.maxDeals}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, maxDeals: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">AI Credits / Mo</label>
                    <input
                      type="number"
                      value={formData.limits.aiQueryLimit}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          limits: { ...p.limits, aiQueryLimit: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-bold rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-zinc-800" />

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">AI Feature Toggles</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(formData.aiFeatures).map(([feat, enabled]) => (
                    <label
                      key={feat}
                      className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            aiFeatures: { ...p.aiFeatures, [feat]: e.target.checked },
                          }))
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800 dark:text-zinc-200 capitalize">
                        {feat.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSaving}>
                  Save Package Config
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageManagement;
