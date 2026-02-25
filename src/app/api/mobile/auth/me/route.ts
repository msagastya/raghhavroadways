import { NextRequest } from "next/server"
import { requireMobileAuth, ok } from "@/lib/mobile-auth"

// GET /api/mobile/auth/me
export async function GET(req: NextRequest) {
  try {
    const user = await requireMobileAuth(req)
    return ok({ user })
  } catch (e) {
    if (e instanceof Response) return e
    return Response.json({ error: "Server error" }, { status: 500 })
  }
}
