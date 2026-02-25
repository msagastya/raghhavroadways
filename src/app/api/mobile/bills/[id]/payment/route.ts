import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// POST /api/mobile/bills/[id]/payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireMobileAuth(req)
    const { id } = await params
    const body = await req.json()
    const { amount, mode, reference, tdsAmount, notes } = body ?? {}

    if (!amount || !mode) return err("Amount and mode are required")

    const bill = await prisma.bill.findUnique({ where: { id } })
    if (!bill) return err("Bill not found", 404)
    if (bill.status === "PAID" || bill.status === "CANCELLED") {
      return err("Cannot add payment to this bill")
    }

    const payAmount = parseFloat(amount)
    const outstanding = bill.totalAmount - bill.paidAmount
    if (payAmount > outstanding + 0.01) {
      return err(`Payment exceeds outstanding amount of ₹${outstanding.toFixed(2)}`)
    }

    const newPaid = bill.paidAmount + payAmount
    const newStatus =
      newPaid >= bill.totalAmount - 0.01
        ? "PAID"
        : newPaid > 0
        ? "PARTIALLY_PAID"
        : bill.status

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          partyId: bill.partyId,
          billId: id,
          amount: payAmount,
          mode,
          reference: reference || null,
          tdsAmount: tdsAmount ? parseFloat(tdsAmount) : 0,
          notes: notes || null,
          createdById: user.sub,
        },
      }),
      prisma.bill.update({
        where: { id },
        data: { paidAmount: newPaid, status: newStatus },
      }),
      prisma.ledgerEntry.create({
        data: {
          partyId: bill.partyId,
          type: "RECEIVABLE",
          credit: payAmount,
          debit: 0,
          balance: -(outstanding - payAmount),
          description: `Payment received for bill ${bill.billNumber}`,
          createdById: user.sub,
        },
      }),
    ])

    return ok({
      payment,
      bill: { status: newStatus, paidAmount: newPaid, outstanding: bill.totalAmount - newPaid },
    }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/bills/[id]/payment POST]", e)
    return err("Server error", 500)
  }
}
