"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { getSession, AdminSession } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession) {
      router.push("/login");
      return;
    }

    setSession(currentSession);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-yellow-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-neutral-400">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen bg-neutral-950 flex overflow-hidden">
      <Sidebar session={session} />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col bg-neutral-950">
        <Header session={session} />
        <div className="admin-scroll flex-1 overflow-y-auto px-2 pb-2">
          {children}
        </div>
      </main>
    </div>
  );
}
