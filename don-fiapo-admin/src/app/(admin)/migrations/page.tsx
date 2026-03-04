"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Ship, Loader2, CheckCircle, XCircle, Clock, Search, ExternalLink, ShieldAlert
} from "lucide-react";
import { getSession, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Migration {
  id: string;
  userId: string;
  solanaTxHash: string;
  solanaSender: string;
  lunesRecipient: string;
  amountSolana: number;
  amountLunes: number;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  lunesTxHash: string | null;
  user: {
    id: string;
    xUsername: string | null;
    trustScore: number;
  };
}

export default function MigrationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");

  // Approval modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [lunesTx, setLunesTx] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchMigrations = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/migrations?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setMigrations(data.migrations || []);
      }
    } catch (err) {
      console.error("[Migrations] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.push("/login"); return; }
    setSession(s);
    fetchMigrations(tab);
  }, [router, tab, fetchMigrations]);

  const handleVerify = async (approved: boolean) => {
    if (!selectedMigration) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/admin/migrations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedMigration.id,
          approved,
          reason: approved ? undefined : rejectionReason,
          lunesTxHash: approved ? lunesTx : undefined,
        }),
      });

      if (res.ok) {
        setVerifyModalOpen(false);
        setLunesTx("");
        setRejectionReason("");
        setSelectedMigration(null);
        await fetchMigrations(tab);
      } else {
        alert("Erro ao processar verificação");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de rede");
    } finally {
      setProcessing(false);
    }
  };

  const openVerifyModal = (m: Migration) => {
    setSelectedMigration(m);
    setVerifyModalOpen(true);
  };

  if (loading && migrations.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl ring-1 ring-yellow-500/30">
              <Ship className="w-6 h-6 text-yellow-500" />
            </div>
            Bridge: Solana → Lunes
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Verificação de migração da pré-venda (GemPad)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-xl w-fit">
        {["PENDING", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            onClick={() => setTab(status as any)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition",
              tab === status ? "bg-yellow-500/10 text-yellow-500" : "text-neutral-400 hover:text-white"
            )}
          >
            {status === "PENDING" ? "Pendentes" : status === "APPROVED" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
              <th className="text-left py-3 px-4">Data</th>
              <th className="text-left py-3 px-4">TxHash Solana</th>
              <th className="text-left py-3 px-4">Carteira Lunes Destino</th>
              <th className="text-right py-3 px-4">Enviado (SOL)</th>
              <th className="text-right py-3 px-4">Bônus (+2%)</th>
              <th className="text-right py-3 px-4">Total (LUNES)</th>
              <th className="text-center py-3 px-4">Trust</th>
              <th className="text-right py-3 px-4">Ação</th>
            </tr>
          </thead>
          <tbody>
            {migrations.map((m) => (
              <tr key={m.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition">
                <td className="py-3 px-4 text-neutral-400">
                  {new Date(m.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="py-3 px-4">
                  <a 
                    href={`https://solscan.io/tx/${m.solanaTxHash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-mono text-xs"
                  >
                    {m.solanaTxHash.slice(0, 8)}...{m.solanaTxHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="py-3 px-4 text-blue-400 font-mono text-xs">
                  {m.lunesRecipient.slice(0, 8)}...{m.lunesRecipient.slice(-8)}
                </td>
                <td className="py-3 px-4 text-right text-neutral-300 font-mono">
                  {m.amountSolana.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-green-400 font-mono">
                  +{(m.amountLunes - m.amountSolana).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-bold text-yellow-400 font-mono">
                  {m.amountLunes.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={cn("text-xs font-bold", m.user.trustScore >= 80 ? "text-green-400" : m.user.trustScore >= 50 ? "text-yellow-400" : "text-red-400")}>
                    {m.user.trustScore}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {m.status === "PENDING" ? (
                    <button 
                      onClick={() => openVerifyModal(m)}
                      className="px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 font-medium text-xs transition"
                    >
                      Analisar
                    </button>
                  ) : m.status === "APPROVED" ? (
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">Aprovado</Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">Rejeitado</Badge>
                  )}
                </td>
              </tr>
            ))}
            {migrations.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-neutral-500">
                <Clock className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                Nenhuma migração encontrada nesta aba.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Verify Modal */}
      {verifyModalOpen && selectedMigration && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Analisar Migração</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-neutral-800/50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Verificar no Solscan:</span>
                  <a href={`https://solscan.io/tx/${selectedMigration.solanaTxHash}`} target="_blank" rel="noreferrer" className="text-purple-400 flex items-center gap-1 hover:underline">
                    {selectedMigration.solanaTxHash.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Valor enviado na Solana:</span>
                  <span className="font-bold text-white">{selectedMigration.amountSolana.toLocaleString()} FIAPO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Pagar na carteira Lunes:</span>
                  <span className="font-mono text-blue-400 text-xs">{selectedMigration.lunesRecipient}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-700 pt-2 mt-2">
                  <span className="font-bold text-golden">Total a Transferir (com bônus):</span>
                  <span className="font-bold text-golden text-lg">{selectedMigration.amountLunes.toLocaleString()} FIAPO</span>
                </div>
              </div>

              <div className="border border-neutral-800 p-4 rounded-xl">
                <label className="text-xs text-neutral-500 mb-1 block">Aprovação: TxHash Lunes de Pagamento (Opcional)</label>
                <Input 
                  placeholder="Se já pagou na Lunes, cole o hash aqui..." 
                  value={lunesTx} 
                  onChange={(e) => setLunesTx(e.target.value)} 
                  className="bg-neutral-950 border-neutral-700 text-sm"
                />
              </div>

              <div className="border border-neutral-800 p-4 rounded-xl">
                <label className="text-xs text-neutral-500 mb-1 block">Rejeição: Motivo (Opcional)</label>
                <Input 
                  placeholder="Se for rejeitar, explique o motivo..." 
                  value={rejectionReason} 
                  onChange={(e) => setRejectionReason(e.target.value)} 
                  className="bg-neutral-950 border-neutral-700 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setVerifyModalOpen(false)} 
                disabled={processing}
                className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleVerify(false)} 
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeitar"}
              </button>
              <button 
                onClick={() => handleVerify(true)} 
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition text-sm font-bold disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aprovar Migração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
