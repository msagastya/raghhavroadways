import { NextRequest } from "next/server"
import { requireMobileAuth, ok, err } from "@/lib/mobile-auth"
import { prisma } from "@/lib/prisma"

// GET /api/mobile/consignments/next-gr
// Returns the predicted next GR/LR number (non-reserving, informational only)
export async function GET(req: NextRequest) {
  try {
    await requireMobileAuth(req)
    const count = await prisma.consignment.count()
    const grNumber = `RR${String(count + 1).padStart(5, "0")}`
    return ok({ grNumber })
  } catch (e) {
    if (e instanceof Response) return e
    return err("Server error", 500)
  }
}
