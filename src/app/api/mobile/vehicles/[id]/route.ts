import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/vehicles/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMobileAuth(req)
    const { id } = await params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, phone: true, altPhone: true } },
        documents: { orderBy: { expiryDate: "asc" } },
        incidents: { orderBy: { date: "desc" }, take: 10 },
        consignments: {
          orderBy: { bookingDate: "desc" },
          take: 10,
          select: {
            id: true,
            lrNumber: true,
            fromCity: true,
            toCity: true,
            bookingDate: true,
            status: true,
            freightAmount: true,
          },
        },
        _count: { select: { consignments: true } },
      },
    })

    if (!vehicle) return err("Vehicle not found", 404)

    const now = new Date()
    const docsWithStatus = vehicle.documents.map((d) => ({
      ...d,
      daysToExpiry: d.expiryDate
        ? Math.ceil((d.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      isExpired: d.expiryDate ? d.expiryDate < now : false,
      isExpiringSoon: d.expiryDate
        ? d.expiryDate >= now &&
          d.expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : false,
    }))

    return ok({
      vehicle: {
        ...vehicle,
        documents: docsWithStatus,
        totalTrips: vehicle._count.consignments,
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/vehicles/[id] GET]", e)
    return err("Server error", 500)
  }
}
