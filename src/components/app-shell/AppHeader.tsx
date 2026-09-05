"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  RotateCcw, 
  Bot, 
  ScrollText, 
  FileCheck, 
  Settings, 
  LogOut,
  ChevronDown
} from "lucide-react";
import { Workspace, User } from "@/types";

interface SidebarProps {
  workspace: Workspace;
  user: User;
}

export function Sidebar({ workspace, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const navItems = [
    { label: "Overview", href: "/app", icon: LayoutDashboard },
    { label: "Recovery Queue", href: "/app/recovery", icon: RotateCcw, badge: "100" },
    { label: "Agent Center", href: "/app/agent", icon: Bot },
    { label: "AI Decisions", href: "/app/agent/decisions", icon: FileCheck },
    { label: "Audit Ledger", href: "/app/audit", icon: ScrollText },
  ];

  return (
    <aside className="w-64 border-r border-[#E5E5E7] bg-[#FAFAFA] flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#000000] flex items-center justify-center font-semibold text-xs text-white">
            RL
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#000000]">REFUND LOOP</span>
        </div>

        {/* Workspace Switcher */}
        <div className="flex items-center justify-between p-2 bg-white border border-[#E5E5E7] rounded-xl text-xs shadow-2xs">
          <div className="truncate font-medium text-[#1D1D1F]">{workspace.name}</div>
          <ChevronDown className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/app" 
              ? pathname === "/app" 
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition ${
                  active
                    ? "bg-[#000000] text-white"
                    : "text-[#6E6E73] hover:text-[#000000] hover:bg-[#F0F0F2]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && !active && (
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#E5E5E7] text-[#1D1D1F]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Settings / User */}
      <div className="p-5 border-t border-[#E5E5E7] space-y-3">
        <Link
          href="/app/settings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition ${
            pathname.startsWith("/app/settings")
              ? "bg-[#000000] text-white"
              : "text-[#6E6E73] hover:text-[#000000] hover:bg-[#F0F0F2]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E7]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#E5E5E7] text-[#1D1D1F] flex items-center justify-center font-bold text-xs">
              {user.name?.slice(0, 2).toUpperCase() || "AV"}
            </div>
            <div className="truncate">
              <div className="text-[12px] font-semibold text-[#000000] truncate">{user.name || "Aarush Verma"}</div>
              <div className="text-[10px] text-[#86868B] truncate">{user.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-[#86868B] hover:text-[#000000] transition rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export const AppHeader = Sidebar;

