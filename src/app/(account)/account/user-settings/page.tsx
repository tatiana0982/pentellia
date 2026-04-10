"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  User, Building2, Globe2, MapPin, Phone, Briefcase,
  Github, Linkedin, Twitter, Save, Loader2,
  Camera, Upload, AlertCircle, CreditCard,
  ArrowRight, CheckCircle2, Link2, ExternalLink,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn }       from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import toast from "react-hot-toast";

// ── Constants ──────────────────────────────────────────────────────────
const INDUSTRIES = [
  "", "Banking & Finance", "Healthcare", "Government & Defence",
  "Technology & Software", "Telecommunications", "Energy & Utilities",
  "Retail & E-commerce", "Manufacturing", "Education",
  "Legal & Compliance", "Consulting", "Media & Entertainment", "Other",
];

const COUNTRIES = [
  "", "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "UAE", "Netherlands", "Brazil",
  "Japan", "South Korea", "Other",
];

const YEARS_EXP = ["", "< 1 year", "1–2 years", "3–5 years", "6–10 years", "10+ years"];

const SECURITY_ROLES = [
  "", "Penetration Tester", "Security Engineer", "Security Analyst",
  "Bug Bounty Hunter", "Red Team / Offensive", "Blue Team / Defensive",
  "DevSecOps", "CISO / Security Manager", "Security Researcher",
  "Student / Learning", "Other",
];

// ── Types ──────────────────────────────────────────────────────────────
interface UserData {
  firstName:      string;
  lastName:       string;
  email:          string;
  company:        string;
  role:           string;
  phone:          string;
  country:        string;
  timezone:       string;
  bio:            string;
  website:        string;
  linkedin:       string;
  twitter:        string;
  github:         string;
  industry:       string;
  yearsInSec:     string;
  secRole:        string;
  certifications: string;
  avatar?:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────
function normaliseUrl(raw: string): string {
  if (!raw.trim()) return "";
  const s = raw.trim().toLowerCase();
  if (s.startsWith("http://") || s.startsWith("https://")) return raw.trim();
  return `https://${raw.trim()}`;
}

function validateLink(value: string, type: "github" | "linkedin" | "twitter" | "website"): string | null {
  if (!value.trim()) return null;
  const url = normaliseUrl(value);
  try {
    const u = new URL(url);
    if (type === "github"   && !u.hostname.includes("github.com"))   return "Must be a github.com URL";
    if (type === "linkedin" && !u.hostname.includes("linkedin.com")) return "Must be a linkedin.com URL";
    if (type === "twitter"  && !u.hostname.includes("twitter.com") && !u.hostname.includes("x.com"))
      return "Must be a twitter.com or x.com URL";
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

function validatePhone(p: string): string | null {
  if (!p.trim()) return null;
  const digits = p.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Must be 7–15 digits";
  return null;
}

function profileCompletion(u: UserData, hasPhoto: boolean) {
  const checks = [
    { label: "First name",    ok: !!u.firstName  },
    { label: "Last name",     ok: !!u.lastName   },
    { label: "Company",       ok: !!u.company    },
    { label: "Job title",     ok: !!u.role       },
    { label: "Country",       ok: !!u.country    },
    { label: "Industry",      ok: !!u.industry   },
    { label: "Profile photo", ok: hasPhoto       },
  ];
  const done = checks.filter(c => c.ok).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(c => !c.ok).map(c => c.label) };
}

// ── Sub-components ─────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06]">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label, error, children,
}: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function UserSettingsPage() {
  const [original,     setOriginal]     = useState<UserData | null>(null);
  const [draft,        setDraft]        = useState<UserData | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [linkErrors,   setLinkErrors]   = useState<Record<string, string | null>>({});
  const [phoneError,   setPhoneError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(() => {
    if (!original || !draft) return false;
    return JSON.stringify(original) !== JSON.stringify(draft);
  }, [original, draft]);

  const load = useCallback(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setOriginal(d.user);
          setDraft(d.user);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof UserData, value: string) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : null);
  };

  const validateAll = (): boolean => {
    if (!draft) return false;
    const errs: Record<string, string | null> = {
      github:   validateLink(draft.github,   "github"),
      linkedin: validateLink(draft.linkedin, "linkedin"),
      twitter:  validateLink(draft.twitter,  "twitter"),
      website:  validateLink(draft.website,  "website"),
    };
    setLinkErrors(errs);
    const pErr = validatePhone(draft.phone);
    setPhoneError(pErr);
    return !Object.values(errs).some(Boolean) && !pErr;
  };

  const handleSave = async () => {
    if (!draft || !isDirty) return;
    if (!validateAll()) { toast.error("Fix validation errors before saving"); return; }
    setIsSaving(true);
    try {
      // Normalise URLs before saving
      const payload = {
        ...draft,
        github:   draft.github   ? normaliseUrl(draft.github)   : "",
        linkedin: draft.linkedin ? normaliseUrl(draft.linkedin) : "",
        twitter:  draft.twitter  ? normaliseUrl(draft.twitter)  : "",
        website:  draft.website  ? normaliseUrl(draft.website)  : "",
      };
      const res  = await fetch("/api/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setOriginal(payload);
        setDraft(payload);
        toast.success("Profile saved");
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => { setDraft(original); setLinkErrors({}); setPhoneError(null); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const id = toast.loading("Uploading…");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result as string;
      setAvatarPreview(b64);
      try {
        const res  = await fetch("/api/users", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: b64 }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Photo updated", { id });
          setAvatarVersion(Date.now());
          setTimeout(() => setAvatarPreview(null), 800);
        } else throw new Error();
      } catch {
        toast.error("Upload failed", { id });
        setAvatarPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const avatarSrc = avatarPreview ?? (draft?.avatar || `/api/users/avatar?v=${avatarVersion}`);
  const hasPhoto  = !avatarSrc.startsWith("/api/users");
  const { pct, missing } = useMemo(
    () => profileCompletion(draft ?? {} as UserData, hasPhoto),
    [draft, avatarPreview, avatarVersion],
  );
  const initials = ((draft?.firstName?.[0] ?? "") + (draft?.lastName?.[0] ?? "")).toUpperCase() || "?";

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
      </div>
    );
  }

  const inp = "bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-0 h-9 text-sm";
  const sel = "w-full h-9 px-3 rounded-md bg-black/30 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 appearance-none";

  return (
    <div className="space-y-5 max-w-none animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Profile Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your account information and preferences.</p>
        </div>

        {/* Save / Discard bar */}
        {isDirty && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
            <button onClick={handleDiscard} className="h-8 px-3 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-4 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* ── Completion banner ── */}
      {pct < 100 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-6 relative shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 4 a 14 14 0 0 1 0 28 a 14 14 0 0 1 0 -28" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path d="M18 4 a 14 14 0 0 1 0 28 a 14 14 0 0 1 0 -28" fill="none" stroke="#f59e0b"
                strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct}, 100`} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-300">{pct}% profile complete</p>
            <p className="text-xs text-amber-500/60 mt-0.5">Missing: {missing.join(" · ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Avatar + basic */}
          <Section title="Personal Information">
            <div className="flex items-start gap-5 mb-5">
              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-16 w-16 border border-white/10">
                  <AvatarImage src={avatarSrc} className="object-cover" />
                  <AvatarFallback className="bg-violet-900/50 text-lg font-bold text-violet-200">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="pt-1">
                <button onClick={() => fileInputRef.current?.click()} className="h-8 px-3 text-xs border border-white/10 text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-1.5 transition-all">
                  <Upload className="h-3 w-3" /> Change Photo
                </button>
                <p className="text-[11px] text-slate-600 mt-1.5">JPG, PNG, WebP · max 5MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <FieldGroup>
              <Field label="First Name">
                <Input value={draft.firstName} onChange={e => set("firstName", e.target.value)} className={inp} placeholder="Jane" />
              </Field>
              <Field label="Last Name">
                <Input value={draft.lastName} onChange={e => set("lastName", e.target.value)} className={inp} placeholder="Doe" />
              </Field>
              <Field label="Company / Organisation">
                <Input value={draft.company} onChange={e => set("company", e.target.value)} className={inp} placeholder="Acme Corp" />
              </Field>
              <Field label="Job Title / Designation">
                <Input value={draft.role} onChange={e => set("role", e.target.value)} className={inp} placeholder="Senior Security Analyst" />
              </Field>
              <Field label="Country" >
                <select value={draft.country} onChange={e => set("country", e.target.value)} className={sel}>
                  {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0B0C15]">{c || "Select country…"}</option>)}
                </select>
              </Field>
              <Field label="Phone" error={phoneError}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={draft.phone}
                    onChange={e => { set("phone", e.target.value); setPhoneError(validatePhone(e.target.value)); }}
                    className={cn("pl-9", inp)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </Field>
            </FieldGroup>

            <div className="mt-4 space-y-1.5">
              <Label className="text-xs text-slate-400">Professional Bio</Label>
              <Textarea
                value={draft.bio}
                onChange={e => set("bio", e.target.value)}
                rows={3}
                className="bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-0 text-sm resize-none"
                placeholder="Brief description of your background and expertise…"
                maxLength={300}
              />
              <p className="text-[11px] text-slate-600 text-right">{draft.bio?.length ?? 0}/300</p>
            </div>
          </Section>

          {/* Security profile */}
          <Section title="Security Background">
            <FieldGroup>
              <Field label="Industry / Sector">
                <select value={draft.industry} onChange={e => set("industry", e.target.value)} className={sel}>
                  {INDUSTRIES.map(i => <option key={i} value={i} className="bg-[#0B0C15]">{i || "Select industry…"}</option>)}
                </select>
              </Field>
              <Field label="Security Role">
                <select value={draft.secRole} onChange={e => set("secRole", e.target.value)} className={sel}>
                  {SECURITY_ROLES.map(r => <option key={r} value={r} className="bg-[#0B0C15]">{r || "Select role…"}</option>)}
                </select>
              </Field>
              <Field label="Years in Security">
                <select value={draft.yearsInSec} onChange={e => set("yearsInSec", e.target.value)} className={sel}>
                  {YEARS_EXP.map(y => <option key={y} value={y} className="bg-[#0B0C15]">{y || "Select experience…"}</option>)}
                </select>
              </Field>
              <Field label="Certifications">
                <Input
                  value={draft.certifications}
                  onChange={e => set("certifications", e.target.value)}
                  className={inp}
                  placeholder="e.g. OSCP, CEH, CISSP"
                />
              </Field>
            </FieldGroup>
          </Section>

          {/* Social / Links */}
          <Section title="Online Presence">
            <div className="space-y-3">
              {([
                { key: "website",  icon: Globe2,    label: "Website",  placeholder: "yoursite.com",          type: "website"  },
                { key: "linkedin", icon: Linkedin,  label: "LinkedIn", placeholder: "linkedin.com/in/handle", type: "linkedin" },
                { key: "twitter",  icon: Twitter,   label: "X / Twitter", placeholder: "twitter.com/handle", type: "twitter"  },
                { key: "github",   icon: Github,    label: "GitHub",   placeholder: "github.com/username",   type: "github"   },
              ] as const).map(f => {
                const err = linkErrors[f.key];
                const val = (draft as any)[f.key] ?? "";
                return (
                  <Field key={f.key} label={f.label} error={err}>
                    <div className="relative flex items-center">
                      <f.icon className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
                      <Input
                        value={val}
                        onChange={e => {
                          set(f.key as keyof UserData, e.target.value);
                          setLinkErrors(prev => ({ ...prev, [f.key]: validateLink(e.target.value, f.type) }));
                        }}
                        placeholder={f.placeholder}
                        className={cn("pl-9 pr-8", inp, err && "border-red-500/50")}
                      />
                      {val && !err && (
                        <CheckCircle2 className="absolute right-2.5 h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                  </Field>
                );
              })}
            </div>
          </Section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Save button (sticky on mobile) */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 p-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium">Unsaved changes will be lost on navigation.</p>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={cn(
                "w-full h-9 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                isDirty
                  ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_8px_rgba(124,58,237,0.3)]"
                  : "bg-white/[0.05] text-slate-600 cursor-not-allowed",
              )}
            >
              {isSaving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><Save className="h-3.5 w-3.5" /> {isDirty ? "Save Profile" : "No Changes"}</>
              }
            </button>
            {isDirty && (
              <button onClick={handleDiscard} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Discard changes
              </button>
            )}
          </div>

          {/* Subscription quick link */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Billing</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-200 font-medium">Subscription</p>
                  <p className="text-[11px] text-slate-500">Plans & usage</p>
                </div>
              </div>
              <Link href="/subscription">
                <button className="h-7 px-3 text-xs border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1 transition-all">
                  View <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </div>
          </div>

          {/* Security quick link */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Security</p>
            <div className="space-y-2">
              {[
                { label: "Change Password",   href: "/account/security"      },
                { label: "Login History",     href: "/account/login-history" },
                { label: "API Keys",          href: "/account/api"           },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <div className="flex items-center justify-between py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer">
                    <span>{l.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-4">
            <p className="text-[11px] text-red-500/60 uppercase tracking-wider font-semibold mb-2">Danger Zone</p>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <Link href="/account/security">
              <button className="h-7 px-3 text-xs border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 rounded-lg transition-all">
                Delete Account
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}