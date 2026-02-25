import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/reports?from=&to=
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const { searchParams } = new URL(req.url)
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")

    const now = new Date()
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const to = toStr ? new Date(toStr) : now

    const [
      revenueByMonth,
      topConsignors,
      topRoutes,
      statusBreakdown,
      paymentBreakdown,
      freightTypeBreakdown,
    ] = await Promise.all([
      // Monthly revenue
      prisma.$queryRaw<{ month: string; revenue: number; count: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "bookingDate"), 'Mon YYYY') as month,
          COALESCE(SUM("freightAmount"), 0)::float as revenue,
          COUNT(*)::int as count
        FROM "Consignment"
        WHERE "bookingDate" BETWEEN ${from} AND ${to}
          AND status != 'CANCELLED'
        GROUP BY DATE_TRUNC('month', "bookingDate")
        ORDER BY DATE_TRUNC('month', "bookingDate") ASC
      `,

      // Top consignors by freight
      prisma.consignment.groupBy({
        by: ["consignorId"],
        where: {
          bookingDate: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        _sum: { freightAmount: true },
        _count: true,
        orderBy: { _sum: { freightAmount: "desc" } },
        take: 5,
      }),

      // Top routes
      prisma.$queryRaw<{ route: string; count: number; revenue: number }[]>`
        SELECT
          CONCAT("fromCity", ' → ', "toCity") as route,
          COUNT(*)::int as count,
          COALESCE(SUM("freightAmount"), 0)::float as revenue
        FROM "Consignment"
        WHERE "bookingDate" BETWEEN ${from} AND ${to}
          AND status != 'CANCELLED'
        GROUP BY "fromCity", "toCity"
        ORDER BY count DESC
        LIMIT 5
      `,

      // Status breakdown
      prisma.consignment.groupBy({
        by: ["status"],
        where: { bookingDate: { gte: from, lte: to } },
        _count: true,
      }),

      // Payment type breakdown
      prisma.consignment.groupBy({
        by: ["paymentType"],
        where: {
          bookingDate: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        _count: true,
        _sum: { freightAmount: true },
      }),

      // Freight type breakdown
      prisma.consignment.groupBy({
        by: ["freightType"],
        where: {
          bookingDate: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        _count: true,
        _sum: { freightAmount: true },
      }),
    ])

    // Resolve party names for top consignors
    const consignorIds = topConsignors.map((c) => c.consignorId)
    const parties = await prisma.party.findMany({
      where: { id: { in: consignorIds } },
      select: { id: true, name: true },
    })
    const partyMap = new Map(parties.map((p) => [p.id, p.name]))

    return ok({
      period: { from, to },
      revenueByMonth,
      topConsignors: topConsignors.map((c) => ({
        name: partyMap.get(c.consignorId) ?? "Unknown",
        trips: c._count,
        revenue: c._sum.freightAmount ?? 0,
      })),
      topRoutes,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        type: p.paymentType,
        count: p._count,
        revenue: p._sum.freightAmount ?? 0,
      })),
      freightTypeBreakdown: freightTypeBreakdown.map((f) => ({
        type: f.freightType,
        count: f._count,
        revenue: f._sum.freightAmount ?? 0,
      })),
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/reports GET]", e)
    return err("Server error", 500)
  }
}
