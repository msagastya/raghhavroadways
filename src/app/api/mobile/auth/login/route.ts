import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signMobileToken, ok, err } from "@/lib/mobile-auth"

// POST /api/mobile/auth/login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body ?? {}

    if (!email || !password) {
      return err("Email and password are required")
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true },
    })

    if (!user || !user.isActive) {
      return err("Invalid credentials", 401)
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return err("Invalid credentials", 401)
    }

    const token = await signMobileToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      roleId: user.roleId,
    })

    return ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        roleId: user.roleId,
      },
    })
  } catch (e) {
    console.error("[mobile/auth/login]", e)
    return err("Server error", 500)
  }
}
