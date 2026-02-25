import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/parties?type=&search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const search = searchParams.get("search") ?? ""
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30"))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isActive: true, deletedAt: null }

    if (type && type !== "ALL") {
      where.type = type
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.party.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          type: true,
          name: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          gstin: true,
          creditDays: true,
          commissionType: true,
          commissionValue: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              consignmentsOrigin: true,
              bills: true,
            },
          },
        },
      }),
      prisma.party.count({ where }),
    ])

    return ok({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/parties GET]", e)
    return err("Server error", 500)
  }
}

// POST /api/mobile/parties
export async function POST(req: NextRequest) {
  try {
    await requireMobileAuth(req)

    const body = await req.json()
    const {
      type, name, phone, altPhone, email,
      address, city, state, pincode,
      gstin, pan, creditDays, creditLimit,
      commissionType, commissionValue, notes,
    } = body ?? {}

    if (!type || !name) return err("Type and name are required")

    const party = await prisma.party.create({
      data: {
        type,
        name,
        phone: phone || null,
        altPhone: altPhone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        gstin: gstin || null,
        pan: pan || null,
        creditDays: creditDays ? parseInt(creditDays) : 45,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        commissionType: commissionType || null,
        commissionValue: commissionValue ? parseFloat(commissionValue) : null,
        notes: notes || null,
      },
    })

    return ok({ party }, 201)
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[mobile/parties POST]", e)
    return err("Server error", 500)
  }
}
