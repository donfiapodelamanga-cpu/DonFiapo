"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/lib/stores";

/**
 * WebMCP Global Hook 🤖
 * Experiemental hook to expose DApp functionality to AI Agents (like Chrome AI, Gemini, Claude)
 * based on the W3C Web Machine Context Protocol (WebMCP) drafts.
 */
export function useWebMCP() {
    const { lunesAddress } = useWalletStore();

    useEffect(() => {
        // Only run on the client side
        if (typeof window === "undefined") return;

        // Experimental: Injects the standard `registerTool` if the browser supports AI Agent interaction
        // Most browsers will inject an `ai` object in the future (like window.ai in Chrome Canary)
        const agentApi = (window as any).ai || (window as any).webmcp;

        if (agentApi && typeof agentApi.registerTool === "function") {
            console.log("[WebMCP] Registering AI Agent tools for Don Fiapo Ecosystem");

            // Tool 1: Check Lunes Address
            agentApi.registerTool({
                name: "getConnectedWallet",
                description: "Returns the currently connected Web3 Lunes wallet address of the user.",
                parameters: {},
                handler: async () => {
                    if (!lunesAddress) {
                        return { status: "disconnected", message: "User has not connected their wallet yet." };
                    }
                    return { status: "connected", address: lunesAddress };
                }
            });

            // Tool 2: Navigate to Spin Game
            agentApi.registerTool({
                name: "openSpinGame",
                description: "Navigates the user to the Don Fiapo Casino Spin Game.",
                parameters: {},
                handler: async () => {
                    window.location.href = "/games/spin";
                    return { status: "navigated", message: "Opening the Spin Game..." };
                }
            });

            // Tool 3: Navigate to Airdrop Page
            agentApi.registerTool({
                name: "openAirdropMissions",
                description: "Navigates the user to the Royal Airdrop page to complete missions.",
                parameters: {},
                handler: async () => {
                    window.location.href = "/airdrop";
                    return { status: "navigated", message: "Opening the Airdrop Missions..." };
                }
            });

            // Tool 4: Request FIAPO Balance (Triggers an API call)
            agentApi.registerTool({
                name: "getFiapoBalance",
                description: "Fetches the user's current FIAPO token off-chain balance.",
                parameters: {},
                handler: async () => {
                    if (!lunesAddress) {
                        return { status: "error", message: "Wallet not connected" };
                    }
                    try {
                        const res = await fetch(`/api/user/wallet?lunesAddress=${lunesAddress}`);
                        if (res.ok) {
                            return { status: "success", message: "Balance fetch successful (Check UI)" };
                        }
                    } catch (e) {
                        return { status: "error", message: "Failed to fetch balance" };
                    }
                }
            });

        }
    }, [lunesAddress]);

    return null;
}
