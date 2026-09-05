import React from "react";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { TopBar } from "@/components/app-shell/TopBar";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireAuth();

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex overflow-hidden">
      <Sidebar workspace={workspace} user={user} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar workspace={workspace} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
