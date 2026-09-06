import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import useAuthStore, { CompanyMembership } from '../store/authStore';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Card, CardHeader, CardBody } from '../components/ui/Card';

export const SelectCompany = () => {
  const { user, companies, login, clearCompanySelection } = useAuthStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();

  const handleSelect = async (company: CompanyMembership) => {
    setSelectedCompanyId(company.id);
    setIsLoading(true);
    try {
      const res = await api.post('/auth/select-company', { companyId: company.id });
      const { accessToken, user: updatedUser } = res.data;

      login(accessToken, updatedUser);
      clearCompanySelection();
      success(`Switched to ${company.companyName}`);

      if (updatedUser.role === 'SUPER_ADMIN' || updatedUser.role === 'SuperAdmin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to select company.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="premium-shadow overflow-hidden border border-slate-200 bg-white/95 backdrop-blur-xl">
          <CardHeader className="bg-slate-50 p-6 border-b border-slate-100 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <Building2 size={24} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Select Company Workspace</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Welcome back, <strong className="text-slate-800">{user?.name || user?.email}</strong>. Choose which company workspace you would like to access:
            </p>
          </CardHeader>

          <CardBody className="p-6 space-y-3">
            {companies && companies.length > 0 ? (
              companies.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSelect(comp)}
                  className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-center justify-between group cursor-pointer text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {comp.companyName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                        {comp.companyName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{comp.role}</span>
                        <span>•</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                            comp.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {comp.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                    {isLoading && selectedCompanyId === comp.id ? (
                      <Loader2 size={18} className="animate-spin text-blue-600" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No company memberships found.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default SelectCompany;
