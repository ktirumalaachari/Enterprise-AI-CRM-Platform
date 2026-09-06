import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  Mail,
  FileText,
  Send,
  Copy,
  Check,
  MessageSquare,
  Zap,
  ChevronRight,
  Brain,
  TrendingUp,
  Shield,
  Lock,
  ArrowRight,
  Paperclip,
  X,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import useAuthStore from '../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Tab = 'copilot' | 'email' | 'summarizer';
type Msg = { role: 'user' | 'assistant'; content: string };

/* ─── Quick‑prompt chips (6 Small Content Boxes - Fully Responsive) ─────────*/
const QUICK_PROMPTS = [
  { icon: '💡', label: 'Price Objections', text: 'How should I handle price objections during contract negotiation?' },
  { icon: '📋', label: 'BANT Checklist',   text: 'Give me a BANT lead qualification framework checklist for tech sales.' },
  { icon: '🚀', label: 'Close Strategy',   text: 'What are the top 3 closing techniques for enterprise B2B deals?' },
  { icon: '🎯', label: 'Cold Pitch',       text: 'Draft a 30-second cold call pitch for an AI CRM solution.' },
  { icon: '📊', label: 'Pipeline Review',  text: 'How can I accelerate slow-moving deals in my Q3 pipeline?' },
  { icon: '🤝', label: 'Follow-up Cadence', text: 'What is the best email follow-up cadence for uncommunicative leads?' },
];

/* ─── Tab metadata ────────────────────────────────────────────────────────*/
const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'copilot',    label: 'Copilot Chat', icon: MessageSquare, desc: 'Real-time sales strategy' },
  { id: 'email',      label: 'Email Writer',  icon: Mail,          desc: 'AI-crafted outreach'     },
  { id: 'summarizer', label: 'Summarizer',    icon: FileText,      desc: 'Meeting intel extraction' },
];

/* ════════════════════════════════════════════════════════════════════════ */
export const AiAssistant = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('copilot');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
  const isExpired = !isSuperAdmin && (user?.subscription?.status === 'expired' || user?.subscription?.aiAccess === false);

  const DEFAULT_INITIAL_MSG: Msg = {
    role: 'assistant',
    content: 'Hello! I am your AI Sales Copilot powered by Groq LLaMA-3. How can I help you qualify leads, handle objections, or close deals today?',
  };

  const STORAGE_KEY = `ai_copilot_chat_history_${user?.id || 'guest'}`;

  /* Copilot Persistent Chat History */
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_INITIAL_MSG];
  });

  // Sync chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages, STORAGE_KEY]);

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setMessages([DEFAULT_INITIAL_MSG]);
    success('Chat history cleared. Started a new AI conversation!');
  };

  const [inputPrompt, setInputPrompt]     = useState('');
  const [isCopilotLoading, setCopilotLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* File Attachment State */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content?: string; size: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1) + ' KB';
    const reader = new FileReader();

    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    ) {
      reader.onload = (evt) => {
        setAttachedFile({
          name: file.name,
          content: evt.target?.result as string,
          size: sizeKb,
        });
        success(`Attached ${file.name}`);
      };
      reader.readAsText(file);
    } else {
      setAttachedFile({
        name: file.name,
        size: sizeKb,
      });
      success(`Attached ${file.name}`);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCopilotLoading]);

  /* Email */
  const [recipientName,      setRecipientName]      = useState('John Doe');
  const [companyName,        setCompanyName]        = useState('Acme Corp');
  const [dealValue,          setDealValue]          = useState('50000');
  const [emailType,          setEmailType]          = useState<'Cold Outreach'|'Follow-up'|'Proposal Intro'|'Objection Handler'>('Follow-up');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedEmail,     setGeneratedEmail]     = useState('');
  const [isEmailLoading,     setEmailLoading]       = useState(false);
  const [isCopied,           setIsCopied]           = useState(false);

  /* Summarizer */
  const [rawNotes,        setRawNotes]       = useState('');
  const [summarizedOutput,setSummarizedOutput] = useState('');
  const [isSummaryLoading,setSummaryLoading]  = useState(false);

  /* ── Handlers ───────────────────────────────────────────────────────── */
  const handleSendCopilot = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const baseText = customText || inputPrompt;
    if (!baseText.trim() && !attachedFile) return;

    let promptToSend = baseText;
    let displayUserMessage = baseText;

    if (attachedFile) {
      displayUserMessage = baseText
        ? `${baseText}\n\n📎 [Attachment: ${attachedFile.name}]`
        : `📎 [Attachment: ${attachedFile.name}]`;
      promptToSend = `${baseText}\n\n[Attached File: ${attachedFile.name}${attachedFile.content ? `\nFile Content:\n${attachedFile.content}` : ''}]`;
    }

    setMessages(p => [...p, { role: 'user', content: displayUserMessage }]);
    if (!customText) setInputPrompt('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setCopilotLoading(true);
    try {
      const res = await api.post('/ai/copilot-chat', { prompt: promptToSend, history: messages.slice(-4) });
      setMessages(p => [...p, { role: 'assistant', content: res.data.reply }]);
    } catch {
      error('Copilot request failed.');
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an issue reaching the Groq AI model.' }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const res = await api.post('/ai/generate-email', {
        recipientName, company: companyName,
        dealValue: parseFloat(dealValue) || 0, emailType, customPrompt: customInstructions,
      });
      setGeneratedEmail(res.data.result);
      success('AI email generated!');
    } catch { error('Failed to generate email.'); }
    finally   { setEmailLoading(false); }
  };

  const handleSummarizeNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotes.trim()) return;
    setSummaryLoading(true);
    try {
      const res = await api.post('/ai/summarize-notes', { notes: rawNotes });
      setSummarizedOutput(res.data.result);
      success('Notes summarized!');
    } catch { error('Failed to summarize notes.'); }
    finally   { setSummaryLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    success('Copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col w-full"
      style={{ height: 'calc(100vh - 96px)', minHeight: 0 }}
    >
      {/* ══ TOP HEADER STRIP ═══════════════════════════════════════════ */}
      <div className="flex-shrink-0 mb-2 sm:mb-3">
        {/* Gradient card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #4f46e5 100%)',
          }}
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-10 w-24 h-24 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
            {/* Left: branding */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight tracking-tight">
                  AI Sales Copilot <span className="text-blue-200">&amp; Tools</span>
                </h1>
                <p className="text-[10px] sm:text-[11px] text-blue-200 leading-tight truncate">
                  Powered by Groq LLaMA-3 · High-speed sales intelligence
                </p>
              </div>
            </div>

            {/* Right: status pills */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold text-emerald-100"
                style={{ background: 'rgba(16,185,129,0.22)', border: '1px solid rgba(52,211,153,0.35)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                LLaMA 3.3 Active
              </span>
              <span
                className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold text-blue-100"
                style={{ background: 'rgba(99,102,241,0.28)', border: '1px solid rgba(129,140,248,0.35)' }}
              >
                <Shield className="w-2.5 h-2.5" />
                Enterprise
              </span>
            </div>
          </div>

          {/* ── Tab bar (Fully Responsive Side-by-Side Equal Width Tabs) ─────────────────────────────── */}
          <div className="relative z-10 flex items-center gap-1 sm:gap-2 px-2 sm:px-4 pb-2 border-t border-white/10 w-full overflow-x-auto no-scrollbar scrollbar-none">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 min-w-[95px] xs:min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-extrabold transition-all duration-200 whitespace-nowrap select-none mt-1.5 cursor-pointer ${
                    active
                      ? 'bg-white text-blue-600 dark:bg-[#121212] dark:text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-blue-100 border border-white/15'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ EXPIRED TRIAL / SUBSCRIPTION OVERLAY ═══════════════════════ */}
      {isExpired && (
        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border-b border-red-200 dark:border-red-900/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-rose-950/60 border border-red-200 dark:border-rose-800 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-red-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Your 14-day free trial has ended.</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Upgrade your plan to continue using AI Chat, Email Generator, and Meeting Summarizer.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> View Plans <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ══ TAB CONTENT — fills remaining height ═══════════════════════ */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">

          {/* ─────────────── TAB 1: COPILOT CHAT ─────────────────────── */}
          {activeTab === 'copilot' && (
            <motion.div
              key="copilot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="h-full flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 shadow-md"
            >
              {/* Chat sub-header */}
              <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181B]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight">Interactive AI Sales Strategist</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400 leading-tight">Ask anything about pipeline, objections &amp; closing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 hidden sm:flex">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-[10px] sm:text-xs font-bold gap-1.5 px-2.5 py-1 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Clear Chat History & Start New Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Clear History</span>
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex flex-col gap-2.5 sm:gap-3 min-h-0">
                {messages.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex gap-2 sm:gap-2.5 max-w-[92%] sm:max-w-[85%] md:max-w-[78%] ${
                      m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      }`}
                    >
                      {m.role === 'user' ? 'Y' : <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                        m.role === 'user'
                          ? 'rounded-tr-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md'
                          : 'rounded-tl-sm text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-[#18181B] border border-slate-200/80 dark:border-zinc-800 whitespace-pre-wrap'
                      }`}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}

                {isCopilotLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-400"
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 px-3.5 py-2 rounded-2xl rounded-tl-sm">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts + Attachment + Input */}
              <div className="flex-shrink-0 px-3 sm:px-4 pt-2 pb-2.5 sm:pb-3 flex flex-col gap-2 sm:gap-2.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/90 dark:bg-[#18181B]">
                {/* 6 Small Content Boxes / Quick Prompt Chips (Fully Responsive Horizontal Scroll Bar with Touch Panning) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1 min-w-0 flex-nowrap touch-pan-x select-none w-full">
                  <span className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400 font-extrabold whitespace-nowrap flex-shrink-0 mr-0.5 uppercase tracking-wider">
                    TRY:
                  </span>
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => handleSendCopilot(undefined, q.text)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all duration-150 active:scale-95 bg-blue-50/90 dark:bg-zinc-800/90 hover:bg-blue-100 dark:hover:bg-zinc-700 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-zinc-700/80 shadow-2xs cursor-pointer"
                    >
                      <span>{q.icon}</span>
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>

                {/* Attached File Preview Badge (If attached) */}
                {attachedFile && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100/80 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 self-start animate-in fade-in duration-150">
                    <Paperclip className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold truncate max-w-[180px] sm:max-w-[280px]">{attachedFile.name}</span>
                    <span className="text-[10px] text-blue-500 font-mono">({attachedFile.size})</span>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="ml-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.pdf,.csv,.doc,.docx,.json,.md,.png,.jpg,.jpeg"
                  className="hidden"
                />

                {/* Input row with Attachment Button */}
                <form onSubmit={handleSendCopilot} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach document or file to AI chat"
                    className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      attachedFile
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-zinc-800 text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-white border border-slate-200 dark:border-zinc-700 hover:border-blue-300'
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    placeholder="Ask AI Sales Copilot or attach a file..."
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    className="flex-1 min-w-0 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isCopilotLoading || (!inputPrompt.trim() && !attachedFile)}
                    className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ─────────────── TAB 2: EMAIL WRITER ─────────────────────── */}
          {activeTab === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="min-h-full sm:h-full grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto sm:overflow-visible pb-4 sm:pb-0"
            >
              {/* Left: form */}
              <div className="rounded-2xl flex flex-col overflow-hidden bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 shadow-md">
                {/* Panel header */}
                <div className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181B]">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Email Campaign Parameters</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400">Configure your AI outreach</p>
                  </div>
                </div>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2.5 sm:py-3">
                  <form onSubmit={handleGenerateEmail} className="flex flex-col gap-2.5 sm:gap-3">
                    {/* 2-col row for name + company */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Recipient</label>
                        <input
                          value={recipientName}
                          onChange={e => setRecipientName(e.target.value)}
                          placeholder="e.g. John Doe"
                          required
                          className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Company</label>
                        <input
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* 2-col row for deal value + email type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Deal Value ($)</label>
                        <input
                          type="number"
                          value={dealValue}
                          onChange={e => setDealValue(e.target.value)}
                          placeholder="50000"
                          className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Email Type</label>
                        <select
                          value={emailType}
                          onChange={e => setEmailType(e.target.value as any)}
                          className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="Cold Outreach">Cold Outreach</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Proposal Intro">Proposal Intro</option>
                          <option value="Objection Handler">Objection Handler</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes / Tone */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Additional Notes / Tone</label>
                      <textarea
                        rows={3}
                        value={customInstructions}
                        onChange={e => setCustomInstructions(e.target.value)}
                        placeholder="e.g. Emphasize fast ROI and 24/7 customer support…"
                        className="px-3 py-2 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none resize-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isEmailLoading}
                      className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] shadow-md cursor-pointer"
                    >
                      {isEmailLoading ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Email with AI
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: preview */}
              <div className="rounded-2xl flex flex-col overflow-hidden bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 shadow-md">
                <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181B]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">AI Generated Email Draft</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400">Ready to send</p>
                    </div>
                  </div>
                  {generatedEmail && (
                    <button
                      onClick={() => copyToClipboard(generatedEmail)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  {generatedEmail ? (
                    <pre className="font-mono text-xs sm:text-sm text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {generatedEmail}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400">No draft yet</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Configure parameters and generate your email</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────── TAB 3: SUMMARIZER ───────────────────────── */}
          {activeTab === 'summarizer' && (
            <motion.div
              key="summarizer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="min-h-full sm:h-full grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto sm:overflow-visible pb-4 sm:pb-0"
            >
              {/* Left: notes input */}
              <div className="rounded-2xl flex flex-col overflow-hidden bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 shadow-md">
                <div className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181B]">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Raw Meeting Notes</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400">Paste unstructured call notes or transcripts</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden px-3 sm:px-4 py-2.5 sm:py-3">
                  <form onSubmit={handleSummarizeNotes} className="flex-1 flex flex-col gap-2.5">
                    <textarea
                      className="flex-1 w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none resize-none focus:border-violet-500 transition-all leading-relaxed"
                      style={{ minHeight: '120px' }}
                      placeholder="Paste raw unstructured call notes, transcript snippets, or discussion points here…"
                      value={rawNotes}
                      onChange={e => setRawNotes(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSummaryLoading}
                      className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] flex-shrink-0 shadow-md cursor-pointer"
                    >
                      {isSummaryLoading ? (
                        <><Zap className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                      ) : (
                        <><Zap className="w-3.5 h-3.5" /> Summarize &amp; Extract Action Items <ChevronRight className="w-3.5 h-3.5 opacity-70" /></>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: output */}
              <div className="rounded-2xl flex flex-col overflow-hidden bg-white dark:bg-[#121212] border border-slate-200 dark:border-zinc-800 shadow-md">
                <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-[#18181B]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Structured Executive Summary</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-400">Key insights &amp; action items</p>
                    </div>
                  </div>
                  {summarizedOutput && (
                    <button
                      onClick={() => copyToClipboard(summarizedOutput)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  {summarizedOutput ? (
                    <pre className="font-mono text-xs sm:text-sm text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {summarizedOutput}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-amber-50 dark:bg-amber-950/50">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400">No summary yet</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Paste meeting notes to extract summary &amp; action items</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default AiAssistant;
