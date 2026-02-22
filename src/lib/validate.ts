// ─── Field validators ─────────────────────────────────────────────────────────
// Each returns an error string or null if valid.

export function validateGSTIN(v?: string | null): string | null {
  if (!v?.trim()) return null
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim().toUpperCase()))
    return "GSTIN must be 15 characters in format 22AAAAA0000A1Z5"
  return null
}

export function validatePAN(v?: string | null): string | null {
  if (!v?.trim()) return null
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.trim().toUpperCase()))
    return "PAN must be 10 characters in format AAAAA0000A"
  return null
}

export function validatePhone(v?: string | null): string | null {
  if (!v?.trim()) return null
  const clean = v.trim().replace(/[\s\-]/g, "")
  if (!/^\d{10}$/.test(clean))
    return "Phone must be a 10-digit number"
  return null
}

export function validatePincode(v?: string | null): string | null {
  if (!v?.trim()) return null
  if (!/^\d{6}$/.test(v.trim()))
    return "Pincode must be exactly 6 digits"
  return null
}

export function validateEwayBill(v?: string | null): string | null {
  if (!v?.trim()) return null
  if (!/^\d{12}$/.test(v.trim()))
    return "E-way bill number must be exactly 12 digits"
  return null
}

export function validateAmount(amount: number, field = "Amount"): string | null {
  if (isNaN(amount) || amount <= 0) return `${field} must be greater than zero`
  if (amount > 50_000_000) return `${field} value seems too large — please verify`
  return null
}

export function validateNonNegative(amount: number, field = "Amount"): string | null {
  if (isNaN(amount) || amount < 0) return `${field} cannot be negative`
  if (amount > 50_000_000) return `${field} value seems too large — please verify`
  return null
}

/** Return the first error found, or null if all pass. */
export function firstError(...checks: (string | null)[]): string | null {
  return checks.find(Boolean) ?? null
}
