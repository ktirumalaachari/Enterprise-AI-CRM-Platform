import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Filter, 
  ChevronRight, 
  MessageSquare, 
  Tag, 
  User, 
  Building2, 
  Mail, 
  Phone,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

interface CustomerSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  value: number;
  assignedTo?: { id: string; name: string; role: string; avatar?: string };
  tags: string[];
  notes: { content: string; createdBy: { name: string; avatar?: string }; createdAt: string }[];
}

export const Leads = () => {
  const { success, error, info } = useToast();
  const { user: currentUser } = useAuthStore();

  const [leads, setLeads] = useState<CustomerSession[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignmentFilter, setAssignmentFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CustomerSession | null>(null);

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<any>('Lead');
  const [newLeadValue, setNewLeadValue] = useState('0');
  const [newLeadAssigned, setNewLeadAssigned] = useState('');
  const [newLeadTags, setNewLeadTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notes state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // CSV import state
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/customers', {
        params: {
          search: searchTerm || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          assignedTo: assignmentFilter !== 'All' ? assignmentFilter : undefined,
        }
      });
      // Map API customers format to client
      const mapped = response.data.customers.map((c: any) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        status: c.status,
        value: c.value,
        assignedTo: c.assignedTo ? { id: c.assignedTo._id, name: c.assignedTo.name, role: c.assignedTo.role, avatar: c.assignedTo.avatar } : undefined,
        tags: c.tags,
        notes: c.notes.map((n: any) => ({
          content: n.content,
          createdBy: { name: n.createdBy?.name || 'Workspace User', avatar: n.createdBy?.avatar },
          createdAt: n.createdAt,
        }))
      }));
      setLeads(mapped);
    } catch (err: any) {
      error('Failed to load leads list.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/users');
      setTeamMembers(response.data.users);
    } catch (err) {
      console.warn('Failed to load users catalog.');
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, statusFilter, assignmentFilter]);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadEmail) {
      error('Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/customers', {
        name: newLeadName,
        email: newLeadEmail,
        phone: newLeadPhone,
        company: newLeadCompany,
        status: newLeadStatus,
        value: parseFloat(newLeadValue) || 0,
        assignedTo: newLeadAssigned || undefined,
        tags: newLeadTags ? newLeadTags.split(',').map(t => t.trim()) : [],
      });
      success('Lead created successfully.');
      setIsAddModalOpen(false);
      
      // Reset Form
      setNewLeadName('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadCompany('');
      setNewLeadStatus('Lead');
      setNewLeadValue('0');
      setNewLeadAssigned('');
      setNewLeadTags('');

      fetchLeads();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteContent.trim()) return;

    setIsSubmittingNote(true);
    try {
      const response = await api.post(`/customers/${selectedLead.id}/notes`, {
        content: newNoteContent,
      });

      // Update active selected note lists
      const mappedNotes = response.data.notes.map((n: any) => ({
        content: n.content,
        createdBy: { name: n.createdBy?.name || 'Workspace User', avatar: n.createdBy?.avatar },
        createdAt: n.createdAt,
      }));

      setSelectedLead({
        ...selectedLead,
        notes: mappedNotes
      });

      // Update leads list in place
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, notes: mappedNotes } : l));

      setNewNoteContent('');
      success('Note appended successfully.');
    } catch (err: any) {
      error('Failed to append note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action is logged.')) return;

    try {
      await api.delete(`/customers/${leadId}`);
      success('Lead deleted successfully.');
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
      setLeads(leads.filter(l => l.id !== leadId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unauthorized. Deletion restricted.';
      error(msg);
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    if (leads.length === 0) {
      info('No leads available to export.');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Value', 'Tags', 'AssignedTo'];
    const rows = leads.map(l => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.email}"`,
      `"${l.phone || ''}"`,
      `"${(l.company || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      l.value,
      `"${l.tags.join(',')}"`,
      `"${l.assignedTo?.name || 'Unassigned'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV downloaded successfully.');
  };

  // CSV Import Utility
  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      error('Please paste CSV lines first.');
      return;
    }

    setIsImporting(true);
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        error('Invalid CSV format. Header + Data required.');
        return;
      }

      // Simple CSV parser
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const parsedCustomers: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (columns.length < 2) continue; // Skip malformed rows
        
        const customerObj: any = {};
        headers.forEach((header, idx) => {
          customerObj[header] = columns[idx] || '';
        });
        parsedCustomers.push(customerObj);
      }

      await api.post('/customers/import', { customers: parsedCustomers });
      success(`Imported ${parsedCustomers.length} leads successfully.`);
      setIsImportModalOpen(false);
      setCsvText('');
      fetchLeads();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to parse/import CSV records.');
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusColor = (status: CustomerSession['status']) => {
    const map = {
      Lead: 'bg-blue-50 text-blue-700 border-blue-100',
      Contacted: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      Proposal: 'bg-amber-50 text-amber-700 border-amber-100',
      Negotiation: 'bg-purple-50 text-purple-700 border-purple-100',
      Won: 'bg-green-50 text-green-700 border-green-100',
      Lost: 'bg-red-50 text-red-700 border-red-100',
    };
    return map[status] || 'bg-slate-50 text-slate-700';
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Page Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-textPrimary">CRM Pipeline Workspace</h1>
          <p className="text-xs text-brand-textSecondary mt-0.5">Manage deals stages, update contact lists, and import records.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2 text-brand-primary" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2 text-brand-primary" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary" />
            <input 
              type="text" 
              placeholder="Search by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/30 w-full transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Status Filters */}
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <span className="text-brand-textSecondary dark:text-zinc-400 font-semibold flex items-center gap-1.5 shrink-0"><Filter className="w-3.5 h-3.5" /> Pipeline:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-brand-bg dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-xl outline-none cursor-pointer text-brand-textPrimary dark:text-white text-xs w-full sm:w-auto"
              >
                <option value="All">All Stages</option>
                <option value="Lead">Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Closed Won</option>
                <option value="Lost">Closed Lost</option>
              </select>
            </div>

            {/* Sales Rep filters */}
            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <span className="text-brand-textSecondary dark:text-zinc-400 font-semibold shrink-0">Rep:</span>
              <select 
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="px-3 py-2 bg-brand-bg dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-xl outline-none cursor-pointer text-brand-textPrimary dark:text-white text-xs w-full sm:w-auto"
              >
                <option value="All">All Reps</option>
                {teamMembers.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* CRM Leads grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-brand-border text-xs font-semibold text-brand-textSecondary uppercase tracking-wider">
                <th className="px-6 py-4">Client Detail</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Deal Value</th>
                <th className="px-6 py-4">Assigned Sales Manager</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-sm">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-10 bg-slate-200 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-brand-textSecondary italic">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
                      <AlertCircle className="w-10 h-10 text-brand-primary/40" />
                      <p className="text-sm font-semibold">No CRM targets found</p>
                      <p className="text-xs">Adjust filter settings or try importing test items.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-brand-textPrimary group-hover:text-brand-primary transition-colors">{lead.name}</span>
                        <span className="text-xs text-brand-textSecondary">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-brand-textPrimary">{lead.company || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 border text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand-textPrimary">
                      ${lead.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-brand-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-brand-primary border border-brand-primary/10 uppercase">
                          {lead.assignedTo?.name.substring(0, 2) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-none">{lead.assignedTo?.name || 'Unassigned'}</span>
                          <span className="text-[10px] text-brand-textSecondary">{lead.assignedTo?.role || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length === 0 && <span className="text-slate-400 text-xs italic">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          className="p-1 text-brand-textSecondary hover:text-brand-primary hover:bg-slate-100 rounded transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin' || currentUser?.role === 'SalesManager') && (
                          <button 
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Add Lead */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden smooth-shadow border border-brand-border z-10"
            >
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-brand-textPrimary">Create Pipeline Lead</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateLead}>
                <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input 
                      label="Contact Name" 
                      placeholder="e.g. Alice Smith" 
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      required 
                    />
                    <Input 
                      label="Email Address" 
                      type="email" 
                      placeholder="e.g. alice@acme.com" 
                      value={newLeadEmail}
                      onChange={(e) => setNewLeadEmail(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input 
                      label="Phone" 
                      placeholder="+1 (555) 0199" 
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                    />
                    <Input 
                      label="Company" 
                      placeholder="e.g. Acme Corp" 
                      value={newLeadCompany}
                      onChange={(e) => setNewLeadCompany(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-brand-textPrimary select-none">Deal Stage</label>
                      <select 
                        value={newLeadStatus}
                        onChange={(e) => setNewLeadStatus(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-brand-border rounded-lg outline-none transition-all duration-200 text-brand-textPrimary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Closed Won</option>
                        <option value="Lost">Closed Lost</option>
                      </select>
                    </div>

                    <Input 
                      label="Deal Value ($)" 
                      type="number" 
                      placeholder="15000" 
                      value={newLeadValue}
                      onChange={(e) => setNewLeadValue(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-brand-textPrimary select-none">Assign Sales Manager</label>
                      <select 
                        value={newLeadAssigned}
                        onChange={(e) => setNewLeadAssigned(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-brand-border rounded-lg outline-none transition-all duration-200 text-brand-textPrimary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <Input 
                      label="Tags (comma separated)" 
                      placeholder="Warm, Enterprise, SaaS" 
                      value={newLeadTags}
                      onChange={(e) => setNewLeadTags(e.target.value)}
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-brand-border bg-slate-50/50 flex items-center justify-end gap-2.5">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>Confirm</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Import CSV */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden smooth-shadow border border-brand-border z-10"
            >
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-brand-textPrimary">CSV Bulk Import Leads</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-brand-textSecondary hover:text-brand-textPrimary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-brand-textSecondary flex flex-col gap-1">
                  <strong>Expected Header Layout:</strong>
                  <code>Name,Email,Company,Value,Status,Phone,Tags</code>
                  <span className="mt-1">Paste CSV content below. (Comma separated rows, quotation marks optional).</span>
                </div>

                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Name,Email,Company,Value,Status\nJohn Smith,john@google.com,Google,85000,Proposal\nSara Carter,sara@netflix.com,Netflix,120000,Won`}
                  rows={8}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-lg outline-none font-mono focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="px-6 py-4 border-t border-brand-border bg-slate-50/50 flex items-center justify-end gap-2.5">
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleImportCSV} isLoading={isImporting}>Import Records</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drawer / Detail Modal: Lead Details */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-xl h-full border-l border-brand-border flex flex-col shadow-2xl relative z-10"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Client File details</span>
                  <h3 className="font-bold text-lg text-brand-textPrimary">{selectedLead.name}</h3>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-brand-textSecondary hover:text-brand-textPrimary p-1 bg-white border border-brand-border rounded-full smooth-shadow">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {/* Details Summary grid */}
                <div className="grid grid-cols-2 gap-4 border-b border-brand-border pb-5 text-sm">
                  <div className="flex items-center gap-2.5 text-brand-textSecondary">
                    <Mail className="w-4 h-4 text-brand-primary" />
                    <span className="truncate">{selectedLead.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-brand-textSecondary">
                    <Phone className="w-4 h-4 text-brand-primary" />
                    <span>{selectedLead.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-brand-textSecondary">
                    <Building2 className="w-4 h-4 text-brand-primary" />
                    <span>{selectedLead.company || 'No company'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-brand-textSecondary">
                    <DollarSign className="w-4 h-4 text-brand-primary" />
                    <span className="font-bold text-brand-textPrimary">${selectedLead.value.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status selector update */}
                <div className="flex items-center justify-between bg-slate-50 border border-brand-border p-3.5 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-brand-textPrimary">Adjust Pipeline Stage</span>
                    <span className="text-[10px] text-brand-textSecondary">Update Deal stage in database</span>
                  </div>
                  <select
                    value={selectedLead.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await api.put(`/customers/${selectedLead.id}`, { status: newStatus });
                        setSelectedLead({ ...selectedLead, status: newStatus as any });
                        setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, status: newStatus as any } : l));
                        success('Status updated successfully.');
                      } catch (err) {
                        error('Failed to update stage.');
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-brand-border rounded-lg outline-none cursor-pointer text-xs font-semibold text-brand-textPrimary"
                  >
                    <option value="Lead">Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Closed Won</option>
                    <option value="Lost">Closed Lost</option>
                  </select>
                </div>

                {/* Notes History */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-brand-textPrimary flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand-primary" /> Notes Log</span>
                  
                  {/* Append Note form */}
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <textarea
                      placeholder="Add an update about this lead..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={2}
                      className="flex-1 px-3 py-2 text-xs border border-brand-border rounded-lg outline-none focus:border-brand-primary"
                      required
                    />
                    <Button type="submit" variant="primary" className="h-auto self-stretch" isLoading={isSubmittingNote}>Add</Button>
                  </form>

                  {/* List Notes */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    {selectedLead.notes.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 rounded-lg text-xs italic text-brand-textSecondary">
                        No activity updates logged for this contact.
                      </div>
                    ) : (
                      selectedLead.notes.slice().reverse().map((note, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-col gap-1 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-brand-textSecondary">
                            <span className="font-bold flex items-center gap-1"><User className="w-3 h-3" /> {note.createdBy.name}</span>
                            <span>{new Date(note.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <p className="text-slate-700 leading-normal">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tags Section */}
                <div className="flex flex-col gap-2 border-t border-brand-border pt-5">
                  <span className="text-xs font-bold text-brand-textPrimary flex items-center gap-2"><Tag className="w-4 h-4 text-brand-primary" /> Lead Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {tag}
                      </span>
                    ))}
                    {selectedLead.tags.length === 0 && <span className="text-xs text-brand-textSecondary italic">No tags associated.</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leads;
