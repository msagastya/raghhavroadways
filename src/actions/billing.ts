"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { generateBillNumber } from "@/lib/lr-generator"
import { BillStatus } from "@prisma/client"
import { requireAuth } from "@/lib/auth-utils"
import { validateAmount, validateNonNegative, firstError } from "@/lib/validate"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateBillInput = {
  partyId:            string
  consignmentId?:     string | null
  billDate:           string
  dueDate?:           string | null
  subtotal:           number
  gstRate:            number
  isInterstate:       boolean
  contentDescription?: string | null
  notes?:             string | null
}

export type RecordPaymentInput = {
  billId:     string
  partyId:    string
  date:       string
  amount:     number
  tdsAmount:  number
  mode:       string
  reference?: string | null
  notes?:     string | null
}

export type RecordVehiclePaymentInput = {
  partyId:        string
  consignmentId?: string | null
  date:           string
  amount:         number
  type:           string
  mode:           string
  reference?:     string | null
  notes?:         string | null
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export async function createBill(data: CreateBillInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = firstError(
    !data.partyId ? "Party is required" : null,
    validateAmount(data.subtotal, "Freight amount"),
    data.gstRate < 0 || data.gstRate > 28 ? "Invalid GST rate" : null,
  )
  if (err) return { success: false as const, error: err }

  try {
    const billNumber = await generateBillNumber()

    const subtotal = data.subtotal
    const rate     = data.gstRate / 100
    let cgst = 0, sgst = 0, igst = 0

    if (data.isInterstate) {
      igst = +(subtotal * rate).toFixed(2)
    } else {
      cgst = +(subtotal * (rate / 2)).toFixed(2)
      sgst = +(subtotal * (rate / 2)).toFixed(2)
    }

    const totalAmount = +(subtotal + cgst + sgst + igst).toFixed(2)

    const bill = await prisma.$transaction(async (tx) => {
      const b = await tx.bill.create({
        data: {
          billNumber,
          billDate:      new Date(data.billDate),
          dueDate:       data.dueDate ? new Date(data.dueDate) : null,
          partyId:       data.partyId,
          consignmentId: data.consignmentId || null,
          subtotal,
          cgst,
          sgst,
          igst,
          totalAmount,
          gstRate:       data.gstRate,
          isInterstate:  data.isInterstate,
          description:   data.contentDescription || null,
          notes:         data.notes || null,
          status:        "DRAFT",
        },
      })

      if (data.consignmentId) {
        const current = await tx.consignment.findUnique({
          where:  { id: data.consignmentId },
          select: { status: true, lrNumber: true },
        })
        if (current?.status === "DELIVERED") {
          await tx.consignment.update({
            where: { id: data.consignmentId },
            data:  { status: "BILLED" },
          })
          await tx.consignmentLog.create({
            data: { consignmentId: data.consignmentId, status: "BILLED", note: `Bill ${billNumber} generated` },
          })
        }

        // Notification
        await tx.notification.create({
          data: {
            type:       "BILL",
            title:      "Bill Generated",
            message:    `Bill ${billNumber} created for ${current?.lrNumber ?? "consignment"}`,
            entityType: "bill",
            entityId:   b.id,
          },
        })
      }

      return b
    })

    revalidatePath("/billing")
    if (data.consignmentId) revalidatePath(`/consignments/${data.consignmentId}`)
    return { success: true as const, id: bill.id, billNumber }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create bill"
    return { success: false as const, error: msg }
  }
}

export async function updateBillStatus(billId: string, status: BillStatus) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    await prisma.bill.update({ where: { id: billId }, data: { status } })
    revalidatePath("/billing")
    revalidatePath(`/billing/${billId}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update bill"
    return { success: false as const, error: msg }
  }
}

export async function cancelBill(billId: string) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  try {
    const bill = await prisma.bill.findUnique({
      where:  { id: billId },
      select: { status: true, paidAmount: true },
    })
    if (!bill) return { success: false as const, error: "Bill not found" }
    if (bill.paidAmount > 0)
      return { success: false as const, error: "Cannot cancel a bill with payments recorded" }

    await prisma.bill.update({ where: { id: billId }, data: { status: "CANCELLED" } })
    revalidatePath("/billing")
    revalidatePath(`/billing/${billId}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel bill"
    return { success: false as const, error: msg }
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(data: RecordPaymentInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = firstError(
    validateAmount(data.amount, "Payment amount"),
    validateNonNegative(data.tdsAmount, "TDS amount"),
    data.tdsAmount >= data.amount ? "TDS cannot exceed payment amount" : null,
  )
  if (err) return { success: false as const, error: err }

  try {
    const bill = await prisma.bill.findUnique({
      where:  { id: data.billId },
      select: { totalAmount: true, paidAmount: true, consignmentId: true },
    })
    if (!bill) return { success: false as const, error: "Bill not found" }

    const netAmount   = data.amount - data.tdsAmount
    const newPaid     = +(bill.paidAmount + data.amount).toFixed(2)
    const isFullyPaid = newPaid >= bill.totalAmount
    const newStatus: BillStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction(async (tx) => {
      await tx.bill.update({
        where: { id: data.billId },
        data:  { paidAmount: newPaid, status: newStatus },
      })

      const payment = await tx.payment.create({
        data: {
          date:      new Date(data.date),
          partyId:   data.partyId,
          billId:    data.billId,
          amount:    data.amount,
          tdsAmount: data.tdsAmount,
          mode:      data.mode,
          reference: data.reference || null,
          notes:     data.notes     || null,
          createdById: auth.user.id,
        },
      })

      await tx.ledgerEntry.create({
        data: {
          date:        new Date(data.date),
          partyId:     data.partyId,
          type:        "RECEIVABLE",
          credit:      netAmount,
          debit:       0,
          balance:     0,
          description: `Payment received for bill ${data.billId}`,
          paymentId:   payment.id,
          createdById: auth.user.id,
        },
      })

      if (isFullyPaid && bill.consignmentId) {
        const consignment = await tx.consignment.findUnique({
          where:  { id: bill.consignmentId },
          select: { status: true },
        })
        if (consignment && consignment.status !== "PAID" && consignment.status !== "CANCELLED") {
          await tx.consignment.update({ where: { id: bill.consignmentId }, data: { status: "PAID" } })
          await tx.consignmentLog.create({
            data: { consignmentId: bill.consignmentId, status: "PAID", note: "Bill fully paid" },
          })
        }
      } else if (!isFullyPaid && bill.consignmentId) {
        const consignment = await tx.consignment.findUnique({
          where:  { id: bill.consignmentId },
          select: { status: true },
        })
        if (consignment?.status === "BILLED") {
          await tx.consignment.update({ where: { id: bill.consignmentId }, data: { status: "PARTIALLY_PAID" } })
          await tx.consignmentLog.create({
            data: { consignmentId: bill.consignmentId, status: "PARTIALLY_PAID", note: `Partial payment ₹${data.amount}` },
          })
        }
      }
    })

    revalidatePath("/billing")
    revalidatePath(`/billing/${data.billId}`)
    if (bill.consignmentId) revalidatePath(`/consignments/${bill.consignmentId}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record payment"
    return { success: false as const, error: msg }
  }
}

// ─── Vehicle Payments ─────────────────────────────────────────────────────────

export async function recordVehiclePayment(data: RecordVehiclePaymentInput) {
  const auth = await requireAuth()
  if ("error" in auth) return { success: false as const, error: auth.error }

  const err = validateAmount(data.amount, "Payment amount")
  if (err) return { success: false as const, error: err }

  try {
    await prisma.$transaction(async (tx) => {
      const vp = await tx.vehiclePayment.create({
        data: {
          date:          new Date(data.date),
          partyId:       data.partyId,
          consignmentId: data.consignmentId || null,
          amount:        data.amount,
          type:          data.type,
          mode:          data.mode,
          reference:     data.reference || null,
          notes:         data.notes     || null,
          createdById:   auth.user.id,
        },
      })

      await tx.ledgerEntry.create({
        data: {
          date:             new Date(data.date),
          partyId:          data.partyId,
          type:             "PAYABLE",
          debit:            data.amount,
          credit:           0,
          balance:          0,
          description:      `Vehicle payment (${data.type}) to owner`,
          vehiclePaymentId: vp.id,
          createdById:      auth.user.id,
        },
      })

      if (data.consignmentId) {
        const c = await tx.consignment.findUnique({
          where:  { id: data.consignmentId },
          select: { advancePaid: true, balancePaid: true },
        })
        if (c) {
          if (data.type === "ADVANCE") {
            await tx.consignment.update({
              where: { id: data.consignmentId },
              data:  { advancePaid: c.advancePaid + data.amount },
            })
          } else {
            await tx.consignment.update({
              where: { id: data.consignmentId },
              data:  { balancePaid: c.balancePaid + data.amount },
            })
          }
        }
      }
    })

    revalidatePath("/billing/vehicle-payments")
    if (data.consignmentId) revalidatePath(`/consignments/${data.consignmentId}`)
    revalidatePath(`/parties/vehicle-owners/${data.partyId}`)
    return { success: true as const }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record vehicle payment"
    return { success: false as const, error: msg }
  }
}
