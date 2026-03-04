"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Megaphone,
  Handshake,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Gem,
  Coins,
  Store,
  Crown,
  Award,
  Gift,
  Rocket,
  Target,
  Vote,
  Server,
  Ship,
  KeyRound,
  SendHorizonal,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, clearSession, hasPermission, AdminSession } from "@/lib/auth";
import Image from "next/image";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

interface SidebarProps {
  session: AdminSession;
}

export default function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const groupPaths: Record<string, string[]> = {
      comercial: ["/sales", "/partnerships"],
      marketing: ["/marketing", "/missions", "/airdrop", "/lottery", "/rewards", "/affiliate", "/collections"],
      financeiro: ["/finance", "/transactions", "/system-wallets", "/migrations", "/distribution"],
      produtos: ["/tokenomics", "/ico", "/staking", "/marketplace", "/spin", "/governance"],
      sistema: ["/infrastructure", "/settings"],
    };
    for (const [groupId, paths] of Object.entries(groupPaths)) {
      if (paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        initial.add(groupId);
      }
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const navEntries: NavEntry[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      permission: "view_dashboard",
    },
    {
      href: "/users",
      label: "Usuários",
      icon: <Users className="w-5 h-5" />,
      permission: "users",
    },
    // ── Comercial Group ──
    {
      id: "comercial",
      label: "Comercial",
      icon: <ShoppingCart className="w-5 h-5" />,
      permission: "sales",
      children: [
        {
          href: "/sales",
          label: "Vendas",
          icon: <ShoppingCart className="w-4 h-4" />,
          permission: "sales",
        },
        {
          href: "/partnerships",
          label: "Parceiros",
          icon: <Handshake className="w-4 h-4" />,
          permission: "partnerships",
        },
      ],
    },
    // ── Marketing Group ──
    {
      id: "marketing",
      label: "Marketing",
      icon: <Megaphone className="w-5 h-5" />,
      permission: "view_dashboard",
      children: [
        {
          href: "/marketing",
          label: "Visão Geral",
          icon: <Megaphone className="w-4 h-4" />,
          permission: "marketing",
        },
        {
          href: "/missions",
          label: "Missões",
          icon: <Target className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/airdrop",
          label: "Airdrop",
          icon: <Rocket className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/lottery",
          label: "Lottery",
          icon: <Gift className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/rewards",
          label: "Rewards & Rankings",
          icon: <Award className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/affiliate",
          label: "Afiliados",
          icon: <Users className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/collections",
          label: "Coleções NFT",
          icon: <Layers className="w-4 h-4" />,
          permission: "collections",
        },
      ],
    },
    // ── Financeiro Group ──
    {
      id: "financeiro",
      label: "Financeiro",
      icon: <DollarSign className="w-5 h-5" />,
      permission: "finance",
      children: [
        {
          href: "/finance",
          label: "Visão Geral",
          icon: <BarChart3 className="w-4 h-4" />,
          permission: "finance",
        },
        {
          href: "/transactions",
          label: "Transações",
          icon: <BarChart3 className="w-4 h-4" />,
          permission: "finance",
        },
        {
          href: "/system-wallets",
          label: "Carteiras do Sistema",
          icon: <KeyRound className="w-4 h-4" />,
          permission: "finance",
        },
        {
          href: "/migrations",
          label: "Bridge (Solana → Lunes)",
          icon: <Ship className="w-4 h-4" />,
          permission: "finance",
        },
        {
          href: "/distribution",
          label: "Distribuição Early Bird",
          icon: <SendHorizonal className="w-4 h-4" />,
          permission: "finance",
        },
      ],
    },
    // ── Produtos Group ──
    {
      id: "produtos",
      label: "Produtos",
      icon: <Gem className="w-5 h-5" />,
      permission: "view_dashboard",
      children: [
        {
          href: "/tokenomics",
          label: "Tokenomics",
          icon: <Coins className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/ico",
          label: "ICO & NFTs",
          icon: <Gem className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/staking",
          label: "Staking",
          icon: <Coins className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/marketplace",
          label: "Marketplace",
          icon: <Store className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/spin",
          label: "Spin Game",
          icon: <Target className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/governance",
          label: "Governance",
          icon: <Vote className="w-4 h-4" />,
          permission: "view_dashboard",
        },
      ],
    },
    // ── Sistema Group ──
    {
      id: "sistema",
      label: "Sistema",
      icon: <Server className="w-5 h-5" />,
      permission: "view_dashboard",
      children: [
        {
          href: "/infrastructure",
          label: "Infraestrutura",
          icon: <Server className="w-4 h-4" />,
          permission: "view_dashboard",
        },
        {
          href: "/settings",
          label: "Configurações",
          icon: <Settings className="w-4 h-4" />,
          permission: "settings",
        },
      ],
    },
  ];

  const filteredEntries = navEntries.filter((entry) =>
    hasPermission(session, entry.permission)
  );

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => isActive(child.href));

  const linkClasses = (href: string) =>
    cn(
      "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
      isActive(href)
        ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/50 shadow-[0_6px_20px_rgba(250,204,21,0.15)]"
        : "text-neutral-400 hover:bg-neutral-800/80 hover:text-white hover:translate-x-0.5",
      isCollapsed && "justify-center"
    );

  return (
    <aside
      className={cn(
        "relative h-screen shrink-0 bg-neutral-900/95 border-r border-neutral-800/80 flex flex-col transition-all duration-300 ease-out backdrop-blur-xl",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-500/10 to-transparent" />
      {/* Logo */}
      <div className="p-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 ring-1 ring-yellow-500/50 shadow-[0_0_0_1px_rgba(250,204,21,0.1),0_8px_24px_rgba(250,204,21,0.08)] flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image src="/logo.png" alt="Don Fiapo" width={28} height={28} className="rounded-md" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-yellow-500 truncate tracking-wide">Don Fiapo</h1>
              <p className="text-xs text-neutral-500 truncate">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-neutral-800/80">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_8px_24px_rgba(250,204,21,0.15)]">
            <span className="text-yellow-500 font-bold text-sm">
              {session.email.charAt(0).toUpperCase()}
            </span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{session.email}</p>
              <p className="text-xs text-yellow-500 truncate">{session.roleName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="admin-scroll flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredEntries.map((entry) => {
          if (isGroup(entry)) {
            const group = entry;
            const groupOpen = openGroups.has(group.id) || isGroupActive(group);
            const groupActive = isGroupActive(group);

            if (isCollapsed) {
              return (
                <Link
                  key={group.id}
                  href={group.children[0]?.href ?? "#"}
                  className={cn(
                    "group flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200",
                    groupActive
                      ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/50"
                      : "text-neutral-400 hover:bg-neutral-800/80 hover:text-white"
                  )}
                  title={group.label}
                >
                  <span className="transition-transform duration-200 group-hover:scale-105">{group.icon}</span>
                </Link>
              );
            }

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    groupActive
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "text-neutral-400 hover:bg-neutral-800/80 hover:text-white"
                  )}
                >
                  <span className="transition-transform duration-200 group-hover:scale-105">{group.icon}</span>
                  <span className="text-sm font-medium flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      groupOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {groupOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-neutral-800/60 pl-3">
                    {group.children
                      .filter((child) => hasPermission(session, child.permission))
                      .map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[13px]",
                            isActive(child.href)
                              ? "bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/40"
                              : "text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-200"
                          )}
                        >
                          <span>{child.icon}</span>
                          <span className="font-medium">{child.label}</span>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item
          const item = entry as NavItem;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={linkClasses(item.href)}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="transition-transform duration-200 group-hover:scale-105">{item.icon}</span>
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-800/80 space-y-2 bg-neutral-950/40">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-400 hover:bg-neutral-800/80 hover:text-white transition-all duration-200 active:scale-[0.98]",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Recolher</span>
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200 active:scale-[0.98]",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
