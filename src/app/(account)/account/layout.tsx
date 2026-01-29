"use client";

<<<<<<< HEAD
import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Building2,
  Briefcase,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  company: string;
  size: string;
  role: string;
  country: string;
  timezone: string;
  verifiedDomain?: string; // Aligned with API naming
}

export default function UserSettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Domain Verification States
  const [domainStatus, setDomainStatus] = useState<
    "idle" | "verifying" | "verified" | "failed"
  >("idle");
  const [tempDomain, setTempDomain] = useState("");

  // Avatar Management
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  // --- 1. Fetch User Data ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users"); 
        const data = await res.json();

        if (data.success) {
          setUser(data.user);
          // Map verifiedDomain from API to local state
          setTempDomain(data.user.verifiedDomain || "");
          if (data.user.verifiedDomain) setDomainStatus("verified");
        } else {
          toast.error(data.error || "Failed to load profile");
        }
      } catch (error) {
        console.error(error);
        toast.error("Network error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  // --- 2. Generic Update Handler ---
  const updateUserAPI = async (updates: Partial<UserData>) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();

      if (data.success) {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
        toast.success("Changes saved successfully");
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Optimized Avatar Upload ---
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const toastId = toast.loading("Processing image...");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setAvatarPreview(base64String);

      const success = await updateUserAPI({ avatar: base64String });

      if (success) {
        toast.dismiss(toastId);
        toast.success("Avatar updated!");
        setAvatarVersion(Date.now());
        setTimeout(() => setAvatarPreview(null), 1000);
      } else {
        toast.dismiss(toastId);
        setAvatarPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) return user.avatar;
    return `/api/users/avatar?v=${avatarVersion}`;
  };

  // --- 5. Form Handlers ---
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await updateUserAPI({
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
    });
  };

  const handleEditDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await updateUserAPI({
      company: formData.get("company") as string,
      size: formData.get("size") as string,
      role: formData.get("role") as string,
    });
  };

  const handleEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await updateUserAPI({
      country: formData.get("country") as string,
      timezone: formData.get("timezone") as string,
    });
  };

  const handleDomainVerify = async () => {
    setDomainStatus("verifying");
    setTimeout(async () => {
      const isSuccess = Math.random() > 0.3; // Simulated logic
      if (isSuccess) {
        // Updated to use verifiedDomain
        const saved = await updateUserAPI({ verifiedDomain: tempDomain });
        if (saved) setDomainStatus("verified");
      } else {
        setDomainStatus("failed");
        toast.error("Verification failed. TXT record not found.");
      }
    }, 2000);
  };

  if (isLoading || !user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 animate-pulse">
          <div className="h-24 w-24 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 w-full space-y-4">
            <div className="h-8 w-48 bg-white/10 rounded mx-auto md:mx-0" />
            <div className="h-4 w-32 bg-white/5 rounded mx-auto md:mx-0" />
          </div>
        </div>
        <div className="h-64 rounded-2xl border border-white/10 bg-[#0B0C15]/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 font-sans">
      {/* 1. Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 backdrop-blur-md p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-[#0B0C15] shadow-lg">
            <AvatarImage src={getAvatarSrc()} className="object-cover" />
            <AvatarFallback className="bg-violet-600 text-xl font-bold text-white">
              {user.firstName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button onClick={handleAvatarClick} disabled={isSaving} className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-violet-600 transition-all shadow-lg">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{user.firstName} {user.lastName}</h1>
          <p className="text-slate-400">{user.email}</p>
          <div className="pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-slate-300">Edit Profile</Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <form id="profileForm" onSubmit={handleEditProfile} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input name="firstName" defaultValue={user.firstName} required className="bg-black/40 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input name="lastName" defaultValue={user.lastName} required className="bg-black/40 border-white/10 text-white" />
                    </div>
                  </div>
                </form>
                <DialogFooter>
                  <Button type="submit" form="profileForm" disabled={isSaving} className="bg-violet-600 text-white">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 2. Company Details */}
      <SectionCard
        title="Company details"
        onEdit={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-violet-400">Edit</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200">
              <DialogHeader><DialogTitle>Edit Company Details</DialogTitle></DialogHeader>
              <form id="companyForm" onSubmit={handleEditDetails} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input name="company" defaultValue={user.company} className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Input name="size" defaultValue={user.size} className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Job Role</Label>
                  <Input name="role" defaultValue={user.role} className="bg-black/40 border-white/10 text-white" />
                </div>
              </form>
              <DialogFooter><Button type="submit" form="companyForm" disabled={isSaving} className="bg-violet-600">Save Changes</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoItem label="Company" value={user.company} icon={Building2} />
          <InfoItem label="Size" value={user.size} />
          <InfoItem label="Job role" value={user.role} icon={Briefcase} />
        </div>
      </SectionCard>

      {/* 3. Location */}
      <SectionCard
        title="Location"
        onEdit={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-violet-400">Edit</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0B0C15] border border-white/10 text-slate-200">
              <DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>
              <form id="locationForm" onSubmit={handleEditLocation} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input name="country" defaultValue={user.country} className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input name="timezone" defaultValue={user.timezone} className="bg-black/40 border-white/10 text-white" />
                </div>
              </form>
              <DialogFooter><Button type="submit" form="locationForm" disabled={isSaving} className="bg-violet-600">Save Changes</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoItem label="Country" value={user.country} icon={MapPin} />
          <InfoItem label="Time zone" value={user.timezone} />
        </div>
      </SectionCard>

      {/* 4. Verified Domain */}
      <SectionCard title="Verified Domain">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="w-full space-y-2">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Primary Domain</Label>
              <div className="flex flex-col md:flex-row gap-4 w-full items-end md:items-center">
                <div className="relative w-full">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={tempDomain}
                    onChange={(e) => setTempDomain(e.target.value)}
                    placeholder="example.com"
                    className={cn(
                      "pl-9 bg-black/40 border-white/10 text-slate-200",
                      domainStatus === "verified" && "border-emerald-500/50 bg-emerald-500/5 text-emerald-400",
                      domainStatus === "failed" && "border-red-500/50 bg-red-500/5 text-red-400"
                    )}
                  />
                  {domainStatus === "verified" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                </div>
                <Button onClick={handleDomainVerify} disabled={domainStatus === "verifying" || !tempDomain || isSaving} className="w-full md:w-auto bg-white/5 border border-white/10 text-slate-300">
                  {domainStatus === "verifying" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {domainStatus === "verifying" ? "Verifying..." : "Verify DNS"}
                </Button>
              </div>
            </div>
          </div>
          <div className="text-sm">
            {domainStatus === "idle" && <p className="text-slate-500">Add a TXT record to your DNS configuration to verify ownership.</p>}
            {domainStatus === "verified" && <p className="text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Domain verified & saved.</p>}
            {domainStatus === "failed" && <p className="text-red-400 flex items-center gap-2"><XCircle className="h-3 w-3" /> Verification failed. TXT record not found.</p>}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// --- Helper Components ---
function SectionCard({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B0C15]/50 backdrop-blur-md overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
        {onEdit}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1 hover:bg-white/[0.07] transition-colors">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 text-slate-200 font-medium min-h-[24px]">
        {Icon && <Icon className="h-4 w-4 text-violet-400" />}
        {value || <span className="text-slate-600 italic">Not set</span>}
      </div>
    </div>
  );
}
=======
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  CreditCard,
  FileText,
  History,
  ShieldCheck,
  Key,
  Code2,
  Settings,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

// Define the sidebar structure
const sidebarItems = [
  {
    title: "User settings",
    items: [{ label: "Overview", href: "/account/user-settings", icon: User }],
  },
  {
    title: "Security",
    items: [
      { label: "Login history", href: "/account/login-history", icon: Key },
    ],
  },
  {
    title: "API",
    items: [{ label: "REST API", href: "/account/api", icon: Code2 }],
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row  gap-6 p-6 md:p-8 font-sans text-slate-200">
      {/* --- Settings Sidebar --- */}
      <aside className="w-full md:w-64 flex-none fixed flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* 'Back to Product' Header Link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Settings Title */}
        <div className="flex items-center gap-2 px-2 pt-2 border-t border-white/5">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Settings className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Account</h2>
            <p className="text-xs text-slate-500">Manage your preferences</p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="space-y-6">
          {sidebarItems.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-violet-600/10 text-violet-300 border border-violet-500/20"
                          : "text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-violet-400" : "text-slate-500"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 ml-64  overflow-y-auto custom-scrollbar rounded-2xl">
        {children}
      </main>
    </div>
  );
}
>>>>>>> 975182b0e5edae21dc80688abc747913fc481c89
