import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// ─── In-memory rate limiter (per email, resets every 15 min) ──────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = email.toLowerCase()
  const entry = loginAttempts.get(key)

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 })
    return { allowed: true, remaining: 4 }
  }

  if (entry.count >= 5) return { allowed: false, remaining: 0 }

  entry.count++
  return { allowed: true, remaining: 5 - entry.count }
}

function resetRateLimit(email: string) {
  loginAttempts.delete(email.toLowerCase())
}

// ─── NextAuth ─────────────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string

        // Rate limit: max 5 attempts per email per 15 minutes
        const { allowed } = checkRateLimit(email)
        if (!allowed) {
          throw new Error("Too many login attempts. Please try again in 15 minutes.")
        }

        const user = await prisma.user.findUnique({
          where:   { email },
          include: { role: true },
        })

        if (!user || !user.isActive) return null

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) return null

        // Successful login — clear rate limit
        resetRateLimit(email)

        return {
          id:     user.id,
          name:   user.name,
          email:  user.email,
          role:   user.role.name,
          roleId: user.roleId,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id     = user.id
        token.role   = (user as any).role
        token.roleId = (user as any).roleId
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id     = token.id     as string
        session.user.role   = token.role   as string
        session.user.roleId = token.roleId as string
      }
      return session
    },
  },
  pages:     { signIn: "/login" },
  trustHost: true,
})
