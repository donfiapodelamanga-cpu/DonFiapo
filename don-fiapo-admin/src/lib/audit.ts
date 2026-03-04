import prisma from "./prisma";

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  adminEmail: string;
  ipAddress?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (error) {
    console.error("[AuditLog] Failed to log:", error);
  }
}

/**
 * Get recent audit logs with optional filters
 */
export async function getAuditLogs(opts?: {
  entity?: string;
  adminEmail?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      ...(opts?.entity && { entity: opts.entity }),
      ...(opts?.adminEmail && { adminEmail: opts.adminEmail }),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 50,
    skip: opts?.offset || 0,
  });
}
