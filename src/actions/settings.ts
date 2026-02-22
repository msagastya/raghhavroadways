"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { requireAuth, requireAdmin } from "@/lib/auth-utils"

// ─── Company Settings ─────────────────────────────────────────────────────────

export async function saveCompanySettings(data: Record<string, string>) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    const allowed = [
      "company_name", "gst_number", "pan", "address", "city",
      "state", "pincode", "phone", "email",
    ]
    for (const key of allowed) {
      if (key in data) {
        await prisma.systemSetting.upsert({
          where:  { key },
          update: { value: data[key] },
          create: { key, value: data[key] },
        })
      }
    }
    revalidatePath("/settings")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to save settings" }
  }
}

export async function saveNumberingSettings(data: {
  lr_prefix: string; invoice_prefix: string; invoice_series: string
}) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    for (const [key, value] of Object.entries(data)) {
      await prisma.systemSetting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      })
    }
    revalidatePath("/settings")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to save numbering settings" }
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createUser(data: {
  name: string; email: string; password: string
  phone?: string | null; roleId: string
}) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (!data.name?.trim())  return { success: false as const, error: "Name is required" }
  if (!data.email?.trim()) return { success: false as const, error: "Email is required" }
  if (data.password.length < 8) return { success: false as const, error: "Password must be at least 8 characters" }

  try {
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) return { success: false as const, error: "Email already in use" }

    const hashed = await bcrypt.hash(data.password, 12)
    const user   = await prisma.user.create({
      data: {
        name:     data.name.trim(),
        email:    data.email.trim().toLowerCase(),
        password: hashed,
        phone:    data.phone || null,
        roleId:   data.roleId,
        isActive: true,
      },
    })
    revalidatePath("/settings/users")
    return { success: true as const, id: user.id }
  } catch {
    return { success: false as const, error: "Failed to create user" }
  }
}

export async function updateUser(id: string, data: {
  name: string; phone?: string | null; roleId: string; isActive: boolean
}) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.user.update({
      where: { id },
      data:  { name: data.name.trim(), phone: data.phone || null, roleId: data.roleId, isActive: data.isActive },
    })
    revalidatePath("/settings/users")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update user" }
  }
}

export async function changePassword(id: string, newPassword: string) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (newPassword.length < 8) return { success: false as const, error: "Password must be at least 8 characters" }

  try {
    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id }, data: { password: hashed } })
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to change password" }
  }
}

/** Self-service password change — user changes their own password */
export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (newPassword.length < 8) return { success: false as const, error: "New password must be at least 8 characters" }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } })
    if (!user) return { success: false as const, error: "User not found" }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return { success: false as const, error: "Current password is incorrect" }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: auth.user.id }, data: { password: hashed } })
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to change password" }
  }
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false as const, error: auth.error }

  // Prevent deactivating yourself
  if (id === auth.user.id) return { success: false as const, error: "You cannot deactivate your own account" }

  try {
    await prisma.user.update({ where: { id }, data: { isActive } })
    revalidatePath("/settings/users")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update user" }
  }
}
