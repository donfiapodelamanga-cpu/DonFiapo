"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Loader2,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  Rocket,
  Pause,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
  Palette,
  DollarSign,
  Package,
  Link,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CollectionItem {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ipfsHash: string | null;
  metadata: string | null;
  price: number;
  currency: string;
  supply: number;
  mintedCount: number;
  status: string;
  rarity: string | null;
  mintedTo: string | null;
  mintedAt: string | null;
}

interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  coverImage: string | null;
  coverIpfsHash: string | null;
  status: string;
  launchDate: string | null;
  createdBy: string;
  createdAt: string;
  contractAddress: string | null;
  contractCollectionId: number | null;
  deployedAt: string | null;
  _count: { items: number };
}

interface SyncStatus {
  contractCollectionId: number | null;
  contractAddress: string;
  deployedAt: string | null;
  totalItems: number;
  syncedItems: number;
  pendingItems: number;
  isFullySynced: boolean;
  contract: { configured: boolean; connected: boolean; error?: string };
}

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<AdminSession | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Edit collection state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", symbol: "", description: "" });
  const [saveLoading, setSaveLoading] = useState(false);

  // Upload state
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Add item modal
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemFile, setAddItemFile] = useState<File | null>(null);
  const [addItemForm, setAddItemForm] = useState({ name: "", description: "", price: "0", currency: "LUNES", supply: "1", rarity: "" });

  // Delete item
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Blockchain sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    if (!hasPermission(s, "collections")) { router.push("/dashboard"); return; }
    setSession(s);
  }, [router]);

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/collections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data);
        setEditForm({
          name: data.name,
          symbol: data.symbol,
          description: data.description || "",
        });
      }
    } catch (e) {
      console.error("Error fetching collection:", e);
    }
  }, [id]);

  const fetchItems = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/admin/collections/${id}/items?page=${p}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotalPages(data.pages);
        setTotalItems(data.total);
      }
    } catch (e) {
      console.error("Error fetching items:", e);
    }
  }, [id]);

  useEffect(() => {
    if (session) {
      setLoading(true);
      Promise.all([fetchCollection(), fetchItems(1)]).finally(() => setLoading(false));
    }
  }, [session, fetchCollection, fetchItems]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchItems(newPage);
  };

  // Fetch blockchain sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/collections/${id}/sync`);
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (e) {
      console.error("Error fetching sync status:", e);
    }
  }, [id]);

  useEffect(() => {
    if (session && collection) {
      fetchSyncStatus();
    }
  }, [session, collection, fetchSyncStatus]);

  // Polling: verificar agendamentos a cada 60s
  useEffect(() => {
    if (!collection || collection.status !== "scheduled") return;
    const interval = setInterval(async () => {
      try {
        await fetch("/api/admin/collections/scheduler");
        await fetchCollection();
      } catch { /* silent */ }
    }, 60_000);
    return () => clearInterval(interval);
  }, [collection, fetchCollection]);

  // Execute blockchain sync
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/admin/collections/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data.message || "Sincronização concluída!");
        await Promise.all([fetchCollection(), fetchSyncStatus()]);
      } else {
        setSyncResult(`Erro: ${data.error}`);
      }
    } catch {
      setSyncResult("Erro ao sincronizar com a blockchain");
    } finally {
      setSyncing(false);
    }
  };

  // Save collection edits
  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchCollection();
        setIsEditing(false);
      }
    } catch {
      alert("Erro ao salvar");
    } finally {
      setSaveLoading(false);
    }
  };

  // Upload item image (for existing items)
  const handleItemImageUpload = async (itemId: string, file: File) => {
    setUploadingItemId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("collectionId", id);

      const uploadRes = await fetch("/api/admin/collections/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) { alert("Erro no upload para IPFS"); return; }
      const { url, ipfsHash } = await uploadRes.json();

      await fetch(`/api/admin/collections/${id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, imageUrl: url, ipfsHash }),
      });

      await fetchItems(page);
    } catch {
      alert("Erro no upload");
    } finally {
      setUploadingItemId(null);
    }
  };

  // Upload cover image
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("collectionId", id);

      const uploadRes = await fetch("/api/admin/collections/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) { alert("Erro no upload para IPFS"); return; }
      const { url, ipfsHash } = await uploadRes.json();

      await fetch(`/api/admin/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url, coverIpfsHash: ipfsHash }),
      });

      await fetchCollection();
    } catch {
      alert("Erro no upload da capa");
    } finally {
      setUploadingCover(false);
    }
  };

  // Add new NFT item to collection
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddItemLoading(true);
    try {
      let imageUrl: string | null = null;
      let ipfsHash: string | null = null;

      // Upload image first if provided
      if (addItemFile) {
        const formData = new FormData();
        formData.append("file", addItemFile);
        formData.append("collectionId", id);
        formData.append("itemName", addItemForm.name);

        const uploadRes = await fetch("/api/admin/collections/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) { alert("Erro no upload da imagem para IPFS"); setAddItemLoading(false); return; }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        ipfsHash = uploadData.ipfsHash;
      }

      const res = await fetch(`/api/admin/collections/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addItemForm,
          imageUrl,
          ipfsHash,
        }),
      });

      if (res.ok) {
        setAddItemOpen(false);
        setAddItemForm({ name: "", description: "", price: "0", currency: "LUNES", supply: "1", rarity: "" });
        setAddItemFile(null);
        await Promise.all([fetchItems(1), fetchCollection()]);
        setPage(1);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao adicionar NFT");
      }
    } catch {
      alert("Erro ao adicionar NFT");
    } finally {
      setAddItemLoading(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/admin/collections/${id}/items?itemId=${itemId}`, { method: "DELETE" });
      if (res.ok) {
        await Promise.all([fetchItems(page), fetchCollection()]);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir");
      }
    } catch {
      alert("Erro ao excluir");
    }
    setDeleteItemId(null);
  };

  // Status change
  const handleStatusChange = async (newStatus: string) => {
    try {
      await fetch(`/api/admin/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchCollection();
    } catch {
      alert("Erro ao atualizar status");
    }
  };

  // Schedule launch
  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert("Selecione data e hora");
      return;
    }
    const launchDate = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (launchDate <= new Date()) {
      alert("A data de lançamento deve ser no futuro");
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", launchDate: launchDate.toISOString() }),
      });
      if (res.ok) {
        setScheduleOpen(false);
        setScheduleDate("");
        setScheduleTime("");
        await fetchCollection();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao agendar");
      }
    } catch {
      alert("Erro ao agendar lançamento");
    } finally {
      setScheduleLoading(false);
    }
  };

  if (loading || !collection) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  const totalSupply = items.reduce((acc, it) => acc + it.supply, 0);
  const totalMinted = items.reduce((acc, it) => acc + it.mintedCount, 0);

  return (
    <div className="p-8">
      {/* Hidden cover input */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCoverUpload(file);
          e.target.value = "";
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/collections")} className="p-2 rounded-lg hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{collection.name}</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 text-neutral-400">{collection.symbol}</span>
            <span className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full border",
              collection.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/50" :
              collection.status === "scheduled" ? "bg-blue-500/10 text-blue-400 border-blue-500/50" :
              collection.status === "paused" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/50" :
              collection.status === "sold_out" ? "bg-red-500/10 text-red-400 border-red-500/50" :
              "bg-neutral-500/10 text-neutral-400 border-neutral-500/50"
            )}>
              {collection.status === "active" ? "Ativo" : collection.status === "scheduled" ? "Agendado" : collection.status === "paused" ? "Pausado" : collection.status === "sold_out" ? "Esgotado" : "Rascunho"}
            </span>
          </div>
          <p className="text-neutral-500 text-sm mt-1">Criado por {collection.createdBy} · {totalItems} arte(s)</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm">
              <Edit3 className="w-4 h-4" /> Editar
            </button>
          ) : (
            <button onClick={handleSave} disabled={saveLoading} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors text-sm font-bold">
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          )}
          {collection.status === "draft" && (
            <>
              <button onClick={() => handleStatusChange("active")} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/20 transition-colors text-sm">
                <Rocket className="w-4 h-4" /> Lançar Agora
              </button>
              <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/50 rounded-lg hover:bg-blue-500/20 transition-colors text-sm">
                <Clock className="w-4 h-4" /> Agendar
              </button>
            </>
          )}
          {collection.status === "scheduled" && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs">
                <Clock className="w-3.5 h-3.5" />
                {collection.launchDate && (
                  <span>{new Date(collection.launchDate).toLocaleDateString("pt-BR")} às {new Date(collection.launchDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                )}
              </div>
              <button onClick={() => handleStatusChange("active")} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/20 transition-colors text-sm">
                <Rocket className="w-4 h-4" /> Lançar Agora
              </button>
              <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/50 rounded-lg hover:bg-blue-500/20 transition-colors text-sm">
                <Clock className="w-4 h-4" /> Reagendar
              </button>
              <button onClick={() => handleStatusChange("draft")} className="flex items-center gap-2 px-4 py-2 bg-neutral-500/10 text-neutral-400 border border-neutral-500/50 rounded-lg hover:bg-neutral-500/20 transition-colors text-sm">
                <XCircle className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}
          {collection.status === "active" && (
            <button onClick={() => handleStatusChange("paused")} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 rounded-lg hover:bg-yellow-500/20 transition-colors text-sm">
              <Pause className="w-4 h-4" /> Pausar
            </button>
          )}
          {collection.status === "paused" && (
            <button onClick={() => handleStatusChange("active")} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/20 transition-colors text-sm">
              <Rocket className="w-4 h-4" /> Reativar
            </button>
          )}
        </div>
      </div>

      {/* Top Row: Cover + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cover Image */}
        <div
          className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden relative group cursor-pointer h-64 flex items-center justify-center"
          onClick={() => coverInputRef.current?.click()}
        >
          {uploadingCover ? (
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          ) : collection.coverImage ? (
            <>
              <img src={collection.coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </>
          ) : (
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-500 text-sm">Clique para adicionar capa</p>
            </div>
          )}
        </div>

        {/* Collection Info */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          {isEditing ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-neutral-400 text-xs">Nome</Label>
                  <Input className="bg-neutral-800 border-neutral-700 mt-1" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs">Símbolo</Label>
                  <Input className="bg-neutral-800 border-neutral-700 mt-1 uppercase" value={editForm.symbol} onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div>
                <Label className="text-neutral-400 text-xs">Descrição</Label>
                <textarea className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white outline-none mt-1 h-16 resize-none" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              {collection.description && <p className="text-neutral-400 text-sm mb-4">{collection.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Artes</p>
                  <p className="text-lg font-bold text-white flex items-center gap-1.5"><Palette className="w-4 h-4 text-yellow-500" />{totalItems}</p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Cópias Total</p>
                  <p className="text-lg font-bold text-white flex items-center gap-1.5"><Package className="w-4 h-4 text-yellow-500" />{totalSupply}</p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Mintados</p>
                  <p className="text-lg font-bold text-green-400 flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{totalMinted}</p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-3">
                  <p className="text-[10px] text-neutral-500 uppercase">Disponíveis</p>
                  <p className="text-lg font-bold text-white">{totalSupply - totalMinted}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Blockchain Sync Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Link className="w-5 h-5 text-yellow-500" />
            Blockchain (Lunes Network)
          </h3>
          <div className="flex items-center gap-2">
            {syncStatus && (
              <span className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1.5",
                syncStatus.isFullySynced
                  ? "bg-green-500/10 text-green-400 border-green-500/50"
                  : syncStatus.contractCollectionId
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                    : "bg-neutral-500/10 text-neutral-400 border-neutral-500/50"
              )}>
                {syncStatus.isFullySynced ? (
                  <><CheckCircle2 className="w-3 h-3" /> Sincronizado</>
                ) : syncStatus.contractCollectionId ? (
                  <><AlertCircle className="w-3 h-3" /> Parcial ({syncStatus.syncedItems}/{syncStatus.totalItems})</>
                ) : (
                  "Não publicado"
                )}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing || !syncStatus?.contract.configured}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/50 rounded-lg hover:bg-purple-500/20 transition-colors text-sm disabled:opacity-40"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {collection.contractCollectionId ? "Sincronizar" : "Publicar na Blockchain"}
            </button>
          </div>
        </div>

        {syncResult && (
          <div className={cn(
            "mb-4 px-4 py-3 rounded-lg text-sm border",
            syncResult.startsWith("Erro")
              ? "bg-red-500/10 text-red-400 border-red-500/30"
              : "bg-green-500/10 text-green-400 border-green-500/30"
          )}>
            {syncResult}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <p className="text-[10px] text-neutral-500 uppercase">Contrato</p>
            {syncStatus?.contract.configured ? (
              <p className="text-xs font-mono text-neutral-300 truncate" title={syncStatus.contractAddress}>
                {syncStatus.contractAddress ? `${syncStatus.contractAddress.slice(0, 8)}...${syncStatus.contractAddress.slice(-6)}` : "—"}
              </p>
            ) : (
              <p className="text-xs text-neutral-500">Não configurado</p>
            )}
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <p className="text-[10px] text-neutral-500 uppercase">Collection ID</p>
            <p className="text-lg font-bold text-white">
              {collection.contractCollectionId ?? "—"}
            </p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <p className="text-[10px] text-neutral-500 uppercase">Tokens On-Chain</p>
            <p className="text-lg font-bold text-white">
              {syncStatus ? `${syncStatus.syncedItems}/${syncStatus.totalItems}` : "—"}
            </p>
          </div>
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <p className="text-[10px] text-neutral-500 uppercase">Rede</p>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-2 h-2 rounded-full",
                syncStatus?.contract.connected ? "bg-green-400" : "bg-neutral-600"
              )} />
              <p className="text-xs text-neutral-300">
                {syncStatus?.contract.connected ? "Conectado" : syncStatus?.contract.error ? "Offline" : "—"}
              </p>
            </div>
          </div>
        </div>

        {collection.deployedAt && (
          <p className="text-[10px] text-neutral-600 mt-3">
            Publicado em {new Date(collection.deployedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* NFTs Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-yellow-500" />
              Artes da Coleção
            </h3>
            <p className="text-neutral-500 text-sm mt-1">{totalItems} NFT(s) na coleção</p>
          </div>
          <button
            onClick={() => setAddItemOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar NFT
          </button>
        </div>

        {/* Items Grid */}
        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <Palette className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-white mb-2">Nenhuma arte adicionada</h4>
              <p className="text-neutral-500 mb-6 text-sm">Adicione NFTs a esta coleção clicando em &quot;Adicionar NFT&quot;</p>
              <button
                onClick={() => setAddItemOpen(true)}
                className="px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors"
              >
                Adicionar Primeiro NFT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl overflow-hidden hover:border-neutral-600 transition-all group"
                >
                  {/* Image */}
                  <div className="relative aspect-square flex items-center justify-center bg-neutral-800">
                    {uploadingItemId === item.id ? (
                      <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                    ) : item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-10 h-10 text-neutral-600 mx-auto mb-1" />
                        <p className="text-[10px] text-neutral-600">Sem imagem</p>
                      </div>
                    )}

                    {/* Upload overlay */}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Upload className="w-6 h-6 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleItemImageUpload(item.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {/* IPFS badge */}
                    {item.ipfsHash && (
                      <div className="absolute top-2 left-2">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-500/20 text-green-400 border border-green-500/30">IPFS</span>
                      </div>
                    )}

                    {/* Rarity badge */}
                    {item.rarity && (
                      <div className="absolute top-2 right-2">
                        <span className={cn(
                          "px-1.5 py-0.5 text-[9px] font-bold rounded border",
                          item.rarity === "Legendary" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                          item.rarity === "Epic" ? "bg-pink-500/20 text-pink-400 border-pink-500/30" :
                          item.rarity === "Rare" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          item.rarity === "Uncommon" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
                        )}>
                          {item.rarity === "Common" ? "Comum" :
                           item.rarity === "Uncommon" ? "Incomum" :
                           item.rarity === "Rare" ? "Raro" :
                           item.rarity === "Epic" ? "Épico" :
                           item.rarity === "Legendary" ? "Lendário" : item.rarity}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-neutral-500 truncate">{item.description}</p>
                        )}
                      </div>
                      {item.mintedCount === 0 && (
                        <button
                          onClick={() => setDeleteItemId(item.id)}
                          className="p-1 text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-yellow-500">{item.price} {item.currency}</span>
                      <span className="text-neutral-500">{item.mintedCount}/{item.supply} mint</span>
                    </div>

                    {item.supply > 1 && (
                      <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${(item.mintedCount / item.supply) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-neutral-400">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="p-2 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add NFT Modal */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-yellow-500" />
              Adicionar NFT à Coleção
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Cada NFT pode ter sua própria arte, preço e quantidade de cópias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddItem}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome do NFT *</Label>
                <Input
                  placeholder="Ex: O Rei Manga"
                  className="bg-neutral-900 border-neutral-800"
                  value={addItemForm.name}
                  onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Descrição</Label>
                <textarea
                  placeholder="Descrição da arte..."
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none resize-none h-16"
                  value={addItemForm.description}
                  onChange={(e) => setAddItemForm({ ...addItemForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Preço</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10.00"
                    className="bg-neutral-900 border-neutral-800"
                    value={addItemForm.price}
                    onChange={(e) => setAddItemForm({ ...addItemForm, price: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <select
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                    value={addItemForm.currency}
                    onChange={(e) => setAddItemForm({ ...addItemForm, currency: e.target.value })}
                  >
                    <option value="LUNES">LUNES</option>
                    <option value="FIAPO">FIAPO</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Cópias</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="1"
                    className="bg-neutral-900 border-neutral-800"
                    value={addItemForm.supply}
                    onChange={(e) => setAddItemForm({ ...addItemForm, supply: e.target.value })}
                  />
                </div>
              </div>

              {/* Rarity */}
              <div className="grid gap-2">
                <Label>Raridade</Label>
                <select
                  className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 outline-none"
                  value={addItemForm.rarity}
                  onChange={(e) => setAddItemForm({ ...addItemForm, rarity: e.target.value })}
                >
                  <option value="">Sem raridade</option>
                  <option value="Common">Comum</option>
                  <option value="Uncommon">Incomum</option>
                  <option value="Rare">Raro</option>
                  <option value="Epic">Épico</option>
                  <option value="Legendary">Lendário</option>
                </select>
              </div>

              {/* Image upload */}
              <div className="grid gap-2">
                <Label>Imagem da Arte</Label>
                <div
                  className="border-2 border-dashed border-neutral-700 rounded-xl p-6 text-center hover:border-yellow-500/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("add-item-file")?.click()}
                >
                  {addItemFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <ImageIcon className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-yellow-400">{addItemFile.name}</span>
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setAddItemFile(null); }} className="text-neutral-500 hover:text-red-400">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
                      <p className="text-xs text-neutral-500">Clique para selecionar (PNG, JPG, WebP, GIF — max 10MB)</p>
                    </>
                  )}
                  <input
                    id="add-item-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setAddItemFile(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                </div>
                <p className="text-[10px] text-neutral-600">Você também pode adicionar a imagem depois.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                onClick={() => { setAddItemOpen(false); setAddItemFile(null); }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={addItemLoading}
              >
                {addItemLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar NFT
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation */}
      <Dialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400">Excluir NFT</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Tem certeza? Este NFT será removido permanentemente da coleção.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700" onClick={() => setDeleteItemId(null)}>
              Cancelar
            </Button>
            <Button className="bg-red-500 hover:bg-red-400 text-white font-bold" onClick={() => deleteItemId && handleDeleteItem(deleteItemId)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Launch Modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-400 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Agendar Lançamento
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Defina a data e hora para a coleção ser publicada automaticamente para venda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-neutral-300">Data de Lançamento</Label>
              <Input
                type="date"
                className="bg-neutral-900 border-neutral-800 text-white"
                value={scheduleDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-neutral-300">Horário</Label>
              <Input
                type="time"
                className="bg-neutral-900 border-neutral-800 text-white"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            {scheduleDate && scheduleTime && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                <p className="font-medium">A coleção será lançada em:</p>
                <p className="text-blue-400 font-bold mt-1">
                  {new Date(`${scheduleDate}T${scheduleTime}:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {" às "}
                  {scheduleTime}h
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
              onClick={() => { setScheduleOpen(false); setScheduleDate(""); setScheduleTime(""); }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold"
              disabled={scheduleLoading || !scheduleDate || !scheduleTime}
              onClick={handleSchedule}
            >
              {scheduleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
              Agendar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
