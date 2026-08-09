export function normalizeOpaqueText(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error("cannot normalize empty text");
  return normalized;
}

/**
 * Capacity units from a device UI are intentionally not converted here.
 * Android labels such as "GB" do not prove either the physical medium or
 * the unit convention; the original value must remain unresolved until a
 * runtime probe validates it.
 */
export function normalizeCapacity(value: string): undefined {
  normalizeOpaqueText(value);
  return undefined;
}

export function normalizeVersion(value: string): string {
  return normalizeOpaqueText(value);
}
