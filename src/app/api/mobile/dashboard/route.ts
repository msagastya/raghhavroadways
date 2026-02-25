import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/dashboard
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
      totalConsignments,
      activeConsignments,
      deliveredThisMonth,
      pendingBillsAgg,
      thisMonthRevenue,
      lastMonthRevenue,
      recentConsignments,
      alerts,
      statusBreakdown,
      monthlyRevenue,
    ] = await Promise.all([
      // Total consignments
      prisma.consignment.count({ where: { status: { not: "CANCELLED" } } }),

      // Active (in transit + booked)
      prisma.consignment.count({
        where: { status: { in: ["BOOKED", "IN_TRANSIT"] } },
      }),

      // Delivered this month
      prisma.consignment.count({
        where: {
          status: { in: ["DELIVERED", "BILLED", "PARTIALLY_PAID", "PAID"] },
          updatedAt: { gte: startOfMonth },
        },
      }),

      // Total outstanding bills
      prisma.bill.aggregate({
        where: { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
      }),

      // This month revenue (freight amounts)
      prisma.consignment.aggregate({
        where: {
          bookingDate: { gte: startOfMonth },
          status: { not: "CANCELLED" },
        },
        _sum: { freightAmount: true },
      }),

      // Last month revenue
      prisma.consignment.aggregate({
        where: {
          bookingDate: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { not: "CANCELLED" },
        },
        _sum: { freightAmount: true },
      }),

      // Recent 5 consignments
      prisma.consignment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          consignor: { select: { name: true } },
          consignee: { select: { name: true } },
        },
      }),

      // Alerts: expiring vehicle docs (30 days)
      prisma.vehicleDocument.findMany({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: { vehicle: { select: { vehicleNumber: true } } },
        orderBy: { expiryDate: "asc" },
        take: 10,
      }),

      // Status breakdown for donut chart
      prisma.consignment.groupBy({
        by: ["status"],
        _count: true,
        where: { status: { not: "CANCELLED" } },
      }),

      // Monthly revenue (last 6 months)
      prisma.$queryRaw<{ month: string; total: number }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "bookingDate"), 'Mon') as month,
               COALESCE(SUM("freightAmount"), 0)::float as total
        FROM "Consignment"
        WHERE "bookingDate" >= NOW() - INTERVAL '6 months'
          AND status != 'CANCELLED'
        GROUP BY DATE_TRUNC('month', "bookingDate")
        ORDER BY DATE_TRUNC('month', "bookingDate") ASC
      `,
    ])

    const outstanding =
      (pendingBillsAgg._sum.totalAmount ?? 0) - (pendingBillsAgg._sum.paidAmount ?? 0)

    const thisRevenue = thisMonthRevenue._sum.freightAmount ?? 0
    const lastRevenue = lastMonthRevenue._sum.freightAmount ?? 0
    const revenueGrowth =
      lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue) * 100 : 0

    return ok({
      kpis: {
        totalConsignments,
        activeConsignments,
        deliveredThisMonth,
        outstandingAmount: outstanding,
        pendingBillsCount: pendingBillsAgg._count,
        thisMonthRevenue: thisRevenue,
        lastMonthRevenue: lastRevenue,
        revenueGrowthPercent: Math.round(revenueGrowth * 10) / 10,
      },
      recentConsignments: recentConsignments.map((c) => ({
        id: c.id,
        lrNumber: c.lrNumber,
        fromCity: c.fromCity,
        toCity: c.toCity,
        consignor: c.consignor.name,
        consignee: c.consignee.name,
        freightAmount: c.freightAmount,
        paymentType: c.paymentType,
        status: c.status,
        bookingDate: c.bookingDate,
      })),
      alerts: alerts.map((a) => ({
        vehicleNumber: a.vehicle.vehicleNumber,
        docType: a.type,
        expiryDate: a.expiryDate,
        daysLeft: Math.ceil(
          ((a.expiryDate?.getTime() ?? 0) - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      charts: {
        statusBreakdown: statusBreakdown.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        monthlyRevenue,
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/dashboard]", e)
    return err("Server error", 500)
  }
}
