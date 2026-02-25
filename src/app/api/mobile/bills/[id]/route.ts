import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/bills/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMobileAuth(req)
    const { id } = await params

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        party: { select: { id: true, name: true, type: true, phone: true, email: true, gstin: true } },
        consignment: {
          select: {
            id: true,
            lrNumber: true,
            fromCity: true,
            toCity: true,
            description: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
          include: {
            createdBy: { select: { name: true } },
          },
        },
      },
    })

    if (!bill) return err("Bill not found", 404)

    return ok({
      bill: {
        ...bill,
        outstanding: bill.totalAmount - bill.paidAmount,
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/bills/[id] GET]", e)
    return err("Server error", 500)
  }
}
