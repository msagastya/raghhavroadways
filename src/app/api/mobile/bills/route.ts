import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/bills?status=&partyId=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const partyId = searchParams.get("partyId")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== "ALL") where.status = status
    if (partyId) where.partyId = partyId

    const [items, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { billDate: "desc" },
        include: {
          party: { select: { id: true, name: true, type: true } },
          consignment: { select: { id: true, lrNumber: true } },
        },
      }),
      prisma.bill.count({ where }),
    ])

    return ok({
      items: items.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        billDate: b.billDate,
        dueDate: b.dueDate,
        party: b.party,
        consignment: b.consignment,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        outstanding: b.totalAmount - b.paidAmount,
        status: b.status,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/bills GET]", e)
    return err("Server error", 500)
  }
}
