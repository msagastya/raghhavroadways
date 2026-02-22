"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function getNotifications() {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error, notifications: [] }

  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return { success: true as const, notifications }
  } catch {
    return { success: false as const, error: "Failed to fetch notifications", notifications: [] }
  }
}

export async function markAllNotificationsRead() {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data:  { isRead: true },
    })
    revalidatePath("/")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to mark notifications as read" }
  }
}

export async function markNotificationRead(id: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.notification.update({ where: { id }, data: { isRead: true } })
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to mark notification as read" }
  }
}
