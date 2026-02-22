"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid email or password")
      } else {
        toast.success("Welcome back!")
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: "#9dbfad",
        backgroundImage: [
          "radial-gradient(ellipse at 3%  96%, rgba(2,8,4,0.96) 0%, transparent 30%)",
          "radial-gradient(ellipse at 97% 97%, rgba(145,108,18,0.92) 0%, transparent 30%)",
          "radial-gradient(ellipse at 90%  4%, rgba(8,40,14,0.88) 0%, transparent 26%)",
          "radial-gradient(ellipse at 4%   4%, rgba(6,22,10,0.85) 0%, transparent 24%)",
          "radial-gradient(ellipse at 50%  50%,rgba(215,245,225,0.55) 0%, transparent 48%)",
        ].join(", "),
      }}
    >

      {/* Login card */}
      <div
        className="glass rounded-3xl w-full max-w-[420px] p-10 animate-fade-up relative"
        style={{ zIndex: 2 }}
      >
        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "#0D2B1A",
              boxShadow: "0 8px 24px rgba(13,43,26,0.30)",
            }}
          >
            <Image
              src="/logo.png"
              alt="Raghhav Roadways"
              width={44}
              height={44}
              className="object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              unoptimized
            />
          </div>

          <h1 className="text-[22px] font-bold text-brand-900 tracking-tight">
            Raghhav Roadways
          </h1>
          <p className="text-[13px] font-semibold tracking-widest uppercase mt-0.5"
             style={{ color: "#C9A84C" }}>
            Transport Management
          </p>
          <p className="text-[13px] text-brand-900/45 mt-3 text-center">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-[12.5px] font-semibold text-brand-900/70 mb-1.5 tracking-wide"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@raghhav.com"
              className="input-field"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[12.5px] font-semibold text-brand-900/70 mb-1.5 tracking-wide"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-900/40 hover:text-brand-900/70 transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={17} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-6"
            style={{ padding: "12px 20px" }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} strokeWidth={2} />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[11.5px] text-brand-900/30 mt-6">
          © {new Date().getFullYear()} Raghhav Roadways. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
