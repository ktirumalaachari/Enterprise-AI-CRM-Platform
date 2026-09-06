import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User as UserIcon,
  ShieldAlert,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Zap,
  LogIn,
  Check,
  Building2,
  X,
} from "lucide-react";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import { useToast } from "../components/ui/Toast";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";

/* ─────────────────────────────────── types ─── */
type Mode = "login" | "register";
type Role = "SuperAdmin" | "Admin" | "SalesManager" | "SalesRep";

interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

/* ─────────────────────────────────── validation helper ─── */
const validateField = (
  name: string,
  value: string,
  isSignup = false,
): string | undefined => {
  if (name === "email") {
    if (!value.trim()) return "Email address is required";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) return "Enter a valid email address";
  }

  if (name === "password") {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    if (value.length > 8) return "Password cannot exceed 8 characters";
    if (
      !/[A-Z]/.test(value) ||
      !/[0-9]/.test(value) ||
      !/[^A-Za-z0-9]/.test(value)
    ) {
      return "Must include uppercase, digit & symbol";
    }
  }

  if (name === "fullName" && isSignup) {
    if (!value.trim()) return "Full name is required";
    if (value.trim().length < 3) return "Min 3 characters required";
    if (!/^[a-zA-Z\s]+$/.test(value)) return "Only letters and spaces allowed";
  }

  return undefined;
};

/* ─────────────────────────────────── form field (desktop) ─── */
interface FieldProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  touched?: boolean;
  maxLength?: number;
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  autoComplete,
  required,
  error,
  touched,
  maxLength,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const hasError = touched && !!error;
  const isValid = touched && !error && value;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-brand-textSecondary select-none">
          {label}
        </label>
        {hasError && (
          <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>{error}</span>
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <span
          className={`absolute left-3.5 pointer-events-none transition-colors ${
            hasError ? "text-rose-400" : "text-brand-textSecondary"
          }`}
        >
          {icon}
        </span>
        <input
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            if (maxLength && e.target.value.length > maxLength) return;
            onChange(e.target.value);
          }}
          autoComplete={autoComplete}
          required={required}
          maxLength={maxLength}
          className={`w-full pl-10 pr-10 py-3 text-sm border rounded-xl bg-brand-bg text-brand-textPrimary placeholder:text-brand-textSecondary/60 focus:outline-none focus:ring-2 transition-all ${
            hasError
              ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400/20"
              : isValid
                ? "border-emerald-400 focus:ring-emerald-400/20 bg-emerald-50/10"
                : "border-brand-border focus:ring-brand-primary/20 focus:border-brand-primary"
          }`}
        />
        {isValid && !isPassword && (
          <span className="absolute right-3.5 text-emerald-500 pointer-events-none">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3.5 text-brand-textSecondary hover:text-brand-primary transition-colors"
            tabIndex={-1}
            aria-label="Toggle password visibility"
          >
            {show ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── button component helper ─── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  isLoading?: boolean;
}

function Button({
  children,
  variant = "primary",
  isLoading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "flex items-center justify-center gap-2 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variantStyles =
    variant === "primary"
      ? "bg-brand-primary hover:bg-brand-secondary text-white shadow-md shadow-brand-primary/20"
      : "border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs";

  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}

/* ─────────────────────────────────── divider ─── */
function Divider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-brand-border" />
      <span className="text-xs text-brand-textSecondary font-medium">
        or continue with email
      </span>
      <div className="flex-1 h-px bg-brand-border" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/* ─────────────────────────────────── brand panel content ─── */
interface BrandPanelProps {
  mode: Mode;
  onSwitch: () => void;
}

function BrandPanel({ mode, onSwitch }: BrandPanelProps) {
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 text-white overflow-hidden select-none">
      {/* Animated background blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-blue-600 to-indigo-700" />
      <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 text-center"
        >
          {mode === "login" ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold mb-5 backdrop-blur-sm border border-white/20">
                <Sparkles className="w-3.5 h-3.5" />
                New to AI CRM?
              </div>
              <h2 className="text-2xl font-bold mb-2 leading-tight">
                Hello, Friend!
              </h2>
              <p className="text-blue-100 text-xs mb-8 max-w-xs mx-auto leading-relaxed">
                Enter your details to access your CRM workspace and AI tools.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold mb-5 backdrop-blur-sm border border-white/20">
                <Sparkles className="w-3.5 h-3.5" />
                Already have an account?
              </div>
              <h2 className="text-2xl font-bold mb-2 leading-tight">
                Welcome Back!
              </h2>
              <p className="text-blue-100 text-xs mb-8 max-w-xs mx-auto leading-relaxed">
                Sign in to continue. Your pipeline and AI assistant are waiting.
              </p>
            </>
          )}

          <button
            onClick={onSwitch}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 border-2 border-white/60 text-white rounded-xl text-xs font-semibold hover:bg-white hover:text-brand-primary transition-all duration-200"
          >
            {mode === "login" ? "Create Account" : "Sign In"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────── desktop login form ─── */
interface LoginFormProps {
  onSwitchToRegister: () => void;
  onOpenCompanyModal?: () => void;
  active?: boolean;
}

function LoginForm({
  onSwitchToRegister,
  onOpenCompanyModal,
  active = true,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setEmail("");
    setPassword("");
    const t1 = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 50);
    const t2 = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<
    "none" | "request" | "verify" | "reset"
  >("none");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotDevOtp, setForgotDevOtp] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateField("email", v) }));
    }
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (touched.password) {
      setErrors((prev) => ({
        ...prev,
        password: validateField("password", v),
      }));
    }
  };

  const getRoleDashboard = (role: string) => {
    if (role === "SuperAdmin") return "/super-admin";
    return "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const newErrors: ValidationErrors = {};
    const emailErr = validateField("email", email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validateField("password", password);
    if (passErr) newErrors.password = passErr;

    setErrors(newErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(newErrors).length > 0) {
      const hasEmailError = !!newErrors.email;
      const hasPasswordError = !!newErrors.password;
      if (hasEmailError && hasPasswordError) {
        error("Please enter your email and password to sign in.");
      } else if (hasEmailError) {
        error("Please enter your email address.");
      } else if (hasPasswordError) {
        error("Please enter your password.");
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      if (data.requiresCompanySelection) {
        useAuthStore
          .getState()
          .setMultiCompanySelection(
            data.accessToken,
            data.user,
            data.companies,
          );
        navigate("/select-company");
        return;
      }

      if (data.noCompany) {
        error(
          "No company workspace is linked to your account. Please register a company or join one.",
        );
        return;
      }

      const { accessToken: jwtToken, user: loggedUser } = data;
      login(jwtToken, loggedUser);

      // State machine routing
      if (
        loggedUser?.role === "SUPER_ADMIN" ||
        loggedUser?.role === "SuperAdmin"
      ) {
        navigate("/super-admin", { replace: true });
      } else if (
        data.requiresJoinCode ||
        loggedUser?.accountStatus === "PENDING_COMPANY"
      ) {
        success("Please enter your company join code to continue.");
        navigate("/join-company", { replace: true });
      } else if (
        data.requiresPendingApproval ||
        loggedUser?.accountStatus === "PENDING_APPROVAL"
      ) {
        navigate("/pending-approval", { replace: true });
      } else if (loggedUser?.accountStatus === "REJECTED") {
        navigate("/rejected", { replace: true });
      } else if (loggedUser?.companyStatus === "PENDING") {
        navigate("/pending-approval", { replace: true });
      } else {
        success("Welcome back! Logged in successfully.");
        navigate(from !== "/dashboard" ? from : "/dashboard", {
          replace: true,
        });
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Invalid email or password.";
      if (status === 403 && err.response?.data?.accountStatus === "REJECTED") {
        error(
          "Your join request was rejected. Please contact the company admin.",
        );
        navigate("/rejected", { replace: true });
      } else {
        error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const res = await api.post("/auth/google-login", {
          accessToken: tokenResponse.access_token,
        });
        login(res.data.accessToken, res.data.user);
        const user = res.data.user;
        if (user?.role === "SUPER_ADMIN" || user?.role === "SuperAdmin") {
          success("Logged in via Google successfully!");
          navigate("/super-admin", { replace: true });
        } else if (
          res.data.requiresJoinCode ||
          user?.accountStatus === "PENDING_COMPANY"
        ) {
          success("Please enter your company join code to continue.");
          navigate("/join-company", { replace: true });
        } else if (
          res.data.requiresPendingApproval ||
          user?.accountStatus === "PENDING_APPROVAL"
        ) {
          navigate("/pending-approval", { replace: true });
        } else if (user?.accountStatus === "REJECTED") {
          navigate("/rejected", { replace: true });
        } else {
          success("Logged in via Google successfully!");
          const dest = from !== "/dashboard" ? from : "/dashboard";
          navigate(dest, { replace: true });
        }
      } catch (err: any) {
        if (
          err.response?.status === 403 &&
          err.response?.data?.accountStatus === "REJECTED"
        ) {
          error(
            "Your join request was rejected. Please contact the company admin.",
          );
          navigate("/rejected", { replace: true });
        } else {
          error(err.response?.data?.message || "Google authentication failed.");
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error("[Google OAuth Error]", errorResponse);
      error("Google Sign-In was cancelled or failed.");
      setIsGoogleLoading(false);
    },
  });

  // Forgot Password Handlers
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      error("Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      success(res.data.message || "OTP sent to your email.");
      if (res.data.devModeCode) {
        setForgotDevOtp(res.data.devModeCode);
      }
      setForgotStep("verify");
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to request reset OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      error("Please enter the 6-digit verification code.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/verify-reset-otp", {
        email: forgotEmail,
        otp: forgotOtp,
      });
      success(res.data.message || "OTP validated successfully.");
      setForgotStep("reset");
    } catch (err: any) {
      error(err.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPassword.length < 6) {
      error("Password must be at least 6 characters long.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotPassword,
      });
      success(res.data.message || "Password reset successfully.");
      setForgotStep("none");
      setForgotEmail("");
      setForgotOtp("");
      setForgotPassword("");
      setForgotDevOtp("");
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (!active) {
    return <div className="hidden" aria-hidden="true" />;
  }

  return (
    <div className="flex flex-col h-full w-full px-6 lg:px-8 py-5 select-none overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <h1 className="text-xl font-bold text-brand-textPrimary mb-0.5">
          {forgotStep !== "none" ? "Reset Password" : "Sign In"}
        </h1>
        <p className="text-xs text-brand-textSecondary">
          {forgotStep !== "none"
            ? "Follow steps to secure your account."
            : "Access your CRM workspace and AI tools."}
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-hide">
        {forgotStep === "none" ? (
          <>
            {/* Google */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 border border-brand-border rounded-xl text-xs font-semibold text-brand-textPrimary hover:bg-brand-bg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs active:scale-[0.99]"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                ) : (
                  <GoogleIcon />
                )}
                <span>
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </span>
              </button>
            </div>

            <Divider />

            <form
              id="login-form-element"
              onSubmit={handleSubmit}
              className="flex flex-col gap-2.5"
              noValidate
              autoComplete="off"
            >
              {/* Chrome Autofill Trap — traps browser credential auto-injection */}
              <input
                type="text"
                name="fake_email_remembered"
                tabIndex={-1}
                className="hidden"
                aria-hidden="true"
                autoComplete="off"
                defaultValue=""
              />
              <input
                type="password"
                name="fake_password_remembered"
                tabIndex={-1}
                className="hidden"
                aria-hidden="true"
                autoComplete="new-password"
                defaultValue=""
              />

              <Field
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={handleEmailChange}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="off"
                required
                error={errors.email}
                touched={touched.email}
              />
              <Field
                label="Password (Max 8 Chars)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                icon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
                maxLength={8}
                error={errors.password}
                touched={touched.password}
              />

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotStep("request")}
                  className="text-brand-primary hover:underline font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-brand-primary text-white rounded-xl font-semibold text-xs hover:bg-brand-secondary transition-all shadow-md shadow-brand-primary/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>
          </>
        ) : forgotStep === "request" ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
            <Field
              label="Registered Email Address"
              type="email"
              placeholder="name@company.com"
              value={forgotEmail}
              onChange={setForgotEmail}
              icon={<Mail className="w-4 h-4" />}
              required
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setForgotStep("none")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={forgotLoading}
              >
                Send Code
              </Button>
            </div>
          </form>
        ) : forgotStep === "verify" ? (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            {forgotDevOtp && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-mono leading-normal">
                <strong>[Dev mode Code]:</strong> {forgotDevOtp}
              </div>
            )}
            <Field
              label="6-Digit Verification OTP"
              placeholder="Enter code"
              value={forgotOtp}
              onChange={setForgotOtp}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setForgotStep("request")}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={forgotLoading}
              >
                Verify Code
              </Button>
            </div>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
              >
                Resend OTP Code
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <Field
              label="Create New Password (Max 8 Chars)"
              type="password"
              placeholder="Min 6 characters"
              value={forgotPassword}
              onChange={setForgotPassword}
              icon={<Lock className="w-4 h-4" />}
              required
              maxLength={8}
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setForgotStep("verify")}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={forgotLoading}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pt-2.5 mt-2 border-t border-brand-border/60 bg-white space-y-2">
        {/* Mobile switch */}
        <p className="lg:hidden text-center text-xs text-brand-textSecondary mt-2">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToRegister}
            className="text-brand-primary font-semibold hover:underline cursor-pointer"
          >
            Create one
          </button>
        </p>

        {/* Desktop account switcher — only visible on lg+ */}
        {forgotStep === "none" && (
          <p className="hidden lg:block text-center text-xs text-brand-textSecondary mt-1">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-brand-primary font-semibold hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        )}

        {/* Back to Home — below account switcher */}
        {forgotStep === "none" && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 rounded-full font-medium text-[11px] transition-all cursor-pointer active:scale-[0.97]"
            >
              ← Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── desktop register form ─── */
interface RegisterFormProps {
  onSwitchToLogin: () => void;
  active?: boolean;
}

function RegisterForm({ onSwitchToLogin, active = true }: RegisterFormProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const res = await api.post("/auth/google-login", {
          accessToken: tokenResponse.access_token,
        });
        login(res.data.accessToken, res.data.user);
        const user = res.data.user;
        if (user?.role === "SUPER_ADMIN" || user?.role === "SuperAdmin") {
          success("Logged in via Google successfully!");
          navigate("/super-admin", { replace: true });
        } else if (
          res.data.requiresJoinCode ||
          user?.accountStatus === "PENDING_COMPANY"
        ) {
          success("Please enter your company join code to continue.");
          navigate("/join-company", { replace: true });
        } else if (
          res.data.requiresPendingApproval ||
          user?.accountStatus === "PENDING_APPROVAL"
        ) {
          navigate("/pending-approval", { replace: true });
        } else if (user?.accountStatus === "REJECTED") {
          navigate("/rejected", { replace: true });
        } else {
          success("Logged in via Google successfully!");
          navigate("/dashboard", { replace: true });
        }
      } catch (err: any) {
        if (
          err.response?.status === 403 &&
          err.response?.data?.accountStatus === "REJECTED"
        ) {
          error(
            "Your join request was rejected. Please contact the company admin.",
          );
          navigate("/rejected", { replace: true });
        } else {
          error(err.response?.data?.message || "Google authentication failed.");
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error("[Google OAuth Error]", errorResponse);
      error("Google Sign-In was cancelled or failed.");
      setIsGoogleLoading(false);
    },
  });

  // Standard user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SalesRep");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Company registration form state
  const [compName, setCompName] = useState("");
  const [compIndustry, setCompIndustry] = useState("Technology");
  const [compSize, setCompSize] = useState("1-10");
  const [compEmail, setCompEmail] = useState("");
  const [compPhone, setCompPhone] = useState("");
  const [compOwnerName, setCompOwnerName] = useState("");
  const [compPassword, setCompPassword] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (touched.fullName) {
      setErrors((prev) => ({
        ...prev,
        fullName: validateField("fullName", v, true),
      }));
    }
  };

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateField("email", v) }));
    }
  };

  const handlePasswordChange = (v: string) => {
    if (v.length > 8) return;
    setPassword(v);
    if (touched.password) {
      setErrors((prev) => ({
        ...prev,
        password: validateField("password", v),
      }));
    }
  };

  const handleCompPhoneChange = (v: string) => {
    const numbersOnly = v.replace(/[^0-9]/g, "");
    if (numbersOnly.length > 10) return;
    setCompPhone(numbersOnly);
  };

  const handleCompPasswordChange = (v: string) => {
    if (v.length > 8) return;
    setCompPassword(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (isCompanyMode) {
      // Strict Company Registration Validation
      if (!compName.trim()) {
        error("Company Name is required.");
        return;
      }
      if (!compEmail.trim()) {
        error("Business Email is required.");
        return;
      }
      if (!compOwnerName.trim()) {
        error("Owner Name is required.");
        return;
      }
      if (!compPassword) {
        error("Password is required.");
        return;
      }
      if (compPassword.length > 8) {
        error("Password cannot exceed 8 characters.");
        return;
      }
      if (compPhone && compPhone.length !== 10) {
        error("Phone number must be exactly 10 digits.");
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.post("/companies/register", {
          companyName: compName,
          businessEmail: compEmail,
          phone: compPhone,
          industry: compIndustry,
          companySize: compSize,
          ownerName: compOwnerName,
          ownerEmail: compEmail,
          password: compPassword,
        });

        if (res.data?.accessToken && res.data?.user) {
          login(res.data.accessToken, res.data.user);
        }
        success(
          "Company registration submitted! Pending Super Admin approval.",
        );
        navigate("/pending-approval", { replace: true });
      } catch (err: any) {
        error(err.response?.data?.message || "Failed to register company.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard User Account Validation
    const newErrors: ValidationErrors = {};
    const nameErr = validateField("fullName", name, true);
    if (nameErr) newErrors.fullName = nameErr;
    const emailErr = validateField("email", email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validateField("password", password);
    if (passErr) newErrors.password = passErr;

    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true });

    if (Object.keys(newErrors).length > 0) {
      const missing: string[] = [];
      if (newErrors.fullName) missing.push("full name");
      if (newErrors.email) missing.push("email address");
      if (newErrors.password) missing.push("password");
      error(
        missing.length === 1
          ? `Please enter your ${missing[0]} to create an account.`
          : `Please fill in your ${missing.join(" and ")} to create an account.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });
      login(res.data.accessToken, res.data.user);
      if (
        res.data.requiresJoinCode ||
        res.data.user?.accountStatus === "PENDING_COMPANY"
      ) {
        success(
          "Account created. Please enter your company join code to continue.",
        );
        navigate("/join-company", { replace: true });
      } else {
        success("Account created! Welcome to AI CRM.");
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!active) {
    return <div className="hidden" aria-hidden="true" />;
  }

  return (
    <div className="flex flex-col h-full w-full px-6 lg:px-8 py-4 select-none overflow-hidden">
      {/* Header with Motion Animation & Styling */}
      <div className="flex-shrink-0 mb-3">
        <AnimatePresence mode="wait">
          {isCompanyMode ? (
            <motion.div
              key="company-header"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-1"
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-blue-600 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                <span>AI CRM WORKSPACE</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-1.5">
                <span>Register New</span>
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                  Company Workspace
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Submit your company registration for platform approval.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="account-header"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-1"
            >
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-[10px] font-bold text-indigo-600 shadow-2xs">
                <Sparkles size={11} className="animate-pulse text-indigo-600" />
                <span>AI CRM PLATFORM</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
                Create Account
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Start your free AI CRM workspace today.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-hide">
        {!isCompanyMode ? (
          <>
            {/* Google */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => loginWithGoogle()}
                disabled={isGoogleLoading}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 border border-brand-border rounded-xl text-xs font-semibold text-brand-textPrimary hover:bg-brand-bg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs active:scale-[0.99]"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                ) : (
                  <GoogleIcon />
                )}
                <span>
                  {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
                </span>
              </button>
            </div>

            <Divider />

            <form
              id="register-personal-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-2"
              noValidate
            >
              <Field
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={handleNameChange}
                icon={<UserIcon className="w-4 h-4" />}
                autoComplete="name"
                required
                error={errors.fullName}
                touched={touched.fullName}
              />
              <Field
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={handleEmailChange}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
                error={errors.email}
                touched={touched.email}
              />
              <Field
                label="Password (Max 8 Chars)"
                type="password"
                placeholder="Pass123#"
                value={password}
                onChange={handlePasswordChange}
                icon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
                maxLength={8}
                error={errors.password}
                touched={touched.password}
              />

              {/* Role selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-brand-textSecondary select-none">
                  Role
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textSecondary pointer-events-none">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full pl-10 pr-4 py-2 text-xs border border-brand-border rounded-xl bg-brand-bg text-brand-textPrimary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary appearance-none transition-all cursor-pointer font-medium"
                  >
                    <option value="SalesRep">Sales Representative</option>
                    <option value="SalesManager">Sales Manager</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-brand-primary text-white rounded-xl font-semibold text-xs hover:bg-brand-secondary transition-all shadow-md shadow-brand-primary/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </>
        ) : (
          <form
            id="register-company-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-2"
            noValidate
          >
            <Field
              label="Company Name *"
              placeholder="e.g. Acme Enterprise"
              value={compName}
              onChange={setCompName}
              icon={<Building2 className="w-4 h-4" />}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-brand-textSecondary mb-1">
                  Industry
                </label>
                <select
                  value={compIndustry}
                  onChange={(e) => setCompIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-xl bg-brand-bg text-brand-textPrimary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-medium"
                >
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Services">Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-textSecondary mb-1">
                  Size
                </label>
                <select
                  value={compSize}
                  onChange={(e) => setCompSize(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border rounded-xl bg-brand-bg text-brand-textPrimary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-medium"
                >
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="500+">500+</option>
                </select>
              </div>
            </div>

            <Field
              label="Business Email *"
              type="email"
              placeholder="owner@company.com"
              value={compEmail}
              onChange={setCompEmail}
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Field
              label="Phone Number (Max 10 Digits)"
              type="tel"
              placeholder="9876543210"
              value={compPhone}
              onChange={handleCompPhoneChange}
              icon={<UserIcon className="w-4 h-4" />}
              maxLength={10}
            />

            <Field
              label="Owner Name *"
              placeholder="John Doe"
              value={compOwnerName}
              onChange={setCompOwnerName}
              icon={<UserIcon className="w-4 h-4" />}
              required
            />

            <Field
              label="Password (Max 8 Chars) *"
              type="password"
              placeholder="Pass123#"
              value={compPassword}
              onChange={handleCompPasswordChange}
              icon={<Lock className="w-4 h-4" />}
              required
              maxLength={8}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 bg-brand-primary text-white rounded-xl font-semibold text-xs hover:bg-brand-secondary transition-all shadow-md shadow-brand-primary/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Register Company Workspace"
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pt-3 mt-2 border-t border-slate-100 bg-white space-y-2">
        <div className="text-center text-[11px] text-slate-500 space-y-1 pt-0.5">
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
            >
              Sign In
            </button>
          </p>

          <p>
            {isCompanyMode ? (
              <>
                Registering as individual employee?{" "}
                <button
                  type="button"
                  onClick={() => setIsCompanyMode(false)}
                  className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Registering a new company?{" "}
                <button
                  type="button"
                  onClick={() => setIsCompanyMode(true)}
                  className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
                >
                  Register Company
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Company Register Modal ─── */
interface CompanyRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CompanyRegisterModal({ isOpen, onClose }: CompanyRegisterModalProps) {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("1-10");
  const [ownerName, setOwnerName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !companyName.trim() ||
      !businessEmail.trim() ||
      !ownerName.trim() ||
      !password
    ) {
      error("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/companies/register", {
        companyName,
        businessEmail,
        phone,
        industry,
        companySize,
        ownerName,
        ownerEmail: businessEmail,
        password,
      });

      if (res.data?.accessToken && res.data?.user) {
        login(res.data.accessToken, res.data.user);
      }
      success("Company registration submitted! Pending Super Admin approval.");
      onClose();
      navigate("/pending-approval", { replace: true });
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to register company.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Register New Company Workspace
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your company registration for platform approval.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form
          id="company-register-modal-form"
          onSubmit={handleSubmit}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Enterprise"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Retail">Retail</option>
                <option value="Services">Services</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Size
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="500+">500+</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Business Email *
            </label>
            <input
              type="email"
              required
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              placeholder="owner@company.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Owner Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-md cursor-pointer disabled:opacity-60"
            >
              {isLoading ? "Submitting..." : "Register Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Mobile/Tablet responsive auth form ─── */
interface MobileAuthFormState {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  rememberMe: boolean;
}

interface MobileAuthProps {
  mode: Mode;
  onSwitchMode: (m: Mode) => void;
  onOpenCompanyModal?: () => void;
  active?: boolean;
}

function MobileAuthSection({
  mode,
  onSwitchMode,
  onOpenCompanyModal,
  active = true,
}: MobileAuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState<MobileAuthFormState>({
    fullName: "",
    email: "",
    password: "",
    role: "SalesRep",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData((prev) => ({ ...prev, email: "", password: "" }));
    const t1 = setTimeout(
      () => setFormData((prev) => ({ ...prev, email: "", password: "" })),
      50,
    );
    const t2 = setTimeout(
      () => setFormData((prev) => ({ ...prev, email: "", password: "" })),
      300,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<
    "none" | "request" | "verify" | "reset"
  >("none");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotDevOtp, setForgotDevOtp] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const isSignup = mode === "register";

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const fieldValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({ ...prev, [name]: fieldValue }));

    if (type !== "checkbox") {
      const err = validateField(name, fieldValue as string, isSignup);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value, isSignup);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const switchMode = (newMode: Mode) => {
    if (mode === newMode) return;
    setIsAnimating(true);
    onSwitchMode(newMode);
    setErrors({});
    setTouched({});
    setSubmittedMessage(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      role: "SalesRep",
      rememberMe: false,
    });
    setTimeout(() => setIsAnimating(false), 280);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const newErrors: ValidationErrors = {};
    const emailErr = validateField("email", formData.email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validateField("password", formData.password);
    if (passErr) newErrors.password = passErr;
    if (isSignup) {
      const nameErr = validateField("fullName", formData.fullName, true);
      if (nameErr) newErrors.fullName = nameErr;
    }

    setErrors(newErrors);
    setTouched({ email: true, password: true, fullName: true, role: true });

    if (Object.keys(newErrors).length > 0) {
      let message = "";
      if (!isSignup) {
        const hasEmailError = !!newErrors.email;
        const hasPasswordError = !!newErrors.password;
        if (hasEmailError && hasPasswordError) {
          message = "Please enter your email and password to sign in.";
        } else if (hasEmailError) {
          message = "Please enter your email address.";
        } else if (hasPasswordError) {
          message = "Please enter your password.";
        }
      } else {
        const missing: string[] = [];
        if (newErrors.fullName) missing.push("full name");
        if (newErrors.email) missing.push("email address");
        if (newErrors.password) missing.push("password");
        message =
          missing.length === 1
            ? `Please enter your ${missing[0]} to create an account.`
            : `Please fill in your ${missing.join(" and ")} to create an account.`;
      }
      setSubmittedMessage({ text: message, type: "error" });
      return;
    }

    setIsLoading(true);
    setSubmittedMessage(null);

    try {
      if (!isSignup) {
        const res = await api.post("/auth/login", {
          email: formData.email,
          password: formData.password,
        });
        login(res.data.accessToken, res.data.user);
        success("Logged in successfully!");
        navigate(from, { replace: true });
      } else {
        const res = await api.post("/auth/register", {
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        login(res.data.accessToken, res.data.user);
        if (
          res.data.requiresJoinCode ||
          res.data.user?.accountStatus === "PENDING_COMPANY"
        ) {
          success(
            "Account created. Please enter your company join code to continue.",
          );
          navigate("/join-company", { replace: true });
        } else {
          success(`Account created successfully as ${formData.role}!`);
          navigate("/dashboard", { replace: true });
        }
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        (isSignup
          ? "Failed to register account."
          : "Invalid email or password.");
      setSubmittedMessage({ text: errMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const res = await api.post("/auth/google-login", {
          accessToken: tokenResponse.access_token,
        });
        login(res.data.accessToken, res.data.user);
        const user = res.data.user;
        if (user?.role === "SUPER_ADMIN" || user?.role === "SuperAdmin") {
          success("Logged in via Google successfully!");
          navigate("/super-admin", { replace: true });
        } else if (
          res.data.requiresJoinCode ||
          user?.accountStatus === "PENDING_COMPANY"
        ) {
          success("Please enter your company join code to continue.");
          navigate("/join-company", { replace: true });
        } else if (
          res.data.requiresPendingApproval ||
          user?.accountStatus === "PENDING_APPROVAL"
        ) {
          navigate("/pending-approval", { replace: true });
        } else if (user?.accountStatus === "REJECTED") {
          navigate("/rejected", { replace: true });
        } else {
          success("Logged in via Google successfully!");
          navigate(from !== "/dashboard" ? from : "/dashboard", {
            replace: true,
          });
        }
      } catch (err: any) {
        if (
          err.response?.status === 403 &&
          err.response?.data?.accountStatus === "REJECTED"
        ) {
          error(
            "Your join request was rejected. Please contact the company admin.",
          );
          navigate("/rejected", { replace: true });
        } else {
          error(err.response?.data?.message || "Google authentication failed.");
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error("[Google OAuth Error]", errorResponse);
      error("Google Sign-In was cancelled or failed.");
      setIsGoogleLoading(false);
    },
  });

  // Mobile Forgot Password handlers
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      error("Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        email: forgotEmail,
      });
      success(res.data.message || "OTP sent to your email.");
      if (res.data.devModeCode) {
        setForgotDevOtp(res.data.devModeCode);
      }
      setForgotStep("verify");
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to request reset OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      error("Please enter the 6-digit verification code.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/verify-reset-otp", {
        email: forgotEmail,
        otp: forgotOtp,
      });
      success(res.data.message || "OTP validated successfully.");
      setForgotStep("reset");
    } catch (err: any) {
      error(err.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPassword.length < 6) {
      error("Password must be at least 6 characters long.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotPassword,
      });
      success(res.data.message || "Password reset successfully.");
      setForgotStep("none");
      setForgotEmail("");
      setForgotOtp("");
      setForgotPassword("");
      setForgotDevOtp("");
    } catch (err: any) {
      error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  const GoogleSvg = () => (
    <svg
      className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0"
      viewBox="0 0 24 24"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );

  if (!active) {
    return <div className="hidden" aria-hidden="true" />;
  }

  return (
    <>
      {/* Clean neutral background — no gradients, no blur tint */}
      <div className="fixed inset-0 z-[41] bg-[#F8FAFC]" />

      {/* Floating animated blobs for mobile/tablet viewports */}
      <div className="fixed inset-0 z-[41] overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-100/40 blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, 50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-100/40 blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-sky-100/30 blur-2xl"
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* ── Layer 3: Form — fixed + flex = guaranteed perfect centering ── */}
      <div className="fixed inset-0 z-[42] overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="relative w-full sm:max-w-md md:max-w-lg">
            {/* Main Glass Card */}
            <div className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_16px_rgba(0,0,0,0.06),_0_24px_64px_rgba(0,0,0,0.12),_0_2px_4px_rgba(0,0,0,0.04)] border border-slate-200/90 overflow-hidden flex flex-col relative">
              {/* ── SIGN IN VIEW ─── */}
              {!isSignup ? (
                <div
                  className={`w-full p-4 sm:p-6 flex flex-col justify-between ${isAnimating ? "opacity-80" : "animate-slide-up"}`}
                >
                  <div>
                    {/* Branding */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                          <Sparkles
                            size={14}
                            className="animate-spin"
                            style={{ animationDuration: "9s" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          AI CRM Suite
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                        <Zap size={10} className="fill-blue-600" />
                        <span>Workspace</span>
                      </span>
                    </div>

                    {/* Title */}
                    <div className="mb-3">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        {forgotStep !== "none" ? "Reset Password" : "Sign In"}
                      </h1>
                      <p className="text-slate-500 text-[11px] sm:text-xs font-medium">
                        {forgotStep !== "none"
                          ? "Follow steps to secure your account."
                          : "AI CRM & Sales Management Platform"}
                      </p>
                    </div>

                    {forgotStep === "none" ? (
                      <>
                        {/* Google Button */}
                        <div className="relative w-full">
                          <button
                            type="button"
                            onClick={() => loginWithGoogle()}
                            disabled={isGoogleLoading}
                            className="w-full py-2 sm:py-2.5 px-3 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 active:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm active:scale-[0.98] group cursor-pointer disabled:opacity-50"
                          >
                            <GoogleSvg />
                            <span>
                              {isGoogleLoading
                                ? "Connecting..."
                                : "Sign in with Google"}
                            </span>
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="relative my-3 flex items-center justify-center">
                          <div className="border-t border-slate-200/80 w-full" />
                          <span className="bg-white px-2.5 text-[10px] text-slate-400 font-medium tracking-wider uppercase absolute">
                            or continue with email
                          </span>
                        </div>

                        {/* Form */}
                        <form
                          onSubmit={handleSubmit}
                          className="space-y-2.5"
                          noValidate
                          autoComplete="off"
                        >
                          {/* Chrome Autofill Trap */}
                          <input
                            type="text"
                            name="fake_email_mob"
                            tabIndex={-1}
                            className="hidden"
                            aria-hidden="true"
                            autoComplete="off"
                            defaultValue=""
                          />
                          <input
                            type="password"
                            name="fake_pass_mob"
                            tabIndex={-1}
                            className="hidden"
                            aria-hidden="true"
                            autoComplete="new-password"
                            defaultValue=""
                          />

                          {/* Email */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                                Email Address
                              </label>
                              {touched.email && errors.email && (
                                <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5 animate-slide-up">
                                  <AlertCircle size={10} />
                                  <span>{errors.email}</span>
                                </span>
                              )}
                            </div>
                            <div className="relative group">
                              <div
                                className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                                  touched.email && errors.email
                                    ? "text-rose-400"
                                    : "text-slate-400 group-focus-within:text-blue-600"
                                }`}
                              >
                                <Mail size={16} />
                              </div>
                              <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                placeholder="name@company.com"
                                autoComplete="off"
                                className={`w-full pl-9 pr-8 py-2 sm:py-2.5 bg-[#f8fafc] border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-sm ${
                                  touched.email && errors.email
                                    ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20 animate-shake"
                                    : touched.email &&
                                        !errors.email &&
                                        formData.email
                                      ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 bg-emerald-50/10"
                                      : "border-slate-200/90 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white"
                                }`}
                              />
                              {touched.email &&
                                !errors.email &&
                                formData.email && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 animate-pop-check pointer-events-none">
                                    <CheckCircle2 size={15} />
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Password */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                                Password (Max 8 Chars)
                              </label>
                              {touched.password && errors.password && (
                                <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5 animate-slide-up">
                                  <AlertCircle size={10} />
                                  <span>{errors.password}</span>
                                </span>
                              )}
                            </div>
                            <div className="relative group">
                              <div
                                className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                                  touched.password && errors.password
                                    ? "text-rose-400"
                                    : "text-slate-400 group-focus-within:text-blue-600"
                                }`}
                              >
                                <Lock size={16} />
                              </div>
                              <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                maxLength={8}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className={`w-full pl-9 pr-9 py-2 sm:py-2.5 bg-[#f8fafc] border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-sm ${
                                  touched.password && errors.password
                                    ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20 animate-shake"
                                    : touched.password &&
                                        !errors.password &&
                                        formData.password
                                      ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                                      : "border-slate-200/90 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                aria-label="Toggle password visibility"
                              >
                                {showPassword ? (
                                  <EyeOff size={16} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Remember Me & Forgot Password */}
                          <div className="flex items-center justify-between pt-0.5">
                            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleInputChange}
                                className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-[11px] sm:text-xs font-medium text-slate-600">
                                Remember me
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setForgotStep("request")}
                              className="text-[11px] sm:text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          </div>

                          {/* Feedback Toast */}
                          {submittedMessage && (
                            <div
                              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 animate-slide-up ${
                                submittedMessage.type === "success"
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                  : "bg-rose-50 border border-rose-200 text-rose-700"
                              }`}
                            >
                              {submittedMessage.type === "success" ? (
                                <CheckCircle2 size={14} className="shrink-0" />
                              ) : (
                                <AlertCircle size={14} className="shrink-0" />
                              )}
                              <span className="font-medium">
                                {submittedMessage.text}
                              </span>
                            </div>
                          )}

                          {/* Submit */}
                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                            >
                              <LogIn size={16} />
                              <span>
                                {isLoading ? "Signing In..." : "Sign In"}
                              </span>
                            </button>
                          </div>
                        </form>
                      </>
                    ) : forgotStep === "request" ? (
                      <form
                        onSubmit={handleRequestOtp}
                        className="flex flex-col gap-3"
                      >
                        <Field
                          label="Registered Email Address"
                          type="email"
                          placeholder="name@company.com"
                          value={forgotEmail}
                          onChange={setForgotEmail}
                          icon={<Mail className="w-4 h-4" />}
                          required
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setForgotStep("none")}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={forgotLoading}
                          >
                            Send Code
                          </Button>
                        </div>
                      </form>
                    ) : forgotStep === "verify" ? (
                      <form
                        onSubmit={handleVerifyOtp}
                        className="flex flex-col gap-3"
                      >
                        {forgotDevOtp && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-mono leading-normal">
                            <strong>[Dev mode Code]:</strong> {forgotDevOtp}
                          </div>
                        )}
                        <Field
                          label="6-Digit Verification OTP"
                          placeholder="Enter code"
                          value={forgotOtp}
                          onChange={setForgotOtp}
                          icon={<Lock className="w-4 h-4" />}
                          required
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setForgotStep("request")}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={forgotLoading}
                          >
                            Verify Code
                          </Button>
                        </div>
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={handleRequestOtp}
                            className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                          >
                            Resend OTP Code
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form
                        onSubmit={handleResetPassword}
                        className="flex flex-col gap-3"
                      >
                        <Field
                          label="Create New Password (Max 8 Chars)"
                          type="password"
                          placeholder="Min 6 characters"
                          value={forgotPassword}
                          onChange={setForgotPassword}
                          icon={<Lock className="w-4 h-4" />}
                          required
                          maxLength={8}
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setForgotStep("verify")}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={forgotLoading}
                          >
                            Update Password
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Bottom Switcher */}
                  <div className="mt-3 pt-2 border-t border-slate-100/80 text-center flex-shrink-0 flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
                      >
                        Sign Up
                      </button>
                    </p>
                    {forgotStep === "none" && (
                      <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="inline-flex items-center gap-1.5 px-5 py-1.5 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 rounded-full font-medium text-[11px] transition-all cursor-pointer active:scale-[0.97]"
                      >
                        ← Back to Home
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ── SIGN UP VIEW ─── */
                <div
                  className={`w-full p-4 sm:p-6 flex flex-col justify-between ${isAnimating ? "opacity-80" : "animate-slide-up"}`}
                >
                  <div>
                    {/* Branding */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                          <Sparkles
                            size={14}
                            className="animate-spin"
                            style={{ animationDuration: "9s" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          AI CRM Suite
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                        <ShieldCheck size={11} />
                        <span>14-Day Trial</span>
                      </span>
                    </div>

                    {/* Title */}
                    <div className="mb-2.5">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Create Account
                      </h1>
                      <p className="text-slate-500 text-[11px] sm:text-xs font-medium">
                        Get started with your CRM workspace
                      </p>
                    </div>

                    {/* Google Button */}
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => loginWithGoogle()}
                        disabled={isGoogleLoading}
                        className="w-full py-2 sm:py-2.5 px-3 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50/80 active:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm active:scale-[0.98] group cursor-pointer disabled:opacity-50"
                      >
                        <GoogleSvg />
                        <span>
                          {isGoogleLoading
                            ? "Connecting..."
                            : "Sign up with Google"}
                        </span>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-2.5 flex items-center justify-center">
                      <div className="border-t border-slate-200/80 w-full" />
                      <span className="bg-white px-2.5 text-[10px] text-slate-400 font-medium tracking-wider uppercase absolute">
                        or continue with email
                      </span>
                    </div>

                    {/* Form */}
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-2"
                      noValidate
                    >
                      {/* Full Name */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                            Full Name
                          </label>
                          {touched.fullName && errors.fullName && (
                            <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5 animate-slide-up">
                              <AlertCircle size={10} />
                              <span>{errors.fullName}</span>
                            </span>
                          )}
                        </div>
                        <div className="relative group">
                          <div
                            className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                              touched.fullName && errors.fullName
                                ? "text-rose-400"
                                : "text-slate-400 group-focus-within:text-blue-600"
                            }`}
                          >
                            <UserIcon size={16} />
                          </div>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="John Doe"
                            autoComplete="name"
                            className={`w-full pl-9 pr-8 py-2 bg-[#f8fafc] border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-sm ${
                              touched.fullName && errors.fullName
                                ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20 animate-shake"
                                : touched.fullName &&
                                    !errors.fullName &&
                                    formData.fullName
                                  ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 bg-emerald-50/10"
                                  : "border-slate-200/90 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white"
                            }`}
                          />
                          {touched.fullName &&
                            !errors.fullName &&
                            formData.fullName && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 animate-pop-check pointer-events-none">
                                <CheckCircle2 size={15} />
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                            Email Address
                          </label>
                          {touched.email && errors.email && (
                            <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5 animate-slide-up">
                              <AlertCircle size={10} />
                              <span>{errors.email}</span>
                            </span>
                          )}
                        </div>
                        <div className="relative group">
                          <div
                            className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                              touched.email && errors.email
                                ? "text-rose-400"
                                : "text-slate-400 group-focus-within:text-blue-600"
                            }`}
                          >
                            <Mail size={16} />
                          </div>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="name@company.com"
                            autoComplete="email"
                            className={`w-full pl-9 pr-8 py-2 bg-[#f8fafc] border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-sm ${
                              touched.email && errors.email
                                ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20 animate-shake"
                                : touched.email &&
                                    !errors.email &&
                                    formData.email
                                  ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 bg-emerald-50/10"
                                  : "border-slate-200/90 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white"
                            }`}
                          />
                          {touched.email && !errors.email && formData.email && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-500 animate-pop-check pointer-events-none">
                              <CheckCircle2 size={15} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="block text-[11px] sm:text-xs font-semibold text-slate-700">
                            Password (Max 8 Chars)
                          </label>
                          {touched.password && errors.password && (
                            <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5 animate-slide-up">
                              <AlertCircle size={10} />
                              <span>{errors.password}</span>
                            </span>
                          )}
                        </div>
                        <div className="relative group">
                          <div
                            className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                              touched.password && errors.password
                                ? "text-rose-400"
                                : "text-slate-400 group-focus-within:text-blue-600"
                            }`}
                          >
                            <Lock size={16} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            maxLength={8}
                            placeholder="Pass123#"
                            autoComplete="new-password"
                            className={`w-full pl-9 pr-9 py-2 bg-[#f8fafc] border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-medium shadow-sm ${
                              touched.password && errors.password
                                ? "border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-400/20 animate-shake"
                                : touched.password &&
                                    !errors.password &&
                                    formData.password
                                  ? "border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                                  : "border-slate-200/90 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-0.5">
                          Select User Role
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                            <Briefcase size={16} />
                          </div>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="w-full pl-9 pr-8 py-2 bg-[#f8fafc] border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white transition-all font-medium appearance-none cursor-pointer shadow-sm"
                          >
                            <option value="SalesRep">
                              Sales Representative (SalesRep)
                            </option>
                            <option value="SalesManager">Sales Manager</option>
                            <option value="Admin">Administrator (Admin)</option>
                            <option value="SuperAdmin">
                              Super Administrator (SuperAdmin)
                            </option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <ShieldAlert size={15} />
                          </div>
                        </div>
                      </div>

                      {/* Feedback Toast */}
                      {submittedMessage && (
                        <div
                          className={`p-2 rounded-lg text-xs flex items-center gap-1.5 animate-slide-up ${
                            submittedMessage.type === "success"
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                              : "bg-rose-50 border border-rose-200 text-rose-700"
                          }`}
                        >
                          {submittedMessage.type === "success" ? (
                            <CheckCircle2 size={14} className="shrink-0" />
                          ) : (
                            <AlertCircle size={14} className="shrink-0" />
                          )}
                          <span className="font-medium">
                            {submittedMessage.text}
                          </span>
                        </div>
                      )}

                      {/* Submit */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          <Check size={16} />
                          <span>
                            {isLoading ? "Creating Account..." : "Sign Up"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Bottom Switcher */}
                  <div className="mt-3 pt-2 border-t border-slate-100/80 text-center space-y-1">
                    <p className="text-xs text-slate-500 font-medium">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() =>
                          onSwitchMode(
                            mode === "register" ? "login" : "register",
                          )
                        }
                        className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
                      >
                        {mode === "register" ? "Sign In" : "Create Account"}
                      </button>
                    </p>

                    <p className="text-xs text-slate-500 font-medium">
                      Registering a new company?{" "}
                      <button
                        type="button"
                        onClick={onOpenCompanyModal}
                        className="text-blue-600 font-bold hover:underline cursor-pointer focus:outline-none"
                      >
                        Register Company
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* /glass card */}
          </div>
          {/* /width limiter */}
        </div>
        {/* /min-h-full centering */}
      </div>
      {/* /form layer */}
    </>
  );
}

/* ─────────────────────────────────── main AuthPage ─── */
interface AuthPageProps {
  initialMode?: Mode;
}

export const AuthPage = ({ initialMode = "login" }: AuthPageProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  // Initialize synchronously so the correct layout is painted on first render.
  // This prevents the flash where both forms appear in the DOM simultaneously.
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") return window.innerWidth < 1024;
    return false;
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    navigate(m === "login" ? "/login" : "/register", { replace: true });
  };

  const isLogin = mode === "login";

  return (
    <>
      <CompanyRegisterModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      {/* ── MOBILE / TABLET VIEW (hidden on lg+) ── */}
      <div className="lg:hidden">
        {isMobile && (
          <MobileAuthSection
            mode={mode}
            onSwitchMode={(m) => {
              setMode(m);
              navigate(m === "login" ? "/login" : "/register", {
                replace: true,
              });
            }}
            onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
            active={isMobile}
          />
        )}
      </div>

      {/* ── DESKTOP VIEW (hidden below lg) — Original design fully preserved ── */}
      <div className="hidden lg:flex min-h-screen w-full items-center justify-center bg-[#F1F5F9] relative overflow-hidden p-4">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[50%] bg-brand-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[50%] bg-indigo-400/8 rounded-full blur-3xl" />
        </div>

        {/* Medium-sized Card Container */}
        <div className="relative w-full max-w-[760px] h-[520px] max-h-[92vh] bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.06),_0_24px_64px_rgba(0,0,0,0.12),_0_2px_4px_rgba(0,0,0,0.04)] overflow-hidden flex border border-brand-border/60">
          {/* ── DESKTOP SPLIT LAYOUT ─── */}
          <div className="flex w-full h-full relative">
            {/* Login form panel */}
            <div
              className={`absolute inset-y-0 flex transition-all duration-500 ease-in-out ${isLogin ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              style={{ width: "55%", left: 0 }}
            >
              {!isMobile && (
                <LoginForm
                  onSwitchToRegister={() => switchMode("register")}
                  active={!isMobile}
                />
              )}
            </div>

            {/* Register form panel */}
            <div
              className={`absolute inset-y-0 flex transition-all duration-500 ease-in-out ${!isLogin ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              style={{ width: "55%", left: isLogin ? 0 : "45%" }}
            >
              {!isMobile && (
                <RegisterForm
                  onSwitchToLogin={() => switchMode("login")}
                  active={!isMobile}
                />
              )}
            </div>

            {/* Sliding brand panel */}
            <div
              className="absolute top-0 bottom-0 w-[45%] h-full transition-all duration-500 ease-in-out"
              style={{ left: isLogin ? "55%" : "0%" }}
            >
              <BrandPanel
                mode={mode}
                onSwitch={() => switchMode(isLogin ? "register" : "login")}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* Named re-exports for backward compat with existing Login/Register route imports */
export const Login = () => <AuthPage initialMode="login" />;
export const Register = () => <AuthPage initialMode="register" />;

export default AuthPage;
