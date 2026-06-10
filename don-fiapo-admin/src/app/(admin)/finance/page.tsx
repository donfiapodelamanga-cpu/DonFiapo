"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, RefreshCw, Wallet, Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Interfaces
interface TreasuryData {
  lunes: {
    balance: number;
    price: number;
    valueUsd: number;
    valueBrl: number;
  };
  solana: {
    balance: number;
    price: number;
    valueUsd: number;
    valueBrl: number;
  };
  totalUsd: number;
  totalBrl: number;
  updatedAt: string;
}

interface FinanceWallet {
  id: string;
  address: string;
  network: string;
  type: string;
  balance: number;
  balanceUsd: number;
  balanceBrl: number;
  updatedAt: string;
}

interface FinanceTransaction {
  id: string;
  txHash: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "AIRDROP" | "SALE";
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  timestamp: string;
  wallet?: {
    address: string;
    network: string;
  };
  description?: string;
}

interface AirdropOverview {
  offChain: {
    totalUsers: number;
    totalPoints: number;
    activeMissions: number;
  };
  onChain: {
    totalClaims: number;
    totalTokensDistributed: number;
    contractBalance: number;
  };
}

export default function FinancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [airdrop, setAirdrop] = useState<AirdropOverview | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [treasuryRes, walletsRes, txRes, airdropRes] = await Promise.all([
        fetch("/api/finance/treasury"),
        fetch("/api/finance/wallets"),
        fetch("/api/admin/transactions?limit=10"),
        fetch("/api/admin/airdrop/overview"),
      ]);

      if (treasuryRes.ok) setTreasury(await treasuryRes.json());
      if (walletsRes.ok) setWallets(await walletsRes.json());
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.data || []);
      }
      if (airdropRes.ok) setAirdrop(await airdropRes.json());
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number, currency: "USD" | "BRL") => {
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
      style: "currency",
      currency,
    }).format(value);
  };

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanças & Tesouraria</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral dos ativos, carteiras e movimentações do projeto.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Treasury Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tesouraria Total (USD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treasury ? formatCurrency(treasury.totalUsd, "USD") : "---"}
            </div>
            <p className="text-xs text-muted-foreground">
              ≈ {treasury ? formatCurrency(treasury.totalBrl, "BRL") : "---"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Lunes ($FIAPO)</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treasury?.lunes.balance.toLocaleString()} FIAPO
            </div>
            <p className="text-xs text-muted-foreground">
              {treasury ? formatCurrency(treasury.lunes.valueUsd, "USD") : "---"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Solana ($FIAPO)</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treasury?.solana.balance.toLocaleString()} FIAPO
            </div>
            <p className="text-xs text-muted-foreground">
              {treasury ? formatCurrency(treasury.solana.valueUsd, "USD") : "---"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Airdrop Estimado</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {airdrop ? (airdrop.offChain.totalPoints * 0.001).toLocaleString() : "---"} FIAPO
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado em 1000 pts = 1 FIAPO (Est.)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Wallets List */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Carteiras do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {wallets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma carteira encontrada</p>
              ) : (
                wallets.map((wallet) => (
                  <div key={wallet.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{wallet.type}</span>
                        <Badge variant="secondary" className="text-[10px]">{wallet.network}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono" title={wallet.address}>
                        {shortenAddress(wallet.address)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{wallet.balance.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(wallet.balanceUsd, "USD")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Hash/Desc</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação recente
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.type === "INCOME" ? "default" :
                          tx.type === "EXPENSE" ? "destructive" :
                          "outline"
                        }>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[150px] truncate">
                         {tx.txHash ? (
                           <a href="#" className="hover:underline" title={tx.txHash}>
                             {shortenAddress(tx.txHash)}
                           </a>
                         ) : (
                           tx.description || "---"
                         )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={
                          tx.type === "INCOME" ? "text-green-600" :
                          tx.type === "EXPENSE" ? "text-red-600" : ""
                        }>
                          {tx.type === "EXPENSE" ? "-" : "+"}
                          {tx.amount.toLocaleString()} {tx.currency}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Airdrop Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas do Airdrop</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Engajamento Off-Chain</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{airdrop?.offChain.totalUsers.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Participantes</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{airdrop?.offChain.activeMissions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Missões Ativas</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pontos Distribuídos</h3>
              <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {airdrop?.offChain.totalPoints.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total de Pontos (DB)</div>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground opacity-20" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Distribuição On-Chain</h3>
               <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {airdrop?.onChain.totalTokensDistributed.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">FIAPO Reivindicados</div>
                </div>
                <Coins className="h-8 w-8 text-muted-foreground opacity-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
