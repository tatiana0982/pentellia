"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { auth, googleProvider } from "@/config/firebaseClient";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Quote,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  Timer,
  Mail,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { GoogleIcon } from "./icons";
// Zod Schemas

const loginSchema = z.object({
  email:    z.string().email("Invalid email address.").trim(),
  password: z.string().min(1, "Password is required."),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required.").trim(),
  lastName:  z.string().min(1, "Last name is required.").trim(),
  email:     z.string().email("Invalid email address.").trim(),
  password:  z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

const forgotEmailSchema = z.object({
  email: z.string().email("Invalid email address.").trim(),
});

const resetPasswordSchema = z
  .object({
    newPassword:     z.string().min(8, "Password must be at least 8 characters.")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
// Types & Constants

type AuthView =
  | "login"
  | "signup"
  | "forgot-email"
  | "forgot-otp"
  | "reset-password"
  | "verify-email-otp";

// OTP expires in 60 seconds — match the server-side TTL exactly
const OTP_TTL    = 60;
const RESET_TTL  = 5 * 60;
// Component

export default function AuthForm({
  initialView = "login",
}: {
  initialView?: "login" | "signup" | "forgot-email";
}) {
  const [view,       setView]       = useState<AuthView>(initialView);
  const [isLoading,  setIsLoading]  = useState(false);

  const [showPassword,        setShowPassword]        = useState(false);
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otp,          setOtp]          = useState<string[]>(["", "", "", "", "", ""]);
  const [otpEmail,     setOtpEmail]     = useState("");
  const [otpPurpose,   setOtpPurpose]   = useState<"verify-email" | "reset">("verify-email");
  const [resetToken,   setResetToken]   = useState("");

  // Pending signup data — held until OTP is verified, THEN Firebase account is created
  const [pendingSignup, setPendingSignup] = useState<{
    firstName: string; lastName: string; email: string; password: string;
  } | null>(null);

  // Countdown timers
  const [otpCountdown,   setOtpCountdown]   = useState(OTP_TTL);
  const [resetCountdown, setResetCountdown] = useState(RESET_TTL);
  const otpTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // OTP input refs for auto-focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router  = useRouter();

  // ── Forms ──────────────────────────────────
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const forgotEmailForm = useForm<z.infer<typeof forgotEmailSchema>>({
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: "" },
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // ── Timer helpers ──────────────────────────
  const startTimer = useCallback((
    setter: React.Dispatch<React.SetStateAction<number>>,
    initial: number,
    ref: React.MutableRefObject<NodeJS.Timeout | null>,
  ) => {
    if (ref.current) clearInterval(ref.current);
    setter(initial);
    ref.current = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) { clearInterval(ref.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (otpTimerRef.current)   clearInterval(otpTimerRef.current);
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
  }, []);

  const formatTime   = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const timerColor   = (s: number) =>
    s <= 20 ? "text-red-400" : s <= 40 ? "text-amber-400" : "text-violet-400";

  // ── Server session sync (called only after confirmed auth) ──
  const handleServerSync = async (credential: UserCredential) => {
    const token = await credential.user.getIdToken(true);
    const res   = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ idToken: token }),
    });
    if (!res.ok) throw new Error("Failed to create session");
  };

  // ── Send OTP to backend ─────────────────────────────────────
  const sendOtp = async (email: string, purpose: "verify-email" | "reset") => {
    const res = await fetch("/api/auth/send-otp", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, purpose }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send OTP");
  };
  // Handlers

  // Login — straightforward, no OTP needed
  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleServerSync(cred);
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── PRODUCTION SIGNUP FLOW ──────────────────────────────────
  // Step 1: Send OTP FIRST (before creating Firebase account)
  // Step 2: User verifies OTP
  // Step 3: THEN create Firebase account + session → dashboard
  //
  // Why: Creating Firebase account before OTP leaves dangling
  // unverified accounts. If the user retries they get
  // "email already in use" even though they never finished.
  const onSignup = async (values: z.infer<typeof signupSchema>) => {
    setIsLoading(true);
    try {
      // Store the signup data — we will use it AFTER OTP is verified
      setPendingSignup(values);

      // Send OTP first — no Firebase account created yet
      await sendOtp(values.email, "verify-email");

      setOtpEmail(values.email);
      setOtpPurpose("verify-email");
      setOtp(["", "", "", "", "", ""]);
      startTimer(setOtpCountdown, OTP_TTL, otpTimerRef);
      setView("verify-email-otp");
      toast.success("Check your email for the 6-digit code.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password → send OTP
  const onForgotEmail = async (values: z.infer<typeof forgotEmailSchema>) => {
    setIsLoading(true);
    try {
      await sendOtp(values.email, "reset");
      setOtpEmail(values.email);
      setOtpPurpose("reset");
      setOtp(["", "", "", "", "", ""]);
      startTimer(setOtpCountdown, OTP_TTL, otpTimerRef);
      setView("forgot-otp");
      toast.success("If this email is registered, a code has been sent.");
    } catch (error: any) {
      // Still show success to prevent email enumeration
      setOtpEmail(values.email);
      setOtpPurpose("reset");
      setOtp(["", "", "", "", "", ""]);
      startTimer(setOtpCountdown, OTP_TTL, otpTimerRef);
      setView("forgot-otp");
      toast.success("If this email is registered, a code has been sent.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input ───────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next  = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────
  const onVerifyOtp = async () => {
    const otpStr = otp.join("");
    if (otpStr.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    if (otpCountdown === 0) {
      toast.error("Code has expired. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: otpEmail, otp: otpStr, purpose: otpPurpose }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Incorrect code. Please try again.");
        return;
      }

      if (otpPurpose === "verify-email") {
        // OTP verified — NOW create the Firebase account
        if (!pendingSignup) {
          toast.error("Signup data lost. Please start over.");
          setView("signup");
          return;
        }

        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            pendingSignup.email,
            pendingSignup.password,
          );
          await updateProfile(cred.user, {
            displayName: `${pendingSignup.firstName} ${pendingSignup.lastName}`,
          });
          await handleServerSync(cred);
          setPendingSignup(null);
          toast.success("Account created! Welcome to Pentellia.");
          router.push("/dashboard");
          router.refresh();
        } catch (firebaseErr: any) {
          if (firebaseErr.code === "auth/email-already-in-use") {
            // Account already exists (e.g. previous partial signup completed).
            // Attempt to log them in directly.
            try {
              const cred = await signInWithEmailAndPassword(
                auth,
                pendingSignup.email,
                pendingSignup.password,
              );
              await handleServerSync(cred);
              setPendingSignup(null);
              toast.success("Welcome back!");
              router.push("/dashboard");
              router.refresh();
            } catch {
              toast.error("Account exists. Please sign in with your existing password.");
              setView("login");
              loginForm.setValue("email", pendingSignup.email);
            }
          } else {
            toast.error("Account creation failed. Please try again.");
          }
        }

      } else {
        // reset purpose — proceed to set new password
        setResetToken(data.resetToken);
        resetPasswordForm.reset();
        startTimer(setResetCountdown, RESET_TTL, resetTimerRef);
        setView("reset-password");
        toast.success("Identity verified. Set your new password.");
      }

    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────
  const onResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsLoading(true);
    try {
      await sendOtp(otpEmail, otpPurpose);
      setOtp(["", "", "", "", "", ""]);
      startTimer(setOtpCountdown, OTP_TTL, otpTimerRef);
      otpRefs.current[0]?.focus();
      toast.success("New code sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset Password ──────────────────────────────────────────
  const onResetPassword = async (values: z.infer<typeof resetPasswordSchema>) => {
    if (resetCountdown === 0) {
      toast.error("Session expired. Please start the reset process again.");
      setView("forgot-email");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: otpEmail, resetToken, newPassword: values.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password.");
        if (data.expired) setView("forgot-email");
        return;
      }
      toast.success("Password reset. Please sign in.");
      setView("login");
      loginForm.setValue("email", otpEmail);
    } catch {
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google Sign-In ──────────────────────────────────────────
  // Google already verifies the email — no OTP step needed.
  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await handleServerSync(cred);
      toast.success("Signed in with Google.");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed. Please try again.");
      }
      setIsLoading(false);
    }
  };
  // Shared UI

  const inputCls =
    "h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-violet-500 focus-visible:border-violet-500/50";
  const labelCls =
    "text-slate-300 text-xs uppercase tracking-wider font-semibold";
  const btnPrimary =
    "w-full h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all";
  const cardCls =
    "grid gap-6 p-6 md:p-8 rounded-2xl border border-white/10 bg-[#0B0C15]/40 backdrop-blur-xl shadow-2xl transition-all duration-500";

  const headerMap: Record<AuthView, { title: string; sub: string }> = {
    login:             { title: "Welcome back",      sub: "Enter your credentials to access your command center." },
    signup:            { title: "Create an account", sub: "Enter your details to start your security journey." },
    "forgot-email":    { title: "Forgot password?",  sub: "Enter your email and we'll send a verification code." },
    "forgot-otp":      { title: "Check your email",  sub: `We sent a 6-digit code to ${otpEmail}` },
    "reset-password":  { title: "Set new password",  sub: "Identity verified. Create a strong new password." },
    "verify-email-otp":{ title: "Verify your email", sub: `We sent a 6-digit code to ${otpEmail}` },
  };
  const { title, sub } = headerMap[view];
  // Render

  return (
    <div className="container min-h-screen flex-col fixed items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-[#05050A]">
      {/* ── LEFT PANEL ── */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r border-white/5">
        <div className="absolute inset-0 bg-[#0B0C15]" />
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/aldiyar-LbMpHvKkbQg-unsplash.jpg" alt="Cybersecurity Background" className="object-cover h-full w-full" />
          <div className="absolute inset-0" />
        </div>
        <Link href="/" className="relative z-20 flex items-center text-lg font-medium">
          <img src="/logo.png" alt="logo" width={140} height={40} />
        </Link>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-4">
            <Quote className="h-8 w-8 text-violet-500/50 mb-4" />
            <p className="text-lg font-light leading-relaxed text-slate-200">
              &ldquo;Pentellia has completely revolutionized our vulnerability management workflow. The automated scanning and real-time reporting give us the confidence to deploy faster.&rdquo;
            </p>
            <footer className="text-sm font-medium text-slate-400">
              <div className="text-white">Sandeep Verma | Parth Awasthi</div>
              <div className="text-violet-400">Encoderspro, Pvt Limited.</div>
            </footer>
          </blockquote>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="lg:p-8 relative flex items-center justify-center h-full">
        <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] relative z-10 p-4 sm:p-0">

          {/* Back button for sub-flows */}
          {(view === "forgot-email" || view === "forgot-otp" || view === "reset-password") && (
            <button
              onClick={() => {
                if (view === "forgot-otp") setView("forgot-email");
                else setView("login");
              }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-fit"
            >
              <ArrowLeft className="h-4 w-4" />Back to sign in
            </button>
          )}

          {/* Header */}
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter text-white">{title}</h1>
            <p className="text-sm text-slate-400">{sub}</p>
          </div>

          <div className={cardCls}>

            {/* ══ LOGIN ══ */}
            {view === "login" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Email</FormLabel>
                        <FormControl><Input placeholder="name@company.com" {...field} className={inputCls} /></FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className={labelCls}>Password</FormLabel>
                          <button type="button" onClick={() => setView("forgot-email")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Forgot?</button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className={cn(inputCls, "pr-10")} />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white" onClick={() => setShowPassword(p => !p)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={isLoading} className={btnPrimary}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* ══ SIGNUP ══ */}
            {view === "signup" && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={signupForm.control} name="firstName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>First</FormLabel>
                          <FormControl><Input placeholder="John" {...field} className={inputCls} /></FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )} />
                      <FormField control={signupForm.control} name="lastName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelCls}>Last</FormLabel>
                          <FormControl><Input placeholder="Doe" {...field} className={inputCls} /></FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={signupForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Email</FormLabel>
                        <FormControl><Input placeholder="name@company.com" {...field} className={inputCls} /></FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={signupForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className={cn(inputCls, "pr-10")} />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white" onClick={() => setShowPassword(p => !p)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={isLoading} className={btnPrimary}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoading ? "Sending verification code…" : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* ══ FORGOT EMAIL ══ */}
            {view === "forgot-email" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <Form {...forgotEmailForm}>
                  <form onSubmit={forgotEmailForm.handleSubmit(onForgotEmail)} className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-2">
                      <Mail className="h-5 w-5 text-violet-400 shrink-0" />
                      <p className="text-xs text-slate-300 leading-relaxed">Enter your registered email. We&apos;ll send a one-time verification code.</p>
                    </div>
                    <FormField control={forgotEmailForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Email Address</FormLabel>
                        <FormControl><Input placeholder="name@company.com" {...field} className={inputCls} /></FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={isLoading} className={btnPrimary}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Code
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* ══ OTP VERIFY (signup + forgot-password) ══ */}
            {(view === "forgot-otp" || view === "verify-email-otp") && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                {/* Timer */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-400">Code expires in</span>
                  </div>
                  <span className={cn("text-sm font-mono font-bold tabular-nums", timerColor(otpCountdown))}>
                    {formatTime(otpCountdown)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000",
                      otpCountdown <= 20 ? "bg-red-500" : otpCountdown <= 40 ? "bg-amber-500" : "bg-violet-500")}
                    style={{ width: `${(otpCountdown / OTP_TTL) * 100}%` }}
                  />
                </div>

                {/* OTP boxes */}
                <div>
                  <p className={cn(labelCls, "mb-3 block")}>Enter 6-Digit Code</p>
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={otpCountdown === 0}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={cn(
                          "w-full aspect-square text-center text-xl font-bold rounded-xl border transition-all",
                          "bg-white/5 text-white caret-violet-400",
                          "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500/50",
                          digit ? "border-violet-500/50 bg-violet-500/10" : "border-white/10",
                          otpCountdown === 0 && "opacity-40 cursor-not-allowed",
                        )}
                      />
                    ))}
                  </div>
                </div>

                {otpCountdown === 0 && (
                  <p className="text-xs text-center text-red-400">Code expired. Request a new one below.</p>
                )}

                <Button
                  type="button"
                  disabled={isLoading || otp.join("").length !== 6 || otpCountdown === 0}
                  onClick={onVerifyOtp}
                  className={btnPrimary}
                >
                  {isLoading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {isLoading
                    ? (otpPurpose === "verify-email" ? "Creating account…" : "Verifying…")
                    : "Verify Code"}
                </Button>

                {/* Resend */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Didn&apos;t receive the code?</p>
                  <button
                    type="button"
                    onClick={onResendOtp}
                    disabled={isLoading || otpCountdown > 0}
                    className={cn(
                      "text-xs font-medium flex items-center gap-1.5 mx-auto transition-colors",
                      otpCountdown > 0 ? "text-slate-600 cursor-not-allowed" : "text-violet-400 hover:text-violet-300",
                    )}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {otpCountdown > 0 ? `Resend in ${formatTime(otpCountdown)}` : "Resend Code"}
                  </button>
                </div>
              </div>
            )}

            {/* ══ RESET PASSWORD ══ */}
            {view === "reset-password" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <div className={cn("flex items-center justify-between p-3 rounded-xl border",
                      resetCountdown <= 60 ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10")}>
                      <div className="flex items-center gap-2">
                        <KeyRound className={cn("h-4 w-4", resetCountdown <= 60 ? "text-red-400" : "text-slate-400")} />
                        <span className="text-xs text-slate-400">Session expires in</span>
                      </div>
                      <span className={cn("text-sm font-mono font-bold tabular-nums", timerColor(resetCountdown))}>
                        {formatTime(resetCountdown)}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000",
                          resetCountdown <= 60 ? "bg-red-500" : resetCountdown <= 120 ? "bg-amber-500" : "bg-violet-500")}
                        style={{ width: `${(resetCountdown / RESET_TTL) * 100}%` }}
                      />
                    </div>
                    {resetCountdown === 0 && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400 text-center">Session expired. Please restart the reset process.</p>
                      </div>
                    )}
                    <FormField control={resetPasswordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showNewPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={resetCountdown === 0}
                              onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}
                              className={cn(inputCls, "pr-10")} />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white" onClick={() => setShowNewPassword(p => !p)}>
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={resetPasswordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelCls}>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={resetCountdown === 0}
                              onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}
                              className={cn(inputCls, "pr-10")} />
                            <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-white" onClick={() => setShowConfirmPassword(p => !p)}>
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                    <p className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-violet-500 mt-0.5">•</span>
                      Paste is disabled. Please type your password manually.
                    </p>
                    <Button type="submit" disabled={isLoading || resetCountdown === 0} className={btnPrimary}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reset Password
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {/* Google + separator (login / signup only) */}
            {(view === "login" || view === "signup") && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0e0f18] px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>
                <Button variant="outline" type="button" disabled={isLoading} onClick={onGoogleSignIn}
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-slate-300 h-10">
                  <GoogleIcon className="mr-2 h-4 w-4" />Google
                </Button>
              </>
            )}
          </div>

          {/* Login ↔ Signup toggle */}
          {(view === "login" || view === "signup") && (
            <p className="px-8 text-center text-sm text-slate-400">
              {view === "login" ? "New to Pentellia? " : "Already have an account? "}
              <button
                onClick={() => { setView(view === "login" ? "signup" : "login"); setShowPassword(false); }}
                className="underline underline-offset-4 hover:text-violet-400 transition-colors font-medium text-white"
              >
                {view === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
