"use client";

import { AdminSession } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

export default function Header({ session }: { session: AdminSession }) {
    const router = useRouter();
    const displayName = session.email.split("@")[0];

    const handleLogout = () => {
        clearSession();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-10 border-b border-neutral-800/70 bg-neutral-900/60 backdrop-blur-md">
            <div className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Don Fiapo Control Center</p>
                    <h2 className="truncate text-base font-semibold text-white">Operador: {displayName}</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/90 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-medium text-neutral-300">Sessão ativa</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/90 px-3 py-2 text-sm text-neutral-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/40 hover:text-white hover:shadow-[0_10px_22px_rgba(239,68,68,0.2)] active:translate-y-0"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sair</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
