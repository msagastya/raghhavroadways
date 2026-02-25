import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/consignments?status=&search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") ?? ""
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status && status !== "ALL") {
      where.status = status
    }

    if (search) {
      where.OR = [
        { lrNumber: { contains: search, mode: "insensitive" } },
        { fromCity: { contains: search, mode: "insensitive" } },
        { toCity: { contains: search, mode: "insensitive" } },
        { consignor: { name: { contains: search, mode: "insensitive" } } },
        { consignee: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.consignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          consignor: { select: { id: true, name: true } },
          consignee: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
          vehicle: { select: { id: true, vehicleNumber: true } },
        },
      }),
      prisma.consignment.count({ where }),
    ])

    return ok({
      items: items.map((c) => ({
        id: c.id,
        lrNumber: c.lrNumber,
        bookingDate: c.bookingDate,
        fromCity: c.fromCity,
        fromState: c.fromState,
        toCity: c.toCity,
        toState: c.toState,
        consignor: c.consignor,
        consignee: c.consignee,
        agent: c.agent,
        vehicle: c.vehicle,
        freightAmount: c.freightAmount,
        paymentType: c.paymentType,
        freightType: c.freightType,
        status: c.status,
        description: c.description,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/consignments GET]", e)
    return err("Server error", 500)
  }
}

// POST /api/mobile/consignments
export async function POST(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const body = await req.json()
    const {
      fromCity, fromState, toCity, toState,
      consignorId, consigneeId, agentId,
      description, freightType, freightAmount, paymentType,
      weight, quantity, unit, declaredValue,
      vehicleId, driverName, driverPhone,
      vehicleFreight, advancePaid,
      ewayBillNumber, invoiceChallanNo, notes,
    } = body ?? {}

    if (!fromCity || !toCity || !consignorId || !consigneeId || !freightAmount || !description) {
      return err("Missing required fields")
    }

    // Generate LR number
    const count = await prisma.consignment.count()
    const lrNumber = `RR${String(count + 1).padStart(5, "0")}`

    const consignment = await prisma.consignment.create({
      data: {
        lrNumber,
        fromCity,
        fromState: fromState ?? "",
        toCity,
        toState: toState ?? "",
        consignorId,
        consigneeId,
        agentId: agentId || null,
        description,
        freightType: freightType ?? "FTL",
        freightAmount: parseFloat(freightAmount),
        paymentType: paymentType ?? "TBB",
        weight: weight ? parseFloat(weight) : null,
        quantity: quantity ? parseInt(quantity) : null,
        unit: unit || null,
        declaredValue: declaredValue ? parseFloat(declaredValue) : null,
        vehicleId: vehicleId || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        vehicleFreight: vehicleFreight ? parseFloat(vehicleFreight) : null,
        advancePaid: advancePaid ? parseFloat(advancePaid) : 0,
        ewayBillNumber: ewayBillNumber || null,
        invoiceChallanNo: invoiceChallanNo || null,
        notes: notes || null,
        status: "BOOKED",
      },
      include: {
        consignor: { select: { name: true } },
        consignee: { select: { name: true } },
      },
    })

    // Create initial status log
    await prisma.consignmentLog.create({
      data: { consignmentId: consignment.id, status: "BOOKED", note: "Consignment created" },
    })

    return ok({ consignment }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/consignments POST]", e)
    return err("Server error", 500)
  }
}
