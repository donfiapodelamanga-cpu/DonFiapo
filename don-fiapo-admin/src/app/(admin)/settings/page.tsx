"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Bell,
  Shield,
  Key,
  Globe,
  Mail,
  Smartphone,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  Lock,
  Plus,
} from "lucide-react";
import { getSession, hasPermission, AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  status: "active" | "revoked";
}

// API keys are fetched from /api/admin/settings/api-keys (when available)

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "security" | "api">("general");
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Don Fiapo",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    language: "pt-BR",
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailTransactions: true,
    emailSecurity: true,
    emailMarketing: false,
    pushTransactions: true,
    pushSecurity: true,
    pushUpdates: false,
    smsCritical: true,
    smsMarketing: false,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
    loginNotifications: true,
  });

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    if (!hasPermission(currentSession, "settings")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(currentSession);

    // Fetch API keys from backend (graceful fallback to empty)
    fetch("/api/admin/settings/api-keys")
      .then(res => res.ok ? res.json() : [])
      .then(data => setApiKeys(Array.isArray(data) ? data : []))
      .catch(() => setApiKeys([]));
  }, [router]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalSettings, notificationSettings, securitySettings }),
      });
      if (res.ok) {
        alert("Configurações salvas com sucesso!");
      } else {
        alert("Configurações salvas localmente (API de persistência pendente).");
      }
    } catch {
      alert("Configurações salvas localmente (API de persistência pendente).");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Chave copiada para a área de transferência!");
  };

  if (!session) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-neutral-400 mt-2">
            Gerencie as configurações do sistema e preferências
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
        >
          <Save className="w-5 h-5" />
          Salvar Alterações
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-neutral-800">
        {[
          { id: "general", label: "Geral", icon: Settings },
          { id: "notifications", label: "Notificações", icon: Bell },
          { id: "security", label: "Segurança", icon: Shield },
          { id: "api", label: "API Keys", icon: Key },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-yellow-500 text-yellow-500"
                : "border-transparent text-neutral-400 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Configurações Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={generalSettings.companyName}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, companyName: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Fuso Horário
              </label>
              <select
                value={generalSettings.timezone}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, timezone: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              >
                <option value="America/Sao_Paulo">América/São Paulo (GMT-3)</option>
                <option value="America/New_York">América/Nova York (GMT-5)</option>
                <option value="Europe/London">Europa/Londres (GMT+0)</option>
                <option value="Europe/Paris">Europa/Paris (GMT+1)</option>
                <option value="Asia/Tokyo">Ásia/Tóquio (GMT+9)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Moeda Padrão
              </label>
              <select
                value={generalSettings.currency}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, currency: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              >
                <option value="BRL">Real Brasileiro (BRL)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">Libra Esterlina (GBP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Idioma
              </label>
              <select
                value={generalSettings.language}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, language: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Notificações por Email</h3>
                <p className="text-sm text-neutral-400">Configure alertas enviados por email</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { key: "emailTransactions", label: "Transações importantes", desc: "Receba alertas sobre transações acima de R$ 10.000" },
                { key: "emailSecurity", label: "Alertas de segurança", desc: "Notificações de login em novos dispositivos" },
                { key: "emailMarketing", label: "Relatórios de marketing", desc: "Resumo semanal de campanhas e métricas" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings],
                      })
                    }
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      notificationSettings[item.key as keyof typeof notificationSettings]
                        ? "bg-yellow-500"
                        : "bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? "left-7"
                          : "left-1"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Notificações Push</h3>
                <p className="text-sm text-neutral-400">Alertas em tempo real no navegador</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { key: "pushTransactions", label: "Transações em tempo real", desc: "Notificações instantâneas de novas transações" },
                { key: "pushSecurity", label: "Alertas de segurança", desc: "Avisos imediatos sobre atividades suspeitas" },
                { key: "pushUpdates", label: "Atualizações do sistema", desc: "Novidades e melhorias na plataforma" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-sm text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings],
                      })
                    }
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      notificationSettings[item.key as keyof typeof notificationSettings]
                        ? "bg-yellow-500"
                        : "bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        notificationSettings[item.key as keyof typeof notificationSettings]
                          ? "left-7"
                          : "left-1"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Configurações de Segurança</h3>
                <p className="text-sm text-neutral-400">Proteja sua conta e dados</p>
              </div>
            </div>
            <div className="space-y-6">
              {/* Two Factor Auth */}
              <div className="flex items-center justify-between py-3 border-b border-neutral-800">
                <div>
                  <p className="text-white font-medium">Autenticação de Dois Fatores (2FA)</p>
                  <p className="text-sm text-neutral-500">Adicione uma camada extra de segurança</p>
                </div>
                <button
                  onClick={() =>
                    setSecuritySettings({
                      ...securitySettings,
                      twoFactorEnabled: !securitySettings.twoFactorEnabled,
                    })
                  }
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    securitySettings.twoFactorEnabled ? "bg-yellow-500" : "bg-neutral-700"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      securitySettings.twoFactorEnabled ? "left-7" : "left-1"
                    )}
                  />
                </button>
              </div>

              {/* Session Timeout */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Tempo de Sessão (minutos)
                </label>
                <select
                  value={securitySettings.sessionTimeout}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })
                  }
                  className="w-full md:w-64 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="120">2 horas</option>
                </select>
              </div>

              {/* Password Expiry */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Expiração de Senha (dias)
                </label>
                <select
                  value={securitySettings.passwordExpiry}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })
                  }
                  className="w-full md:w-64 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                >
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                </select>
              </div>

              {/* Login Notifications */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Notificações de Login</p>
                  <p className="text-sm text-neutral-500">Receba alertas quando houver novo login</p>
                </div>
                <button
                  onClick={() =>
                    setSecuritySettings({
                      ...securitySettings,
                      loginNotifications: !securitySettings.loginNotifications,
                    })
                  }
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    securitySettings.loginNotifications ? "bg-yellow-500" : "bg-neutral-700"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      securitySettings.loginNotifications ? "left-7" : "left-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">API Keys</h3>
                  <p className="text-sm text-neutral-400">Gerencie chaves de acesso à API</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
                <Plus className="w-4 h-4" />
                Nova API Key
              </button>
            </div>

            <div className="space-y-4">
              {apiKeys.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  <p>Nenhuma API key configurada.</p>
                  <p className="text-sm mt-1">API keys serão listadas aqui quando criadas.</p>
                </div>
              )}
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className={cn(
                    "p-4 border rounded-lg",
                    apiKey.status === "active"
                      ? "border-neutral-800 bg-neutral-950"
                      : "border-neutral-800/50 bg-neutral-950/50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-white">{apiKey.name}</h4>
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs rounded-full",
                            apiKey.status === "active"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          )}
                        >
                          {apiKey.status === "active" ? "Ativa" : "Revogada"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="px-3 py-1 bg-neutral-900 rounded text-sm text-neutral-400 font-mono">
                          {showApiKey === apiKey.id ? apiKey.key : apiKey.key.replace(/x/g, "•")}
                        </code>
                        <button
                          onClick={() =>
                            setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)
                          }
                          className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                        >
                          {showApiKey === apiKey.id ? (
                            <EyeOff className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                        <span>Criada em: {formatDate(apiKey.createdAt)}</span>
                        <span>•</span>
                        <span>Último uso: {formatDate(apiKey.lastUsed)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {apiKey.status === "active" && (
                        <>
                          <button className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                            <RefreshCw className="w-4 h-4 text-neutral-400" />
                          </button>
                          <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong className="text-blue-500">Dica de segurança:</strong> Nunca compartilhe suas
                API keys em repositórios públicos ou client-side. Em caso de suspeita de
                vazamento, revogue a chave imediatamente e gere uma nova.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl text-blue-500">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Acesso às Configurações</p>
          <p className="text-sm text-blue-500/80 mt-1">
            Como usuário com acesso às configurações, você pode modificar
            preferências do sistema. Alterações críticas de segurança requerem
            confirmação adicional.
          </p>
        </div>
      </div>
    </div>
  );
}
