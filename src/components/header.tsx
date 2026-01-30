"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import {
  Menu,
  Bell,
  CreditCard,
  LogOut,
  User,
  KeyRound,
  Trash2,
  X,
  Check,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

// Notification Item Interface
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  created_at: string;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  // --- Notification State ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false); // Track read state
  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        // Optional: logic to check if there are new unread items
        if (data.notifications.length > 0) setHasUnread(true);
      }
    } catch (e) {
      console.error("Failed to fetch notifications");
    }
  }, []);

  // Initial Fetch & Polling (Optional)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 30s
    // C. Listen for Custom Event (Triggered by other components)
    const handleRefresh = () => {
      console.log("🔔 Notification refresh triggered");
      fetchNotifications();
    };
    window.addEventListener("refresh-notifications", handleRefresh);

    // D. Refetch when user tabs back to window (Focus revalidation)
    window.addEventListener("focus", fetchNotifications);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener("refresh-notifications", handleRefresh);
      window.removeEventListener("focus", fetchNotifications);
    };
  }, []);

  // Handle Remove Notification
  const handleRemoveNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing dropdown
    try {
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      await fetch("/api/dashboard/notifications", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error("Failed to delete");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // --- Profile Logic ---
  const firstName = user?.firstName || "User";
  const lastName = user?.lastName || "";
  const email = user?.email || "";
  const avatarUrl = user?.avatar || "/api/users/avatar";

  const getInitials = (fName: string, lName: string) => {
    return ((fName?.[0] || "") + (lName?.[0] || "")).toUpperCase() || "U";
  };

  const completionStats = useMemo(() => {
    if (!user) return { percent: 0 };
    const fields = [
      "firstName",
      "lastName",
      "company",
      "role",
      "country",
      "avatarCheck",
      "verifiedDomain",
    ];
    const completed = fields.filter((f) =>
      f === "avatarCheck" ? true : !!user[f as keyof typeof user],
    );
    return { percent: Math.round((completed.length / fields.length) * 100) };
  }, [user]);

  // Helper for Notification Icons
  const getNotiIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-emerald-400" />;
      case "error":
        return <X className="h-4 w-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-[#0B0C15]/80 backdrop-blur-md px-4 transition-all duration-300">
      <div className="flex items-center gap-4">
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="logo"
            className="w-[140px] object-contain"
          />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/subscription">
          <Button
            size="sm"
            className="hidden border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 sm:inline-flex"
          >
            <CreditCard className="mr-2 h-3.5 w-3.5" /> Upgrade
          </Button>
        </Link>

        {/* --- NOTIFICATIONS DROPDOWN --- */}
        <DropdownMenu open={isNotiOpen} onOpenChange={setIsNotiOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0B0C15] animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 border-white/10 bg-[#0B0C15] text-slate-200 p-0"
          >
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="font-semibold text-sm text-white">
                Notifications
              </span>
              <span className="text-xs text-slate-500">
                {notifications.length} Unread
              </span>
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((noti) => (
                    <div
                      key={noti.id}
                      onClick={(e) => handleRemoveNotification(noti.id, e)}
                      className="group flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0 relative"
                    >
                      <div
                        className={cn(
                          "mt-1 p-1.5 rounded-full bg-white/5 h-fit",
                          noti.type === "success" && "bg-emerald-500/10",
                          noti.type === "error" && "bg-red-500/10",
                        )}
                      >
                        {getNotiIcon(noti.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-200">
                          {noti.title}
                        </p>
                        <p className="text-xs text-slate-400 leading-snug">
                          {noti.message}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {new Date(noti.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity">
                        <X className="h-3 w-3 text-slate-500 hover:text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  No new notifications
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* --- PROFILE DROPDOWN (Existing Logic) --- */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative cursor-pointer group">
              <div className="relative flex items-center justify-center h-11 w-11">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      completionStats.percent === 100
                        ? "text-emerald-500"
                        : "text-violet-600",
                    )}
                    strokeDasharray={`${completionStats.percent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                <Avatar className="absolute h-8 w-8 border border-white/10 transition-transform group-hover:scale-105">
                  <AvatarImage
                    src={avatarUrl}
                    alt={firstName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-violet-900/50 text-xs font-bold text-violet-200">
                    {getInitials(firstName, lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 border-white/10 bg-[#0B0C15] text-slate-200 p-2"
          >
            <div className="px-2 py-2">
              <p className="text-sm font-medium text-white truncate">
                {firstName} {lastName}
              </p>
              <p className="text-xs text-slate-500 truncate mb-3">{email}</p>
              {/* Progress Bar Code ... */}
            </div>
            <DropdownMenuSeparator className="bg-white/10 mx-2" />
            <Link href={"/account/user-settings"}>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white rounded-md py-2.5">
                <User className="mr-2 h-4 w-4 text-slate-400" />{" "}
                <span className="flex-1">Profile Settings</span>
              </DropdownMenuItem>
            </Link>
            <Link href={"/account/api"}>
              <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white rounded-md py-2.5">
                <KeyRound className="mr-2 h-4 w-4 text-slate-400" /> API Keys
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-white/10 mx-2" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-md py-2.5"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
