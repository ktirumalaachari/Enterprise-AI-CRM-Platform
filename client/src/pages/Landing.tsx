import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PricingSection from "../components/subscription/PricingSection";
import {
  Bot,
  BarChart3,
  Users,
  Target,
  Zap,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Shield,
  Globe,
} from "lucide-react";

/* ─────────────────────────────────────────── helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

/* ─────────────────────────────────────────── data ─── */
const features = [
  {
    icon: Bot,
    title: "AI-Powered Assistant",
    description:
      "Automate email drafting, follow-ups, and smart CRM responses powered by generative AI.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
  },
  {
    icon: Target,
    title: "Smart Lead Management",
    description:
      "Automatically score and prioritize leads based on engagement signals and fit.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
  },
  {
    icon: BarChart3,
    title: "Visual Sales Pipeline",
    description:
      "Track deals through customizable kanban stages with drag-and-drop simplicity.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Zap,
    title: "Real-Time Analytics",
    description:
      "Make data-driven decisions with dynamic revenue charts and performance dashboards.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
  },
  {
    icon: Users,
    title: "Customer Relationships",
    description:
      "Maintain a 360° view of every client, interaction history, and relationship notes.",
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
  },
  {
    icon: MessageSquare,
    title: "Team Collaboration",
    description:
      "Align your sales team with shared tasks, activity feeds, and instant notifications.",
    color: "from-cyan-500 to-sky-600",
    bg: "bg-cyan-50",
  },
];

const aiCapabilities = [
  "Generate personalized sales emails instantly",
  "Create smart follow-up messages based on deal context",
  "Summarize lengthy meeting notes in seconds",
  "Analyze CRM data to predict deal success",
  "Get AI-recommended next actions for every lead",
];

const stats = [
  { value: "3.2×", label: "Faster deal closure" },
  { value: "68%", label: "Less time on manual tasks" },
  { value: "94%", label: "Customer satisfaction" },
];

/* ─────────────────────────────────── sub-components ─── */
interface StatCardProps {
  value: string;
  label: string;
  delay: number;
}

function StatCard({ value, label, delay }: StatCardProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={delay}
      variants={fadeUp}
      className="bg-white border border-brand-border rounded-2xl px-8 py-6 shadow-lg hover:shadow-xl transition-shadow w-full h-36 lg:h-44 flex flex-col items-center justify-center text-center"
    >
      <p className="text-4xl sm:text-5xl font-bold text-brand-primary">
        {value}
      </p>
      <p className="text-sm sm:text-base text-brand-textSecondary mt-3">
        {label}
      </p>
    </motion.div>
  );
}

/* AI Chat Mockup */
function AIChatMockup() {
  const messages = [
    {
      role: "user",
      text: "Draft a follow-up email for Acme Corp based on our last meeting.",
    },
    {
      role: "ai",
      text: "Sure! Here's a polished follow-up based on your meeting notes:",
      extra: (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-600 leading-relaxed">
          <strong>Subject:</strong> Next steps from today's call
          <br />
          <br />
          Hi Sarah,
          <br />
          <br />
          Great speaking with you today. As discussed, I've attached the
          enterprise pricing proposal and integration roadmap...
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white border border-brand-border rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
      {/* header */}
      <div className="flex items-center gap-2.5 p-3 border-b border-brand-border bg-gradient-to-r from-brand-primary/5 to-transparent">
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-brand-textPrimary text-xs">
            AI Sales Assistant
          </p>
          <p className="text-[10px] text-brand-success flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-brand-success inline-block" />
            Online & ready
          </p>
        </div>
      </div>
      {/* messages */}
      <div className="p-3.5 flex flex-col gap-3 bg-slate-50/60">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.4 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs ${
                msg.role === "user"
                  ? "bg-brand-primary text-white rounded-tr-sm"
                  : "bg-white border border-brand-border text-brand-textPrimary rounded-tl-sm shadow-md shadow-slate-200/50"
              }`}
            >
              {msg.text}
              {msg.extra}
            </div>
          </motion.div>
        ))}
        {/* action pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="flex flex-wrap gap-2 mt-0.5"
        >
          {["Send Email", "Edit Draft", "Schedule Follow-up"].map((label) => (
            <span
              key={label}
              className="px-2.5 py-1 bg-white border border-brand-border rounded-full text-[10px] font-medium text-brand-primary shadow-md shadow-slate-200/50"
            >
              {label}
            </span>
          ))}
        </motion.div>
      </div>
      {/* input bar */}
      <div className="p-3 border-t border-brand-border bg-white">
        <div className="flex gap-2 items-center bg-brand-bg border border-brand-border rounded-lg px-3 py-2">
          <p className="flex-1 text-xs text-brand-textSecondary">
            Ask AI anything about your deals...
          </p>
          <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center">
            <ArrowRight className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── main component ─── */
export const Landing = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sectionIds: string[] = [];
      const scrollPosition = window.scrollY + 140;

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goRegister = () => navigate("/register");
  const goLogin = () => navigate("/login");

  const navLinks: any[] = [];

  const navLinkClass = (isActive: boolean) =>
    `relative text-sm font-semibold px-3 py-2 transition-colors duration-200 ${
      isActive
        ? "text-brand-primary"
        : "text-brand-textSecondary hover:text-brand-primary"
    } after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-brand-primary after:origin-center after:transition-transform after:duration-200 ${
      isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
    }`;

  return (
    <div className="min-h-screen bg-white font-sans text-brand-textPrimary overflow-x-hidden">
      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-lg shadow-md shadow-slate-200/50 border-b border-brand-border"
            : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                AI<span className="text-brand-primary">CRM</span>
              </span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.length > 0 &&
                navLinks.map((link) => {
                  const isActive = activeSection === link.id;
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      className={navLinkClass(isActive)}
                    >
                      {link.label}
                    </a>
                  );
                })}
            </div>

            {/* Tablet & Desktop Single Sign In CTA */}
            <div className="flex items-center gap-3">
              <button
                onClick={goLogin}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold bg-brand-primary text-white px-5 py-2 rounded-xl hover:bg-brand-secondary transition-all shadow-md shadow-brand-primary/25 hover:shadow-lg hover:shadow-brand-primary/35 active:scale-[0.98] cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      {/* Note: md:pt-[104px] provides exactly 40px gap between h-16 (64px) navbar and tablet hero content */}
      <section className="relative pt-[74px] md:pt-[104px] lg:pt-20 pb-12 lg:pb-16 overflow-hidden">
        {/* Background radial gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-indigo-100/40 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
            {/* Text side - Always LEFT ALIGNED on Mobile, Tablet & Desktop */}
            <div className="text-left flex flex-col items-start">
              <motion.div
                initial="hidden"
                animate="visible"
                custom={0}
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-brand-primary text-xs font-semibold mb-3 shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                AI-Powered CRM Platform
              </motion.div>

              <motion.h1
                initial="hidden"
                animate="visible"
                custom={0.1}
                variants={fadeUp}
                className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] mb-4 text-left"
              >
                Manage Your Sales.
                <br />
                Grow Your Business.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-400">
                  Powered by AI.
                </span>
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="visible"
                custom={0.2}
                variants={fadeUp}
                className="text-sm sm:text-base text-brand-textSecondary leading-relaxed mb-6 max-w-lg text-left"
              >
                Empower your team to close more deals, build stronger
                relationships, and hit revenue targets — all from one
                intelligent platform built for modern sales teams.
              </motion.p>

              <motion.div
                initial="hidden"
                animate="visible"
                custom={0.3}
                variants={fadeUp}
                className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
              >
                <button
                  onClick={goRegister}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/40 hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Start for Free</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  onClick={goLogin}
                  className="hidden lg:inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-brand-textPrimary border border-brand-border rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5 w-full sm:w-auto shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Login to Dashboard</span>
                </button>
              </motion.div>

              {/* Trust Badges - Left Aligned */}
              <motion.div
                initial="hidden"
                animate="visible"
                custom={0.4}
                variants={fadeUp}
                className="flex flex-wrap gap-4 mt-6 text-xs text-brand-textSecondary justify-start"
              >
                {[
                  { icon: Shield, text: "SOC 2 Compliant" },
                  { icon: Globe, text: "GDPR Ready" },
                  { icon: TrendingUp, text: "99.9% Uptime SLA" },
                ].map(({ icon: Icon, text }) => (
                  <span
                    key={text}
                    className="flex items-center gap-1.5 font-medium"
                  >
                    <Icon className="w-3.5 h-3.5 text-brand-success" />
                    {text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Dashboard Mockup (Tablet & Desktop 2-Column Right Side) */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={scaleIn}
              className="relative hidden md:block"
            >
              <div className="p-1 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-transparent shadow-xl shadow-slate-200/60 border border-slate-200/80">
                <img
                  src="/images/crm-dashboard.jpg.png"
                  alt="AI CRM Dashboard"
                  className="rounded-xl w-full h-auto"
                />
              </div>
            </motion.div>
          </div>

          {/* Scroll-Based Second Section (Mobile Only) */}
          <div className="mt-10 md:hidden">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={scaleIn}
              className="p-1 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-transparent shadow-xl shadow-slate-200/60 border border-slate-200/80 max-w-lg mx-auto"
            >
              <img
                src="/images/crm-dashboard.jpg.png"
                alt="AI CRM Dashboard"
                className="rounded-xl w-full h-auto"
              />
            </motion.div>
          </div>

          {/* Proven Results Quick Stats - Full Width */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.6}
            variants={fadeUp}
            className="mt-[100px] pt-8 border-t border-brand-border"
          >
            <div className="text-center">
              <p className="text-brand-primary font-semibold text-xs uppercase tracking-wider mb-4">
                Proven results
              </p>
              <p className="text-sm text-brand-textSecondary mb-6">
                See how AI CRM transforms sales performance across the board.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 max-w-3xl mx-auto w-full">
                {stats.map((s, i) => (
                  <StatCard
                    key={s.label}
                    value={s.value}
                    label={s.label}
                    delay={i * 0.1}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CORE PLATFORM ──────────────────────────────────── */}
      <section className="py-10 sm:py-12 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2"
            >
              Core Platform
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0.1}
              variants={fadeUp}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-textPrimary mb-3"
            >
              Everything you need to scale
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0.2}
              variants={fadeUp}
              className="text-brand-textSecondary text-base sm:text-lg"
            >
              Powerful features wrapped in a clean, intuitive interface your
              team will love.
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.5 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="group bg-white border border-brand-border rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default"
                >
                  <div
                    className={`w-11 h-11 ${feature.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5.5 h-5.5 text-brand-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-brand-textPrimary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-brand-textSecondary text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI SALES ASSISTANT ─────────────────────────────────── */}
      <section className="py-10 sm:py-12 lg:py-14 bg-brand-bg border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* AI chat mockup */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-br from-brand-primary/10 to-blue-200/10 rounded-3xl blur-2xl -z-10" />
              <AIChatMockup />
            </motion.div>

            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <p className="text-brand-primary font-semibold text-xs uppercase tracking-wider mb-2">
                AI Sales Assistant
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-textPrimary mb-4">
                Your unfair
                <br />
                competitive advantage.
              </h2>
              <p className="text-base sm:text-lg text-brand-textSecondary mb-6 leading-relaxed">
                Stop spending hours on repetitive tasks. Our embedded AI
                assistant works directly inside your CRM to give you superpowers
                across every stage of the sales cycle.
              </p>

              <ul className="space-y-3.5">
                {aiCapabilities.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-brand-success flex-shrink-0 mt-0.5" />
                    <span className="text-brand-textPrimary text-sm sm:text-base">
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>

              <motion.button
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                onClick={goRegister}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/30 hover:shadow-xl text-sm"
              >
                Try AI Assistant Free <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ─────────────────────────────────── */}
      <PricingSection showTitle={true} />

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section className="py-16 sm:py-20 relative overflow-hidden bg-brand-textPrimary">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-1/2 left-1/2 w-[800px] h-[500px] bg-brand-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            Your entire sales workflow.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              One intelligent platform.
            </span>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.15}
            variants={fadeUp}
            className="text-slate-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Join thousands of sales professionals closing more deals, building
            better pipelines, and saving hours every week with AI-powered tools.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0.25}
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={goRegister}
              className="px-8 py-3.5 bg-brand-primary text-white rounded-xl font-semibold text-base hover:bg-blue-500 transition-all shadow-xl hover:shadow-brand-primary/40 hover:shadow-2xl hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Get Started Free
            </button>
            <button
              onClick={goLogin}
              className="text-slate-300 hover:text-white transition-colors font-medium text-sm underline underline-offset-2"
            >
              Already have an account? Login
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-white border-t border-brand-border pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  AI<span className="text-brand-primary">CRM</span>
                </span>
              </div>
              <p className="text-brand-textSecondary text-sm max-w-xs leading-relaxed mb-5">
                The modern platform for sales teams to manage relationships,
                track deals, and accelerate growth with artificial intelligence.
              </p>
              {/* Social icons */}
              <div className="flex gap-3">
                {/* X/Twitter */}
                <a
                  href="https://x.com/TiruAchari"
                  aria-label="X / Twitter"
                  className="w-9 h-9 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-textSecondary hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/k-tirumala-achari-921106307/"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-textSecondary hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                {/* GitHub */}
                <a
                  href="https://github.com/ktirumalaachari"
                  aria-label="GitHub"
                  className="w-9 h-9 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-brand-textSecondary hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product links */}
            <div>
              <h4 className="font-semibold text-brand-textPrimary text-sm mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                {[
                  "Features",
                  "AI Assistant",
                  "CRM",
                  "Sales Pipeline",
                  "Analytics",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-brand-textSecondary hover:text-brand-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <h4 className="font-semibold text-brand-textPrimary text-sm mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                {["About", "Contact", "Privacy Policy", "Terms of Service"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-brand-textSecondary hover:text-brand-primary transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-brand-border flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm text-brand-textSecondary">
              &copy; {new Date().getFullYear()} AI CRM Platform. All rights
              reserved Built for modern sales teams.
            </p>
            <p className="text-xs text-brand-textSecondary">
              Built with ♥ by K Tirumala Achari
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
