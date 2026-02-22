import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BUCKET = "tms-documents"
const MAX_PDF_BYTES = 10 * 1024 * 1024  // 10 MB

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file     = formData.get("file") as File | null
    const folder   = (formData.get("folder") as string | null) ?? "misc"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    // Size guard for PDFs (images are pre-compressed client-side)
    if (file.type === "application/pdf" && file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be under 10 MB" }, { status: 400 })
    }

    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin"
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `${folder}/${name}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 })
  }
}
