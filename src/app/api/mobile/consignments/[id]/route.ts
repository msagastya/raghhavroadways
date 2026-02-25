import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/consignments/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMobileAuth(req)
    const { id } = await params

    const c = await prisma.consignment.findUnique({
      where: { id },
      include: {
        consignor: { select: { id: true, name: true, phone: true, city: true } },
        consignee: { select: { id: true, name: true, phone: true, city: true } },
        agent: { select: { id: true, name: true, phone: true } },
        vehicle: {
          include: {
            owner: { select: { id: true, name: true, phone: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        documents: true,
        bills: {
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
            billDate: true,
          },
        },
        vehiclePayments: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    })

    if (!c) return err("Consignment not found", 404)

    return ok({ consignment: c })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/consignments/[id] GET]", e)
    return err("Server error", 500)
  }
}

// PATCH /api/mobile/consignments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMobileAuth(req)
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.consignment.findUnique({ where: { id } })
    if (!existing) return err("Consignment not found", 404)

    const updated = await prisma.consignment.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.vehicleId !== undefined && { vehicleId: body.vehicleId || null }),
        ...(body.driverName !== undefined && { driverName: body.driverName }),
        ...(body.driverPhone !== undefined && { driverPhone: body.driverPhone }),
        ...(body.ewayBillNumber !== undefined && { ewayBillNumber: body.ewayBillNumber }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    if (body.status && body.status !== existing.status) {
      await prisma.consignmentLog.create({
        data: {
          consignmentId: id,
          status: body.status,
          note: body.note ?? null,
        },
      })
    }

    return ok({ consignment: updated })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/consignments/[id] PATCH]", e)
    return err("Server error", 500)
  }
}
