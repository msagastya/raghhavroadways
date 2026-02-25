/**
 * Mobile JWT auth helper for Flutter API routes.
 * Signs and verifies Bearer tokens independently of NextAuth sessions.
 */

import { SignJWT, jwtVerify } from "jose"
import { prisma } from "@/lib/prisma"

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-dev-secret-change-in-prod"
)

const ISSUER = "raghhav-tms-mobile"
const AUDIENCE = "tms-mobile-app"
const EXPIRY = "30d"

export interface MobileTokenPayload {
  sub: string        // user id
  email: string
  name: string
  role: string
  roleId: string
}

/** Sign a JWT for mobile app (30 day expiry) */
export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRY)
    .sign(secret)
}

/** Verify and decode a mobile JWT. Returns payload or null. */
export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    return payload as unknown as MobileTokenPayload
  } catch {
    return null
  }
}

/** Extract Bearer token from Authorization header */
export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

/** Full auth guard: extracts + verifies token, returns user payload or null */
export async function mobileAuth(request: Request): Promise<MobileTokenPayload | null> {
  const authHeader = request.headers.get("authorization")
  const token = extractBearer(authHeader)
  if (!token) return null
  return verifyMobileToken(token)
}

/** Auth guard that throws a 401 Response on failure */
export async function requireMobileAuth(request: Request): Promise<MobileTokenPayload> {
  const payload = await mobileAuth(request)
  if (!payload) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Verify user still active in DB (lightweight check)
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { isActive: true },
  })
  if (!user?.isActive) {
    throw Response.json({ error: "Account disabled" }, { status: 401 })
  }
  return payload
}

/** JSON success response helper */
export function ok(data: unknown, status = 200) {
  return Response.json(data, { status })
}

/** JSON error response helper */
export function err(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}
