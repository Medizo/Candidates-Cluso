"use client";

import { FormEvent, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LockKeyhole, Mail, Sparkles, KeyRound, ArrowLeft, ShieldCheck, Timer, Send, Eye, EyeOff, UserPlus, Phone, User, ChevronDown } from "lucide-react";

import { MOBILE_COUNTRY_CODE_OPTIONS } from "@/lib/mobilePhone";

type LoginMode = "password" | "otp" | "signup";
type OtpStep = "email" | "verify";
type SignupStep = "form" | "verify";

const SIGNUP_COUNTRY_CODES = [
  "+91",
  ...MOBILE_COUNTRY_CODE_OPTIONS.filter((code) => code !== "+91"),
];

export default function LoginPage() {
  const router = useRouter();

  // Shared
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("password");

  // Password mode
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [otpSentMessage, setOtpSentMessage] = useState("");
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Signup mode
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupCountryCode, setSignupCountryCode] = useState("+91");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupOtpDigits, setSignupOtpDigits] = useState(["", "", "", "", "", ""]);
  const [signupCountdown, setSignupCountdown] = useState(0);
  const [signupOtpMessage, setSignupOtpMessage] = useState("");
  const signupOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Custom Country Code Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Transformer Card Unfold Animation State
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const cardContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardContentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setCardHeight(entry.target.getBoundingClientRect().height);
        }
      });
      resizeObserver.observe(cardContentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Countdown timer for signup OTP resend
  useEffect(() => {
    if (signupCountdown <= 0) return;
    const timer = setInterval(() => {
      setSignupCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [signupCountdown]);

  // ---------- Password Login ----------
  async function onPasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = res.status >= 500 ? "Server error. Please try again." : "Login failed";
        const rawError = (await res.text()).trim();

        if (rawError) {
          try {
            const data = JSON.parse(rawError) as { error?: string; message?: string };
            message = data.error?.trim() || data.message?.trim() || message;
          } catch {
            if (!rawError.startsWith("<")) {
              message = rawError;
            }
          }
        }

        setError(message);
        return;
      }

      const data = (await res.json()) as { mustChangePassword?: boolean };
      router.push(data.mustChangePassword ? "/dashboard/profile?focus=password-change" : "/dashboard");
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- OTP: Send ----------
  async function sendOtp(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setOtpSentMessage("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Failed to send OTP. Please try again.");
        return;
      }

      setOtpStep("verify");
      setOtpDigits(["", "", "", "", "", ""]);
      setCountdown(300); // 5-minute countdown
      setOtpSentMessage("Verification code sent to your email.");

      // Focus the first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- OTP: Verify ----------
  async function verifyOtp(code?: string) {
    const otp = typeof code === "string" ? code : otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Verification failed. Please try again.");
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
        return;
      }

      const data = (await res.json()) as { mustChangePassword?: boolean };
      router.push(data.mustChangePassword ? "/dashboard/profile?focus=password-change" : "/dashboard");
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Signup: Submit ----------
  async function onSignupSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          phone: `${signupCountryCode} ${signupPhone}`.trim(),
          password: signupPassword,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

      setSignupStep("verify");
      setSignupOtpDigits(["", "", "", "", "", ""]);
      setSignupCountdown(300);
      setSignupOtpMessage("Verification code sent to your email.");

      setTimeout(() => {
        signupOtpRefs.current[0]?.focus();
      }, 100);
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Signup: Verify OTP ----------
  async function verifySignupOtp(code?: string) {
    const otp = typeof code === "string" ? code : signupOtpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, otp }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Verification failed. Please try again.");
        setSignupOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => signupOtpRefs.current[0]?.focus(), 50);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Signup: Resend OTP ----------
  async function resendSignupOtp() {
    setLoading(true);
    setError("");
    setSignupOtpMessage("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          phone: `${signupCountryCode} ${signupPhone}`.trim(),
          password: signupPassword,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Failed to resend OTP. Please try again.");
        return;
      }

      setSignupOtpDigits(["", "", "", "", "", ""]);
      setSignupCountdown(300);
      setSignupOtpMessage("New verification code sent to your email.");
      setTimeout(() => signupOtpRefs.current[0]?.focus(), 100);
    } catch {
      setError("Could not reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- OTP: Digit Input Handling ----------
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, "").slice(-1);
      const newDigits = [...otpDigits];
      newDigits[index] = digit;
      setOtpDigits(newDigits);
      setError("");

      // Auto-focus next input
      if (digit && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits are filled
      if (digit && index === 5) {
        const complete = newDigits.join("");
        if (complete.length === 6) {
          // Small delay to let state update render
          setTimeout(() => verifyOtp(complete), 50);
        }
      }
    },
    [otpDigits, email],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
      if (e.key === "Enter") {
        const complete = otpDigits.join("");
        verifyOtp(complete);
      }
    },
    [otpDigits, email],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;

      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);

      // Focus the next empty or last input
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      // Auto-submit if all 6 digits pasted
      if (pasted.length === 6) {
        setTimeout(() => verifyOtp(pasted), 50);
      }
    },
    [email],
  );

  // ---------- Signup OTP: Digit Input Handling ----------
  const handleSignupOtpChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const newDigits = [...signupOtpDigits];
      newDigits[index] = digit;
      setSignupOtpDigits(newDigits);
      setError("");

      if (digit && index < 5) {
        signupOtpRefs.current[index + 1]?.focus();
      }

      if (digit && index === 5) {
        const complete = newDigits.join("");
        if (complete.length === 6) {
          setTimeout(() => verifySignupOtp(complete), 50);
        }
      }
    },
    [signupOtpDigits, signupEmail],
  );

  const handleSignupOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !signupOtpDigits[index] && index > 0) {
        signupOtpRefs.current[index - 1]?.focus();
      }
      if (e.key === "Enter") {
        const complete = signupOtpDigits.join("");
        verifySignupOtp(complete);
      }
    },
    [signupOtpDigits, signupEmail],
  );

  const handleSignupOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;

      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setSignupOtpDigits(newDigits);

      const nextIndex = Math.min(pasted.length, 5);
      signupOtpRefs.current[nextIndex]?.focus();

      if (pasted.length === 6) {
        setTimeout(() => verifySignupOtp(pasted), 50);
      }
    },
    [signupEmail],
  );

  // ---------- Mode switching ----------
  function switchMode(mode: LoginMode) {
    setLoginMode(mode);
    setError("");
    setOtpStep("email");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpSentMessage("");
    setCountdown(0);
    // Reset signup state
    setSignupStep("form");
    setSignupOtpDigits(["", "", "", "", "", ""]);
    setSignupOtpMessage("");
    setSignupCountdown(0);
  }

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative bg-[#F8F9FA] overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-green-100 rounded-full blur-[80px] opacity-60"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 items-stretch">
        {/* Info & Image panel */}
        <div className="hidden lg:flex flex-col relative w-full h-full rounded-3xl overflow-hidden bg-white/40 backdrop-blur-xl shadow-2xl border border-white/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-emerald-50/50 mix-blend-overlay"></div>
          
          <div className="p-10 pb-4 shrink-0 flex flex-col z-10 relative">
            <div className="mb-8">
              <Image
                src="/images/cluso-infolink-logo.png"
                alt="Cluso Infolink Verification Network"
                width={260}
                height={48}
                className="h-12 w-auto object-contain drop-shadow-sm"
                priority
              />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight drop-shadow-sm">
              Candidate<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Workspace</span>
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-md font-medium">
              Seamlessly complete assigned service forms, track verification outcomes, and efficiently manage your professional identity profile.
            </p>
          </div>
          
          <div className="relative flex-1 w-full mt-4 flex items-end justify-center bg-white rounded-3xl overflow-hidden shadow-inner">
            <Image
              src="/images/Login-sitiing.jpg"
              alt="Candidate Workspace"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain object-bottom p-6 drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-in-out origin-bottom rounded-3xl"
            />
          </div>
        </div>

        {/* Login Form panel */}
        <div className="relative flex flex-col justify-center w-full">
          {/* Subtle glowing orb effect behind the form */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-[80px] pointer-events-none opacity-50 z-0"></div>

          <div
            style={{ height: cardHeight ? `${cardHeight}px` : "auto" }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] relative z-10 flex flex-col justify-center transition-[height] duration-500 ease-in-out overflow-hidden transform hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] w-full"
          >
            <div ref={cardContentRef} className="p-10 sm:p-14 lg:p-16 flex flex-col justify-center w-full">
          
          <div className="mb-8 relative z-10">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
              {loginMode === "signup" ? "Create Account" : "Access Portal"}
            </h2>
            <p className="text-gray-500 text-base font-medium">
              {loginMode === "signup"
                ? "Sign up to create your candidate profile and get started."
                : "Please authenticate to continue to your candidate dashboard."}
            </p>
          </div>

          {/* Login Mode Tabs */}
          {loginMode !== "signup" && (
            <div className="relative z-10 mb-8">
              <div className="flex bg-gray-100/80 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 ${
                    loginMode === "password"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200/60"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/40"
                  }`}
                >
                  <LockKeyhole size={16} strokeWidth={2.5} />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("otp")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 ${
                    loginMode === "otp"
                      ? "bg-white text-gray-900 shadow-md shadow-gray-200/60"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/40"
                  }`}
                >
                  <KeyRound size={16} strokeWidth={2.5} />
                  OTP Login
                </button>
              </div>
            </div>
          )}

          {/* ==================== PASSWORD MODE ==================== */}
          {loginMode === "password" && (
            <form onSubmit={onPasswordSubmit} className="space-y-7 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-3 group">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-3" htmlFor="email">
                  <Mail size={18} strokeWidth={2.5} /> Identity Email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={22} strokeWidth={2} />
                  </div>
                  <input
                    id="email"
                    className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-lg hover:border-blue-300"
                    type="email"
                    placeholder="candidate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 group">
                <label className="text-sm font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-3" htmlFor="password">
                  <LockKeyhole size={18} strokeWidth={2.5} /> Security Key
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <LockKeyhole size={22} strokeWidth={2} />
                  </div>
                  <input
                    id="password"
                    className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-lg tracking-wide hover:border-blue-300"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none cursor-pointer"
                    style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="mt-0.5">
                    <LockKeyhole size={18} className="text-red-500" />
                  </div>
                  <div className="font-medium leading-relaxed">{error}</div>
                </div>
              )}

              <button 
                className="w-full py-4.5 px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(59,130,246,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.7)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-8 flex items-center justify-center gap-3 tracking-wide" 
                disabled={loading}
              >
                <Sparkles size={22} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                {loading ? "Authenticating Session..." : "Initialize Session"}
              </button>
              
              <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500 font-medium">
                  Don&apos;t have an account? <button type="button" onClick={() => switchMode("signup")} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all">Sign up here</button>
                </p>
              </div>
            </form>
          )}

          {/* ==================== OTP MODE ==================== */}
          {loginMode === "otp" && (
            <div className="space-y-7 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* OTP Step 1: Enter Email */}
              {otpStep === "email" && (
                <form onSubmit={sendOtp} className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-100">
                      <ShieldCheck size={22} className="text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Passwordless Login</p>
                      <p className="text-xs text-gray-500">We&apos;ll send a 6-digit code to your email</p>
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <label className="text-sm font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-3" htmlFor="otp-email">
                      <Mail size={18} strokeWidth={2.5} /> Identity Email
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Mail size={22} strokeWidth={2} />
                      </div>
                      <input
                        id="otp-email"
                        className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-lg hover:border-blue-300"
                        type="email"
                        placeholder="candidate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                      <div className="mt-0.5">
                        <ShieldCheck size={18} className="text-red-500" />
                      </div>
                      <div className="font-medium leading-relaxed">{error}</div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4.5 px-6 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.6)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-3 tracking-wide"
                    disabled={loading}
                  >
                    <Send size={20} className={loading ? "animate-pulse" : ""} strokeWidth={2.5} />
                    {loading ? "Sending Code..." : "Send Verification Code"}
                  </button>

                  <div className="mt-8 text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500 font-medium">
                      Don&apos;t have an account? <button type="button" onClick={() => switchMode("signup")} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all">Sign up here</button>
                    </p>
                  </div>
                </form>
              )}

              {/* OTP Step 2: Enter OTP Code */}
              {otpStep === "verify" && (
                <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email");
                      setError("");
                      setOtpDigits(["", "", "", "", "", ""]);
                      setOtpSentMessage("");
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-semibold transition-colors group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Change email
                  </button>

                  {/* Success message */}
                  {otpSentMessage && (
                    <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl shadow-sm flex items-start gap-3 text-emerald-700 text-sm">
                      <div className="mt-0.5">
                        <ShieldCheck size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">{otpSentMessage}</p>
                        <p className="text-emerald-600/70 text-xs mt-1">Sent to <strong>{email}</strong></p>
                      </div>
                    </div>
                  )}

                  {/* OTP digit inputs */}
                  <div>
                    <label className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-3 mb-4">
                      <KeyRound size={18} strokeWidth={2.5} /> Enter Verification Code
                    </label>
                    <div className="flex justify-center gap-3">
                      {otpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpInputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={index === 0 ? handleOtpPaste : undefined}
                          className={`w-14 h-16 text-center text-2xl font-extrabold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                            digit
                              ? "border-blue-400 bg-blue-50/50 text-blue-900 focus:ring-blue-500/20 focus:border-blue-500"
                              : "border-gray-200 bg-gray-50/50 text-gray-900 focus:ring-blue-500/10 focus:border-blue-500 hover:border-blue-300"
                          }`}
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Countdown timer */}
                  {countdown > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Timer size={16} className="text-amber-500" />
                      <span className="font-medium">
                        Code expires in <span className="text-amber-600 font-bold tabular-nums">{formatCountdown(countdown)}</span>
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                      <div className="mt-0.5">
                        <ShieldCheck size={18} className="text-red-500" />
                      </div>
                      <div className="font-medium leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={() => verifyOtp()}
                    className="w-full py-4.5 px-6 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.6)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 tracking-wide"
                    disabled={loading || otpDigits.join("").length !== 6}
                  >
                    <Sparkles size={22} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                    {loading ? "Verifying..." : "Verify & Login"}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500 font-medium">
                      Didn&apos;t receive the code?{" "}
                      {countdown > 0 ? (
                        <span className="text-gray-400">Resend in {formatCountdown(countdown)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => sendOtp()}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all disabled:opacity-50"
                        >
                          Resend Code
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== SIGNUP MODE ==================== */}
          {loginMode === "signup" && (
            <div className="space-y-7 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Signup Step 1: Registration Form */}
              {signupStep === "form" && (
                <form onSubmit={onSignupSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100">
                      <UserPlus size={22} className="text-violet-600" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">New Candidate Account</p>
                      <p className="text-xs text-gray-500">We&apos;ll verify your email with a 6-digit code</p>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2 group">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-2" htmlFor="signup-name">
                      <User size={15} strokeWidth={2.5} /> Full Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <User size={20} strokeWidth={2} />
                      </div>
                      <input
                        id="signup-name"
                        className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-base hover:border-blue-300"
                        type="text"
                        placeholder="Name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                        minLength={2}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2 group">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-2" htmlFor="signup-email">
                      <Mail size={15} strokeWidth={2.5} /> Email Address
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Mail size={20} strokeWidth={2} />
                      </div>
                      <input
                        id="signup-email"
                        className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-base hover:border-blue-300"
                        type="email"
                        placeholder="candidate@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2 group">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-2" htmlFor="signup-phone">
                      <Phone size={15} strokeWidth={2.5} /> Phone Number
                    </label>
                    <div className="flex gap-2">
                      {/* Custom dropdown */}
                      <div ref={dropdownRef} className="relative w-28 shrink-0 select-none">
                        <button
                          type="button"
                          onClick={() => setDropdownOpen((prev) => !prev)}
                          className="w-full flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-3 py-3.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-base hover:border-blue-300 dark:hover:border-slate-600 cursor-pointer"
                        >
                          <span className="flex-1 text-center pr-1">{signupCountryCode}</span>
                          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>
                        {dropdownOpen && (
                          <div className="absolute left-0 mt-1.5 w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-y-auto max-h-[180px] py-1 divide-y divide-gray-50 dark:divide-slate-700/50 animate-in fade-in slide-in-from-top-1 duration-150">
                            {SIGNUP_COUNTRY_CODES.map((code) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => {
                                  setSignupCountryCode(code);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full text-center py-2 px-3 hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-900 dark:text-gray-100 font-semibold transition-colors text-sm ${
                                  signupCountryCode === code ? "bg-blue-50/70 dark:bg-slate-700/70 text-blue-600 dark:text-blue-400 font-bold" : ""
                                }`}
                              >
                                {code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1 flex items-center">
                        <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <Phone size={20} strokeWidth={2} />
                        </div>
                        <input
                          id="signup-phone"
                          className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-base hover:border-blue-300"
                          type="tel"
                          placeholder="9876543210"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          required
                          minLength={10}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2 group">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 group-focus-within:text-blue-600 transition-colors flex items-center gap-2" htmlFor="signup-password">
                      <LockKeyhole size={15} strokeWidth={2.5} /> Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <LockKeyhole size={20} strokeWidth={2} />
                      </div>
                      <input
                        id="signup-password"
                        className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-xl pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-base tracking-wide hover:border-blue-300"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Minimum 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        className="absolute right-4 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      >
                        {showSignupPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="mt-0.5">
                        <UserPlus size={18} className="text-red-500" />
                      </div>
                      <div className="font-medium leading-relaxed">{error}</div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 px-6 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(139,92,246,0.6)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3 tracking-wide"
                    disabled={loading}
                  >
                    <Send size={20} className={loading ? "animate-pulse" : ""} strokeWidth={2.5} />
                    {loading ? "Sending Verification..." : "Create Account & Verify"}
                  </button>

                  <div className="mt-6 text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500 font-medium">
                      Already have an account? <button type="button" onClick={() => switchMode("password")} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all">Login here</button>
                    </p>
                  </div>
                </form>
              )}

              {/* Signup Step 2: OTP Verification */}
              {signupStep === "verify" && (
                <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignupStep("form");
                      setError("");
                      setSignupOtpDigits(["", "", "", "", "", ""]);
                      setSignupOtpMessage("");
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 font-semibold transition-colors group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to form
                  </button>

                  {/* Success message */}
                  {signupOtpMessage && (
                    <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl shadow-sm flex items-start gap-3 text-emerald-700 text-sm">
                      <div className="mt-0.5">
                        <ShieldCheck size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">{signupOtpMessage}</p>
                        <p className="text-emerald-600/70 text-xs mt-1">Sent to <strong>{signupEmail}</strong></p>
                      </div>
                    </div>
                  )}

                  {/* OTP digit inputs */}
                  <div>
                    <label className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-3 mb-4">
                      <KeyRound size={18} strokeWidth={2.5} /> Enter Verification Code
                    </label>
                    <div className="flex justify-center gap-3">
                      {signupOtpDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { signupOtpRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleSignupOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleSignupOtpKeyDown(index, e)}
                          onPaste={index === 0 ? handleSignupOtpPaste : undefined}
                          className={`w-14 h-16 text-center text-2xl font-extrabold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-4 ${
                            digit
                              ? "border-violet-400 bg-violet-50/50 text-violet-900 focus:ring-violet-500/20 focus:border-violet-500"
                              : "border-gray-200 bg-gray-50/50 text-gray-900 focus:ring-violet-500/10 focus:border-violet-500 hover:border-violet-300"
                          }`}
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Countdown timer */}
                  {signupCountdown > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Timer size={16} className="text-amber-500" />
                      <span className="font-medium">
                        Code expires in <span className="text-amber-600 font-bold tabular-nums">{formatCountdown(signupCountdown)}</span>
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                      <div className="mt-0.5">
                        <ShieldCheck size={18} className="text-red-500" />
                      </div>
                      <div className="font-medium leading-relaxed">{error}</div>
                    </div>
                  )}

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={() => verifySignupOtp()}
                    className="w-full py-4.5 px-6 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(139,92,246,0.6)] transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 tracking-wide"
                    disabled={loading || signupOtpDigits.join("").length !== 6}
                  >
                    <Sparkles size={22} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                    {loading ? "Creating Account..." : "Verify & Create Account"}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center border-t border-gray-100 pt-6">
                    <p className="text-sm text-gray-500 font-medium">
                      Didn&apos;t receive the code?{" "}
                      {signupCountdown > 0 ? (
                        <span className="text-gray-400">Resend in {formatCountdown(signupCountdown)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={resendSignupOtp}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-all disabled:opacity-50"
                        >
                          Resend Code
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
