/** Parse a consignment's description field into an array of items.
 *  New format: JSON array string e.g. '["Cotton Bales","Auto Parts"]'
 *  Legacy format: plain string treated as single item.
 */
export function parseDescriptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch {}
  return raw.trim() ? [raw.trim()] : []
}
