"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound, Loader2, Check, ShieldAlert, Eye, EyeOff, Trash2,
  AlertTriangle, Send, Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Card ────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, danger = false, children }: {
  title: string; icon: React.ElementType; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-lg overflow-hidden border",
      danger ? "bg-red-500/[0.03] border-red-500/15" : "bg-[#0d0e1a] border-white/[0.07]",
    )}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
        <div className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center shrink-0 border",
          danger ? "bg-red-500/10 border-red-500/20" : "bg-violet-500/10 border-violet-500/15",
        )}>
          <Icon className={cn("h-3.5 w-3.5", danger ? "text-red-400" : "text-violet-400")} />
        </div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="space-y-0.5 mb-1.5">
      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</Label>
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

const iCls = "h-9 bg-black/30 border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-violet-500/20 focus-visible:border-violet-500/50 rounded-md";

// ─── Change Password ──────────────────────────────────────────────────
function ChangePasswordSection() {
  const [step,       setStep]       = useState<"idle"|"otp_sent"|"verified"|"done">("idle");
  const [otp,        setOtp]        = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);

  const sendOtp = async () => {
    setLoading(true);
    try {
      const uRes  = await fetch("/api/users");
      const uData = await uRes.json();
      if (!uData.success) throw new Error("Could not fetch user email");
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: uData.user.email, type: "forgot" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      toast.success("OTP sent to your email");
      setStep("otp_sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 4) { toast.error("Enter the OTP"); return; }
    setLoading(true);
    try {
      const uRes  = await fetch("/api/users");
      const uData = await uRes.json();
      const res   = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: uData.user.email, otp, type: "forgot" }),
      });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setResetToken(data.resetToken);
      setStep("verified");
      toast.success("OTP verified");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");
      toast.success("Password changed successfully");
      setStep("done");
      setOtp(""); setNewPwd(""); setConfirmPwd(""); setResetToken("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally { setLoading(false); }
  };

  if (step === "done") return (
    <div className="flex items-center gap-3 text-violet-400 text-sm">
      <div className="h-7 w-7 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
        <Check className="h-3.5 w-3.5" />
      </div>
      Password updated successfully.
    </div>
  );

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-sm text-slate-400 leading-relaxed">
        We'll send a one-time code to your registered email address to verify your identity before changing your password.
      </p>

      {step === "idle" && (
        <button onClick={sendOtp} disabled={loading}
          className="flex items-center gap-2 px-4 h-9 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-[0_2px_8px_rgba(124,58,237,0.25)] transition-all disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send OTP to Email
        </button>
      )}

      {step === "otp_sent" && (
        <div className="space-y-4">
          <div>
            <FieldLabel label="Enter OTP" hint="Check your inbox — code expires in 10 minutes" />
            <div className="flex gap-2">
              <Input value={otp} onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="123456" maxLength={8} className={cn(iCls, "tracking-widest font-mono")} />
              <button onClick={verifyOtp} disabled={loading || !otp}
                className="px-4 h-9 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </button>
            </div>
          </div>
          <button onClick={() => { setStep("idle"); setOtp(""); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Send new code
          </button>
        </div>
      )}

      {step === "verified" && (
        <div className="space-y-4">
          <div>
            <FieldLabel label="New Password" />
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)} placeholder="Minimum 8 characters"
                className={cn(iCls, "pr-10")} />
              <button type="button" onClick={() => setShowPwd((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <FieldLabel label="Confirm New Password" />
            <Input type="password" value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Repeat new password"
              className={iCls} />
          </div>
          <button onClick={changePassword} disabled={loading || !newPwd || !confirmPwd}
            className="flex items-center gap-2 px-4 h-9 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Update Password
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Delete Account ──────────────────────────────────────────────────
function DeleteAccountSection() {
  const router = useRouter();
  const [step,         setStep]         = useState<"idle"|"confirming"|"otp_sent"|"deleting">("idle");
  const [confirmation, setConfirmation] = useState("");
  const [otp,          setOtp]          = useState("");
  const [loading,      setLoading]      = useState(false);

  const REQUIRED_TEXT = "I delete this account";

  const sendOtp = async () => {
    if (confirmation !== REQUIRED_TEXT) { toast.error("Confirmation text does not match"); return; }
    setLoading(true);
    try {
      const uRes  = await fetch("/api/users");
      const uData = await uRes.json();
      const res   = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: uData.user.email, type: "forgot" }),
      });
      if (!res.ok) throw new Error("Failed to send OTP");
      toast.success("OTP sent to your email");
      setStep("otp_sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const verifyAndDelete = async () => {
    if (!otp) { toast.error("Enter the OTP"); return; }
    setLoading(true);
    try {
      const uRes  = await fetch("/api/users");
      const uData = await uRes.json();
      const vRes  = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: uData.user.email, otp, type: "forgot" }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || "Invalid OTP");

      setStep("deleting");
      const dRes  = await fetch("/api/auth/delete-account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vData.resetToken, confirmation }),
      });
      const dData = await dRes.json();
      if (!dRes.ok) throw new Error(dData.error || "Deletion failed");

      toast.success("Account deleted. Redirecting…");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
      setLoading(false);
      setStep("otp_sent");
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-start gap-3 p-3.5 rounded-md bg-red-500/5 border border-red-500/15">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-red-300/80 leading-relaxed">
          This permanently deletes your account, all scans, reports, AI summaries, domains, and billing history.
          This action cannot be undone. Your balance will not be refunded.
        </p>
      </div>

      {step === "idle" && (
        <button onClick={() => setStep("confirming")}
          className="flex items-center gap-2 text-xs font-medium text-red-400 border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 px-3 py-2 rounded-md transition-all">
          <Trash2 className="h-3.5 w-3.5" /> Delete My Account
        </button>
      )}

      {step === "confirming" && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Type exactly: "{REQUIRED_TEXT}"
            </label>
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
              placeholder={REQUIRED_TEXT} className={iCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStep("idle"); setConfirmation(""); }}
              className="px-3 h-8 rounded-md text-xs font-medium text-slate-400 bg-white/[0.05] hover:bg-white/[0.08] transition-all">
              Cancel
            </button>
            <button onClick={sendOtp} disabled={loading || confirmation !== REQUIRED_TEXT}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all disabled:opacity-40">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send OTP to Confirm
            </button>
          </div>
        </div>
      )}

      {(step === "otp_sent" || step === "deleting") && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Enter OTP from Email
            </label>
            <p className="text-[11px] text-slate-600 mb-2">This is your final confirmation step</p>
            <div className="flex gap-2">
              <Input value={otp} onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="123456" maxLength={8}
                className={cn(iCls, "tracking-widest font-mono")} disabled={step === "deleting"} />
              <button onClick={verifyAndDelete} disabled={loading || !otp}
                className="px-3 h-9 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all disabled:opacity-50 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function SecurityPage() {
  return (
    <div className="w-full space-y-5 pb-16 font-sans">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
          <ShieldAlert className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Account Security</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your password and account access</p>
        </div>
      </div>

      <Card title="Change Password" icon={KeyRound}>
        <ChangePasswordSection />
      </Card>

      <Card title="Delete Account" icon={Trash2} danger>
        <DeleteAccountSection />
      </Card>
    </div>
  );
}
