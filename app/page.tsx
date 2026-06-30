"use client";

import { FormEvent, useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Read from URL parameters to prefill signup
  useEffect(() => {
    const mode = searchParams.get("mode");
    const name = searchParams.get("name");
    const urlEmail = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (mode === "signup") {
      setLoginMode("signup");
      if (name) setSignupName(name);
      if (urlEmail) {
        setSignupEmail(urlEmail);
        setEmail(urlEmail);
      }
      if (phone) {
        // Try to extract country code (e.g. +91 9876543210 or +919876543210)
        const matches = phone.match(/^(\+\d{1,4})\s*(.*)$/);
        if (matches) {
          setSignupCountryCode(matches[1]);
          setSignupPhone(matches[2].replace(/\D/g, ""));
        } else {
          setSignupPhone(phone.replace(/\D/g, ""));
        }
      }
    }
  }, [searchParams]);

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
    <main className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-background via-background to-[#dbeafe]/30 overflow-hidden font-sans text-on-background">
      {/* Drifting Background Blobs for Glassmorphic Depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[radial-gradient(circle_at_center,var(--primary-glow)_0%,transparent_70%)] rounded-full blur-[80px] animate-drift pointer-events-none opacity-45" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[radial-gradient(circle_at_center,var(--primary-glow)_0%,transparent_70%)] rounded-full blur-[80px] animate-drift-reverse pointer-events-none opacity-45" />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 p-6 items-stretch">
        {/* Info & Image panel (Left Card) */}
        <div className="hidden lg:flex flex-col relative w-full h-full rounded-3xl overflow-hidden bg-surface/75 backdrop-blur-md shadow-2xl border border-outline/35 transition-all duration-500 hover:border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-emerald-50/5 pointer-events-none"></div>
          
          <div className="p-10 pb-4 shrink-0 flex flex-col z-10 relative">
            <div className="mb-8">
              <Image
                src="/images/cluso-infolink-logo.png"
                alt="Cluso Infolink Verification Network"
                width={260}
                height={48}
                className="h-12 w-auto object-contain drop-shadow-sm filter dark:invert"
                priority
              />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-on-background mb-6 leading-tight drop-shadow-sm font-display-lg">
              Candidate<br /><span className="text-gradient-primary">Workspace</span>
            </h1>
            <p className="text-on-background/80 text-lg leading-relaxed max-w-md font-semibold">
              Seamlessly complete assigned service forms, track verification outcomes, and efficiently manage your professional identity profile.
            </p>
          </div>
          
          {/* Vector SVG Workspace Illustration */}
          <div className="relative flex-1 w-full mt-4 flex items-center justify-center p-8 bg-surface-container-low/40 rounded-t-3xl overflow-hidden shadow-inner">
            <svg viewBox="0 0 500 400" className="w-full h-full object-contain max-h-[320px] drop-shadow-xl hover:scale-[1.03] transition-transform duration-500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background soft tech shapes */}
              <circle cx="250" cy="200" r="140" fill="url(#bg-sphere-grad)" opacity="0.4" />
              <path d="M 80,120 Q 200,60 380,100" stroke="url(#line-grad-1)" strokeWidth="3" strokeDasharray="6 6" opacity="0.6" />
              <path d="M 120,320 Q 280,360 420,280" stroke="url(#line-grad-2)" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.5" />
              
              <defs>
                <linearGradient id="bg-sphere-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="line-grad-1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="line-grad-2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="shield-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="checkmark-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Floating verification card (left) */}
              <g transform="translate(60, 110)" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.06))">
                <rect width="130" height="90" rx="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                {/* Header bar */}
                <rect x="12" y="12" width="40" height="8" rx="4" fill="#2563eb" opacity="0.85" />
                <circle cx="118" cy="16" r="4" fill="#10b981" />
                {/* Text lines */}
                <rect x="12" y="32" width="106" height="5" rx="2.5" fill="#f1f5f9" />
                <rect x="12" y="44" width="80" height="5" rx="2.5" fill="#f1f5f9" />
                <rect x="12" y="56" width="95" height="5" rx="2.5" fill="#f1f5f9" />
                {/* Small status pill */}
                <rect x="12" y="68" width="48" height="12" rx="6" fill="#dcfce7" />
                <rect x="20" y="72" width="32" height="4" rx="2" fill="#166534" />
              </g>

              {/* Floating identity card (right) */}
              <g transform="translate(290, 80)" filter="drop-shadow(0px 12px 24px rgba(0,0,0,0.08))">
                <rect width="150" height="110" rx="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                {/* Profile placeholder */}
                <circle cx="36" cy="36" r="18" fill="#eff6ff" />
                <circle cx="36" cy="30" r="7" fill="#2563eb" />
                <path d="M 24,47 A 12,12 0 0 1 48,47 Z" fill="#2563eb" />
                
                <rect x="66" y="24" width="60" height="8" rx="4" fill="#0f172a" />
                <rect x="66" y="38" width="40" height="6" rx="3" fill="#64748b" />
                
                {/* Form checkboxes list */}
                <rect x="16" y="64" width="118" height="1" fill="#f1f5f9" />
                
                <rect x="16" y="76" width="10" height="10" rx="3" fill="#10b981" />
                <path d="M 19,81 L 21,83 L 24,78" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="34" y="79" width="70" height="5" rx="2.5" fill="#94a3b8" />
                
                <rect x="16" y="92" width="10" height="10" rx="3" fill="#10b981" />
                <path d="M 19,97 L 21,99 L 24,94" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="34" y="95" width="50" height="5" rx="2.5" fill="#94a3b8" />
              </g>

              {/* Centerpiece: Laptop & Security Shield */}
              <g transform="translate(140, 200)">
                {/* Laptop Body */}
                <path d="M 30,110 L 190,110 L 210,140 L 10,140 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
                <rect x="65" y="112" width="90" height="16" rx="2" fill="#94a3b8" opacity="0.6" />
                <rect x="100" y="132" width="20" height="4" rx="2" fill="#64748b" />
                
                {/* Laptop Screen */}
                <rect x="40" y="15" width="140" height="95" rx="8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
                <rect x="44" y="19" width="132" height="87" rx="5" fill="#0f172a" />
                
                {/* Visual code/graphs on laptop */}
                <rect x="52" y="28" width="50" height="5" rx="2.5" fill="#2563eb" opacity="0.75" />
                <rect x="52" y="38" width="116" height="4" rx="2" fill="#334155" />
                <rect x="52" y="46" width="90" height="4" rx="2" fill="#334155" />
                <rect x="52" y="54" width="105" height="4" rx="2" fill="#334155" />
                
                {/* Small pie-chart element inside laptop */}
                <circle cx="138" cy="40" r="14" fill="#334155" />
                <path d="M 138,40 L 138,26 A 14,14 0 0 1 152,40 Z" fill="#10b981" />
                <path d="M 138,40 L 152,40 A 14,14 0 0 1 138,54 Z" fill="#2563eb" />
                
                {/* Screen console line */}
                <rect x="52" y="80" width="116" height="15" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <circle cx="58" cy="87.5" r="2.5" fill="#ef4444" />
                <circle cx="66" cy="87.5" r="2.5" fill="#eab308" />
                <circle cx="74" cy="87.5" r="2.5" fill="#22c55e" />
                <rect x="86" y="85" width="70" height="5" rx="2.5" fill="#334155" />
              </g>

              {/* Floating Security Shield overlapping laptop */}
              <g transform="translate(230, 240)" filter="drop-shadow(0px 14px 28px rgba(37,99,235,0.25))">
                {/* Double layer shield */}
                <path d="M 0,0 L 32,-16 L 64,0 C 64,36 32,58 32,58 C 32,58 0,36 0,0 Z" fill="url(#shield-glow)" />
                <path d="M 6,5 L 32,-8 L 58,5 C 58,32 32,49 32,49 C 32,49 6,32 6,5 Z" fill="#ffffff" opacity="0.15" />
                {/* Checkmark inside shield */}
                <path d="M 18,20 L 28,30 L 46,12" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Mini checkmark circles */}
              <g transform="translate(110, 250)" filter="drop-shadow(0px 4px 8px rgba(16,185,129,0.25))">
                <circle cx="16" cy="16" r="16" fill="url(#checkmark-grad)" />
                <path d="M 9,16 L 14,21 L 23,12" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Floating database cylinder */}
              <g transform="translate(360, 260)" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.06))">
                <path d="M0,8 C0,3.6 15.7,0 35,0 C 54.3,0 70,3.6 70,8 L70,32 C70,36.4 54.3,40 35,40 C 15.7,40 0,36.4 0,32 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M0,8 C0,12.4 15.7,16 35,16 C 54.3,16 70,12.4 70,8" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M0,20 C0,24.4 15.7,28 35,28 C 54.3,28 70,24.4 70,20" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
                {/* Small secure green dot on database */}
                <circle cx="35" cy="24" r="3.5" fill="#10b981" />
              </g>
            </svg>
          </div>
        </div>

        {/* Login Form panel (Right Card) */}
        <div className="relative flex flex-col justify-center w-full z-10">
          <div
            style={{ height: cardHeight ? `${cardHeight}px` : "auto" }}
            className="bg-surface/75 backdrop-blur-md border border-outline/40 rounded-3xl shadow-[0_20px_50px_rgba(37,99,235,0.05)] relative z-10 flex flex-col justify-center transition-all duration-500 ease-in-out overflow-hidden hover:shadow-[0_25px_60px_rgba(37,99,235,0.12)] w-full hover:border-primary/25"
          >
            <div ref={cardContentRef} className="p-10 sm:p-14 lg:p-16 flex flex-col justify-center w-full">
              
              <div className="mb-8 relative z-10">
                <h2 className="text-4xl font-extrabold text-on-background mb-3 tracking-tight font-display-lg text-gradient-primary">
                  {loginMode === "signup" ? "Create Account" : "Access Portal"}
                </h2>
                <p className="text-on-background/70 text-base font-semibold">
                  {loginMode === "signup"
                    ? "Sign up to create your candidate profile and get started."
                    : "Please authenticate to continue to your candidate dashboard."}
                </p>
              </div>

              {/* Login Mode Tabs */}
              {loginMode !== "signup" && (
                <div className="relative z-10 mb-8">
                  <div className="flex bg-surface-container-low/40 border border-outline/20 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => switchMode("password")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                        loginMode === "password"
                          ? "bg-surface border border-outline/25 text-primary shadow-sm"
                          : "text-on-background/60 hover:text-on-background hover:bg-surface-container-high/40"
                      }`}
                    >
                      <LockKeyhole size={16} strokeWidth={2.5} />
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("otp")}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                        loginMode === "otp"
                          ? "bg-surface border border-outline/25 text-primary shadow-sm"
                          : "text-on-background/60 hover:text-on-background hover:bg-surface-container-high/40"
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
                    <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-3 font-label-caps" htmlFor="email">
                      <Mail size={16} strokeWidth={2.5} /> Identity Email
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                        <Mail size={20} strokeWidth={2} />
                      </div>
                      <input
                        id="email"
                        className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-4 py-3.5 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-lg hover:border-primary/45"
                        type="email"
                        placeholder="candidate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-3 font-label-caps" htmlFor="password">
                      <LockKeyhole size={16} strokeWidth={2.5} /> Security Key
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                        <LockKeyhole size={20} strokeWidth={2} />
                      </div>
                      <input
                        id="password"
                        className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-12 py-3.5 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-lg tracking-wide hover:border-primary/45"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 text-on-background/45 hover:text-on-background focus:outline-none cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-surface-container-high/40"
                        style={{ background: "none", border: "none" }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/5 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="mt-0.5">
                        <LockKeyhole size={18} className="text-red-500" />
                      </div>
                      <div className="font-bold leading-relaxed">{error}</div>
                    </div>
                  )}

                  <button 
                    className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-light hover:opacity-95 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-[0_12px_24px_-6px_var(--primary-glow)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-8 flex items-center justify-center gap-3 tracking-wide cursor-pointer" 
                    disabled={loading}
                  >
                    <Sparkles size={20} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                    {loading ? "Authenticating Session..." : "Initialize Session"}
                  </button>
                  
                  <div className="mt-8 text-center border-t border-outline/20 pt-6">
                    <p className="text-sm text-on-background/60 font-semibold">
                      Don&apos;t have an account? <button type="button" onClick={() => switchMode("signup")} className="text-primary hover:text-primary-dark font-bold hover:underline transition-all cursor-pointer">Sign up here</button>
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
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                          <ShieldCheck size={22} className="text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-background">Passwordless Login</p>
                          <p className="text-xs text-on-background/60 font-semibold">We&apos;ll send a 6-digit code to your email</p>
                        </div>
                      </div>

                      <div className="space-y-3 group">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-3 font-label-caps" htmlFor="otp-email">
                          <Mail size={16} strokeWidth={2.5} /> Identity Email
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                            <Mail size={20} strokeWidth={2} />
                          </div>
                          <input
                            id="otp-email"
                            className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-4 py-3.5 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-lg hover:border-primary/45"
                            type="email"
                            placeholder="candidate@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/5 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                          <div className="mt-0.5">
                            <ShieldCheck size={18} className="text-red-500" />
                          </div>
                          <div className="font-bold leading-relaxed">{error}</div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-primary hover:opacity-95 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.5)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-3 tracking-wide cursor-pointer"
                        disabled={loading}
                      >
                        <Send size={20} className={loading ? "animate-pulse" : ""} strokeWidth={2.5} />
                        {loading ? "Sending Code..." : "Send Verification Code"}
                      </button>

                      <div className="mt-8 text-center border-t border-outline/20 pt-6">
                        <p className="text-sm text-on-background/60 font-semibold">
                          Don&apos;t have an account? <button type="button" onClick={() => switchMode("signup")} className="text-primary hover:text-primary-dark font-bold hover:underline transition-all cursor-pointer">Sign up here</button>
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
                        className="flex items-center gap-2 text-sm text-on-background/60 hover:text-primary font-bold transition-colors group cursor-pointer"
                      >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Change email
                      </button>

                      {/* Success message */}
                      {otpSentMessage && (
                        <div className="p-4 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-xl shadow-sm flex items-start gap-3 text-emerald-700 text-sm">
                          <div className="mt-0.5">
                            <ShieldCheck size={18} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-bold">{otpSentMessage}</p>
                            <p className="text-emerald-600/70 text-xs mt-1 font-semibold">Sent to <strong>{email}</strong></p>
                          </div>
                        </div>
                      )}

                      {/* OTP digit inputs */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 flex items-center gap-3 mb-4 font-label-caps">
                          <KeyRound size={16} strokeWidth={2.5} /> Enter Verification Code
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
                                  ? "border-primary-light bg-primary/5 text-primary focus:ring-primary/20 focus:border-primary"
                                  : "border-outline bg-surface-container-low/40 text-on-background focus:ring-primary/10 focus:border-primary hover:border-primary/45"
                              }`}
                              aria-label={`Digit ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Countdown timer */}
                      {countdown > 0 && (
                        <div className="flex items-center justify-center gap-2 text-sm text-on-background/60">
                          <Timer size={16} className="text-amber-500" />
                          <span className="font-semibold">
                            Code expires in <span className="text-amber-600 font-bold tabular-nums">{formatCountdown(countdown)}</span>
                          </span>
                        </div>
                      )}

                      {error && (
                        <div className="p-4 bg-red-500/5 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                          <div className="mt-0.5">
                            <ShieldCheck size={18} className="text-red-500" />
                          </div>
                          <div className="font-bold leading-relaxed">{error}</div>
                        </div>
                      )}

                      {/* Verify button */}
                      <button
                        type="button"
                        onClick={() => verifyOtp()}
                        className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-primary hover:opacity-95 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-[0_12px_24px_-6px_var(--primary-glow)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 tracking-wide cursor-pointer"
                        disabled={loading || otpDigits.join("").length !== 6}
                      >
                        <Sparkles size={20} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                        {loading ? "Verifying..." : "Verify & Login"}
                      </button>

                      {/* Resend OTP */}
                      <div className="text-center border-t border-outline/20 pt-6">
                        <p className="text-sm text-on-background/60 font-semibold">
                          Didn&apos;t receive the code?{" "}
                          {countdown > 0 ? (
                            <span className="text-on-background/45 font-bold">Resend in {formatCountdown(countdown)}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => sendOtp()}
                              disabled={loading}
                              className="text-primary hover:text-primary-dark font-bold hover:underline transition-all disabled:opacity-50 cursor-pointer"
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
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                          <UserPlus size={22} className="text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-background">New Candidate Account</p>
                          <p className="text-xs text-on-background/60 font-semibold">We&apos;ll verify your email with a 6-digit code</p>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div className="space-y-2 group">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-2 font-label-caps" htmlFor="signup-name">
                          <User size={15} strokeWidth={2.5} /> Full Name
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                            <User size={18} strokeWidth={2} />
                          </div>
                          <input
                            id="signup-name"
                            className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-4 py-3 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-base hover:border-primary/45"
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
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-2 font-label-caps" htmlFor="signup-email">
                          <Mail size={15} strokeWidth={2.5} /> Email Address
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                            <Mail size={18} strokeWidth={2} />
                          </div>
                          <input
                            id="signup-email"
                            className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-4 py-3 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-base hover:border-primary/45"
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
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-2 font-label-caps" htmlFor="signup-phone">
                          <Phone size={15} strokeWidth={2.5} /> Phone Number
                        </label>
                        <div className="flex gap-2">
                          {/* Custom dropdown */}
                          <div ref={dropdownRef} className="relative w-28 shrink-0 select-none">
                            <button
                              type="button"
                              onClick={() => setDropdownOpen((prev) => !prev)}
                              className="w-full flex items-center justify-between bg-surface-container-low/40 border border-outline/65 rounded-xl px-3 py-3 text-on-background focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-base hover:border-primary/45 cursor-pointer"
                            >
                              <span className="flex-1 text-center pr-1">{signupCountryCode}</span>
                              <ChevronDown size={16} className={`text-on-background/45 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {dropdownOpen && (
                              <div className="absolute left-0 mt-1.5 w-full bg-surface border border-outline/35 rounded-xl shadow-lg z-50 overflow-y-auto max-h-[180px] py-1 divide-y divide-outline/10 animate-in fade-in slide-in-from-top-1 duration-150">
                                {SIGNUP_COUNTRY_CODES.map((code) => (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => {
                                      setSignupCountryCode(code);
                                      setDropdownOpen(false);
                                    }}
                                    className={`w-full text-center py-2 px-3 hover:bg-surface-container-high/40 text-on-background font-semibold transition-colors text-sm ${
                                      signupCountryCode === code ? "bg-primary/10 text-primary font-bold" : ""
                                    }`}
                                  >
                                    {code}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative flex-1 flex items-center">
                            <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                              <Phone size={18} strokeWidth={2} />
                            </div>
                            <input
                              id="signup-phone"
                              className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-4 py-3 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-base hover:border-primary/45"
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
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 group-focus-within:text-primary transition-colors flex items-center gap-2 font-label-caps" htmlFor="signup-password">
                          <LockKeyhole size={15} strokeWidth={2.5} /> Password
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-on-background/45 group-focus-within:text-primary transition-colors">
                            <LockKeyhole size={18} strokeWidth={2} />
                          </div>
                          <input
                            id="signup-password"
                            className="w-full bg-surface-container-low/40 border border-outline/65 rounded-xl pl-12 pr-12 py-3 text-on-background placeholder-on-background/35 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-base tracking-wide hover:border-primary/45"
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
                            className="absolute right-4 text-on-background/45 hover:text-on-background focus:outline-none cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-surface-container-high/40"
                            style={{ background: "none", border: "none" }}
                            aria-label={showSignupPassword ? "Hide password" : "Show password"}
                          >
                            {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="p-4 bg-red-500/5 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="mt-0.5">
                            <UserPlus size={18} className="text-red-500" />
                          </div>
                          <div className="font-bold leading-relaxed">{error}</div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-light hover:opacity-95 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-[0_12px_24px_-6px_var(--primary-glow)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3 tracking-wide cursor-pointer"
                        disabled={loading}
                      >
                        <Send size={20} className={loading ? "animate-pulse" : ""} strokeWidth={2.5} />
                        {loading ? "Sending Verification..." : "Create Account & Verify"}
                      </button>

                      <div className="mt-6 text-center border-t border-outline/20 pt-6">
                        <p className="text-sm text-on-background/60 font-semibold">
                          Already have an account? <button type="button" onClick={() => switchMode("password")} className="text-primary hover:text-primary-dark font-bold hover:underline transition-all cursor-pointer">Login here</button>
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
                        className="flex items-center gap-2 text-sm text-on-background/60 hover:text-primary font-bold transition-colors group cursor-pointer"
                      >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to form
                      </button>

                      {/* Success message */}
                      {signupOtpMessage && (
                        <div className="p-4 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-xl shadow-sm flex items-start gap-3 text-emerald-700 text-sm">
                          <div className="mt-0.5">
                            <ShieldCheck size={18} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-bold">{signupOtpMessage}</p>
                            <p className="text-emerald-600/70 text-xs mt-1 font-semibold">Sent to <strong>{signupEmail}</strong></p>
                          </div>
                        </div>
                      )}

                      {/* OTP digit inputs */}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-on-background/70 flex items-center gap-3 mb-4 font-label-caps">
                          <KeyRound size={16} strokeWidth={2.5} /> Enter Verification Code
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
                                  ? "border-primary-light bg-primary/5 text-primary focus:ring-primary/20 focus:border-primary"
                                  : "border-outline bg-surface-container-low/40 text-on-background focus:ring-primary/10 focus:border-primary hover:border-primary/45"
                              }`}
                              aria-label={`Digit ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Countdown timer */}
                      {signupCountdown > 0 && (
                        <div className="flex items-center justify-center gap-2 text-sm text-on-background/60">
                          <Timer size={16} className="text-amber-500" />
                          <span className="font-semibold">
                            Code expires in <span className="text-amber-600 font-bold tabular-nums">{formatCountdown(signupCountdown)}</span>
                          </span>
                        </div>
                      )}

                      {error && (
                        <div className="p-4 bg-red-500/5 border-l-4 border-red-500 rounded-r-xl shadow-sm flex items-start gap-3 text-red-700 text-sm">
                          <div className="mt-0.5">
                            <ShieldCheck size={18} className="text-red-500" />
                          </div>
                          <div className="font-bold leading-relaxed">{error}</div>
                        </div>
                      )}

                      {/* Verify button */}
                      <button
                        type="button"
                        onClick={() => verifySignupOtp()}
                        className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-light hover:opacity-95 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-[0_12px_24px_-6px_var(--primary-glow)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 tracking-wide cursor-pointer"
                        disabled={loading || signupOtpDigits.join("").length !== 6}
                      >
                        <Sparkles size={20} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
                        {loading ? "Creating Account..." : "Verify & Create Account"}
                      </button>

                      {/* Resend OTP */}
                      <div className="text-center border-t border-outline/20 pt-6">
                        <p className="text-sm text-on-background/60 font-semibold">
                          Didn&apos;t receive the code?{" "}
                          {signupCountdown > 0 ? (
                            <span className="text-on-background/45 font-bold">Resend in {formatCountdown(signupCountdown)}</span>
                          ) : (
                            <button
                              type="button"
                              onClick={resendSignupOtp}
                              disabled={loading}
                              className="text-primary hover:text-primary-dark font-bold hover:underline transition-all disabled:opacity-50 cursor-pointer"
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
