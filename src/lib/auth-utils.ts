"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// ─── Session helpers ───────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

/** Use inside server actions that require a logged-in user. */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user?.id) return { error: "Authentication required" as const }
  return { user }
}

// ─── Role helpers ──────────────────────────────────────────────────────────────

/** Roles that have full admin access regardless of RolePermission rows. */
const ADMIN_ROLES = ["ADMIN", "OWNER", "Owner", "owner", "admin"]

function isAdminRole(role?: string | null): boolean {
  return !!role && ADMIN_ROLES.includes(role)
}

/** Returns true if the current user has admin-level access. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return isAdminRole(user?.role)
}

/**
 * Use inside admin-only server actions.
 * Returns { error } if not admin, { user } if OK.
 */
export async function requireAdmin() {
  const result = await requireAuth()
  if ("error" in result) return result
  if (!isAdminRole(result.user.role)) return { error: "Admin access required" as const }
  return result
}

// ─── Fine-grained RBAC (RolePermission table) ─────────────────────────────────

/**
 * Check if a role has a specific (module, action) permission.
 * Admin roles always pass regardless of RolePermission rows.
 */
export async function hasPermission(
  roleId: string,
  roleName: string,
  module: string,
  action: string
): Promise<boolean> {
  if (isAdminRole(roleName)) return true
  const count = await prisma.rolePermission.count({
    where: { roleId, permission: { module, action } },
  })
  return count > 0
}

/**
 * Use inside server actions that need a specific permission.
 * Falls back to role=ADMIN bypass.
 */
export async function requirePermission(module: string, action: string) {
  const result = await requireAuth()
  if ("error" in result) return result
  const { user } = result
  const allowed = await hasPermission(user.roleId!, user.role!, module, action)
  if (!allowed) return { error: `You don't have permission to ${action} ${module}` as const }
  return { user }
}
