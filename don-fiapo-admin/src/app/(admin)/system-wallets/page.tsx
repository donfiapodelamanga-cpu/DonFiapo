"use client";

import { useEffect, useState, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Save,
  Trash2,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Shield,
  Edit2,
  Wand2,
  Eye,
  EyeOff,
  Info,
  BookOpen,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SystemWallet {
  id: string;
  key: string;
  label: string;
  address: string;
  network: string;
  symbol: string;
  purpose: string | null;
  isActive: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Predefined wallet templates for quick setup
const WALLET_TEMPLATES = [
  { key: "spin_fiapo", label: "Spin FIAPO Pool", network: "lunes", symbol: "FIAPO", purpose: "Distribuição de prêmios FIAPO do Spin Game" },
  { key: "spin_usdt", label: "Spin USDT Pool", network: "solana", symbol: "USDT", purpose: "Distribuição de prêmios USDT do Spin Game (SPL token na Solana)" },
  { key: "spin_lunes", label: "Spin LUNES Pool", network: "lunes", symbol: "LUNES", purpose: "Distribuição de prêmios LUNES do Spin Game" },
  { key: "spin_revenue", label: "Spin Revenue", network: "solana", symbol: "USDT", purpose: "Recebimento da receita de vendas de pacotes de spin (USDT Solana)" },
  { key: "treasury_solana", label: "Treasury Solana", network: "solana", symbol: "USDT", purpose: "Carteira principal da tesouraria na Solana" },
  { key: "ico_receiver", label: "ICO Receiver (Solana)", network: "solana", symbol: "USDT", purpose: "Recebimento de pagamentos USDT da ICO" },
  { key: "migration_treasury", label: "Migration Treasury", network: "solana", symbol: "USDT", purpose: "Carteira de recebimento da migração Solana → Lunes" },
  { key: "treasury_lunes", label: "Treasury Lunes", network: "lunes", symbol: "LUNES", purpose: "Carteira principal da tesouraria na Lunes Network" },
  { key: "airdrop_distribution_lunes", label: "Airdrop Distribution (Early Bird)", network: "lunes", symbol: "LUNES", purpose: "100.000 LUNES distribuídos entre os 30.000 primeiros usuários que completarem atividades" },
  { key: "mission_rewards_pool", label: "Mission Rewards Pool", network: "lunes", symbol: "LUNES", purpose: "Distribui recompensas LUNES de missões completadas" },
];

const NETWORK_OPTIONS = [
  { value: "lunes", label: "Lunes Network" },
  { value: "solana", label: "Solana" },
];

const SYMBOL_OPTIONS = ["FIAPO", "USDT", "USDC", "LUNES", "SOL"];

// BIP39 word list (simplified — first 256 common words for demonstration seed generation)
const BIP39_WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
  "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
  "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
  "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
  "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
  "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
  "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
  "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
  "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
  "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
  "aware", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag",
  "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel",
  "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef",
  "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best",
  "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird",
  "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind",
  "blood", "blossom", "blow", "blue", "blur", "blush", "board", "boat", "body", "boil",
  "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom",
  "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze",
  "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom",
  "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk",
  "bullet", "bundle", "bunny", "burden", "burger", "burst", "bus", "business", "busy", "butter",
  "buyer", "buzz", "cabbage", "cabin", "cable", "cactus",
];

function generateSeedPhrase(): string {
  const words: string[] = [];
  const array = new Uint32Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    words.push(BIP39_WORDS[array[i] % BIP39_WORDS.length]);
  }
  return words.join(" ");
}

export default function SystemWalletsPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [wallets, setWallets] = useState<SystemWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<SystemWallet | null>(null);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    key: "",
    label: "",
    address: "",
    seed: "",
    network: "lunes",
    symbol: "FIAPO",
    purpose: "",
  });
  const [showSeed, setShowSeed] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);

  // Delete confirmation
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wallets");
      if (res.ok) {
        const data = await res.json();
        setWallets(data);
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.key || !form.label || !form.address || !form.network || !form.symbol) return;

    setSaving(form.key);
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: form.key,
          label: form.label,
          address: form.address,
          network: form.network,
          symbol: form.symbol,
          purpose: form.purpose,
          updatedBy: session?.email || "unknown",
        }),
      });

      if (res.ok) {
        await fetchWallets();
        setDialogOpen(false);
        setEditingWallet(null);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save wallet:", error);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/wallets?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchWallets();
      }
    } catch (error) {
      console.error("Failed to delete wallet:", error);
    } finally {
      setDeleteKey(null);
    }
  };

  const resetForm = () => {
    setForm({ key: "", label: "", address: "", seed: "", network: "lunes", symbol: "FIAPO", purpose: "" });
    setDialogStep(1);
    setShowSeed(false);
    setSeedCopied(false);
  };

  const openCreate = () => {
    resetForm();
    setEditingWallet(null);
    setDialogOpen(true);
  };

  const openEdit = (wallet: SystemWallet) => {
    setEditingWallet(wallet);
    setForm({
      key: wallet.key,
      label: wallet.label,
      address: wallet.address,
      seed: "",
      network: wallet.network,
      symbol: wallet.symbol,
      purpose: wallet.purpose || "",
    });
    setDialogStep(2);
    setDialogOpen(true);
  };

  const applyTemplate = (template: typeof WALLET_TEMPLATES[0]) => {
    setForm((prev) => ({
      ...prev,
      key: template.key,
      label: template.label,
      address: "",
      network: template.network,
      symbol: template.symbol,
      purpose: template.purpose,
    }));
  };

  const handleGenerateSeed = () => {
    const seed = generateSeedPhrase();
    setForm((prev) => ({ ...prev, seed }));
    setShowSeed(true);
  };

  const copySeed = () => {
    navigator.clipboard.writeText(form.seed);
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 3000);
  };

  const copyAddress = (key: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Templates not yet configured
  const unconfiguredTemplates = WALLET_TEMPLATES.filter(
    (t) => !wallets.some((w) => w.key === t.key)
  );

  if (!session || !hasPermission(session, "finance")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">Acesso restrito ao departamento financeiro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/20">
              <KeyRound className="w-7 h-7 text-yellow-500" />
            </div>
            Carteiras do Sistema
          </h1>
          <p className="text-neutral-500 mt-2">
            Gerencie as carteiras usadas para recebimentos, distribuição de prêmios e tesouraria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            className="border-neutral-700 text-neutral-300 hover:text-white"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {showGuide ? "Fechar Guia" : "Como Funciona"}
          </Button>
          <Button
            onClick={openCreate}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Carteira
          </Button>
        </div>
      </div>

      {/* Tutorial Guide */}
      {showGuide && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Guia: Como Configurar Carteiras do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-sm font-bold">1</div>
                <h4 className="font-bold text-white text-sm">Escolher Template</h4>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Selecione um dos templates pré-definidos (ex: Spin FIAPO Pool, Treasury Lunes) ou crie manualmente.
                Os templates já vêm com rede, token e finalidade preenchidos.
              </p>
            </div>
            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-sm font-bold">2</div>
                <h4 className="font-bold text-white text-sm">Informar Endereço</h4>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Cole o endereço público da carteira. Para <strong className="text-neutral-300">Lunes</strong>, começa com caracteres alfanuméricos.
                Para <strong className="text-neutral-300">Solana</strong>, começa com letras/números (base58).
                Você também pode gerar uma seed phrase de demonstração.
              </p>
            </div>
            <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-sm font-bold">3</div>
                <h4 className="font-bold text-white text-sm">Salvar e Verificar</h4>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Após salvar, a carteira aparece na lista principal. O sistema usa a <code className="text-yellow-400/80 bg-neutral-800 px-1 rounded">chave</code> (ex: spin_fiapo)
                como referência interna. Verifique na aba Financeiro se os saldos aparecem corretamente.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300/80">
              <strong>Importante:</strong> A seed phrase é apenas para backup local. O sistema <strong>não armazena seeds</strong> no banco de dados por segurança.
              Copie e guarde em local seguro antes de fechar o modal.
            </p>
          </div>
        </div>
      )}

      {/* Quick Setup: Unconfigured Templates */}
      {unconfiguredTemplates.length > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <h3 className="text-sm font-bold text-orange-300 uppercase tracking-wider">
              Carteiras Pendentes de Configuração ({unconfiguredTemplates.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {unconfiguredTemplates.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  applyTemplate(t);
                  setEditingWallet(null);
                  setDialogStep(1);
                  setDialogOpen(true);
                }}
                className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-left hover:border-yellow-500/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-neutral-600">{t.key}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 uppercase">
                    {t.network}
                  </span>
                </div>
                <p className="text-sm font-bold text-neutral-300 group-hover:text-yellow-400 transition-colors">
                  {t.label}
                </p>
                <p className="text-xs text-neutral-600 mt-1">{t.symbol}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wallet List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-16">
          <KeyRound className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
          <p className="text-neutral-500 text-lg">Nenhuma carteira configurada</p>
          <p className="text-neutral-600 text-sm mt-1">
            Clique em &ldquo;Nova Carteira&rdquo; ou selecione um template acima para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={`bg-neutral-900/40 border rounded-2xl p-5 transition-all ${wallet.isActive
                ? "border-neutral-800/50 hover:border-yellow-500/30"
                : "border-red-500/20 opacity-60"
                }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{wallet.label}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono uppercase">
                      {wallet.network}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold">
                      {wallet.symbol}
                    </span>
                    {!wallet.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        Inativa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm font-mono text-neutral-300 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 truncate max-w-[500px]">
                      {wallet.address}
                    </code>
                    <button
                      onClick={() => copyAddress(wallet.key, wallet.address)}
                      className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                      title="Copiar endereço"
                    >
                      {copiedKey === wallet.key ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-600">
                    <span className="font-mono">{wallet.key}</span>
                    {wallet.purpose && <span>• {wallet.purpose}</span>}
                    {wallet.updatedBy && (
                      <span>• Atualizada por {wallet.updatedBy}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(wallet)}
                    className="border-neutral-700 hover:border-yellow-500/50 text-neutral-300"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteKey(wallet.key)}
                    className="border-neutral-700 hover:border-red-500/50 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog — Step-Based */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
              {editingWallet ? (
                <>
                  <Edit2 className="w-5 h-5 text-yellow-500" />
                  Editar Carteira — {editingWallet.label}
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5 text-yellow-500" />
                  Nova Carteira do Sistema
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              {editingWallet
                ? "Atualize o endereço ou configuração desta carteira."
                : dialogStep === 1
                  ? "Passo 1: Selecione um template ou preencha as informações básicas."
                  : "Passo 2: Informe o endereço da carteira e, opcionalmente, gere uma seed phrase."}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator (create only) */}
          {!editingWallet && (
            <div className="flex items-center gap-2 py-1">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${dialogStep === 1 ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30" : "bg-neutral-800 text-neutral-500"
                }`}>
                <span>1</span> Configuração
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600" />
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${dialogStep === 2 ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30" : "bg-neutral-800 text-neutral-500"
                }`}>
                <span>2</span> Endereço & Seed
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* ═══ STEP 1: Template + Basic Info ═══ */}
            {dialogStep === 1 && !editingWallet && (
              <>
                {unconfiguredTemplates.length > 0 && (
                  <div className="grid gap-2">
                    <Label className="text-neutral-300 text-xs font-bold uppercase tracking-wider">Template Rápido</Label>
                    <Select
                      onValueChange={(v) => {
                        const t = WALLET_TEMPLATES.find((t) => t.key === v);
                        if (t) applyTemplate(t);
                      }}
                    >
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                        <SelectValue placeholder="Selecione um template pré-configurado..." />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {unconfiguredTemplates.map((t) => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.label} ({t.symbol} / {t.network})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-neutral-600">Templates preenchem automaticamente rede, token e finalidade.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-neutral-300 text-xs font-bold">Chave (ID Único) *</Label>
                    <Input
                      placeholder="ex: spin_fiapo"
                      className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 font-mono"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    />
                    <p className="text-[10px] text-neutral-600">Identificador usado internamente pelo sistema.</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-neutral-300 text-xs font-bold">Nome de Exibição *</Label>
                    <Input
                      placeholder="ex: Spin FIAPO Pool"
                      className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                    />
                    <p className="text-[10px] text-neutral-600">Nome amigável exibido no painel.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-neutral-300 text-xs font-bold">Rede *</Label>
                    <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {NETWORK_OPTIONS.map((n) => (
                          <SelectItem key={n.value} value={n.value}>
                            {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-neutral-300 text-xs font-bold">Token *</Label>
                    <Select value={form.symbol} onValueChange={(v) => setForm({ ...form, symbol: v })}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {SYMBOL_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-neutral-300 text-xs font-bold">Finalidade</Label>
                  <Input
                    placeholder="Descreva o uso desta carteira..."
                    className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* ═══ STEP 2: Address + Seed ═══ */}
            {(dialogStep === 2 || editingWallet) && (
              <>
                {/* Summary (create mode) */}
                {!editingWallet && form.key && (
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{form.label || form.key}</p>
                      <p className="text-xs text-neutral-500">{form.network} • {form.symbol} • {form.purpose?.slice(0, 60)}</p>
                    </div>
                    <button onClick={() => setDialogStep(1)} className="text-xs text-yellow-500 hover:underline">Editar</button>
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label className="text-neutral-300 text-xs font-bold">Endereço Público da Carteira *</Label>
                  <Input
                    placeholder={form.network === "solana" ? "Ex: 7xKp...base58" : "Ex: 3P8j...endereço Lunes"}
                    className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 font-mono text-sm"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value.trim() })}
                  />
                  <p className="text-[10px] text-neutral-600">
                    Cole o endereço público. Somente o endereço é salvo no banco — seeds não são armazenadas.
                  </p>
                </div>

                {/* Seed Generation */}
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-yellow-500" />
                      <Label className="text-neutral-300 text-xs font-bold">Seed Phrase (Opcional)</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSeed}
                      className="border-neutral-700 text-neutral-300 hover:text-yellow-400 hover:border-yellow-500/50 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1.5" />
                      Gerar Seed
                    </Button>
                  </div>

                  {form.seed ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <div className={`bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-sm leading-relaxed break-all ${showSeed ? "text-yellow-300" : "text-neutral-700 select-none"
                          }`}>
                          {showSeed ? form.seed : "•".repeat(60)}
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            onClick={() => setShowSeed(!showSeed)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                            title={showSeed ? "Ocultar" : "Mostrar"}
                          >
                            {showSeed ? <EyeOff className="w-3.5 h-3.5 text-neutral-500" /> : <Eye className="w-3.5 h-3.5 text-neutral-500" />}
                          </button>
                          <button
                            onClick={copySeed}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                            title="Copiar seed"
                          >
                            {seedCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400/80 leading-relaxed">
                          <strong>ATENÇÃO:</strong> Copie esta seed e guarde em local seguro. Ela NÃO será salva no sistema.
                          Após fechar este modal, não será possível recuperá-la.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-600">
                      Clique em &ldquo;Gerar Seed&rdquo; para criar uma frase de recuperação de 12 palavras.
                      A seed é apenas para seu controle — não é enviada ao servidor.
                    </p>
                  )}
                </div>

                {/* Edit-only fields */}
                {editingWallet && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-neutral-300 text-xs font-bold">Rede</Label>
                        <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                          <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700">
                            {NETWORK_OPTIONS.map((n) => (
                              <SelectItem key={n.value} value={n.value}>
                                {n.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-neutral-300 text-xs font-bold">Token</Label>
                        <Select value={form.symbol} onValueChange={(v) => setForm({ ...form, symbol: v })}>
                          <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700">
                            {SYMBOL_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-neutral-300 text-xs font-bold">Finalidade</Label>
                      <Input
                        placeholder="Descreva o uso desta carteira..."
                        className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600"
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            {/* Back button (step 2, create mode) */}
            {dialogStep === 2 && !editingWallet ? (
              <Button variant="outline" onClick={() => setDialogStep(1)} className="border-neutral-700 text-neutral-300 mr-auto">
                ← Voltar
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-neutral-700 text-neutral-300">
                Cancelar
              </Button>
              {dialogStep === 1 && !editingWallet ? (
                <Button
                  onClick={() => setDialogStep(2)}
                  disabled={!form.key || !form.label}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={!form.key || !form.label || !form.address || saving !== null}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingWallet ? "Atualizar Carteira" : "Criar Carteira"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteKey !== null} onOpenChange={() => setDeleteKey(null)}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir Carteira</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Tem certeza que deseja remover a carteira <code className="text-white font-mono">{deleteKey}</code>?
              Isso pode afetar funcionalidades que dependem dela.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKey(null)} className="border-neutral-700 text-neutral-300">
              Cancelar
            </Button>
            <Button
              onClick={() => deleteKey && handleDelete(deleteKey)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
