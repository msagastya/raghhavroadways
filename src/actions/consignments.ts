"use server"

import { prisma } from "@/lib/prisma"
import { generateLRNumber } from "@/lib/lr-generator"
import { revalidatePath } from "next/cache"
import { ConsignmentStatus } from "@prisma/client"
import { requireAuth } from "@/lib/auth-utils"
import { validateEwayBill, validatePhone, firstError } from "@/lib/validate"

export type ConsignmentInput = {
  bookingDate:     string
  consignorId:     string
  consigneeId:     string
  agentId?:        string | null
  fromCity:        string
  fromState:       string
  toCity:          string
  toState:         string
  description:     string
  freightType:     "FTL" | "LTL" | "WEIGHT_BASIS" | "OTHER"
  weight?:         number | null
  quantity?:       number | null
  unit?:           string | null
  declaredValue?:  number | null
  freightAmount:   number
  paymentType:     "PAID" | "TO_PAY" | "TBB"
  ewayBillNumber?:   string | null
  ewayBillDocUrl?:   string | null
  invoiceChallanNo?: string | null
  challanDocUrl?:    string | null
  vehicleId?:        string | null
  driverName?:     string | null
  driverPhone?:    string | null
  vehicleFreight?: number | null
  advancePaid?:    number
  notes?:          string | null
}

export async function createConsignment(data: ConsignmentInput) {
  // Auth check
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  // Validation
  const validationError = firstError(
    !data.consignorId ? "Consignor is required" : null,
    !data.consigneeId ? "Consignee is required" : null,
    !data.fromCity    ? "Origin city is required" : null,
    !data.toCity      ? "Destination city is required" : null,
    !data.description?.trim() ? "Cargo description is required" : null,
    data.freightAmount <= 0 ? "Freight amount must be greater than zero" : null,
    validatePhone(data.driverPhone),
    validateEwayBill(data.ewayBillNumber),
  )
  if (validationError) return { success: false as const, error: validationError }

  try {
    const lrNumber = await generateLRNumber()

    const result = await prisma.$transaction(async (tx) => {
      // Guard: vehicle must be AVAILABLE
      if (data.vehicleId) {
        const vehicle = await tx.vehicle.findUnique({
          where:  { id: data.vehicleId },
          select: { status: true, vehicleNumber: true },
        })
        if (!vehicle) throw new Error("Vehicle not found")
        if (vehicle.status !== "AVAILABLE") {
          throw new Error(
            `Vehicle ${vehicle.vehicleNumber} is ${vehicle.status.replace("_", " ")} and cannot be assigned`
          )
        }
      }

      const consignment = await tx.consignment.create({
        data: {
          lrNumber,
          bookingDate:    new Date(data.bookingDate),
          consignorId:    data.consignorId,
          consigneeId:    data.consigneeId,
          agentId:        data.agentId        || null,
          fromCity:       data.fromCity.trim(),
          fromState:      data.fromState,
          toCity:         data.toCity.trim(),
          toState:        data.toState,
          description:    data.description.trim(),
          freightType:    data.freightType,
          weight:         data.weight         ?? null,
          quantity:       data.quantity       ?? null,
          unit:           data.unit           ?? null,
          declaredValue:  data.declaredValue  ?? null,
          freightAmount:  data.freightAmount,
          paymentType:    data.paymentType,
          ewayBillNumber:   data.ewayBillNumber   || null,
          ewayBillDocUrl:   data.ewayBillDocUrl   || null,
          invoiceChallanNo: data.invoiceChallanNo || null,
          challanDocUrl:    data.challanDocUrl    || null,
          vehicleId:        data.vehicleId        || null,
          driverName:     data.driverName     || null,
          driverPhone:    data.driverPhone    || null,
          vehicleFreight: data.vehicleFreight ?? null,
          advancePaid:    data.advancePaid    ?? 0,
          balancePaid:    0,
          status:         "BOOKED",
          notes:          data.notes          || null,
        },
      })

      await tx.consignmentLog.create({
        data: { consignmentId: consignment.id, status: "BOOKED", note: "Consignment booked" },
      })

      if (data.vehicleId) {
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data:  { status: "ON_TRIP" },
        })
      }

      return consignment
    })

    revalidatePath("/consignments")
    return { success: true as const, id: result.id, lrNumber }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create consignment"
    return { success: false as const, error: msg }
  }
}

export async function updateConsignmentStatus(
  id: string,
  status: ConsignmentStatus,
  note?: string
) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignment.update({
        where: { id },
        data:  { status },
      })

      await tx.consignmentLog.create({
        data: { consignmentId: id, status, note: note || null },
      })

      // Create notification on delivery
      if (status === "DELIVERED") {
        await tx.notification.create({
          data: {
            type:       "DELIVERY",
            title:      "Consignment Delivered",
            message:    `GR ${consignment.lrNumber} has been delivered`,
            entityType: "consignment",
            entityId:   id,
          },
        })
      }

      // Free vehicle on delivery
      if (status === "DELIVERED" && consignment.vehicleId) {
        await tx.vehicle.update({
          where: { id: consignment.vehicleId },
          data:  { status: "AVAILABLE" },
        })
      }
    })

    revalidatePath("/consignments")
    revalidatePath(`/consignments/${id}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update status"
    return { success: false as const, error: msg }
  }
}

export async function updateConsignment(id: string, data: Partial<ConsignmentInput>) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const validationError = firstError(
    validatePhone(data.driverPhone),
    validateEwayBill(data.ewayBillNumber),
    data.freightAmount !== undefined && data.freightAmount <= 0
      ? "Freight amount must be greater than zero" : null,
  )
  if (validationError) return { success: false as const, error: validationError }

  try {
    await prisma.consignment.update({
      where: { id },
      data: {
        ...(data.bookingDate    && { bookingDate:    new Date(data.bookingDate) }),
        ...(data.consignorId    && { consignorId:    data.consignorId }),
        ...(data.consigneeId    && { consigneeId:    data.consigneeId }),
        agentId:        data.agentId        ?? undefined,
        fromCity:       data.fromCity       ?? undefined,
        fromState:      data.fromState      ?? undefined,
        toCity:         data.toCity         ?? undefined,
        toState:        data.toState        ?? undefined,
        description:    data.description    ?? undefined,
        freightType:    data.freightType    ?? undefined,
        weight:         data.weight         ?? null,
        quantity:       data.quantity       ?? null,
        unit:           data.unit           ?? null,
        declaredValue:  data.declaredValue  ?? null,
        freightAmount:  data.freightAmount  ?? undefined,
        paymentType:    data.paymentType    ?? undefined,
        ewayBillNumber:   data.ewayBillNumber   ?? null,
        ewayBillDocUrl:   data.ewayBillDocUrl   ?? null,
        invoiceChallanNo: data.invoiceChallanNo ?? null,
        challanDocUrl:    data.challanDocUrl    ?? null,
        vehicleId:        data.vehicleId        ?? null,
        driverName:     data.driverName     ?? null,
        driverPhone:    data.driverPhone    ?? null,
        vehicleFreight: data.vehicleFreight ?? null,
        advancePaid:    data.advancePaid    ?? undefined,
        notes:          data.notes          ?? null,
      },
    })
    revalidatePath("/consignments")
    revalidatePath(`/consignments/${id}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update consignment"
    return { success: false as const, error: msg }
  }
}
