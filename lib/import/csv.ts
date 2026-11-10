import { ImportFileError, LIMITS, type CellValue } from "./types";

/**
 * Decodes raw bytes from a text spreadsheet export.
 * Handles UTF-8 (with/without BOM), UTF-16 LE/BE (Excel "Unicode Text"),
 * and falls back to Windows-1252 for legacy Excel CSVs saved on Windows.
 */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  // UTF-16 without a BOM: every other byte is NUL for ASCII-heavy text.
  if (bytes.length >= 4 && bytes[1] === 0 && bytes[3] === 0 && bytes[0] !== 0) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * RFC 4180 parser, made forgiving for real-world exports:
 * - quoted fields may contain delimiters, quotes ("") and newlines
 * - a quote in the middle of an unquoted field is literal (e.g. `14" MacBook`)
 * - CRLF, LF and lone CR line endings
 */
export function parseDelimited(
  text: string,
  delimiter: string,
  maxRows: number = LIMITS.maxRows,
): { rows: string[][]; truncated: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    let value: string;

    if (text.charCodeAt(i) === 34 /* " */) {
      // Quoted field
      i++;
      let buf = "";
      let start = i;
      for (;;) {
        const q = text.indexOf('"', i);
        if (q === -1) {
          // unterminated quote: take the rest of the file
          buf += text.slice(start);
          i = n;
          break;
        }
        if (text.charCodeAt(q + 1) === 34) {
          buf += text.slice(start, q + 1);
          i = q + 2;
          start = i;
          continue;
        }
        buf += text.slice(start, q);
        i = q + 1;
        break;
      }
      // Lenient: keep any stray characters between the closing quote and the delimiter
      let tail = i;
      while (tail < n) {
        const c = text[tail];
        if (c === delimiter || c === "\n" || c === "\r") break;
        tail++;
      }
      if (tail > i) buf += text.slice(i, tail);
      i = tail;
      value = buf;
    } else {
      let end = i;
      while (end < n) {
        const c = text[end];
        if (c === delimiter || c === "\n" || c === "\r") break;
        end++;
      }
      value = text.slice(i, end);
      i = end;
    }

    if (row.length < LIMITS.maxCols) {
      row.push(value.length > LIMITS.maxCellChars ? value.slice(0, LIMITS.maxCellChars) : value);
    }

    if (i >= n) {
      rows.push(row);
      break;
    }
    const c = text[i];
    if (c === delimiter) {
      i++;
      if (i >= n) {
        row.push("");
        rows.push(row);
      }
      continue;
    }
    // newline
    rows.push(row);
    row = [];
    if (c === "\r" && text[i + 1] === "\n") i += 2;
    else i++;
    if (rows.length >= maxRows) {
      return { rows, truncated: i < n && text.slice(i).trim().length > 0 };
    }
  }

  return { rows, truncated: false };
}

const CANDIDATES = [",", ";", "\t", "|"] as const;

/** Picks the delimiter that yields the most consistent multi-column rows. */
export function sniffDelimiter(text: string, hint?: string): string {
  const sample = text.slice(0, 64 * 1024);
  let best = hint ?? ",";
  let bestScore = 0;

  for (const d of CANDIDATES) {
    const { rows } = parseDelimited(sample, d, 30);
    const lens = rows.filter((r) => r.some((c) => c.trim() !== "")).map((r) => r.length);
    if (lens.length === 0) continue;
    const freq = new Map<number, number>();
    for (const l of lens) freq.set(l, (freq.get(l) ?? 0) + 1);
    let mode = 1;
    let modeCount = 0;
    for (const [len, count] of freq) {
      if (count > modeCount || (count === modeCount && len > mode)) {
        mode = len;
        modeCount = count;
      }
    }
    if (mode < 2) continue;
    // reward wide, consistent tables; small bonus for the extension hint
    const score = mode * (modeCount / lens.length) + (d === hint ? 0.25 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Parses CSV/TSV/pasted text into a grid. */
export function readDelimitedText(
  text: string,
  fileName = "",
): { rows: CellValue[][]; delimiter: string; truncated: boolean } {
  if (text.indexOf("\u0000") !== -1 && /\u0000{4,}/.test(text.slice(0, 2048))) {
    throw new ImportFileError(
      "This file doesn't look like a spreadsheet. Upload a CSV, XLS or XLSX file.",
    );
  }

  // Excel's optional "sep=;" first line
  let body = text;
  let forced: string | undefined;
  const sep = /^sep=(.)\r?\n/i.exec(body);
  if (sep) {
    forced = sep[1];
    body = body.slice(sep[0].length);
  }

  const lower = fileName.toLowerCase();
  const hint = lower.endsWith(".tsv") || lower.endsWith(".tab") ? "\t" : undefined;
  const delimiter = forced ?? sniffDelimiter(body, hint);
  const { rows, truncated } = parseDelimited(body, delimiter);
  return { rows, delimiter, truncated };
}

/* ------------------------------------------------------------------ */
/* CSV writing (template, export, issue reports)                       */
/* ------------------------------------------------------------------ */

/**
 * Neutralises spreadsheet formula injection (CWE-1236): cells that start
 * with = + - @ (or a tab/CR) would be executed by Excel/Sheets when the
 * exported file is opened. Prefixing an apostrophe forces them to text.
 * The importer strips that apostrophe again, so exports round-trip.
 */
export function escapeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const out = rows.map((r) =>
    r
      .map((cell) => {
        if (cell === null || cell === undefined) return "";
        const s = typeof cell === "string" ? escapeFormula(cell) : String(cell);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );
  // BOM so Excel opens UTF-8 (₦, accents) correctly; CRLF per RFC 4180
  return "﻿" + out.join("\r\n") + "\r\n";
}
