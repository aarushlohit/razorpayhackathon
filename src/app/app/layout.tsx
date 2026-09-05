import React from "react";
import { Sidebar } from "@/components/app-shell/AppHeader";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await requireAuth();

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] flex selection:bg-[#000000] selection:text-white">
      <Sidebar workspace={workspace} user={user} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF]">
        <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
