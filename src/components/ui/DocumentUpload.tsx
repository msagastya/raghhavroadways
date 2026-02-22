"use client"

import { useRef, useState } from "react"
import { Upload, X, FileText, Eye, Loader2 } from "lucide-react"

interface Props {
  label:    string
  value:    string   // current URL
  folder:   string   // storage sub-folder
  accept?:  string
  onUpload: (url: string) => void
  onRemove: () => void
}

/** Compress an image client-side via Canvas, returns JPEG File */
async function compressImage(file: File, maxWidth = 1400, quality = 0.72): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width  = maxWidth
      }
      const canvas = document.createElement("canvas")
      canvas.width  = width
      canvas.height = height
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
        },
        "image/jpeg",
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")) }
    img.src = url
  })
}

function isImage(file: File) { return file.type.startsWith("image/") }

export default function DocumentUpload({ label, value, folder, accept = "image/*,.pdf", onUpload, onRemove }: Props) {
  const inputRef           = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]  = useState("")

  async function handleFile(file: File) {
    setError("")
    setUploading(true)
    try {
      let toUpload = file

      if (isImage(file)) {
        toUpload = await compressImage(file)
      } else if (file.type === "application/pdf" && file.size > 10 * 1024 * 1024) {
        setError("PDF must be under 10 MB")
        setUploading(false)
        return
      }

      const fd = new FormData()
      fd.append("file",   toUpload)
      fd.append("folder", folder)

      const res  = await fetch("/api/upload", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Upload failed"); return }
      onUpload(json.url)
    } catch (e: any) {
      setError(e.message ?? "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const fileName = value ? value.split("/").pop()?.split("?")[0] ?? "document" : ""
  const isPdf    = value.toLowerCase().includes(".pdf")

  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
             style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.10)" }}>
          <FileText size={16} className="text-brand-700 shrink-0" />
          <span className="text-[12.5px] font-medium text-brand-900 flex-1 truncate">{decodeURIComponent(fileName)}</span>
          <a href={value} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:text-brand-900 px-2 py-1 rounded-lg hover:bg-brand-900/5">
            <Eye size={13} /> View
          </a>
          <button type="button" onClick={onRemove}
                  className="text-brand-900/30 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl cursor-pointer transition-colors py-5"
          style={{ border: "1.5px dashed rgba(13,43,26,0.18)", background: "rgba(13,43,26,0.02)" }}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="text-brand-700 animate-spin" />
              <p className="text-[12px] text-brand-900/50">Uploading &amp; compressing…</p>
            </>
          ) : (
            <>
              <Upload size={18} className="text-brand-900/30" />
              <p className="text-[12.5px] font-medium text-brand-900/50">Click or drag to upload</p>
              <p className="text-[11px] text-brand-900/30">Images compressed automatically · PDF max 10 MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[11.5px] text-red-500 mt-1.5">{error}</p>}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}
