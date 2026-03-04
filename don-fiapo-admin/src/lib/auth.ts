"use client";

export { USER_ROLES, getRoleById } from "@/lib/auth-roles";
export type { UserRole } from "@/lib/auth-roles";

export interface AdminSession {
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
  loginAt: string;
}

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;

  const session = localStorage.getItem("admin_session");
  if (!session) return null;

  try {
    return JSON.parse(session) as AdminSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin_session");
}

export function hasPermission(session: AdminSession | null, permission: string): boolean {
  if (!session) return false;
  if (!session.permissions) return false;
  if (session.permissions.includes("all")) return true;
  return session.permissions.includes(permission);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
