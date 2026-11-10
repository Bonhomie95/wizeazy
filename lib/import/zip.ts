import { ImportFileError } from "./types";

/**
 * Minimal read-only ZIP reader (enough for .xlsx).
 * Inflates with the platform's native DecompressionStream("deflate-raw"),
 * so no JS inflate library ships to the browser. Every entry is size-capped
 * while streaming, which defuses zip bombs regardless of declared sizes.
 */

interface Entry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

export interface ZipArchive {
  names: string[];
  has(name: string): boolean;
  /** Returns the entry's bytes, or null if it doesn't exist. */
  read(name: string): Promise<Uint8Array | null>;
  readText(name: string): Promise<string | null>;
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function openZip(bytes: Uint8Array, maxTotalBytes: number): ZipArchive {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = bytes.byteLength;

  // End of central directory: scan back over a possible archive comment.
  let eocd = -1;
  for (let i = len - 22; i >= Math.max(0, len - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new ImportFileError("This Excel file looks damaged (no zip directory).");

  const total = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (cdOffset === 0xffffffff || total === 0xffff) {
    throw new ImportFileError("This Excel file is too large to read in the browser.");
  }

  const entries = new Map<string, Entry>();
  const decoder = new TextDecoder("utf-8");
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > len || view.getUint32(p, true) !== CEN_SIG) break;
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localHeaderOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen)).replace(/\\/g, "/");
    if (flags & 0x1) {
      throw new ImportFileError("This file is password-protected. Remove the password in Excel and try again.");
    }
    entries.set(name.toLowerCase(), { name, method, compressedSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }

  let inflatedSoFar = 0;

  const read = async (name: string): Promise<Uint8Array | null> => {
    const e = entries.get(name.replace(/^\/+/, "").toLowerCase());
    if (!e) return null;
    const lh = e.localHeaderOffset;
    if (lh + 30 > len || view.getUint32(lh, true) !== LOC_SIG) {
      throw new ImportFileError("This Excel file looks damaged (bad entry header).");
    }
    const start = lh + 30 + view.getUint16(lh + 26, true) + view.getUint16(lh + 28, true);
    const data = bytes.subarray(start, Math.min(len, start + e.compressedSize));
    const budget = maxTotalBytes - inflatedSoFar;
    let out: Uint8Array;
    if (e.method === 0) {
      out = data;
    } else if (e.method === 8) {
      out = await inflateRaw(data, budget);
    } else {
      throw new ImportFileError("This Excel file uses an unsupported compression method.");
    }
    inflatedSoFar += out.byteLength;
    if (inflatedSoFar > maxTotalBytes) {
      throw new ImportFileError("This file is too large once unpacked.");
    }
    return out;
  };

  return {
    names: Array.from(entries.values(), (e) => e.name),
    has: (name) => entries.has(name.replace(/^\/+/, "").toLowerCase()),
    read,
    readText: async (name) => {
      const b = await read(name);
      return b ? decoder.decode(b) : null;
    },
  };
}

async function inflateRaw(data: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new ImportFileError(
      "Your browser can't open .xlsx files. Update it, or save the sheet as CSV.",
    );
  }
  // Copy into a fresh ArrayBuffer-backed view so Blob gets a plain BufferSource.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new ImportFileError("This file is too large once unpacked.");
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ImportFileError) throw err;
    throw new ImportFileError("This Excel file looks damaged and couldn't be unpacked.");
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}
