"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, ShieldAlert, Twitter, MessageCircle, RefreshCw, Wallet, Pickaxe, Vote, Globe, Loader2, Link2, ShieldCheck, AlertTriangle, Coins, Zap, Video, Youtube, Clock, BookOpen, BarChart2, Instagram, Hash, Gamepad2, PenTool, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useWalletStore } from "@/lib/stores";
import { useMissions, useSocialAuth } from "@/hooks/useMissions";
import type { MissionDTO } from "@/lib/missions/types";
import { ONCHAIN_MULTIPLIER } from "@/lib/missions/types";

const PLATFORM_ICON: Record<string, React.ElementType> = {
  X: Twitter,
  TELEGRAM: MessageCircle,
  MINIAPP: Globe,
  WALLET: Wallet,
  NFT: Pickaxe,
  SMART_CONTRACT: Vote,
  TIKTOK: Video,
  YOUTUBE: Youtube,
  MEDIUM: BookOpen,
  CMC: BarChart2,
  INSTAGRAM: Instagram,
  REDDIT: Hash,
  DISCORD: Gamepad2,
  BLOG: PenTool,
  REFERRAL: UserPlus,
};

// Action types that use on-chain verification
const ONCHAIN_VERIFY_ACTIONS = new Set(["MINT_NFT", "STAKE", "SPIN", "SELL_NFT", "BUY_NFT", "TRADE_NFT", "BID_NFT"]);

// Actions that require the user to navigate somewhere first
const ONCHAIN_NAVIGATE_URLS: Record<string, string> = {
  MINT_NFT: "/ico/my-nfts",
  STAKE: "/staking",
  SPIN: "/games/spin",
  SELL_NFT: "/marketplace",
  BUY_NFT: "/marketplace",
  TRADE_NFT: "/marketplace",
  BID_NFT: "/marketplace",
};

// Badge labels per action type
const ONCHAIN_BADGE_LABELS: Record<string, string> = {
  MINT_NFT: "NFT Verified",
  STAKE: "Staking Verified",
  SPIN: "Spin Verified",
  SELL_NFT: "Marketplace Verified",
  BUY_NFT: "Marketplace Verified",
  TRADE_NFT: "Marketplace Verified",
  BID_NFT: "Marketplace Verified",
};

const PLATFORM_COLOR: Record<string, string> = {
  X: "text-blue-400",
  TELEGRAM: "text-blue-500",
  MINIAPP: "text-cyan-400",
  WALLET: "text-purple-400",
  NFT: "text-golden",
  SMART_CONTRACT: "text-green-400",
  TIKTOK: "text-pink-400",
  YOUTUBE: "text-red-400",
  MEDIUM: "text-green-300",
  CMC: "text-blue-300",
  INSTAGRAM: "text-pink-500",
  REDDIT: "text-orange-400",
  DISCORD: "text-indigo-400",
  BLOG: "text-emerald-400",
  REFERRAL: "text-golden",
};

// UGC content action types
const VIDEO_ACTIONS = new Set(["VIDEO_TIKTOK", "VIDEO_YOUTUBE"]);
const ARTICLE_ACTIONS = new Set(["ARTICLE_MEDIUM", "ARTICLE_CMC", "ARTICLE_BLOG"]);

export function RoyalMissions() {
  const { addToast } = useToast();
  const { lunesConnected, lunesAddress } = useWalletStore();
  const { missions, score, loading, submitting, fetchMissions, submitMission, verifySocialMission, verifyOnchainMission, submitVideoMission } = useMissions(lunesAddress || undefined);
  const { status: socialStatus, connectX } = useSocialAuth(lunesAddress || undefined);

  // Tracks mission IDs that the user has already opened the URL for (step 1 done, awaiting step 2 confirm)
  const [pendingVerify, setPendingVerify] = useState<Set<string>>(new Set());
  // Tracks video URL input per mission
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  // Tracks which video missions are showing the URL input form
  const [videoFormOpen, setVideoFormOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const isSocialPlatform = (platform: string) =>
    platform === "X" || platform === "TELEGRAM";

  const isOnchainVerifiable = (mission: MissionDTO) =>
    mission.type === "ONCHAIN" && ONCHAIN_VERIFY_ACTIONS.has((mission.actionType ?? "").toUpperCase());

  const buildTargetUrl = (targetUrl: string) =>
    targetUrl.startsWith("http")
      ? targetUrl
      : targetUrl.replace(/^(follow|tweet|like|repost|comment):/, "https://x.com/");

  const handleStartQuest = async (mission: MissionDTO) => {
    if (!lunesConnected) {
      addToast("error", "Wallet Required", "Connect your wallet to start quests.");
      return;
    }

    // ── On-chain verifiable missions (NFT mint, Staking, Spin): 2-step flow ──
    if (isOnchainVerifiable(mission)) {
      const isOpened = pendingVerify.has(mission.id);

      if (!isOpened) {
        // Step 1: navigate the user to the appropriate on-chain action page
        const actionType = (mission.actionType ?? "").toUpperCase();
        const navUrl = mission.targetUrl?.startsWith("http")
          ? mission.targetUrl
          : ONCHAIN_NAVIGATE_URLS[actionType] ?? null;

        if (navUrl) {
          if (navUrl.startsWith("http")) {
            window.open(navUrl, "_blank");
          } else {
            window.open(navUrl, "_blank");
          }
        }
        setPendingVerify((prev) => new Set(prev).add(mission.id));
        addToast("info", "Action Opened", "Complete the on-chain action, then click 'Verify On-Chain'.");
        return;
      }

      // Step 2: verify on-chain
      const result = await verifyOnchainMission(mission.id);
      if (result.success) {
        setPendingVerify((prev) => { const s = new Set(prev); s.delete(mission.id); return s; });
        addToast("success", "Quest Verified On-Chain!", result.message);
      } else if (result.code === "ONCHAIN_NOT_VERIFIED") {
        // Show progress if available (volume missions)
        const progressSuffix =
          result.count !== undefined && result.required !== undefined
            ? ` Progress: ${result.count}/${result.required}.`
            : "";
        addToast("error", "Not Verified Yet", result.message + progressSuffix);
      } else if (result.code === "ALREADY_VERIFIED") {
        addToast("info", "Already Completed", "This quest was already verified.");
      } else {
        addToast("error", "Verification Failed", result.message);
      }
      return;
    }

    // ── Social missions (X / Telegram): 2-step flow ──
    if (mission.type === "OFFCHAIN" && isSocialPlatform(mission.platform)) {
      if (mission.platform === "X" && !socialStatus.x.connected) {
        addToast("error", "X Account Required", "Connect your X account first to verify this quest.");
        connectX();
        return;
      }
      if (mission.platform === "TELEGRAM" && !socialStatus.telegram.connected) {
        addToast("error", "Telegram Required", "Connect your Telegram account first to verify this quest.");
        return;
      }

      const isOpened = pendingVerify.has(mission.id);

      if (!isOpened) {
        if (mission.targetUrl) {
          window.open(buildTargetUrl(mission.targetUrl), "_blank");
        }
        setPendingVerify((prev) => new Set(prev).add(mission.id));
        return;
      }

      const result = await verifySocialMission(mission.id);
      if (result.success) {
        setPendingVerify((prev) => { const s = new Set(prev); s.delete(mission.id); return s; });
        addToast("success", "Quest Verified!", result.message);
      } else if (result.code === "X_NOT_CONNECTED" || result.code === "X_TOKEN_EXPIRED") {
        addToast("error", "X Session Expired", "Please reconnect your X account.");
        connectX();
      } else if (result.code === "TELEGRAM_NOT_CONNECTED") {
        addToast("error", "Telegram Not Connected", "Please connect your Telegram account and try again.");
      } else {
        addToast("error", "Quest Failed", result.message);
      }
      return;
    }

    // ── Standard off-chain missions ──
    if (mission.targetUrl && mission.type === "OFFCHAIN") {
      window.open(mission.targetUrl, "_blank");
    }
    const result = await submitMission(mission.id);
    if (result.success) {
      addToast("success", "Quest Submitted!", result.message);
    } else {
      addToast("error", "Quest Failed", result.message);
    }
  };

  const handleVideoSubmit = async (mission: MissionDTO) => {
    if (!lunesConnected) {
      addToast("error", "Wallet Required", "Connect your wallet to submit a video.");
      return;
    }
    const url = (videoInputs[mission.id] ?? "").trim();
    if (!url) {
      addToast("error", "URL Required", "Paste the link to your video.");
      return;
    }
    const result = await submitVideoMission(mission.id, url);
    if (result.success) {
      setVideoFormOpen((prev) => { const s = new Set(prev); s.delete(mission.id); return s; });
      setVideoInputs((prev) => { const n = { ...prev }; delete n[mission.id]; return n; });
      addToast("success", "Video Submitted!", result.message);
    } else if (result.code === "ALREADY_VERIFIED") {
      addToast("info", "Already Approved", "This video mission was already verified.");
    } else if (result.code === "ALREADY_PENDING") {
      addToast("info", "Under Review", "Your video is already awaiting review. Check back in up to 7 days.");
    } else if (result.code === "DUPLICATE_URL") {
      addToast("error", "Duplicate URL", "This video link was already submitted by someone else.");
    } else {
      addToast("error", "Submission Failed", result.message);
    }
  };

  const offchainMissions = missions.filter((m) => m.type === "OFFCHAIN");
  const onchainMissions = missions.filter((m) => m.type === "ONCHAIN");

  const hasXMissions = offchainMissions.some((m) => m.platform === "X");
  const hasTelegramMissions = offchainMissions.some((m) => m.platform === "TELEGRAM");

  // Group on-chain missions by category
  const nftMissions = onchainMissions.filter((m) => m.platform === "NFT");
  const stakingMissions = onchainMissions.filter((m) => (m.actionType ?? "").toUpperCase() === "STAKE");
  const spinMissions = onchainMissions.filter((m) => (m.actionType ?? "").toUpperCase() === "SPIN");
  const marketplaceMissions = onchainMissions.filter((m) =>
    ["SELL_NFT", "BUY_NFT", "TRADE_NFT", "BID_NFT"].includes((m.actionType ?? "").toUpperCase())
  );
  const otherOnchainMissions = onchainMissions.filter(
    (m) =>
      m.platform !== "NFT" &&
      !["STAKE", "SPIN", "SELL_NFT", "BUY_NFT", "TRADE_NFT", "BID_NFT"].includes((m.actionType ?? "").toUpperCase())
  );

  // UGC video missions (off-chain, TIKTOK/YOUTUBE platform)
  const tiktokMissions = offchainMissions.filter((m) => m.platform === "TIKTOK");
  const youtubeMissions = offchainMissions.filter((m) => m.platform === "YOUTUBE");
  const articleMissions = offchainMissions.filter((m) => m.platform === "MEDIUM" || m.platform === "CMC");
  const referralMissions = missions.filter((m) => m.platform === "REFERRAL" || m.category === "Referral");
  const socialMissions = offchainMissions.filter((m) => m.platform === "X" || m.platform === "TELEGRAM");
  const otherOffchainMissions = offchainMissions.filter(
    (m) => !["X", "TELEGRAM", "TIKTOK", "YOUTUBE", "MEDIUM", "CMC", "REFERRAL"].includes(m.platform) && m.category !== "Referral"
  );

  return (
    <div className="space-y-8">
      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-golden/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Your Total Score</p>
            <p className="text-3xl font-bold text-golden">
              {score ? score.totalScore.toLocaleString('en-US') : "—"}
            </p>
            {score && (
              <Badge variant="outline" className="mt-2 bg-golden/10 text-golden border-golden/30">
                {score.rank}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-blue-500/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Off-chain Points</p>
            <p className="text-2xl font-bold text-blue-400">
              {score ? score.offchainScore.toLocaleString('en-US') : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-purple-500/20">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">On-chain Points (x{ONCHAIN_MULTIPLIER})</p>
            <p className="text-2xl font-bold text-purple-400">
              {score ? score.onchainScore.toLocaleString('en-US') : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Social Account Connection Panel */}
      {lunesConnected && (hasXMissions || hasTelegramMissions) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hasXMissions && (
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${socialStatus.x.connected ? "border-green-500/30 bg-green-500/5" : "border-blue-400/30 bg-blue-400/5"}`}>
              <div className="flex items-center gap-3">
                <Twitter className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {socialStatus.x.connected ? `@${socialStatus.x.username}` : "X (Twitter)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {socialStatus.x.connected ? "Connected — actions verified via API" : "Required for X quests"}
                  </p>
                </div>
              </div>
              {socialStatus.x.connected ? (
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Button size="sm" variant="outline" className="border-blue-400/40 text-blue-400 hover:bg-blue-400/10 shrink-0" onClick={connectX}>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" /> Connect
                </Button>
              )}
            </div>
          )}
          {hasTelegramMissions && (
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${socialStatus.telegram.connected ? "border-green-500/30 bg-green-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {socialStatus.telegram.connected ? `@${socialStatus.telegram.username}` : "Telegram"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {socialStatus.telegram.connected ? "Connected — membership verified" : "Required for Telegram quests"}
                  </p>
                </div>
              </div>
              {socialStatus.telegram.connected ? (
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Badge variant="outline" className="border-blue-500/40 text-blue-500 text-xs shrink-0">
                  Connect via quest
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trust Score Warning */}
      {lunesConnected && socialStatus.trustScore < 70 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-yellow-200">
            <strong className="text-yellow-400">Trust Score: {socialStatus.trustScore}/100</strong> — Your account has fraud signals detected.
            Avoid undoing social actions. Continued violations may result in a ban.
          </p>
        </div>
      )}

      {/* Anti-Fraud Banner */}
      <div className="bg-golden/10 border border-golden/30 rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-golden shrink-0 mt-0.5" />
        <p>
          <strong className="text-golden">Anti-Fraud System Active:</strong> Our royal guards verify every action
          directly via X and Telegram APIs. Undoing actions (unfollowing, leaving the group) will result
          in score penalties and potential ban from the reward pool.
        </p>
      </div>

      {loading && missions.length === 0 ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-golden mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quests...</p>
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No quests available yet. Check back soon!</p>
        </div>
      ) : (
        <>
          {referralMissions.length > 0 && (
            <MissionSection
              title="Invite & Earn — Referral Quests"
              subtitle="Invite friends to the Kingdom and earn massive rewards. The more you invite, the higher your rank!"
              missions={referralMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {nftMissions.length > 0 && (
            <MissionSection
              title="NFT Minting Quests"
              subtitle="Mint Don Fiapo NFTs on-chain — verified directly via smart contract"
              missions={nftMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {stakingMissions.length > 0 && (
            <MissionSection
              title="Staking Quests"
              subtitle="Stake $FIAPO in any pool — verified on-chain in real time"
              missions={stakingMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {spinMissions.length > 0 && (
            <MissionSection
              title="Spin Game Quest"
              subtitle="Try your luck with the Royal Wheel — verified on-chain"
              missions={spinMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {marketplaceMissions.length > 0 && (
            <MissionSection
              title="Marketplace Quests"
              subtitle="Buy, sell, trade, and bid on NFTs — every action verified directly via the Lunes marketplace contract"
              missions={marketplaceMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {otherOnchainMissions.length > 0 && (
            <MissionSection
              title="Other On-chain Quests"
              subtitle="High priority — earn up to 10x more points"
              missions={otherOnchainMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {socialMissions.length > 0 && (
            <MissionSection
              title="Social Quests"
              subtitle="Verified via X & Telegram APIs — actions are monitored"
              missions={socialMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}
          {otherOffchainMissions.length > 0 && (
            <MissionSection
              title="Other Quests"
              subtitle="Complete these tasks to earn extra points"
              missions={otherOffchainMissions}
              submitting={submitting}
              pendingVerify={pendingVerify}
              onStart={handleStartQuest}
            />
          )}

          {/* ── UGC Video Quests ── */}
          {(tiktokMissions.length > 0 || youtubeMissions.length > 0) && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                  <Video className="w-6 h-6 text-pink-400" />
                  Video Creation Quests
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create TikTok or YouTube content about Don Fiapo. Submit your link — the team reviews within <span className="text-orange-400 font-semibold">7 days</span> and approves your points.
                </p>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 flex items-start gap-3">
                <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-xs text-orange-300/80 space-y-0.5">
                  <p className="font-semibold text-orange-400">How it works:</p>
                  <p>1. Create your video on TikTok or YouTube featuring Don Fiapo.</p>
                  <p>2. Paste the public URL below and click Submit.</p>
                  <p>3. Our team reviews your content within 7 days — if approved, points are credited automatically.</p>
                </div>
              </div>

              {[...tiktokMissions, ...youtubeMissions].map((mission, idx) => {
                const Icon = mission.platform === "TIKTOK" ? Video : Youtube;
                const color = mission.platform === "TIKTOK" ? "text-pink-400" : "text-red-400";
                const borderColor = mission.platform === "TIKTOK" ? "border-pink-500/30" : "border-red-500/30";
                const bgColor = mission.platform === "TIKTOK" ? "bg-pink-500/5" : "bg-red-500/5";
                const isCompleted = mission.userStatus === "VERIFIED";
                const isPending = mission.userStatus === "PENDING";
                const isSubmitting = submitting === mission.id;
                const isFormOpen = videoFormOpen.has(mission.id);

                return (
                  <motion.div key={mission.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className={`border transition-colors ${isCompleted ? "border-green-500/30 bg-green-500/5" : isPending ? "border-yellow-500/30 bg-yellow-500/5" : `${borderColor} ${bgColor}`}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mission.platform === "TIKTOK" ? "bg-pink-500/10" : "bg-red-500/10"}`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-bold text-base">{mission.name}</h4>
                              <Badge variant="outline" className={`text-xs ${mission.platform === "TIKTOK" ? "bg-pink-500/10 text-pink-400 border-pink-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                                {mission.platform === "TIKTOK" ? "TikTok" : "YouTube"}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                7-day review
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{mission.description}</p>

                            {/* URL input form */}
                            {isFormOpen && !isCompleted && !isPending && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="url"
                                  placeholder={mission.platform === "TIKTOK" ? "https://www.tiktok.com/@user/video/..." : "https://www.youtube.com/watch?v=..."}
                                  value={videoInputs[mission.id] ?? ""}
                                  onChange={(e) => setVideoInputs((prev) => ({ ...prev, [mission.id]: e.target.value }))}
                                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-400"
                                />
                                <Button
                                  size="sm"
                                  className="bg-orange-500 hover:bg-orange-400 text-white shrink-0"
                                  onClick={() => handleVideoSubmit(mission)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Submit"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setVideoFormOpen((prev) => { const s = new Set(prev); s.delete(mission.id); return s; })}>
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {isPending && (
                              <p className="text-xs text-yellow-400/80 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Video under review — up to 7 days for approval.
                              </p>
                            )}
                          </div>

                          {/* Points + Button */}
                          <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="text-right shrink-0">
                              <p className="font-bold text-golden">+{mission.basePoints} pts</p>
                              {mission.multiplier > 1 && (
                                <p className="text-xs text-orange-400">x{mission.multiplier} Multiplier</p>
                              )}
                            </div>

                            {isCompleted ? (
                              <Button variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 cursor-default min-w-[140px]" disabled>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approved
                              </Button>
                            ) : isPending ? (
                              <Button variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 cursor-default min-w-[140px]" disabled>
                                <Clock className="w-4 h-4 mr-2" /> Under Review
                              </Button>
                            ) : isFormOpen ? null : (
                              <Button
                                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-400 hover:to-orange-400 text-white min-w-[140px]"
                                onClick={() => setVideoFormOpen((prev) => new Set(prev).add(mission.id))}
                                disabled={isSubmitting}
                              >
                                <Video className="w-4 h-4 mr-2" /> Submit Video
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Article Writing Quests ── */}
          {articleMissions.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-green-300" />
                  Article Writing Quests
                </h3>
                <p className="text-sm text-muted-foreground">
                  Write about Don Fiapo on Medium or CoinMarketCap. Submit your link — the team reviews within{" "}
                  <span className="text-orange-400 font-semibold">7 days</span> and approves your points.
                </p>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-start gap-3">
                <Clock className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <div className="text-xs text-green-300/80 space-y-0.5">
                  <p className="font-semibold text-green-400">How it works:</p>
                  <p>1. Write your article on Medium or publish on CoinMarketCap Community.</p>
                  <p>2. Paste the public article URL below and click Submit.</p>
                  <p>3. Our team reviews your content within 7 days — if approved, points are credited automatically.</p>
                </div>
              </div>

              {articleMissions.map((mission, idx) => {
                const isMedium = mission.platform === "MEDIUM";
                const Icon = isMedium ? BookOpen : BarChart2;
                const color = isMedium ? "text-green-300" : "text-blue-300";
                const borderColor = isMedium ? "border-green-500/30" : "border-blue-400/30";
                const bgColor = isMedium ? "bg-green-500/5" : "bg-blue-400/5";
                const badgeCls = isMedium
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-blue-400/10 text-blue-300 border-blue-400/30";
                const placeholder = isMedium
                  ? "https://medium.com/@yourname/article-title..."
                  : "https://coinmarketcap.com/currencies/don-fiapo/ or /community/post/...";
                const gradientBtn = isMedium
                  ? "bg-gradient-to-r from-green-600 to-teal-500 hover:from-green-500 hover:to-teal-400"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400";

                const isCompleted = mission.userStatus === "VERIFIED";
                const isPending = mission.userStatus === "PENDING";
                const isSubmitting = submitting === mission.id;
                const isFormOpen = videoFormOpen.has(mission.id);

                return (
                  <motion.div key={mission.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className={`border transition-colors ${isCompleted ? "border-green-500/30 bg-green-500/5" : isPending ? "border-yellow-500/30 bg-yellow-500/5" : `${borderColor} ${bgColor}`}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMedium ? "bg-green-500/10" : "bg-blue-400/10"}`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-bold text-base">{mission.name}</h4>
                              <Badge variant="outline" className={`text-xs ${badgeCls}`}>
                                {isMedium ? "Medium" : "CoinMarketCap"}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                7-day review
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{mission.description}</p>

                            {/* URL input form */}
                            {isFormOpen && !isCompleted && !isPending && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="url"
                                  placeholder={placeholder}
                                  value={videoInputs[mission.id] ?? ""}
                                  onChange={(e) => setVideoInputs((prev) => ({ ...prev, [mission.id]: e.target.value }))}
                                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green-400"
                                />
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-500 text-white shrink-0"
                                  onClick={() => handleVideoSubmit(mission)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Submit"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setVideoFormOpen((prev) => { const s = new Set(prev); s.delete(mission.id); return s; })}>
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {isPending && (
                              <p className="text-xs text-yellow-400/80 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Article under review — up to 7 days for approval.
                              </p>
                            )}
                          </div>

                          {/* Points + Button */}
                          <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="text-right shrink-0">
                              <p className="font-bold text-golden">+{mission.basePoints} pts</p>
                              {mission.multiplier > 1 && (
                                <p className="text-xs text-orange-400">x{mission.multiplier} Multiplier</p>
                              )}
                            </div>

                            {isCompleted ? (
                              <Button variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 cursor-default min-w-[140px]" disabled>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approved
                              </Button>
                            ) : isPending ? (
                              <Button variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 cursor-default min-w-[140px]" disabled>
                                <Clock className="w-4 h-4 mr-2" /> Under Review
                              </Button>
                            ) : isFormOpen ? null : (
                              <Button
                                className={`${gradientBtn} text-white min-w-[140px]`}
                                onClick={() => setVideoFormOpen((prev) => new Set(prev).add(mission.id))}
                                disabled={isSubmitting}
                              >
                                <BookOpen className="w-4 h-4 mr-2" /> Submit Article
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SOCIAL_PLATFORMS = new Set(["X", "TELEGRAM"]);

function MissionSection({ title, subtitle, missions, submitting, pendingVerify, onStart }: {
  title: string;
  subtitle: string;
  missions: MissionDTO[];
  submitting: string | null;
  pendingVerify: Set<string>;
  onStart: (m: MissionDTO) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold font-display text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {missions.map((mission, idx) => {
        const Icon = PLATFORM_ICON[mission.platform] || Globe;
        const color = PLATFORM_COLOR[mission.platform] || "text-muted-foreground";
        const isCompleted = mission.userStatus === "VERIFIED";
        const isPending = mission.userStatus === "PENDING";
        const isSocial = mission.type === "OFFCHAIN" && SOCIAL_PLATFORMS.has(mission.platform);
        const isOnchainVerify = ONCHAIN_VERIFY_ACTIONS.has((mission.actionType ?? "").toUpperCase());
        const isVerifying = submitting === mission.id;
        const isOpened = pendingVerify.has(mission.id);

        // Per-action-type label for the badge
        const actionType = (mission.actionType ?? "").toUpperCase();
        const onchainBadgeLabel = ONCHAIN_BADGE_LABELS[actionType] ?? "On-chain Verified";

        // Volume missions: parse minCount from targetUrl "marketplace:<action>:<minCount>"
        const isVolumeMission = ["SELL_NFT", "BUY_NFT", "TRADE_NFT", "BID_NFT"].includes(actionType);
        const volumeRequired = (() => {
          if (!isVolumeMission || !mission.targetUrl) return 1;
          const parts = mission.targetUrl.split(":");
          if (parts.length >= 3 && parts[0] === "marketplace") {
            const n = parseInt(parts[2], 10);
            return isNaN(n) ? 1 : n;
          }
          return 1;
        })();

        return (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`bg-card/50 border transition-colors ${
              isCompleted
                ? "border-green-500/30 bg-green-500/5"
                : isPending
                ? "border-yellow-500/30"
                : isOpened
                ? "border-purple-500/20 bg-purple-500/5"
                : "border-border hover:border-golden/50"
            }`}>
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-muted shrink-0 ${color} relative`}>
                  <Icon className="w-6 h-6" />
                  {isSocial && !isCompleted && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border border-background flex items-center justify-center">
                      <ShieldCheck className="w-2 h-2 text-white" />
                    </span>
                  )}
                  {isOnchainVerify && !isCompleted && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-600 border border-background flex items-center justify-center">
                      <Zap className="w-2 h-2 text-white" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-bold text-lg">{mission.name}</h4>
                    {isOnchainVerify && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                        {onchainBadgeLabel}
                      </Badge>
                    )}
                    {mission.type === "ONCHAIN" && !isOnchainVerify && (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                        On-chain
                      </Badge>
                    )}
                    {isSocial && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                        API Verified
                      </Badge>
                    )}
                    {mission.type === "OFFCHAIN" && !isSocial && (
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                        Social
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{mission.description}</p>

                  {/* Volume requirement badge for marketplace missions */}
                  {isVolumeMission && !isCompleted && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5">
                        Requires: {volumeRequired === 1
                          ? "1 action"
                          : `${volumeRequired} actions`}
                      </span>
                      {volumeRequired > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {actionType === "SELL_NFT" && `List ${volumeRequired} NFTs`}
                          {actionType === "BUY_NFT" && `Own ${volumeRequired} NFTs`}
                          {actionType === "TRADE_NFT" && `${volumeRequired} trade offers`}
                          {actionType === "BID_NFT" && `Lead ${volumeRequired} auctions`}
                        </span>
                      )}
                    </div>
                  )}

                  {isSocial && !isCompleted && (
                    <p className="text-xs text-blue-400/70 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {isOpened
                        ? "Done? Click \"Confirm & Verify\" to validate your action."
                        : `Verified directly via ${mission.platform === "X" ? "X API" : "Telegram Bot API"}`}
                    </p>
                  )}
                  {isOnchainVerify && !isCompleted && (
                    <p className="text-xs text-purple-400/70 mt-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {isOpened
                        ? "Action opened — click \"Verify On-Chain\" after completing it."
                        : "Verified directly via Lunes smart contract query."}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                  <div className="text-right shrink-0">
                    <p className="font-bold text-golden">+{mission.basePoints} pts</p>
                    {mission.multiplier > 1 && (
                      <p className="text-xs text-purple-400">x{mission.multiplier} Multiplier</p>
                    )}
                  </div>

                  {isCompleted ? (
                    <Button variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 cursor-default min-w-[140px]" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Verified
                    </Button>
                  ) : isPending ? (
                    <Button variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 cursor-default min-w-[140px]" disabled>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Verifying
                    </Button>
                  ) : isOnchainVerify ? (
                    <Button
                      className={`min-w-[140px] text-white ${
                        isOpened
                          ? "bg-purple-600 hover:bg-purple-500"
                          : "bg-golden/90 hover:bg-golden text-black"
                      }`}
                      onClick={() => onStart(mission)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
                      ) : isOpened ? (
                        <><Zap className="w-4 h-4 mr-2" /> Verify On-Chain</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Go & Do It</>
                      )}
                    </Button>
                  ) : isSocial ? (
                    <Button
                      className={`min-w-[140px] text-white ${
                        isOpened
                          ? "bg-green-600 hover:bg-green-500"
                          : "bg-blue-600 hover:bg-blue-500"
                      }`}
                      onClick={() => onStart(mission)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Verifying</>
                      ) : isOpened ? (
                        <><ShieldCheck className="w-4 h-4 mr-2" /> Confirm & Verify</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Go & Do It</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="glow-gold min-w-[140px]"
                      onClick={() => onStart(mission)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Start Quest</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
