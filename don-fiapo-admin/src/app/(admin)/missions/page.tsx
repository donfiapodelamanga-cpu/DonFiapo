"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Link2,
  RefreshCw,
  Video,
  Youtube,
  ExternalLink,
  AlertTriangle,
  Calendar,
  Pin,
  Users,
  Trophy,
  Archive,
  Pause,
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VideoSubmission {
  id: string;
  status: string;
  earnedPoints: number;
  submittedAt: string;
  verifiedAt: string | null;
  videoUrl: string | null;
  platform: string | null;
  reviewDeadline: string | null;
  daysLeft: number | null;
  isExpired: boolean;
  user: {
    id: string;
    xUsername: string | null;
    rank: string;
    trustScore: number;
    wallets: { address: string }[];
  };
  mission: {
    id: string;
    name: string;
    actionType: string | null;
    basePoints: number;
    multiplier: number;
  };
}

interface Mission {
  id: string;
  name: string;
  description: string;
  type: string;
  platform: string;
  basePoints: number;
  multiplier: number;
  maxCompletions: number;
  isActive: boolean;
  status: string;
  priority: number;
  category: string | null;
  startDate: string | null;
  endDate: string | null;
  targetUrl: string | null;
  actionType: string | null;
  requiredKeyword: string | null;
  _count?: { completions: number };
}

interface ReferralMilestone {
  id: string;
  tier: number;
  name: string;
  bonusPoints: number;
  badge: string | null;
  isActive: boolean;
}

interface Completion {
  id: string;
  status: string;
  earnedPoints: number;
  completedAt: string;
  user: {
    id: string;
    xUsername: string | null;
    rank: string;
    trustScore: number;
    wallets: { address: string }[];
  };
  mission: {
    id: string;
    name: string;
    type: string;
    platform: string;
    basePoints: number;
  };
}

const MISSION_TYPES = ["OFFCHAIN", "ONCHAIN"];
const PLATFORMS = ["X", "TELEGRAM", "MINIAPP", "WALLET", "NFT", "SMART_CONTRACT", "REFERRAL", "TIKTOK", "YOUTUBE", "MEDIUM", "CMC"];
const ACTIONS = [
  "FOLLOW", "LIKE", "REPOST", "COMMENT", "CONNECT_WALLET",
  "STAKE", "SWAP", "MINT_NFT", "SPIN", "VOTE", "JOIN_GROUP",
  "BUY_NFT", "SELL_NFT", "TRADE_NFT", "BID_NFT",
  "VIDEO_TIKTOK", "VIDEO_YOUTUBE", "ARTICLE_MEDIUM", "ARTICLE_CMC",
  "REFER_FREE", "REFER_NFT",
];
const MISSION_STATUSES = ["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED"] as const;
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  PAUSED: "bg-yellow-500/20 text-yellow-400",
  DRAFT: "bg-neutral-500/20 text-neutral-400",
  ARCHIVED: "bg-red-500/20 text-red-400",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  ACTIVE: <CheckCircle className="w-3 h-3" />,
  PAUSED: <Pause className="w-3 h-3" />,
  DRAFT: <Clock className="w-3 h-3" />,
  ARCHIVED: <Archive className="w-3 h-3" />,
};

// Groups for display
const CATEGORY_MAP: Record<string, string> = {
  FOLLOW: "Social", LIKE: "Social", REPOST: "Social", COMMENT: "Social", JOIN_GROUP: "Social",
  CONNECT_WALLET: "Wallet",
  MINT_NFT: "NFT Mint",
  STAKE: "Staking",
  SPIN: "Spin Game",
  BUY_NFT: "Marketplace", SELL_NFT: "Marketplace", TRADE_NFT: "Marketplace", BID_NFT: "Marketplace",
  VOTE: "Governance",
  VIDEO_TIKTOK: "UGC Vídeo", VIDEO_YOUTUBE: "UGC Vídeo",
  ARTICLE_MEDIUM: "Content", ARTICLE_CMC: "Content",
  REFER_FREE: "Referral", REFER_NFT: "Referral",
};

const ACTION_COLORS: Record<string, string> = {
  Social: "bg-blue-500/20 text-blue-400",
  Wallet: "bg-cyan-500/20 text-cyan-400",
  "NFT Mint": "bg-yellow-500/20 text-yellow-400",
  Staking: "bg-green-500/20 text-green-400",
  "Spin Game": "bg-pink-500/20 text-pink-400",
  Marketplace: "bg-orange-500/20 text-orange-400",
  Governance: "bg-indigo-500/20 text-indigo-400",
  "UGC Vídeo": "bg-pink-500/20 text-pink-400",
  Content: "bg-teal-500/20 text-teal-400",
  Referral: "bg-amber-500/20 text-amber-400",
};

/** Parse minCount from marketplace:sell:3 → 3 */
function parseVolumeRequired(targetUrl: string | null): number | null {
  if (!targetUrl) return null;
  const parts = targetUrl.split(":");
  if (parts.length >= 3 && parts[0] === "marketplace") {
    const n = parseInt(parts[2], 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Returns true if targetUrl is a real navigable URL */
function isNavigableUrl(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith("http") || url.startsWith("/");
}

const emptyMission = {
  name: "",
  description: "",
  type: "OFFCHAIN",
  platform: "X",
  basePoints: 50,
  multiplier: 1,
  maxCompletions: 1,
  isActive: true,
  status: "ACTIVE" as string,
  priority: 0,
  category: "",
  startDate: "",
  endDate: "",
  targetUrl: "",
  requiredKeyword: "",
  actionType: "FOLLOW",
};

export default function MissionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"missions" | "pending" | "videos" | "milestones">("missions");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMission);
  const [saving, setSaving] = useState(false);
  const [videoSubmissions, setVideoSubmissions] = useState<VideoSubmission[]>([]);
  const [videoTab, setVideoTab] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<ReferralMilestone[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (err) {
      console.error("[Missions] Fetch error:", err);
    }
  }, []);

  const fetchVideoSubmissions = useCallback(async (status = videoTab) => {
    try {
      const res = await fetch(`/api/admin/missions/videos?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setVideoSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("[Videos] Fetch error:", err);
    }
  }, [videoTab]);

  const handleVideoReview = async (completionId: string, approved: boolean, reason?: string) => {
    setReviewingId(completionId);
    try {
      const res = await fetch("/api/admin/missions/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId, approved, reason }),
      });
      if (res.ok) {
        await fetchVideoSubmissions();
      }
    } catch (err) {
      console.error("[VideoReview]", err);
    } finally {
      setReviewingId(null);
    }
  };

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/missions/milestones");
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (err) {
      console.error("[Milestones] Fetch error:", err);
    }
  }, []);

  const fetchCompletions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/missions/completions?status=PENDING");
      if (res.ok) {
        const data = await res.json();
        setCompletions(data.completions || []);
      }
    } catch (err) {
      console.error("[Completions] Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    setSession(s);
    Promise.all([fetchMissions(), fetchCompletions(), fetchVideoSubmissions("PENDING"), fetchMilestones()]).finally(() => setLoading(false));
  }, [router, fetchMissions, fetchCompletions, fetchVideoSubmissions, fetchMilestones]);

  useEffect(() => {
    if (tab === "videos") fetchVideoSubmissions(videoTab);
  }, [tab, videoTab, fetchVideoSubmissions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/admin/missions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyMission);
        await fetchMissions();
      }
    } catch (err) {
      console.error("[Save Mission]", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Desativar esta missão?")) return;
    await fetch("/api/admin/missions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchMissions();
  };

  const handleVerify = async (completionId: string, approved: boolean) => {
    await fetch("/api/admin/missions/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId, approved, reason: approved ? undefined : "Rejected by admin" }),
    });
    await fetchCompletions();
  };

  const startEdit = (m: Mission) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      description: m.description,
      type: m.type,
      platform: m.platform,
      basePoints: m.basePoints,
      multiplier: m.multiplier,
      maxCompletions: m.maxCompletions,
      isActive: m.isActive,
      status: m.status || "ACTIVE",
      priority: m.priority || 0,
      category: m.category || "",
      startDate: m.startDate ? m.startDate.slice(0, 16) : "",
      endDate: m.endDate ? m.endDate.slice(0, 16) : "",
      targetUrl: m.targetUrl || "",
      requiredKeyword: m.requiredKeyword || "",
      actionType: m.actionType || "FOLLOW",
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const filteredMissions = statusFilter === "ALL" ? missions : missions.filter((m) => (m.status || "ACTIVE") === statusFilter);
  const offchain = missions.filter((m) => m.type === "OFFCHAIN");
  const onchain = missions.filter((m) => m.type === "ONCHAIN");
  const marketplace = missions.filter((m) => ["BUY_NFT", "SELL_NFT", "TRADE_NFT", "BID_NFT"].includes(m.actionType ?? ""));
  const ugcMissions = missions.filter((m) => ["VIDEO_TIKTOK", "VIDEO_YOUTUBE"].includes(m.actionType ?? ""));
  const referralMissions = missions.filter((m) => m.platform === "REFERRAL" || ["REFER_FREE", "REFER_NFT"].includes(m.actionType ?? ""));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Target className="w-6 h-6 text-yellow-500" />
            </div>
            Royal Missions
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Engine de Missões • {missions.length} missões • {completions.length} pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { Promise.all([fetchMissions(), fetchCompletions()]); }}
            className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyMission); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/30 hover:bg-yellow-500/20 transition text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Nova Missão
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("missions")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition",
            tab === "missions" ? "bg-yellow-500/10 text-yellow-500" : "text-neutral-400 hover:text-white"
          )}
        >
          Missões ({missions.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition",
            tab === "pending" ? "bg-yellow-500/10 text-yellow-500" : "text-neutral-400 hover:text-white",
            completions.length > 0 && tab !== "pending" && "text-red-400"
          )}
        >
          Pendentes ({completions.length})
        </button>
        <button
          onClick={() => setTab("videos")}
          className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition",
            tab === "videos" ? "bg-pink-500/10 text-pink-400" : "text-neutral-400 hover:text-white",
            videoSubmissions.filter(v => v.status === "PENDING").length > 0 && tab !== "videos" && "text-pink-400"
          )}
        >
          <Video className="w-3.5 h-3.5" />
          Vídeos UGC
          {videoSubmissions.filter(v => v.status === "PENDING").length > 0 && (
            <span className="bg-pink-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {videoSubmissions.filter(v => v.status === "PENDING").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("milestones")}
          className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition",
            tab === "milestones" ? "bg-amber-500/10 text-amber-400" : "text-neutral-400 hover:text-white"
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          Milestones ({milestones.length})
        </button>
      </div>

      {/* Mission Form Modal */}
      {showForm && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-lg">{editingId ? "Editar Missão" : "Nova Missão"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-xs text-neutral-500 mb-1 block">Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm">
                {MISSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-neutral-500 mb-1 block">Descrição</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm">
                {MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Plataforma</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Ação</label>
              <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm">
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Pontos Base</label>
              <input type="number" value={form.basePoints} onChange={(e) => setForm({ ...form, basePoints: Number(e.target.value) })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Multiplicador</label>
              <input type="number" step="0.1" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Max Completions</label>
              <input type="number" value={form.maxCompletions} onChange={(e) => setForm({ ...form, maxCompletions: Number(e.target.value) })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Prioridade (pin)</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                placeholder="0 = normal, 100+ = pinned" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Categoria</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Referral, Social..." className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Início</label>
              <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Data Fim</label>
              <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">URL Alvo</label>
              <input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                placeholder="https://..." className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Keyword Obrigatória</label>
              <input value={form.requiredKeyword} onChange={(e) => setForm({ ...form, requiredKeyword: e.target.value })}
                placeholder="#DonFiapo" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-yellow-500" />
              <label className="text-sm text-neutral-300">Ativa</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editingId ? "Salvar" : "Criar"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-400 text-sm hover:text-white transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Missions Tab */}
      {tab === "missions" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">Total</div>
              <div className="text-2xl font-black text-white">{filteredMissions.length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-green-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">Active</div>
              <div className="text-2xl font-black text-green-400">{missions.filter((m) => m.status === "ACTIVE").length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">Paused</div>
              <div className="text-2xl font-black text-yellow-400">{missions.filter((m) => m.status === "PAUSED").length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-neutral-600/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">Draft</div>
              <div className="text-2xl font-black text-neutral-400">{missions.filter((m) => m.status === "DRAFT").length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-amber-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Referral</div>
              <div className="text-2xl font-black text-amber-400">{referralMissions.length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-blue-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">Off-chain</div>
              <div className="text-2xl font-black text-blue-400">{offchain.length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-purple-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs">On-chain</div>
              <div className="text-2xl font-black text-purple-400">{onchain.length}</div>
            </div>
            <div className="bg-neutral-900/40 border border-cyan-500/20 rounded-xl p-4">
              <div className="text-neutral-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Scheduled</div>
              <div className="text-2xl font-black text-cyan-400">{missions.filter((m) => m.startDate || m.endDate).length}</div>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-xl w-fit">
            {["ALL", ...MISSION_STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition",
                  statusFilter === s ? "bg-yellow-500/10 text-yellow-400" : "text-neutral-400 hover:text-white"
                )}>
                {s === "ALL" ? `Todas (${missions.length})` : `${s} (${missions.filter(m => m.status === s).length})`}
              </button>
            ))}
          </div>

          {/* Early Bird Distribution Overview */}
          <EarlyBirdAdminCard />

          {/* Missions grouped by category */}
          {(() => {
            // Build ordered categories — Referral pinned first
            const categoryOrder = ["Referral", "Social", "Wallet", "NFT Mint", "Staking", "Spin Game", "Marketplace", "Governance", "UGC Vídeo", "Content"];
            const grouped: Record<string, Mission[]> = {};
            for (const m of filteredMissions) {
              const cat = CATEGORY_MAP[m.actionType ?? ""] ?? "Outros";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(m);
            }
            const sortedCategories = [
              ...categoryOrder.filter((c) => grouped[c]),
              ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
            ];

            return (
              <div className="space-y-4">
                {sortedCategories.map((cat) => (
                  <div key={cat} className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
                    {/* Category header */}
                    <div className={cn("px-4 py-2.5 flex items-center gap-2 border-b border-neutral-800/50", ACTION_COLORS[cat] ?? "bg-neutral-800/30 text-neutral-400")}>
                      <span className="text-xs font-black uppercase tracking-widest">{cat}</span>
                      <span className="text-xs opacity-60">({grouped[cat].length} missões)</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800/50">
                          <th className="text-left py-2 px-4">Missão</th>
                          <th className="text-left py-2 px-4">Ação</th>
                          <th className="text-right py-2 px-4">Pontos</th>
                          <th className="text-right py-2 px-4">Multi</th>
                          <th className="text-center py-2 px-4">Status</th>
                          <th className="text-center py-2 px-4">Agenda</th>
                          <th className="text-center py-2 px-4">Compl.</th>
                          <th className="text-right py-2 px-4">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[cat].map((m) => {
                          const hasLink = isNavigableUrl(m.targetUrl);
                          const mStatus = m.status || "ACTIVE";
                          const hasSchedule = !!(m.startDate || m.endDate);
                          const isPinned = (m.priority || 0) >= 100;
                          return (
                            <tr key={m.id} className={cn(
                              "border-b border-neutral-800/30 hover:bg-neutral-800/20 transition last:border-0",
                              isPinned && "bg-amber-500/5"
                            )}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  {isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                                  <div>
                                    <div className="font-medium text-white">{m.name}</div>
                                    <div className="text-neutral-500 text-xs truncate max-w-[260px]">{m.description}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded font-mono", ACTION_COLORS[cat] ?? "bg-neutral-700 text-neutral-300")}>
                                  {m.actionType ?? "—"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-yellow-400">{m.basePoints}</td>
                              <td className="py-3 px-4 text-right text-neutral-300">x{m.multiplier}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_COLORS[mStatus] ?? "bg-neutral-700 text-neutral-300")}>
                                  {STATUS_ICONS[mStatus]} {mStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {hasSchedule ? (
                                  <div className="text-[10px] text-cyan-400 space-y-0.5">
                                    {m.startDate && <div className="flex items-center gap-0.5 justify-center"><Calendar className="w-2.5 h-2.5" />{new Date(m.startDate).toLocaleDateString("pt-BR")}</div>}
                                    {m.endDate && <div className="flex items-center gap-0.5 justify-center text-orange-400"><Clock className="w-2.5 h-2.5" />{new Date(m.endDate).toLocaleDateString("pt-BR")}</div>}
                                  </div>
                                ) : (
                                  <span className="text-neutral-600 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center text-neutral-400 font-mono text-xs">{m._count?.completions ?? 0}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  {hasLink && (
                                    <a href={m.targetUrl!} target="_blank" rel="noreferrer"
                                      className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-white transition">
                                      <Link2 className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button onClick={() => startEdit(m)}
                                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-yellow-400 transition">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(m.id)}
                                    className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
                {missions.length === 0 && (
                  <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl py-12 text-center text-neutral-500">
                    Nenhuma missão cadastrada
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Pending Completions Tab */}
      {tab === "pending" && (
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="text-left py-3 px-4">Usuário</th>
                <th className="text-left py-3 px-4">Missão</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-right py-3 px-4">Pontos</th>
                <th className="text-center py-3 px-4">Trust</th>
                <th className="text-left py-3 px-4">Data</th>
                <th className="text-right py-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {completions.map((c) => (
                <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition">
                  <td className="py-3 px-4">
                    <div className="text-white font-medium text-xs">
                      {c.user.xUsername || c.user.wallets?.[0]?.address?.slice(0, 10) || c.user.id.slice(0, 8)}
                    </div>
                    <div className="text-neutral-500 text-[10px]">{c.user.rank}</div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300">{c.mission.name}</td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className={c.mission.type === "ONCHAIN" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}>
                      {c.mission.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-yellow-400">{c.earnedPoints}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn("text-xs font-bold", c.user.trustScore >= 80 ? "text-green-400" : c.user.trustScore >= 50 ? "text-yellow-400" : "text-red-400")}>
                      {c.user.trustScore}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-500 text-xs">{new Date(c.completedAt).toLocaleString("pt-BR")}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleVerify(c.id, true)}
                        className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition" title="Aprovar">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleVerify(c.id, false)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition" title="Rejeitar">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {completions.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-500">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                  Nenhuma verificação pendente
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Referral Milestones Tab */}
      {tab === "milestones" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300/80">
              <p className="font-semibold text-amber-400 mb-0.5">Referral Milestone Tiers</p>
              <p>Configure bonus points awarded when a referrer reaches specific friend-count milestones. Tiers: 1, 5, 10, 30, 50, 100, 1K, 5K, 10K.</p>
            </div>
          </div>

          {milestones.length === 0 && (
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl py-12 text-center space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-neutral-700" />
              <p className="text-neutral-500 text-sm">Nenhum milestone configurado</p>
              <button
                onClick={async () => {
                  await fetch("/api/admin/missions/milestones", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "seed" }),
                  });
                  await fetchMilestones();
                }}
                className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-500/20 transition text-sm font-bold"
              >
                Seed Default Milestones
              </button>
            </div>
          )}

          {milestones.length > 0 && (
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800/50">
                    <th className="text-left py-2 px-4">Tier</th>
                    <th className="text-left py-2 px-4">Nome</th>
                    <th className="text-right py-2 px-4">Bonus Points</th>
                    <th className="text-center py-2 px-4">Badge</th>
                    <th className="text-center py-2 px-4">Status</th>
                    <th className="text-right py-2 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id} className="border-b border-neutral-800/30 hover:bg-neutral-800/20 transition last:border-0">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" /> {m.tier >= 1000 ? `${(m.tier / 1000).toFixed(0)}K` : m.tier} amigos
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{m.name}</td>
                      <td className="py-3 px-4 text-right font-bold text-yellow-400">{m.bonusPoints.toLocaleString("pt-BR")}</td>
                      <td className="py-3 px-4 text-center text-neutral-400 text-xs">{m.badge || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        {m.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-500 text-xs"><XCircle className="w-3 h-3" /> Inativo</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            await fetch("/api/admin/missions/milestones", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ tier: m.tier, isActive: !m.isActive }),
                            });
                            await fetchMilestones();
                          }}
                          className={cn("px-2 py-1 rounded text-xs font-bold transition",
                            m.isActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          )}
                        >
                          {m.isActive ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Videos UGC Tab */}
      {tab === "videos" && (
        <div className="space-y-4">
          {/* Header info */}
          <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <div className="text-xs text-pink-300/80">
              <p className="font-semibold text-pink-400 mb-0.5">Revisão de Vídeos UGC</p>
              <p>Avalie os vídeos submetidos pelos usuários. Aprovados ganham pontos automaticamente. Prazo de revisão: <strong>7 dias</strong> após submissão.</p>
            </div>
          </div>

          {/* Sub-tabs: PENDING / VERIFIED / REJECTED */}
          <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-xl w-fit">
            {(["PENDING", "VERIFIED", "REJECTED"] as const).map((s) => (
              <button key={s} onClick={() => setVideoTab(s)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition",
                  videoTab === s
                    ? s === "PENDING" ? "bg-yellow-500/10 text-yellow-400"
                      : s === "VERIFIED" ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                    : "text-neutral-400 hover:text-white"
                )}>
                {s === "PENDING" ? "⏳ Pendentes" : s === "VERIFIED" ? "✅ Aprovados" : "❌ Rejeitados"}
              </button>
            ))}
          </div>

          {/* Submissions list */}
          <div className="space-y-3">
            {videoSubmissions.map((v) => {
              const isPlatformTikTok = v.platform === "TikTok";
              const isReviewing = reviewingId === v.id;
              return (
                <div key={v.id} className={cn(
                  "rounded-2xl border p-4 space-y-3",
                  v.status === "PENDING" ? "bg-neutral-900/60 border-yellow-500/20" :
                  v.status === "VERIFIED" ? "bg-green-500/5 border-green-500/20" :
                  "bg-red-500/5 border-red-500/20"
                )}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: user + mission info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPlatformTikTok
                          ? <Video className="w-4 h-4 text-pink-400 shrink-0" />
                          : <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                        }
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", isPlatformTikTok ? "bg-pink-500/15 text-pink-400" : "bg-red-500/15 text-red-400")}>
                          {v.platform ?? "Video"}
                        </span>
                        <span className="text-sm font-semibold text-white">{v.mission.name}</span>
                        <span className="text-xs text-yellow-400 font-bold">+{v.mission.basePoints} pts ×{v.mission.multiplier}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                        <span>👤 {v.user.xUsername || v.user.wallets?.[0]?.address?.slice(0, 12) || v.user.id.slice(0, 8)}</span>
                        <span>📊 {v.user.rank}</span>
                        <span className={cn("font-bold", v.user.trustScore >= 80 ? "text-green-400" : v.user.trustScore >= 50 ? "text-yellow-400" : "text-red-400")}>
                          Trust: {v.user.trustScore}
                        </span>
                        <span>📅 {new Date(v.submittedAt).toLocaleDateString("pt-BR")}</span>
                        {v.status === "PENDING" && v.daysLeft !== null && (
                          <span className={cn("font-semibold", v.isExpired ? "text-red-400" : v.daysLeft <= 2 ? "text-orange-400" : "text-neutral-300")}>
                            {v.isExpired ? "⚠️ Prazo vencido!" : `⏱ ${v.daysLeft}d restantes`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: approve/reject buttons */}
                    {v.status === "PENDING" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleVideoReview(v.id, true)}
                          disabled={isReviewing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition text-xs font-bold disabled:opacity-50"
                        >
                          {isReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleVideoReview(v.id, false, "Conteúdo não atende aos requisitos")}
                          disabled={isReviewing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs font-bold disabled:opacity-50"
                        >
                          {isReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Rejeitar
                        </button>
                      </div>
                    )}
                    {v.status === "VERIFIED" && (
                      <span className="flex items-center gap-1 text-green-400 text-xs font-bold shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprovado · +{v.earnedPoints} pts
                      </span>
                    )}
                    {v.status === "REJECTED" && (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-bold shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitado
                      </span>
                    )}
                  </div>

                  {/* Video URL preview */}
                  {v.videoUrl && (
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {v.videoUrl}
                    </a>
                  )}
                </div>
              );
            })}

            {videoSubmissions.length === 0 && (
              <div className="rounded-2xl border border-neutral-800/50 bg-neutral-900/40 py-12 text-center text-neutral-500">
                <Video className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                <p className="text-sm">Nenhum vídeo {videoTab === "PENDING" ? "pendente" : videoTab === "VERIFIED" ? "aprovado" : "rejeitado"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Early Bird Admin Card ──────────────────────────────────────────────────────

interface EarlyBirdData {
  totalAmount: number;
  maxSlots: number;
  slotsClaimed: number;
  slotsRemaining: number;
  percentFilled: number;
  lunesPerSlot: number;
  isFull: boolean;
}

function EarlyBirdAdminCard() {
  const [data, setData] = useState<EarlyBirdData | null>(null);

  useEffect(() => {
    fetch("/api/airdrop/early-bird-status")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const pct = Math.min(100, data.percentFilled);

  return (
    <div className="bg-neutral-900/40 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Early Bird Distribution</p>
            <p className="text-xs text-neutral-500">100,000 LUNES · 30,000 slots · ≈{data.lunesPerSlot.toFixed(2)} LUNES/slot</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-400">Claimed: <strong className="text-yellow-400">{data.slotsClaimed.toLocaleString("pt-BR")}</strong></span>
          <span className="text-neutral-400">Restantes: <strong className={data.isFull ? "text-red-400" : "text-green-400"}>{data.isFull ? "ESGOTADO" : data.slotsRemaining.toLocaleString("pt-BR")}</strong></span>
          <span className="text-neutral-400">Distribuído: <strong className="text-golden">{(data.slotsClaimed * data.lunesPerSlot).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} LUNES</strong></span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-yellow-400")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-600 text-right">{pct.toFixed(1)}% preenchido</p>
      </div>
    </div>
  );
}
