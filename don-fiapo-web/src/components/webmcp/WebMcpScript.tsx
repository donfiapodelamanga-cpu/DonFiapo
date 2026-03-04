"use client";

import Script from "next/script";

export function WebMcpScript() {
  return (
    <>
      <Script
        src="https://unpkg.com/@jason.today/webmcp@latest/build/webmcp.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Initialize WebMCP once script is loaded
          try {
            // @ts-ignore
            if (typeof window !== 'undefined' && window.WebMCP) {
              // @ts-ignore
              const mcp = new window.WebMCP({
                color: "#FFA500", // Don Fiapo Orange
                position: "bottom-right",
                size: "40px",
                padding: "15px",
              });

              mcp.registerTool(
                "get_project_info",
                "Get information about the Don Fiapo project, its tokenomics, ecosystem, and story.",
                {},
                () => {
                  return {
                    content: [
                      {
                        type: "text",
                        text: JSON.stringify({
                          name: "Don Fiapo De la Manga",
                          description: "The first memecoin on the Lunes blockchain. Features ICO, staking, NFT marketplace, and social missions.",
                          token: "$FIAPO",
                          blockchain: "Lunes (Substrate)",
                          features: ["Airdrop/Missions", "Casino Spin Game", "ICO/NFT Sales", "Staking", "Token Migration (Solana → Lunes)"],
                          website: "https://donfiapo.fun",
                          fiapoLock: "$FIAPO won in the Spin Game is locked until ICO/NFT sales conclude"
                        }),
                      },
                    ],
                  };
                }
              );

              mcp.registerTool(
                "navigate",
                "Navigate to a specific section of the website.",
                {
                  path: {
                    type: "string",
                    description: "The path to navigate to (e.g., /ico, /staking, /airdrop, /games/spin, /wallet, /ranking)",
                  },
                },
                (args: { path: string }) => {
                  const currentLocale = window.location.pathname.split("/")[1] || "en";
                  const locales = ["en", "pt", "es", "ru", "fr", "zh"];
                  const prefix = locales.includes(currentLocale) ? `/${currentLocale}` : "/en";
                  let targetPath = args.path.startsWith("/") ? args.path : `/${args.path}`;
                  window.location.href = `${prefix}${targetPath}`;
                  return {
                    content: [{ type: "text", text: `Navigating to ${targetPath}` }],
                  };
                }
              );

              mcp.registerTool(
                "get_wallet_status",
                "Check whether the user has connected their Lunes wallet to the DApp.",
                {},
                () => {
                  // Read wallet address from Zustand store persisted in localStorage
                  try {
                    const raw = localStorage.getItem('wallet-store');
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      const address = parsed?.state?.lunesAddress;
                      if (address) {
                        return { content: [{ type: "text", text: JSON.stringify({ connected: true, address }) }] };
                      }
                    }
                  } catch (_) { }
                  return { content: [{ type: "text", text: JSON.stringify({ connected: false, message: "No wallet connected" }) }] };
                }
              );

              mcp.registerTool(
                "get_fiapo_balance",
                "Get the current off-chain $FIAPO balance for the connected wallet. Tokens are locked until ICO/NFT sales end.",
                {},
                async () => {
                  try {
                    const raw = localStorage.getItem('wallet-store');
                    const parsed = raw ? JSON.parse(raw) : null;
                    const address = parsed?.state?.lunesAddress;
                    if (!address) {
                      return { content: [{ type: "text", text: JSON.stringify({ error: "No wallet connected" }) }] };
                    }
                    const res = await fetch(`/api/missions?wallet=${address}`);
                    const data = await res.json();
                    const score = data?.score;
                    return {
                      content: [{
                        type: "text",
                        text: JSON.stringify({
                          fiapoBalance: score?.offchainScore ?? 0,
                          totalPoints: score?.totalScore ?? 0,
                          rank: score?.rank ?? "PLEBEU",
                          note: "FIAPO is locked until ICO/NFT sales conclude"
                        })
                      }]
                    };
                  } catch (e) {
                    return { content: [{ type: "text", text: JSON.stringify({ error: "Failed to fetch balance" }) }] };
                  }
                }
              );

              mcp.registerTool(
                "do_spin",
                "Trigger one spin of the Don Fiapo Casino Spin Wheel if user is on the spin page.",
                {},
                () => {
                  // Try to find and click the spin button on the page
                  const spinBtn = document.querySelector('[data-spin-button]') as HTMLButtonElement | null;
                  if (spinBtn && !spinBtn.disabled) {
                    spinBtn.click();
                    return { content: [{ type: "text", text: JSON.stringify({ status: "spinning", message: "Spin button clicked" }) }] };
                  }
                  return { content: [{ type: "text", text: JSON.stringify({ status: "error", message: "Spin button not found or not on spin page. Navigate to /games/spin first." }) }] };
                }
              );

              mcp.registerResource(
                "page-content",
                "The visible text content of the current page",
                { uri: "page://current", mimeType: "text/plain" },
                (uri: string) => {
                  return {
                    contents: [
                      {
                        uri: uri,
                        mimeType: "text/plain",
                        text: document.body.innerText,
                      },
                    ],
                  };
                }
              );

              console.log("[WebMCP] ✅ Don Fiapo MCP initialized — Tools: get_project_info, navigate, get_wallet_status, get_fiapo_balance, do_spin");
            }
          } catch (err) {
            console.error("[WebMCP] Failed to initialize:", err);
          }
        }}
      />
    </>
  );
}
