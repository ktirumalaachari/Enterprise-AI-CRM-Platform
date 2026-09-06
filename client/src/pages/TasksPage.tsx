import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  X, 
  User, 
  Building2, 
  Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: { _id: string; name: string; email: string };
  customer?: { _id: string; name: string; company?: string };
  deal?: { _id: string; title: string; value: number };
}

export const TasksPage = () => {
  const { success, error } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [customer, setCustomer] = useState('');
  const [deal, setDeal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tasks', {
        params: {
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
          search: searchTerm || undefined,
        },
      });
      setTasks(res.data.tasks || []);
    } catch (err) {
      error('Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cRes, dRes, uRes] = await Promise.all([
        api.get('/customers'),
        api.get('/deals'),
        api.get('/users'),
      ]);
      setCustomers(cRes.data.customers || []);
      setDeals(dRes.data.deals || []);
      setUsers(uRes.data.users || []);
    } catch (err) {
      console.warn('Failed to fetch metadata for task form');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      error('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/tasks', {
        title,
        description,
        dueDate: dueDate || undefined,
        priority,
        assignedTo: assignedTo || undefined,
        customer: customer || undefined,
        deal: deal || undefined,
      });

      success('Task created successfully!');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      fetchTasks();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus as any } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      success(`Task marked as ${newStatus}.`);
    } catch (err) {
      error('Failed to update task status.');
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      success('Task deleted.');
    } catch (err) {
      error('Failed to delete task.');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'High':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">High Priority</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-textPrimary">Task Management Workspace</h1>
          <p className="text-xs text-brand-textSecondary mt-0.5">Assign, schedule, and track action items across leads & deals.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-sm outline-none w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-brand-border text-xs">
              {['All', 'Pending', 'In Progress', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    statusFilter === st ? 'bg-white text-brand-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-brand-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse flex items-center justify-between">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                </div>
              ))
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic flex flex-col items-center gap-2">
                <CheckSquare className="w-8 h-8 text-brand-primary/30" />
                <span>No tasks match your filters. Click "Create Task" above to add one!</span>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#121212] hover:bg-slate-50/80 dark:hover:bg-zinc-800/80 transition-colors border-b border-slate-100 dark:border-zinc-800 ${
                    task.status === 'Completed' ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={() => handleToggleTaskStatus(task._id, task.status)}
                      className="mt-1 w-4 h-4 rounded text-brand-primary border-slate-300 dark:border-zinc-700 focus:ring-brand-primary cursor-pointer"
                    />

                    <div className="flex flex-col gap-1 min-w-0 flex-1 sm:cursor-default cursor-pointer" onClick={() => { if (window.innerWidth < 768) setSelectedTask(task); }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-bold text-xs ${task.status === 'Completed' ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                        </h4>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-zinc-400 mt-1 flex-wrap font-medium">
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300 font-semibold">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.customer && (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {task.customer.company || task.customer.name}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-300">
                            <User className="w-3 h-3 text-slate-400" />
                            Assigned: {task.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      {/* Modal: Create Task */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden smooth-shadow border border-brand-border z-10"
            >
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-brand-textPrimary">Create New Task</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-brand-textSecondary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  <Input
                    label="Task Title"
                    placeholder="e.g. Prepare enterprise demo slides"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-brand-textPrimary select-none">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Add task notes or parameters..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-brand-border rounded-lg outline-none text-brand-textPrimary focus:border-brand-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Due Date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-brand-textPrimary select-none">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-brand-border rounded-lg outline-none text-brand-textPrimary focus:border-brand-primary"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-brand-textPrimary select-none">Related Customer</label>
                      <select
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-brand-border rounded-lg outline-none text-brand-textPrimary focus:border-brand-primary"
                      >
                        <option value="">Select customer...</option>
                        {customers.map((c) => (
                          <option key={c._id} value={c._id}>{c.name} ({c.company || 'N/A'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-brand-textPrimary select-none">Assign User</label>
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-brand-border rounded-lg outline-none text-brand-textPrimary focus:border-brand-primary"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u._id} value={u._id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-brand-border bg-slate-50/50 flex items-center justify-end gap-2.5">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>Create Task</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mobile-Only Task Detail Popup Container ────────────────────────── */}
      {selectedTask && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-3 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-5 duration-250">
            {/* Top Center Drag Pill Indicator Handle (Clickable Close Trigger) */}
            <div className="pt-3 pb-2 flex justify-center border-b border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                title="Close Modal"
                className="w-14 h-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600 rounded-full transition-colors cursor-pointer"
              />
            </div>

            {/* Header Title Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#121212]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedTask.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Task Detail Overview</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black border self-start ${
                  selectedTask.priority === 'High'
                    ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                    : selectedTask.priority === 'Medium'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                }`}>
                  {selectedTask.priority} Priority
                </span>
              </div>
            </div>

            {/* Modal Body — Vertically Stacked Data Layout */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Status & Due Date Cards */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-zinc-900/70 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border self-start ${
                    selectedTask.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Due Date</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs mt-1">
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'}
                  </span>
                </div>
              </div>

              {/* Data Properties — Vertically Stacked List */}
              <div className="space-y-3 bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60 flex flex-col">
                {selectedTask.description && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Description</span>
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 text-xs mt-0.5 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Assigned Representative</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
                </div>

                <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Associated Customer</span>
                  <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">{selectedTask.customer?.name || 'N/A'} {selectedTask.customer?.company ? `(${selectedTask.customer.company})` : ''}</span>
                </div>

                {selectedTask.deal && (
                  <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Linked Opportunity</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5">{selectedTask.deal.title} (${selectedTask.deal.value?.toLocaleString()})</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant={selectedTask.status === 'Completed' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => {
                    handleToggleTaskStatus(selectedTask._id, selectedTask.status);
                    setSelectedTask(null);
                  }}
                  className="rounded-xl px-4 flex-1 sm:flex-none"
                >
                  Mark {selectedTask.status === 'Completed' ? 'Pending' : 'Completed'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    handleDeleteTask(selectedTask._id);
                    setSelectedTask(null);
                  }}
                  className="rounded-xl px-4"
                >
                  Delete Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
