"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Camera, Loader2, Building2, ShieldCheck, ArrowRight,
  Save, Check, User, Mail, Phone, Clock, Calendar, Target, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types / constants ───────────────────────────────────────────────

interface UserData {
  firstName: string; lastName: string; email: string;
  company: string;   size: string;     role: string;
  country: string;   timezone: string; phone: string;
  industry: string;  preferredLang: string;
  yearsInSec: string; secRole: string; certifications: string; focusAreas: string;
  createdAt?: string; updatedAt?: string;
}
const EMPTY: UserData = {
  firstName:"",lastName:"",email:"",company:"",size:"",role:"",
  country:"",timezone:"",phone:"",industry:"",preferredLang:"en",
  yearsInSec:"",secRole:"",certifications:"",focusAreas:"",
};

const SIZES   = ["Solo / Freelance","2–10","11–50","51–200","201–1,000","1,001–5,000","5,000+"];
const INDS    = ["Cybersecurity","Financial Services","Healthcare","Government & Defence","Technology","Telecom","Energy","Manufacturing","Legal","Education","Retail","Consulting","Other"];
const YEARS   = ["< 1 year","1–2 years","3–5 years","6–10 years","10–15 years","15+ years"];
const SECROLES= ["Red Team / Offensive","Blue Team / Defensive","SOC Analyst","Penetration Tester","Security Engineer","DevSecOps","GRC / Compliance","Threat Intelligence","Cloud Security","Security Manager","CISO","Consultant","Student / Learning"];
const FOCUSES = ["Web Application","Network Security","Cloud Security","API Security","Mobile Security","Infrastructure","OSINT","Malware Analysis","Forensics","Social Engineering","Compliance & Audit","Threat Hunting"];
const CERTS   = ["OSCP","CEH","CISSP","CompTIA Security+","CompTIA PenTest+","CISM","CISA","AWS Security","GCP Security","eJPT","GPEN","GWAPT","GCIH","None / Not yet"];
const LANGS   = [{code:"en",label:"English"},{code:"hi",label:"Hindi"},{code:"de",label:"Deutsch"},{code:"fr",label:"Français"},{code:"es",label:"Español"},{code:"ja",label:"日本語"},{code:"zh",label:"中文"}];

// ─── Field components ────────────────────────────────────────────────

const iCls = "h-10 bg-slate-900/60 border-slate-700/50 text-slate-100 placeholder:text-slate-600 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/50 transition-colors";

function F({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-slate-600 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Sel({ label, value, onChange, options, placeholder, hint }: {
  label:string; value:string; onChange:(v:string)=>void;
  options: string[] | {code:string;label:string}[]; placeholder?:string; hint?:string;
}) {
  return (
    <F label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md bg-slate-900/60 border border-slate-700/50 text-slate-100 text-sm px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-colors [&>option]:bg-[#0d0e1a] cursor-pointer">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.code} value={o.code}>{o.label}</option>
        )}
      </select>
    </F>
  );
}

function Pills({ label, value, onChange, options, hint }: {
  label:string; value:string; onChange:(v:string)=>void; options:string[]; hint?:string;
}) {
  const sel = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const toggle = (opt:string) => {
    const next = sel.includes(opt) ? sel.filter((s) => s !== opt) : [...sel, opt];
    onChange(next.join(", "));
  };
  return (
    <F label={label} hint={hint}>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
        {options.map((opt) => {
          const on = sel.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                on ? "bg-violet-600/20 text-violet-300 border border-violet-500/35" : "bg-slate-800/60 text-slate-500 border border-slate-700/40 hover:text-slate-200 hover:border-slate-600/60",
              )}>
              {on && <Check className="h-2.5 w-2.5" />}
              {opt}
            </button>
          );
        })}
      </div>
    </F>
  );
}

function Card({ title, icon:Icon, children }: { title:string; icon:React.ElementType; children:React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/50 bg-slate-900/20">
        <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SaveBtn({ dirty, saving, saved }: { dirty:boolean; saving:boolean; saved:boolean }) {
  return (
    <button type="submit" disabled={!dirty || saving}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-semibold transition-all",
        saved   ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/25 cursor-default"
        : dirty ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_2px_12px_rgba(124,58,237,0.3)]"
                : "bg-slate-800/60 text-slate-600 border border-slate-700/40 cursor-not-allowed",
      )}>
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
       : saved  ? <><Check className="h-3.5 w-3.5"/>Saved</>
                : <><Save  className="h-3.5 w-3.5"/>Save</>}
    </button>
  );
}

function completion(u: UserData, hasAvatar: boolean, hasDomain: boolean) {
  const checks = [
    {label:"First name",     done:!!u.firstName},   {label:"Last name",       done:!!u.lastName},
    {label:"Phone",          done:!!u.phone},        {label:"Company",         done:!!u.company},
    {label:"Job role",       done:!!u.role},         {label:"Country",         done:!!u.country},
    {label:"Security role",  done:!!u.secRole},      {label:"Profile photo",   done:hasAvatar},
    {label:"Verified domain",done:hasDomain},
  ];
  return { pct: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), missing: checks.filter((c) => !c.done) };
}

// ─── Page ────────────────────────────────────────────────────────────

export default function UserSettingsPage() {
  const [user,      setUser]      = useState<UserData>(EMPTY);
  const [initial,   setInitial]   = useState<UserData>(EMPTY);
  const [loading,   setLoading]   = useState(true);
  const [hasDomain, setHasDomain] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(`/api/users/avatar?v=${Date.now()}`);
  const [uploading, setUploading] = useState(false);
  const [saves,     setSaves]     = useState<Record<string,{saving:boolean;saved:boolean}>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, dRes] = await Promise.all([fetch("/api/users"), fetch("/api/domains")]);
        const uData = await uRes.json();
        const dData = await dRes.json().catch(() => ({ data:[] }));
        if (uData.success) { const u = {...EMPTY,...uData.user}; setUser(u); setInitial(u); }
        setHasDomain((dData?.data ?? []).some((d:any) => d.isVerified));
      } catch { toast.error("Failed to load profile"); }
      finally  { setLoading(false); }
    })();
  }, []);

  const save = useCallback(async (id:string, keys:(keyof UserData)[], e?:React.FormEvent) => {
    e?.preventDefault();
    setSaves((p) => ({...p,[id]:{saving:true,saved:false}}));
    const payload = Object.fromEntries(keys.map((k) => [k, user[k]]));
    try {
      const res  = await fetch("/api/users", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setInitial((p) => ({...p,...payload}));
        setSaves((p) => ({...p,[id]:{saving:false,saved:true}}));
        setTimeout(() => setSaves((p) => ({...p,[id]:{saving:false,saved:false}})), 2500);
        toast.success("Saved");
      } else { toast.error(data.error ?? "Failed"); setSaves((p) => ({...p,[id]:{saving:false,saved:false}})); }
    } catch { toast.error("Network error"); setSaves((p) => ({...p,[id]:{saving:false,saved:false}})); }
  }, [user]);

  const handleFile = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5*1024*1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result as string; setAvatarSrc(b64);
      try {
        const res  = await fetch("/api/users", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({avatar:b64}) });
        const data = await res.json();
        if (data.success) { toast.success("Photo updated"); setAvatarSrc(`/api/users/avatar?v=${Date.now()}`); }
        else { toast.error("Upload failed"); setAvatarSrc(`/api/users/avatar?v=${Date.now()}`); }
      } catch { toast.error("Network error"); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(f);
  };

  const set     = (k:keyof UserData) => (v:string) => setUser((p) => ({...p,[k]:v}));
  const dirty   = (keys:(keyof UserData)[]) => keys.some((k) => user[k] !== initial[k]);
  const ss      = (id:string) => saves[id] ?? {saving:false,saved:false};
  const initials= ((user.firstName?.[0]??"")+(user.lastName?.[0]??""  )).toUpperCase() || "U";
  const {pct,missing} = useMemo(() => completion(user, !avatarSrc.startsWith("/api/users"), hasDomain), [user, avatarSrc, hasDomain]);

  if (loading) return (
    <div className="space-y-4 animate-pulse w-full">
      <div className="h-44 rounded-2xl bg-slate-800/40" />
      {[1,2,3].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-800/30" />)}
    </div>
  );

  return (
    <div className="w-full space-y-5 pb-16 font-sans">

      {/* ── Profile card ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-violet-950 via-indigo-950/80 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage:"radial-gradient(circle at 15% 50%, rgba(124,58,237,0.35) 0%, transparent 55%)" }} />
          <div className="absolute top-3 right-4">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border backdrop-blur-sm",
              pct===100 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
              : pct>=60  ? "bg-violet-500/15  text-violet-400  border-violet-500/25"
                         : "bg-amber-500/15   text-amber-400   border-amber-500/25",
            )}>{pct}% complete</span>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-11 mb-5">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-4 border-[#0d0e1a] shadow-xl ring-2 ring-violet-500/20">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-violet-900/50 text-xl font-bold text-violet-300">{initials}</AvatarFallback>
              </Avatar>
              <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-violet-600 hover:bg-violet-500 border-2 border-[#0d0e1a] flex items-center justify-center transition-all shadow-lg disabled:opacity-60">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin text-white" /> : <Camera className="h-3 w-3 text-white" />}
              </button>
            </div>
            <Link href="/account/domains">
              <button className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all",
                hasDomain ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                           : "text-amber-400  border-amber-500/20  bg-amber-500/5  hover:bg-amber-500/10",
              )}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {hasDomain ? "Domain Verified" : "Verify Domain"}
                {!hasDomain && <ArrowRight className="h-3 w-3" />}
              </button>
            </Link>
          </div>
          <h2 className="text-lg font-bold text-white">{[user.firstName,user.lastName].filter(Boolean).join(" ") || "Your Name"}</h2>
          <p className="text-sm text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>
            {user.role && user.company && <span className="text-slate-600">· {user.role} at {user.company}</span>}
          </p>
          {missing.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Complete your profile</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missing.map((m) => (
                  <span key={m.label} className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-800/50 px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />{m.label}
                  </span>
                ))}
              </div>
              <div className="h-1 w-full rounded-full bg-slate-800/60 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-700" style={{width:`${pct}%`}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column grid for wide screens ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Personal */}
        <Card title="Personal Information" icon={User}>
          <form onSubmit={(e) => save("personal",["firstName","lastName","phone","preferredLang"],e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="First Name"><Input value={user.firstName} onChange={(e) => set("firstName")(e.target.value)} placeholder="Jane" className={iCls} /></F>
              <F label="Last Name"> <Input value={user.lastName}  onChange={(e) => set("lastName")(e.target.value)}  placeholder="Smith" className={iCls} /></F>
            </div>
            <F label="Email Address" hint="Managed by your authentication provider.">
              <Input value={user.email} disabled className={cn(iCls,"opacity-40 cursor-not-allowed")} />
            </F>
            <F label="Phone Number" hint="Used for security alerts and scan notifications.">
              <Input value={user.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+91 98765 43210" type="tel" className={iCls} />
            </F>
            <Sel label="Interface Language" value={user.preferredLang} onChange={set("preferredLang")} options={LANGS} />
            <div className="flex justify-end"><SaveBtn dirty={dirty(["firstName","lastName","phone","preferredLang"])} {...ss("personal")} /></div>
          </form>
        </Card>

        {/* Company */}
        <Card title="Company & Role" icon={Building2}>
          <form onSubmit={(e) => save("company",["company","size","role","industry","country","timezone"],e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <F label="Company"><Input value={user.company} onChange={(e) => set("company")(e.target.value)} placeholder="Acme Security Ltd." className={iCls} /></F>
              <F label="Job Title"><Input value={user.role} onChange={(e) => set("role")(e.target.value)} placeholder="Security Engineer" className={iCls} /></F>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel label="Company Size" value={user.size}     onChange={set("size")}     options={SIZES} placeholder="Select size"     />
              <Sel label="Industry"     value={user.industry} onChange={set("industry")} options={INDS}  placeholder="Select industry" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Country"><Input value={user.country}  onChange={(e) => set("country")(e.target.value)}  placeholder="India"        className={iCls} /></F>
              <F label="Timezone" hint="Affects scheduling."><Input value={user.timezone} onChange={(e) => set("timezone")(e.target.value)} placeholder="Asia/Kolkata" className={iCls} /></F>
            </div>
            <div className="flex justify-end"><SaveBtn dirty={dirty(["company","size","role","industry","country","timezone"])} {...ss("company")} /></div>
          </form>
        </Card>
      </div>

      {/* Security profile — full width */}
      <Card title="Security Profile" icon={Target}>
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/15">
            <p className="text-xs text-violet-300/80 leading-relaxed">Helps tailor scan recommendations, report depth, and AI analysis. Only visible to organisation admins.</p>
          </div>
          <form onSubmit={(e) => save("security",["yearsInSec","secRole","certifications","focusAreas"],e)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Sel label="Years in Security"    value={user.yearsInSec} onChange={set("yearsInSec")} options={YEARS}    placeholder="Select range" />
              <Sel label="Primary Security Role" value={user.secRole}   onChange={set("secRole")}   options={SECROLES} placeholder="Select role"  />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Pills label="Certifications"   value={user.certifications} onChange={set("certifications")} options={CERTS}   hint="Select all that apply." />
              <Pills label="Primary Focus Areas" value={user.focusAreas} onChange={set("focusAreas")}      options={FOCUSES} hint="Used to personalise AI summaries." />
            </div>
            <div className="flex justify-end"><SaveBtn dirty={dirty(["yearsInSec","secRole","certifications","focusAreas"])} {...ss("security")} /></div>
          </form>
        </div>
      </Card>

      {/* Account metadata */}
      <Card title="Account Information" icon={Calendar}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            {label:"Account Created",icon:Calendar,value:user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN",{dateStyle:"long"}) : "—"},
            {label:"Last Updated",   icon:Clock,   value:user.updatedAt ? new Date(user.updatedAt).toLocaleDateString("en-IN",{dateStyle:"long"}) : "—"},
          ].map((m) => (
            <div key={m.label} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/40 space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider"><m.icon className="h-3 w-3"/>{m.label}</span>
              <span className="text-sm text-slate-200 font-medium">{m.value}</span>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/40 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Domain Verification</p>
            <p className="text-xs text-slate-500 mt-0.5">{hasDomain ? "Verified — all tools are unlocked." : "Verify a domain to unlock scanning tools."}</p>
          </div>
          <Link href="/account/domains">
            <button className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all shrink-0",
              hasDomain ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "text-amber-400  border-amber-500/20  bg-amber-500/5  hover:bg-amber-500/10")}>
              <ShieldCheck className="h-3.5 w-3.5" />{hasDomain ? "Manage" : "Verify Now"}<ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </Card>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.025] p-5">
        <h3 className="text-sm font-semibold text-red-400 mb-1.5 flex items-center gap-2"><X className="h-4 w-4"/>Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">Permanently delete this account and all associated data — scans, reports, AI summaries, domains, and billing history. This is irreversible.</p>
        <button onClick={() => toast.error("Contact support@pentellia.io to request account deletion.")}
          className="text-xs font-semibold text-red-400 border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
          <X className="h-3.5 w-3.5"/>Delete Account
        </button>
      </div>
    </div>
  );
}