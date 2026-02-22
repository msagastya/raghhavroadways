"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PartyType } from "@prisma/client"
import { requireAuth } from "@/lib/auth-utils"
import { validateGSTIN, validatePAN, validatePhone, validatePincode, firstError } from "@/lib/validate"

export type PartyInput = {
  name:             string
  phone?:           string
  altPhone?:        string
  email?:           string
  address?:         string
  city?:            string
  state?:           string
  pincode?:         string
  gstin?:           string
  pan?:             string
  creditDays?:      number | null
  creditLimit?:     number | null
  commissionType?:  string | null
  commissionValue?: number | null
  notes?:           string
  isActive?:        boolean
}

const BASE_PATHS: Record<PartyType, string> = {
  COMPANY:       "/parties/companies",
  AGENT:         "/parties/agents",
  VEHICLE_OWNER: "/parties/vehicle-owners",
}

function validatePartyInput(data: PartyInput): string | null {
  return firstError(
    !data.name?.trim() ? "Name is required" : null,
    validatePhone(data.phone),
    validatePhone(data.altPhone),
    validateGSTIN(data.gstin),
    validatePAN(data.pan),
    validatePincode(data.pincode),
    data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
      ? "Invalid email format" : null,
  )
}

export async function createParty(type: PartyType, data: PartyInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = validatePartyInput(data)
  if (err) return { success: false as const, error: err }

  try {
    const party = await prisma.party.create({ data: { type, ...data } })
    revalidatePath(BASE_PATHS[type])
    return { success: true as const, id: party.id }
  } catch {
    return { success: false as const, error: "Failed to create. Please try again." }
  }
}

export async function updateParty(id: string, data: PartyInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = validatePartyInput(data)
  if (err) return { success: false as const, error: err }

  try {
    const party = await prisma.party.update({ where: { id }, data })
    revalidatePath(BASE_PATHS[party.type])
    revalidatePath(`${BASE_PATHS[party.type]}/${id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update. Please try again." }
  }
}

export async function togglePartyActive(id: string, isActive: boolean) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    const party = await prisma.party.update({ where: { id }, data: { isActive } })
    revalidatePath(BASE_PATHS[party.type])
    revalidatePath(`${BASE_PATHS[party.type]}/${id}`)
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to update status." }
  }
}

export async function deleteParty(id: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    const party = await prisma.party.findUnique({
      where:   { id },
      include: {
        _count: {
          select: {
            consignmentsOrigin: true,
            consignmentsDest:   true,
            consignmentsAgent:  true,
            bills:              true,
          },
        },
      },
    })
    if (!party) return { success: false as const, error: "Not found." }

    const linked =
      party._count.consignmentsOrigin +
      party._count.consignmentsDest   +
      party._count.consignmentsAgent  +
      party._count.bills

    if (linked > 0) {
      return {
        success: false as const,
        error: `Cannot delete — ${linked} linked record(s) exist. Deactivate instead.`,
      }
    }

    // Soft delete — preserves the record but hides it from all lists
    await prisma.party.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath(BASE_PATHS[party.type])
    return { success: true as const }
  } catch {
    return { success: false as const, error: "Failed to delete." }
  }
}
