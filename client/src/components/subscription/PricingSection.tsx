import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import { useToast } from '../ui/Toast';

interface PricingSectionProps {
  showTitle?: boolean;
  className?: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const PricingSection: React.FC<PricingSectionProps> = ({
  showTitle = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, accessToken } = useAuthStore();
  const { success, error, info } = useToast();

  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchDynamicPackages = async () => {
      try {
        const res = await api.get('/packages');
        if (res.data?.packages && res.data.packages.length > 0) {
          setDbPackages(res.data.packages);
        }
      } catch (err: any) {
        console.error('Failed to load dynamic packages from API, fallback to default static plans');
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchDynamicPackages();
  }, []);

  const getUniquePlanInfo = (rawName: string, slug: string, limits: any) => {
    const s = (slug || '').toLowerCase();
    const n = (rawName || '').toLowerCase();
    if (s.includes('trial') || n.includes('trial')) {
      return {
        prefix: 'AI CRM',
        suffix: 'Lite',
        tag: '14-DAY TRIAL',
        pillText: `${(limits.aiQueryLimit || 100).toLocaleString()} AI Credits / mo`,
        ctaText: 'Start with AI CRM Lite',
      };
    }
    if (s.includes('starter') || s.includes('basic') || n.includes('starter')) {
      return {
        prefix: 'AI CRM',
        suffix: 'Plus',
        tag: 'FOR GROWING TEAMS',
        pillText: `${(limits.aiQueryLimit || 500).toLocaleString()} AI Credits / mo`,
        ctaText: 'Get AI CRM Plus',
      };
    }
    if (s.includes('prof') || s.includes('medium') || n.includes('prof')) {
      return {
        prefix: 'AI CRM',
        suffix: 'Pro',
        tag: 'RECOMMENDED',
        pillText: `${(limits.aiQueryLimit || 2500).toLocaleString()} AI Credits / mo`,
        ctaText: 'Get AI CRM Pro',
      };
    }
    return {
      prefix: 'AI CRM',
      suffix: 'Ultra',
      tag: 'ENTERPRISE',
      pillText: `${(limits.aiQueryLimit || 10000).toLocaleString()} AI Credits / mo`,
      ctaText: 'Get AI CRM Ultra',
    };
  };

  const buildDetailedFeatures = (pkg: any) => {
    const slug = (pkg.slug || pkg.id || '').toLowerCase();
    const limits = pkg.limits || {};
    const maxUsers = limits.maxTotalUsers || (slug.includes('starter') ? 13 : slug.includes('prof') ? 50 : slug.includes('enter') || slug.includes('premium') ? 250 : 7);
    const maxManagers = limits.maxSalesManagers || (slug.includes('starter') ? 3 : slug.includes('prof') ? 10 : slug.includes('enter') || slug.includes('premium') ? 50 : 2);
    const maxReps = limits.maxSalesReps || (slug.includes('starter') ? 10 : slug.includes('prof') ? 40 : slug.includes('enter') || slug.includes('premium') ? 200 : 5);
    const maxLeads = limits.maxLeads || (slug.includes('starter') ? 2500 : slug.includes('prof') ? 15000 : slug.includes('enter') || slug.includes('premium') ? 100000 : 500);
    const maxDeals = limits.maxDeals || (slug.includes('starter') ? 500 : slug.includes('prof') ? 3000 : slug.includes('enter') || slug.includes('premium') ? 25000 : 100);
    const aiCredits = limits.aiQueryLimit || (slug.includes('starter') ? 500 : slug.includes('prof') ? 2500 : slug.includes('enter') || slug.includes('premium') ? 10000 : 100);

    return [
      `Max Workspace: ${maxUsers} Total Users`,
      `Team Role Split: ${maxManagers} Mgr / ${maxReps} Reps`,
      `Pipeline: ${maxLeads.toLocaleString()} Leads / ${maxDeals.toLocaleString()} Deals`,
      `AI Intelligence: ${aiCredits.toLocaleString()} Query Credits / mo`,
      'CRM Capabilities: Full Pipeline Management',
      'AI Copilot: Integrated Sales Intelligence',
      'Support & SLA: Priority Response',
    ];
  };

  const fallbackPlans = [
    {
      id: 'trial',
      slug: 'trial',
      prefix: 'AI CRM',
      suffix: 'Lite',
      tag: '14-DAY TRIAL',
      name: 'AI CRM Lite',
      price: '₹0',
      duration: 'mo',
      description: 'Get essential CRM tools to explore AI intelligence and manage deals.',
      popular: false,
      ctaText: isAuthenticated ? 'Current Plan' : 'Start with AI CRM Lite',
      isPaid: false,
      pillText: '100 AI Credits / mo',
      limits: { maxTotalUsers: 7, maxSalesManagers: 2, maxSalesReps: 5, maxLeads: 500, maxDeals: 100, aiQueryLimit: 100 },
    },
    {
      id: 'starter',
      slug: 'starter',
      prefix: 'AI CRM',
      suffix: 'Plus',
      tag: 'GROWING TEAMS',
      name: 'AI CRM Plus',
      price: '₹999',
      duration: 'mo',
      description: 'Get more access to AI tools to boost sales velocity and outreach.',
      popular: false,
      ctaText: 'Get AI CRM Plus',
      isPaid: true,
      pillText: '500 AI Credits / mo',
      limits: { maxTotalUsers: 13, maxSalesManagers: 3, maxSalesReps: 10, maxLeads: 2500, maxDeals: 500, aiQueryLimit: 500 },
    },
    {
      id: 'professional',
      slug: 'professional',
      prefix: 'AI CRM',
      suffix: 'Pro',
      tag: 'RECOMMENDED',
      name: 'AI CRM Pro',
      price: '₹2,499',
      duration: 'mo',
      description: 'Work smarter and close faster with full Copilot strategist & meeting intel.',
      popular: true,
      ctaText: 'Get AI CRM Pro',
      isPaid: true,
      pillText: '2,500 AI Credits / mo',
      limits: { maxTotalUsers: 50, maxSalesManagers: 10, maxSalesReps: 40, maxLeads: 15000, maxDeals: 3000, aiQueryLimit: 2500 },
    },
    {
      id: 'enterprise',
      slug: 'enterprise',
      prefix: 'AI CRM',
      suffix: 'Ultra',
      tag: 'ENTERPRISE',
      name: 'AI CRM Ultra',
      price: '₹4,999',
      duration: 'mo',
      description: 'Accelerate your workflows with highest capacity and VIP dedicated support.',
      popular: false,
      ctaText: 'Get AI CRM Ultra',
      isPaid: true,
      pillText: '10,000 AI Credits / mo',
      limits: { maxTotalUsers: 250, maxSalesManagers: 50, maxSalesReps: 200, maxLeads: 100000, maxDeals: 25000, aiQueryLimit: 10000 },
    },
  ].map(p => ({
    ...p,
    features: buildDetailedFeatures(p),
  }));

  const plans = dbPackages.length > 0
    ? dbPackages.map((pkg) => {
      const info = getUniquePlanInfo(pkg.name, pkg.slug, pkg.limits || {});
      return {
        id: pkg.slug || pkg._id,
        prefix: info.prefix,
        suffix: info.suffix,
        tag: info.tag,
        pillText: info.pillText,
        name: `${info.prefix} ${info.suffix}`,
        price: `₹${pkg.monthlyPrice.toLocaleString()}`,
        duration: 'mo',
        description: pkg.description || (info.suffix === 'Pro' ? 'Work smarter and close faster with full Copilot strategist & meeting intel.' : info.suffix === 'Plus' ? 'Get more access to AI tools to boost sales velocity and outreach.' : info.suffix === 'Ultra' ? 'Accelerate your workflows with highest capacity and VIP dedicated support.' : 'Get essential CRM tools to explore AI intelligence and manage deals.'),
        features: buildDetailedFeatures(pkg),
        popular: pkg.isPopular || (pkg.slug === 'professional' || pkg.slug === 'medium'),
        ctaText: info.ctaText,
        isPaid: pkg.monthlyPrice > 0,
      };
    })
    : fallbackPlans;

  const handleSelectPlan = async (planId: string, isPaid: boolean) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isPaid) {
      info('You are already eligible for the 14-day free trial on registration.');
      return;
    }
    setLoadingPlan(planId);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        error('Failed to load payment gateway.');
        setLoadingPlan(null);
        return;
      }
      const orderRes = await api.post('/payments/create-order', { plan: planId });
      const { order, key, amount, planName } = orderRes.data;
      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: 'INR',
        name: 'Enterprise AI CRM',
        description: `${planName || planId.toUpperCase()} SaaS Plan Subscription`,
        order_id: order?.id || orderRes.data.orderId,
        handler: async function (response: any) {
          try {
            let verifyRes;
            try {
              verifyRes = await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              });
            } catch (endpointErr) {
              // Fallback to /verify-payment endpoint if /verify returns 404
              verifyRes = await api.post('/payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              });
            }

            if (verifyRes.data && verifyRes.data.success) {
              success('🎉 Subscription upgraded successfully! Unlocking your new limits.');
              if (user && accessToken) {
                login(accessToken, {
                  ...user,
                  subscription: {
                    ...(user.subscription || {}),
                    plan: planId,
                    status: 'active',
                    aiAccess: true,
                  },
                });
              }
              setTimeout(() => {
                navigate('/payment-success');
              }, 1200);
            } else {
              error(verifyRes.data?.message || 'Payment verification failed on server. Plan was not activated.');
            }
          } catch (err: any) {
            console.error('[PAYMENT VERIFICATION ERROR]:', err);
            error(err.response?.data?.message || 'Payment verification failed. No plan was activated.');
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        error(`Payment Failed: ${response.error?.description || 'Transaction declined'}`);
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      error(err.response?.data?.message || 'Unable to initialize checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <section className={`py-12 sm:py-16 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-zinc-800/80 border border-blue-200/80 dark:border-zinc-700 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Transparent Subscription Plans
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3 leading-snug sm:leading-tight"
            >
              Supercharge your sales team with AI.
            </motion.h2>
          </div>
        )}

        {isLoadingPackages ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
            Loading subscription packages...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan: any, index: number) => {
              const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
              const isCurrentPlan =
                (isSuperAdmin && (plan.slug === 'enterprise' || plan.id === 'enterprise' || plan.id === 'premium')) ||
                (isAuthenticated &&
                (user?.subscription?.plan === plan.id ||
                  user?.subscription?.plan === plan.slug ||
                  (plan.slug === 'starter' && user?.subscription?.plan === 'basic') ||
                  (plan.slug === 'professional' && user?.subscription?.plan === 'medium') ||
                  (plan.slug === 'enterprise' && user?.subscription?.plan === 'premium')) &&
                (user?.subscription?.status === 'active' || user?.subscription?.status === 'trial'));

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className={`relative rounded-3xl flex flex-col p-6 sm:p-7 transition-all duration-300 ${plan.popular
                      ? 'bg-white dark:bg-[#121212] border-2 border-blue-600 dark:border-blue-500 shadow-xl ring-2 ring-blue-500/10 lg:-translate-y-2'
                      : 'bg-white dark:bg-[#121212] border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
                    }`}
                >
                  <div className="mb-2 min-h-[20px]">
                    {plan.popular ? (
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {plan.tag || 'RECOMMENDED'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        {plan.tag || 'AI PLAN'}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {plan.prefix || 'AI CRM'}{' '}
                      <span className="text-blue-600 dark:text-blue-400">
                        {plan.suffix || plan.name}
                      </span>
                    </h3>
                    <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mt-2 min-h-[44px]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Capsule Pill (clean text without emoji) */}
                  <div className="mb-5">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700">
                      <span>{plan.pillText}</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                        {plan.price}
                      </span>
                      <span className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">
                        /{plan.duration || 'mo'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-3.5 px-5 rounded-full font-bold text-sm bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 cursor-not-allowed text-center flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-600" /> {isSuperAdmin ? 'Super Admin Active' : 'Current Plan'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.id, plan.isPaid)}
                        disabled={loadingPlan !== null}
                        className="w-full py-3.5 px-5 rounded-full font-bold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                      >
                        {loadingPlan === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            {plan.ctaText}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 border-t border-slate-100 dark:border-zinc-800/80 pt-5">
                    <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3.5">
                      What&apos;s included:
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature: any, fIndex: number) => (
                        <li key={fIndex} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-200">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
