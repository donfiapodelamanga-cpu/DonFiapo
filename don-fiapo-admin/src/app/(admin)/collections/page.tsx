"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Loader2,
  Image as ImageIcon,
  Package,
  DollarSign,
  Calendar,
  Trash2,
  Eye,
  Rocket,
  Pause,
  Clock,
  XCircle,
  Palette,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  coverImage: string | null;
  status: string;
  launchDate: string | null;
  createdBy: string;
  createdAt: string;
  totalItems: number;
  totalSupply: number;
  totalMinted: number;
  itemsWithArt: number;
  minPrice: number;
  maxPrice: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: "Rascunho", color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/50" },
  scheduled: { label: "Agendado", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/50" },
  active: { label: "Ativo", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/50" },
  paused: { label: "Pausado", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/50" },
  sold_out: { label: "Esgotado", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/50" },
};

export default function CollectionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
  });

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    if (!hasPermission(s, "collections")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(s);
  }, [router]);

  const activateScheduled = useCallback(async () => {
    try {
      await fetch("/api/admin/collections/activate-scheduled", { method: "POST" });
    } catch { /* silent */ }
  }, []);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      await activateScheduled();
      const res = await fetch("/api/admin/collections");
      if (res.ok) setCollections(await res.json());
    } catch (e) {
      console.error("Error fetching collections:", e);
    } finally {
      setLoading(false);
    }
  }, [activateScheduled]);

  useEffect(() => {
    if (session) fetchCollections();
  }, [session, fetchCollections]);

  // Auto-check agendamentos a cada 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      await activateScheduled();
      const res = await fetch("/api/admin/collections");
      if (res.ok) setCollections(await res.json());
    }, 60000);
    return () => clearInterval(interval);
  }, [session, activateScheduled]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, createdBy: session.email }),
      });
      if (res.ok) {
        const newCol = await res.json();
        setForm({ name: "", symbol: "", description: "" });
        setIsCreateOpen(false);
        router.push(`/collections/${newCol.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar coleção");
      }
    } catch {
      alert("Erro ao criar coleção");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCollections();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir");
      }
    } catch {
      alert("Erro ao excluir");
    }
    setDeleteId(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchCollections();
    } catch {
      alert("Erro ao atualizar status");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleId || !scheduleDate) return;
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", launchDate: scheduleDate }),
      });
      if (res.ok) {
        fetchCollections();
        setScheduleId(null);
        setScheduleDate("");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao agendar");
      }
    } catch {
      alert("Erro ao agendar");
    } finally {
      setScheduleLoading(false);
    }
  };

  const totalArts = collections.reduce((acc, c) => acc + c.totalItems, 0);
  const totalSupply = collections.reduce((acc, c) => acc + c.totalSupply, 0);
  const totalMinted = collections.reduce((acc, c) => acc + c.totalMinted, 0);
  const activeCollections = collections.filter((c) => c.status === "active").length;
  const scheduledCollections = collections.filter((c) => c.status === "scheduled").length;

  const formatPriceRange = (col: Collection) => {
    if (col.totalItems === 0) return "—";
    if (col.minPrice === col.maxPrice) return `${col.minPrice} LUNES`;
    return `${col.minPrice} – ${col.maxPrice}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-yellow-500" />
            Coleções NFT
          </h1>
          <p className="text-neutral-400 mt-2">
            Crie álbuns de NFTs e adicione artes para lançar no marketplace
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Coleção
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Coleções", value: collections.length.toString(), icon: Layers },
          { label: "Ativas", value: activeCollections.toString(), icon: Rocket },
          { label: "Agendadas", value: scheduledCollections.toString(), icon: Clock },
          { label: "Artes (NFTs)", value: totalArts.toLocaleString(), icon: Palette },
          { label: "Cópias Totais", value: totalSupply.toLocaleString(), icon: Package },
        ].map((stat, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm">{stat.label}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg ring-1 ring-yellow-500/50">
                <stat.icon className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      ) : collections.length === 0 ? (
        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-16 text-center">
          <Layers className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma coleção criada</h3>
          <p className="text-neutral-400 mb-6">Crie sua primeira coleção de NFTs para lançar no marketplace.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Criar Coleção
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {collections.map((col) => {
            const statusCfg = STATUS_CONFIG[col.status] || STATUS_CONFIG.draft;
            const progress = col.totalSupply > 0 ? (col.totalMinted / col.totalSupply) * 100 : 0;

            return (
              <div
                key={col.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all group"
              >
                {/* Cover */}
                <div className="relative h-40 bg-neutral-800 flex items-center justify-center overflow-hidden">
                  {col.coverImage ? (
                    <img
                      src={col.coverImage}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-neutral-600" />
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 text-[10px] font-bold rounded bg-black/60 text-white backdrop-blur-sm">
                      {col.symbol}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-1">{col.name}</h3>
                  {col.description && (
                    <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{col.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-neutral-800/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-neutral-500 uppercase">Artes</p>
                      <p className="text-sm font-bold text-white">{col.totalItems}</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-neutral-500 uppercase">Cópias</p>
                      <p className="text-sm font-bold text-white">{col.totalSupply.toLocaleString()}</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-neutral-500 uppercase">Preço</p>
                      <p className="text-sm font-bold text-white truncate">{formatPriceRange(col)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  {col.totalSupply > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-neutral-400">Mintados: {col.totalMinted}/{col.totalSupply}</span>
                        <span className="text-yellow-500 font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {col.launchDate && (
                    <div className={cn(
                      "flex items-center gap-2 text-xs mb-4 px-2.5 py-1.5 rounded-lg",
                      col.status === "scheduled"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        : "text-neutral-500"
                    )}>
                      {col.status === "scheduled" ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {col.status === "scheduled" ? (
                        <span>
                          Agendado: {new Date(col.launchDate).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(col.launchDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span>Lançamento: {new Date(col.launchDate).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/collections/${col.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Gerenciar
                    </button>

                    {col.status === "draft" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(col.id, "active")}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm"
                          title="Lançar Agora"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setScheduleId(col.id); setScheduleDate(col.launchDate ? new Date(col.launchDate).toISOString().slice(0, 16) : ""); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors text-sm"
                          title="Agendar Lançamento"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {col.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(col.id, "active")}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm"
                          title="Lançar Agora"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(col.id, "draft")}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-500/10 text-neutral-400 rounded-lg hover:bg-neutral-500/20 transition-colors text-sm"
                          title="Cancelar Agendamento"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {col.status === "active" && (
                      <button
                        onClick={() => handleStatusChange(col.id, "paused")}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm"
                        title="Pausar"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {col.status === "paused" && (
                      <button
                        onClick={() => handleStatusChange(col.id, "active")}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors text-sm"
                        title="Reativar"
                      >
                        <Rocket className="w-4 h-4" />
                      </button>
                    )}
                    {(col.status === "draft") && (
                      <button
                        onClick={() => setDeleteId(col.id)}
                        className="flex items-center justify-center px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Collection Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-500" />
              Nova Coleção NFT
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Crie um álbum de NFTs. Depois você poderá adicionar artes com preço e quantidade individuais.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nome da Coleção *</Label>
                  <Input
                    placeholder="Ex: Don Fiapo Legends"
                    className="bg-neutral-900 border-neutral-800"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Símbolo *</Label>
                  <Input
                    placeholder="Ex: DONL"
                    className="bg-neutral-900 border-neutral-800 uppercase"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Descrição</Label>
                <textarea
                  placeholder="Descrição da coleção..."
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none resize-none h-20"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Palette className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-400">
                  Após criar a coleção, você será redirecionado para adicionar as artes (NFTs) individualmente, 
                  cada uma com seu próprio preço, quantidade de cópias e atributos.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={createLoading}
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Coleção
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">Excluir Coleção</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Tem certeza? Todos os itens da coleção serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button className="bg-red-500 hover:bg-red-400 text-white font-bold" onClick={() => deleteId && handleDelete(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Launch Modal */}
      <Dialog open={!!scheduleId} onOpenChange={() => { setScheduleId(null); setScheduleDate(""); }}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Agendar Lançamento
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Defina a data e hora em que a coleção será publicada automaticamente no marketplace para venda (mint).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label>Data e Hora de Lançamento *</Label>
              <Input
                type="datetime-local"
                className="bg-neutral-900 border-neutral-800"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            {scheduleDate && (
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-400">
                  <p className="font-medium mb-1">A coleção será publicada em:</p>
                  <p className="text-blue-300 font-bold">
                    {new Date(scheduleDate).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })} às {new Date(scheduleDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
              onClick={() => { setScheduleId(null); setScheduleDate(""); }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold"
              disabled={!scheduleDate || scheduleLoading}
              onClick={handleSchedule}
            >
              {scheduleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
