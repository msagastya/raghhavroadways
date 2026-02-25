import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/parties/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMobileAuth(req)
    const { id } = await params

    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        vehicles: {
          where: { isActive: true },
          select: { id: true, vehicleNumber: true, type: true, status: true },
        },
        bills: {
          orderBy: { billDate: "desc" },
          take: 10,
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            billDate: true,
            dueDate: true,
          },
        },
        _count: {
          select: {
            consignmentsOrigin: true,
            consignmentsDest: true,
            bills: true,
          },
        },
      },
    })

    if (!party) return err("Party not found", 404)

    // Financial summary
    const billAgg = await prisma.bill.aggregate({
      where: { partyId: id, status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
      _sum: { totalAmount: true, paidAmount: true },
    })

    const outstanding =
      (billAgg._sum.totalAmount ?? 0) - (billAgg._sum.paidAmount ?? 0)

    return ok({ party, outstanding })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/parties/[id] GET]", e)
    return err("Server error", 500)
  }
}
