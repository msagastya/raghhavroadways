import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/vehicles?status=&search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") ?? ""
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isActive: true, deletedAt: null }
    if (status && status !== "ALL") where.status = status
    if (search) {
      where.OR = [
        { vehicleNumber: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [items, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { vehicleNumber: "asc" },
        include: {
          owner: { select: { id: true, name: true, phone: true } },
          documents: {
            where: { expiryDate: { lte: thirtyDays } },
            select: { type: true, expiryDate: true },
            orderBy: { expiryDate: "asc" },
          },
          _count: { select: { consignments: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ])

    return ok({
      items: items.map((v) => ({
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        type: v.type,
        capacity: v.capacity,
        status: v.status,
        owner: v.owner,
        expiringDocs: v.documents,
        tripsCount: v._count.consignments,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/vehicles GET]", e)
    return err("Server error", 500)
  }
}
