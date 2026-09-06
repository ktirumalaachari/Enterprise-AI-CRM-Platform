import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Video, 
  Phone, 
  Users, 
  MapPin, 
  Trash2, 
  X, 
  Building2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: 'Meeting' | 'Call' | 'Demo' | 'Follow-up';
  customer?: { _id: string; name: string; company?: string; email: string };
  deal?: { _id: string; title: string; value: number };
  location?: string;
  createdBy?: { _id: string; name: string };
}

export const CalendarPage = () => {
  const { success, error } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Appointment Detail Popup Modal State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Meeting' | 'Call' | 'Demo' | 'Follow-up'>('Meeting');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [customer, setCustomer] = useState('');
  const [deal, setDeal] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/calendar');
      setEvents(res.data.events || []);
    } catch (err) {
      error('Failed to load calendar events.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        api.get('/customers'),
        api.get('/deals'),
      ]);
      setCustomers(cRes.data.customers || []);
      setDeals(dRes.data.deals || []);
    } catch (err) {
      console.warn('Failed to load metadata');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMetadata();
  }, []);

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      error('Title, start time, and end time are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/calendar', {
        title,
        type,
        startTime,
        endTime,
        customer: customer || undefined,
        deal: deal || undefined,
        location: location || undefined,
      });

      success('Meeting scheduled successfully!');
      setIsModalOpen(false);
      setTitle('');
      setStartTime('');
      setEndTime('');
      fetchEvents();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to schedule event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Cancel this event?')) return;
    try {
      await api.delete(`/calendar/${eventId}`);
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
      success('Event cancelled.');
    } catch (err) {
      error('Failed to delete event.');
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'Call':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800">Call</span>;
      case 'Demo':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">Product Demo</span>;
      case 'Follow-up':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800">Follow-up</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">Meeting</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-brand-textPrimary dark:text-white">Sales Calendar &amp; Schedule</h1>
          <p className="text-xs text-brand-textSecondary dark:text-zinc-400 mt-0.5">Manage meetings, client calls, and product demonstrations.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>

      {/* Main Agenda List View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-brand-primary dark:text-blue-400" />
              <h3 className="font-bold text-xs text-brand-textPrimary dark:text-white">Upcoming Sales Appointments</h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-brand-border dark:divide-zinc-800">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse h-20 bg-slate-50 dark:bg-zinc-800/40" />
                ))
              ) : events.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 dark:text-zinc-500 italic flex flex-col items-center gap-2">
                  <CalendarIcon className="w-8 h-8 text-brand-primary/30 dark:text-blue-400/30" />
                  <span>No upcoming appointments. Click "Schedule Meeting" to create one!</span>
                </div>
              ) : (
                events.map((evt) => (
                  <div key={evt._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors sm:cursor-default cursor-pointer" onClick={() => { if (window.innerWidth < 768) setSelectedEvent(evt); }}>
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-brand-primary/10 text-brand-primary dark:bg-blue-950/60 dark:text-blue-400 rounded-xl flex flex-col items-center justify-center min-w-[54px] border border-brand-primary/20 dark:border-blue-800">
                        <span className="text-[10px] font-bold uppercase">{new Date(evt.startTime).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-base font-extrabold">{new Date(evt.startTime).getDate()}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-brand-textPrimary dark:text-white">{evt.title}</h4>
                          {getTypeBadge(evt.type)}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand-primary dark:text-blue-400" />
                            {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {evt.customer && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {evt.customer.company || evt.customer.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(evt._id); }}
                      className="p-1 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors self-end sm:self-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* Quick Info Sidebar */}
        <Card className="h-fit bg-white dark:bg-[#121212] border-slate-200 dark:border-zinc-800">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-800">
            <h3 className="font-bold text-xs text-brand-textPrimary dark:text-white">Meeting Tips</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 text-xs text-slate-600 dark:text-zinc-300">
            <div className="p-3.5 bg-blue-50/60 dark:bg-[#18181B] border border-blue-100 dark:border-zinc-800 rounded-xl flex items-start gap-2.5">
              <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">Link your Google Meet or Zoom URLs in the location field for instant 1-click team access.</span>
            </div>
            <div className="p-3.5 bg-amber-50/60 dark:bg-[#18181B] border border-amber-100 dark:border-zinc-800 rounded-xl flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">Use the AI Meeting Summarizer in the AI Assistant hub after every call to extract action items automatically!</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal: Schedule Event */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#121212] rounded-2xl max-w-lg w-full overflow-hidden smooth-shadow border border-brand-border dark:border-zinc-800 z-10"
            >
              <div className="px-6 py-4 border-b border-brand-border dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900">
                <h3 className="font-bold text-brand-textPrimary dark:text-white">Schedule Sales Event</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-brand-textSecondary dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleEvent}>
                <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  <Input
                    label="Meeting Title"
                    placeholder="e.g. Product Demo & Technical Review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-brand-textPrimary dark:text-zinc-300 select-none">Appointment Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-lg outline-none text-brand-textPrimary dark:text-white focus:border-brand-primary cursor-pointer"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Call">Call</option>
                      <option value="Demo">Product Demo</option>
                      <option value="Follow-up">Follow-up</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Start Date & Time"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                    <Input
                      label="End Date & Time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-brand-textPrimary dark:text-zinc-300 select-none">Related Customer</label>
                    <select
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-brand-border dark:border-zinc-700 rounded-lg outline-none text-brand-textPrimary dark:text-white focus:border-brand-primary cursor-pointer"
                    >
                      <option value="">Select customer...</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>{c.name} ({c.company || 'N/A'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-brand-border dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 flex items-center justify-end gap-2.5">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>Schedule Meeting</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Appointment Detail Popup Container (Mobile Bottom Sheet Modal) ────────────────────────── */}
      {selectedEvent && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-3 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-5 duration-250">
            {/* Top Center Drag Pill Indicator Handle (Clickable Close Trigger) */}
            <div className="pt-3 pb-2 flex justify-center border-b border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                title="Close Modal"
                className="w-14 h-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600 rounded-full transition-colors cursor-pointer"
              />
            </div>

            {/* Header Title Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-[#121212]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Sales Appointment Schedule</p>
                </div>
                {getTypeBadge(selectedEvent.type)}
              </div>
            </div>

            {/* Modal Body — Vertically Stacked Data Layout */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* Date & Time Range Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-900/70 rounded-2xl border border-slate-100 dark:border-zinc-800/80 flex flex-col">
                <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Scheduled Date &amp; Time</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xs sm:text-sm mt-1">
                  {new Date(selectedEvent.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xs mt-0.5">
                  {new Date(selectedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Data Properties — Vertically Stacked List */}
              <div className="space-y-3 bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60 flex flex-col">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Associated Customer</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">{selectedEvent.customer?.name || 'N/A'} {selectedEvent.customer?.company ? `(${selectedEvent.customer.company})` : ''}</span>
                </div>

                {selectedEvent.location && (
                  <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Location / Meeting URL</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5 break-all">{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.deal && (
                  <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Linked Opportunity</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5">{selectedEvent.deal.title} (${selectedEvent.deal.value?.toLocaleString()})</span>
                  </div>
                )}

                {selectedEvent.createdBy && (
                  <div className="flex flex-col pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Scheduled By</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs mt-0.5">{selectedEvent.createdBy.name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    handleDeleteEvent(selectedEvent._id);
                    setSelectedEvent(null);
                  }}
                  className="rounded-xl px-4 w-full sm:w-auto"
                >
                  Cancel Appointment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
