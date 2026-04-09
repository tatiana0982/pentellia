"use client";

// src/app/(account)/account/user-settings/page.tsx
// Phase 3: Domain verification section REMOVED. /api/domains fetch REMOVED.

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  User, Building2, Globe2, MapPin, Phone, Briefcase,
  Link2, Github, Linkedin, Twitter, Save, Loader2,
  Camera, ShieldCheck, RefreshCw, ArrowRight, CheckCircle2,
  Upload, AlertCircle, CreditCard, Clock,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import toast from "react-hot-toast";

interface UserData {
  firstName:    string; lastName:   string; email:    string;
  company:      string; role:       string; phone:    string;
  country:      string; timezone:   string; bio:      string;
  website:      string; linkedin:   string; twitter:  string;
  github:       string; industry:   string;
  yearsInSec:   string; secRole:    string; certifications: string;
  focusAreas:   string; preferredLang: string;
  avatar?:      string;
}

function completion(u: UserData, hasAvatar: boolean) {
  const items = [
    { label: "First name",    done: !!u.firstName },
    { label: "Last name",     done: !!u.lastName  },
    { label: "Company",       done: !!u.company   },
    { label: "Role",          done: !!u.role      },
    { label: "Country",       done: !!u.country   },
    { label: "Profile photo", done: hasAvatar     },
  ];
  const done = items.filter(i => i.done).length;
  return { pct: Math.round((done / items.length) * 100), missing: items.filter(i => !i.done).map(i => i.label) };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export default function UserSettingsPage() {
  const [user,         setUser]         = useState<UserData | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile
  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.user); })
      .catch(console.error);
  }, []);

  const updateUserAPI = async (updates: Partial<UserData>) => {
    setIsSaving(true);
    try {
      const res  = await fetch("/api/users", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, ...updates } : null);
        toast.success("Saved");
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error("Failed to save");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be < 5MB"); return; }
    const toastId = toast.loading("Uploading...");
    const reader  = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result as string;
      setAvatarPreview(b64);
      const ok = await updateUserAPI({ avatar: b64 });
      toast.dismiss(toastId);
      if (ok) { toast.success("Avatar updated!"); setAvatarVersion(Date.now()); setTimeout(() => setAvatarPreview(null), 1000); }
      else    { toast.error("Upload failed"); setAvatarPreview(null); }
    };
    reader.readAsDataURL(file);
  };

  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar)  return user.avatar;
    return `/api/users/avatar?v=${avatarVersion}`;
  };

  const { pct, missing } = useMemo(
    () => completion(user ?? {} as UserData, !getAvatarSrc().startsWith("/api/users")),
    [user, avatarPreview, avatarVersion],
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || "U";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account information.</p>
      </div>

      {/* Profile completion */}
      {pct < 100 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">{pct}% complete</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Missing: {missing.join(", ")}</p>
          </div>
          <div className="h-8 w-8 relative shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32" fill="none" stroke="#f59e0b"
                strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct}, 100`} />
            </svg>
          </div>
        </div>
      )}

      {/* Avatar */}
      <SectionCard title="Profile Photo">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <Avatar className="h-20 w-20 border-2 border-white/10">
              <AvatarImage src={getAvatarSrc()} className="object-cover" />
              <AvatarFallback className="bg-violet-900/60 text-2xl font-bold text-violet-200">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={handleAvatarClick} className="border-white/10 text-slate-300 hover:bg-white/5 gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload Photo
            </Button>
            <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP — max 5MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </SectionCard>

      {/* Basic info */}
      <SectionCard title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "firstName",  label: "First Name",  icon: User   },
            { key: "lastName",   label: "Last Name",   icon: User   },
            { key: "company",    label: "Company",     icon: Building2 },
            { key: "role",       label: "Job Title",   icon: Briefcase },
            { key: "phone",      label: "Phone",       icon: Phone  },
            { key: "country",    label: "Country",     icon: MapPin },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs text-slate-400">{f.label}</Label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={(user as any)[f.key] ?? ""}
                  onChange={e => setUser(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                  onBlur={() => updateUserAPI({ [f.key]: (user as any)[f.key] })}
                  className="pl-9 bg-black/40 border-white/10 text-slate-200 focus:border-violet-500"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Bio</Label>
          <Textarea
            value={user.bio ?? ""}
            onChange={e => setUser(prev => prev ? { ...prev, bio: e.target.value } : null)}
            onBlur={() => updateUserAPI({ bio: user.bio })}
            rows={3}
            className="bg-black/40 border-white/10 text-slate-200 focus:border-violet-500 resize-none"
            placeholder="Brief professional bio..."
          />
        </div>
      </SectionCard>

      {/* Security profile */}
      <SectionCard title="Security Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "industry",       label: "Industry"           },
            { key: "yearsInSec",     label: "Years in Security"  },
            { key: "secRole",        label: "Security Role"      },
            { key: "certifications", label: "Certifications"     },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs text-slate-400">{f.label}</Label>
              <Input
                value={(user as any)[f.key] ?? ""}
                onChange={e => setUser(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                onBlur={() => updateUserAPI({ [f.key]: (user as any)[f.key] })}
                className="bg-black/40 border-white/10 text-slate-200 focus:border-violet-500"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Social links */}
      <SectionCard title="Online Presence">
        <div className="space-y-3">
          {[
            { key: "website",  icon: Globe2,    placeholder: "https://yoursite.com" },
            { key: "linkedin", icon: Linkedin,  placeholder: "https://linkedin.com/in/..." },
            { key: "twitter",  icon: Twitter,   placeholder: "@handle" },
            { key: "github",   icon: Github,    placeholder: "github.com/username" },
          ].map(f => (
            <div key={f.key} className="relative">
              <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={(user as any)[f.key] ?? ""}
                onChange={e => setUser(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                onBlur={() => updateUserAPI({ [f.key]: (user as any)[f.key] })}
                placeholder={f.placeholder}
                className="pl-9 bg-black/40 border-white/10 text-slate-200 focus:border-violet-500"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Subscription info */}
      <SectionCard title="Subscription">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Manage your plan</p>
              <p className="text-xs text-slate-500">View usage, upgrade or renew</p>
            </div>
          </div>
          <Link href="/subscription">
            <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:bg-white/5 gap-2">
              View Plans <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Danger Zone">
        <p className="text-xs text-slate-500 leading-relaxed">
          Permanently delete this account and all associated data — scans, reports, AI summaries, and billing history. This is irreversible.
        </p>
        <Link href="/account/security">
          <Button variant="outline" size="sm" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40">
            Delete Account
          </Button>
        </Link>
      </SectionCard>
    </div>
  );
}