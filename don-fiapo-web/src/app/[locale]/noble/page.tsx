"use client";

import { useWalletStore } from "@/lib/stores";
import { useNobleStatus } from "@/hooks/use-noble-status";
import NobleDashboard from "@/components/noble/NobleDashboard";
import { Crown, Loader2 } from "lucide-react";

/**
 * Standalone Noble page — redirects concept:
 * This page still works as a direct route, but the Noble dashboard
 * is also available as a tab inside /wallet for registered parceiros.
 */
export default function NoblePage() {
    const { lunesConnected, lunesAddress } = useWalletStore();
    const { isNoble, noble, loading } = useNobleStatus(lunesAddress);

    if (!lunesConnected) {
        return (
            <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center">
                <Crown className="w-16 h-16 text-golden mb-4 opacity-50" />
                <h1 className="text-2xl font-bold mb-2">Order of Nobles</h1>
                <p className="text-muted-foreground mb-6">Connect your wallet to access the transparency dashboard.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-golden mb-4" />
                <p className="text-muted-foreground">Loading Noble status...</p>
            </div>
        );
    }

    if (!isNoble) {
        return (
            <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center">
                <Crown className="w-16 h-16 text-muted-foreground mb-4 opacity-30" />
                <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
                <p className="text-muted-foreground mb-2 text-center max-w-md">
                    The Noble Dashboard is available only for registered partners (Parceiros).
                </p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    Contact the Don Fiapo commercial team to become a partner.
                </p>
            </div>
        );
    }

    return <NobleDashboard nobleInfo={noble} />;
}
