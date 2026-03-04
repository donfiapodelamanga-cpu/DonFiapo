export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

export const USER_ROLES: UserRole[] = [
  {
    id: "admin_geral",
    name: "Administrador Geral",
    description: "Acesso completo a todas as funcionalidades do sistema",
    permissions: ["all"],
  },
  {
    id: "admin",
    name: "Administrador",
    description: "Gerenciamento de usuários, conteúdo, coleções e configurações",
    permissions: ["users", "content", "collections", "settings", "view_dashboard"],
  },
  {
    id: "financeiro",
    name: "Financeiro",
    description: "Gestão de carteiras, saques, depósitos e relatórios de taxas",
    permissions: ["finance", "transactions", "reports", "view_dashboard"],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Gestão de campanhas, analytics, coleções e conteúdo comercial",
    permissions: ["marketing", "analytics", "content", "collections", "view_dashboard"],
  },
  {
    id: "comercial",
    name: "Comercial",
    description: "Gestão de equipe de vendas, Nobles e parcerias",
    permissions: ["sales", "partnerships", "team", "view_dashboard"],
  },
];

export function getRoleById(roleId: string): UserRole | undefined {
  return USER_ROLES.find((role) => role.id === roleId);
}

export function getRolePermissions(roleId: string): string[] {
  return getRoleById(roleId)?.permissions ?? [];
}

export function hasRolePermission(permissions: string[], permission: string): boolean {
  if (permissions.includes("all")) return true;
  return permissions.includes(permission);
}
