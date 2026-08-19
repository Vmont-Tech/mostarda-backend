function u32(bytes: Uint8Array, offset: number): number { if (offset + 4 > bytes.length) throw new Error("MP4 header is truncated"); return (((bytes[offset]! << 24) >>> 0) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!) >>> 0; }
function u64(bytes: Uint8Array, offset: number): number { const high = u32(bytes, offset); const low = u32(bytes, offset + 4); const value = high * 0x1_0000_0000 + low; if (!Number.isSafeInteger(value)) throw new Error("MP4 duration is too large"); return value; }
function type(bytes: Uint8Array, offset: number): string { return String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!); }
function mvhd(bytes: Uint8Array, start: number, end: number): { version: number; payload: number; boxEnd: number } | undefined {
  let offset = start;
  while (offset + 8 <= end) { const size32 = u32(bytes, offset); const kind = type(bytes, offset + 4); const header = size32 === 1 ? 16 : 8; const boxEnd = size32 === 0 ? end : offset + (size32 === 1 ? u64(bytes, offset + 8) : size32); if (boxEnd <= offset + header || boxEnd > end) throw new Error("MP4 box is invalid"); if (kind === "mvhd") return { version: bytes[offset + header]!, payload: offset + header, boxEnd }; if (kind === "moov" || kind === "trak") { const nested = mvhd(bytes, offset + header, boxEnd); if (nested) return nested; } offset = boxEnd; }
  return undefined;
}
export function readMp4DurationSeconds(bytes: Uint8Array): number {
  const header = mvhd(bytes, 0, bytes.length); if (!header) throw new Error("MP4 mvhd box is missing");
  const timescale = u32(bytes, header.payload + (header.version === 0 ? 12 : 20)); const duration = header.version === 0 ? u32(bytes, header.payload + 16) : u64(bytes, header.payload + 24);
  if (timescale <= 0 || duration <= 0) throw new Error("MP4 duration must be positive"); return duration / timescale;
}
