"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { VehicleStatus } from "@prisma/client"
import { requireAuth } from "@/lib/auth-utils"

// Indian vehicle number: e.g. MH12AB1234 (state code + 2 digits + 1-3 letters + 4 digits)
const VEHICLE_NUMBER_RE = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$/

function validateVehicleNumber(num: string): string | null {
  const clean = num.trim().replace(/\s+/g, "").toUpperCase()
  if (!clean) return "Vehicle number is required"
  if (!VEHICLE_NUMBER_RE.test(clean)) return "Invalid vehicle number format (e.g. MH12AB1234)"
  return null
}

export type VehicleInput = {
  vehicleNumber: string
  type: string
  capacity?: number | null
  ownerId: string
  status?: VehicleStatus
  notes?: string
}

export type VehicleDocInput = {
  type: string
  documentNo?: string
  issueDate?: string
  expiryDate?: string
  notes?: string
}

export type VehicleIncidentInput = {
  date: string
  description: string
  cost?: number | null
}

export async function createVehicle(data: VehicleInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = validateVehicleNumber(data.vehicleNumber)
  if (err) return { success: false as const, error: err }
  if (!data.ownerId) return { success: false as const, error: "Owner is required" }
  if (!data.type)    return { success: false as const, error: "Vehicle type is required" }

  const clean = { ...data, vehicleNumber: data.vehicleNumber.trim().replace(/\s+/g, "").toUpperCase() }

  try {
    const vehicle = await prisma.vehicle.create({ data: clean })
    revalidatePath("/vehicles")
    revalidatePath(`/parties/vehicle-owners/${data.ownerId}`)
    return { success: true as const, id: vehicle.id }
  } catch (e: any) {
    if (e?.code === "P2002") {
      return { success: false as const, error: "Vehicle number already exists." }
    }
    return { success: false as const, error: "Failed to save vehicle." }
  }
}

export async function updateVehicle(id: string, data: Partial<VehicleInput>) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (data.vehicleNumber) {
    const err = validateVehicleNumber(data.vehicleNumber)
    if (err) return { success: false as const, error: err }
    data = { ...data, vehicleNumber: data.vehicleNumber.trim().replace(/\s+/g, "").toUpperCase() }
  }

  try {
    const v = await prisma.vehicle.update({ where: { id }, data })
    revalidatePath("/vehicles")
    revalidatePath(`/vehicles/${id}`)
    revalidatePath(`/parties/vehicle-owners/${v.ownerId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update vehicle." }
  }
}

export async function updateVehicleStatus(id: string, status: VehicleStatus) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.vehicle.update({ where: { id }, data: { status } })
    revalidatePath(`/vehicles/${id}`)
    revalidatePath("/vehicles")
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update status." }
  }
}

export async function addVehicleDocument(vehicleId: string, data: VehicleDocInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (!data.type) return { success: false as const, error: "Document type is required" }

  try {
    await prisma.vehicleDocument.create({
      data: {
        vehicleId,
        type:       data.type,
        documentNo: data.documentNo || null,
        issueDate:  data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes:      data.notes || null,
      },
    })
    revalidatePath(`/vehicles/${vehicleId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to add document." }
  }
}

export async function deleteVehicleDocument(docId: string, vehicleId: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.vehicleDocument.delete({ where: { id: docId } })
    revalidatePath(`/vehicles/${vehicleId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to delete document." }
  }
}

export async function addVehicleIncident(vehicleId: string, data: VehicleIncidentInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (!data.description?.trim()) return { success: false as const, error: "Description is required" }
  if (!data.date) return { success: false as const, error: "Date is required" }

  try {
    await prisma.vehicleIncident.create({
      data: {
        vehicleId,
        date:        new Date(data.date),
        description: data.description.trim(),
        cost:        data.cost ?? null,
        status:      "OPEN",
      },
    })
    revalidatePath(`/vehicles/${vehicleId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to log incident." }
  }
}

export async function resolveIncident(incidentId: string, vehicleId: string, resolution: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  if (!resolution?.trim()) return { success: false as const, error: "Resolution details are required" }

  try {
    await prisma.vehicleIncident.update({
      where: { id: incidentId },
      data:  { status: "RESOLVED", resolution: resolution.trim() },
    })
    revalidatePath(`/vehicles/${vehicleId}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to resolve incident." }
  }
}
