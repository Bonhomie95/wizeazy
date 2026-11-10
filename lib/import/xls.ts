import { ImportFileError, LIMITS, type CellValue, type Sheet, type Workbook } from "./types";

/**
 * Reader for legacy Excel 97–2003 workbooks (.xls, BIFF8 inside an OLE2
 * Compound File). Written from the [MS-CFB] and [MS-XLS] specs: it only
 * extracts cell values (text, numbers, booleans, cached formula results),
 * which is all an import needs — no formatting, no formulas, no macros.
 *
 * Every chain walk and record read is bounds-checked, so a malformed or
 * hostile file fails fast with a friendly error instead of hanging the tab.
 */

const SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ENDOFCHAIN = 0xfffffffe;
const FREESECT = 0xffffffff;
const NOSTREAM = 0xffffffff;

const damaged = () => new ImportFileError("This .xls file looks damaged and couldn't be read.");

export function isCfb(bytes: Uint8Array): boolean {
  return bytes.length >= 512 && SIG.every((b, i) => bytes[i] === b);
}

/* ------------------------------------------------------------------ */
/* Compound File Binary (OLE2) container                               */
/* ------------------------------------------------------------------ */

interface DirEntry {
  name: string;
  type: number; // 1 storage, 2 stream, 5 root
  left: number;
  right: number;
  child: number;
  start: number;
  size: number;
}

function readCfbStream(bytes: Uint8Array, wanted: string[]): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = bytes.byteLength;
  const major = view.getUint16(26, true);
  const sectorShift = view.getUint16(30, true);
  const miniShift = view.getUint16(32, true);
  if ((sectorShift !== 9 && sectorShift !== 12) || miniShift !== 6) throw damaged();

  const sectorSize = 1 << sectorShift;
  const miniSize = 1 << miniShift;
  const firstDirSector = view.getUint32(48, true);
  const miniCutoff = view.getUint32(56, true) || 4096;
  const firstMiniFat = view.getUint32(60, true);
  let difat = view.getUint32(68, true);
  const maxSectors = Math.ceil(len / sectorSize);
  const sectorOffset = (s: number) => (s + 1) * sectorSize;

  // DIFAT → list of FAT sectors
  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) {
    const s = view.getUint32(76 + i * 4, true);
    if (s === FREESECT || s === ENDOFCHAIN) break;
    fatSectors.push(s);
  }
  for (let guard = 0; difat !== ENDOFCHAIN && difat !== FREESECT; guard++) {
    if (guard > maxSectors) throw damaged();
    const off = sectorOffset(difat);
    if (off + sectorSize > len) break;
    const per = sectorSize / 4 - 1;
    for (let i = 0; i < per; i++) {
      const s = view.getUint32(off + i * 4, true);
      if (s !== FREESECT && s !== ENDOFCHAIN) fatSectors.push(s);
    }
    difat = view.getUint32(off + per * 4, true);
  }

  const perSector = sectorSize / 4;
  const fat = new Uint32Array(fatSectors.length * perSector).fill(FREESECT);
  fatSectors.forEach((s, k) => {
    const off = sectorOffset(s);
    if (off + sectorSize > len) return;
    for (let i = 0; i < perSector; i++) fat[k * perSector + i] = view.getUint32(off + i * 4, true);
  });

  const walk = (start: number, table: Uint32Array): number[] => {
    const out: number[] = [];
    let s = start;
    while (s !== ENDOFCHAIN && s !== FREESECT && s < table.length) {
      if (out.length > table.length) throw damaged(); // cycle
      out.push(s);
      s = table[s];
    }
    return out;
  };

  const readChain = (start: number, size?: number): Uint8Array => {
    const secs = walk(start, fat);
    const buf = new Uint8Array(secs.length * sectorSize);
    secs.forEach((s, i) => {
      const off = sectorOffset(s);
      if (off < len) buf.set(bytes.subarray(off, Math.min(off + sectorSize, len)), i * sectorSize);
    });
    return size === undefined ? buf : buf.subarray(0, Math.min(size, buf.length));
  };

  // Directory entries (128 bytes each)
  const dir = readChain(firstDirSector);
  const dv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  const entries: DirEntry[] = [];
  for (let off = 0; off + 128 <= dir.length; off += 128) {
    const nameLen = Math.min(64, dv.getUint16(off + 64, true));
    let name = "";
    for (let i = 0; i + 1 < nameLen - 1; i += 2) {
      const c = dv.getUint16(off + i, true);
      if (c === 0) break;
      name += String.fromCharCode(c);
    }
    const sizeLow = dv.getUint32(off + 120, true);
    const sizeHigh = dv.getUint32(off + 124, true);
    entries.push({
      name,
      type: dir[off + 66],
      left: dv.getUint32(off + 68, true),
      right: dv.getUint32(off + 72, true),
      child: dv.getUint32(off + 76, true),
      start: dv.getUint32(off + 116, true),
      size: major === 3 ? sizeLow : sizeLow + sizeHigh * 2 ** 32,
    });
  }
  const root = entries[0];
  if (!root || root.type !== 5) throw damaged();

  // Prefer streams that are direct children of the root storage.
  const direct: DirEntry[] = [];
  const stack = [root.child];
  for (let guard = 0; stack.length; guard++) {
    if (guard > entries.length * 3) break;
    const id = stack.pop()!;
    if (id === NOSTREAM || id >= entries.length) continue;
    const e = entries[id];
    direct.push(e);
    stack.push(e.left, e.right);
  }
  const match = (e: DirEntry) => e.type === 2 && wanted.includes(e.name.toLowerCase());
  const target = direct.find(match) ?? entries.find(match);
  if (!target) return null;

  if (target.size >= miniCutoff) return readChain(target.start, target.size);

  // Small streams live in the mini stream (64-byte sectors)
  const miniStream = readChain(root.start, root.size);
  const mfBytes = readChain(firstMiniFat);
  const mfView = new DataView(mfBytes.buffer, mfBytes.byteOffset, mfBytes.byteLength);
  const miniFat = new Uint32Array(Math.floor(mfBytes.length / 4));
  for (let i = 0; i < miniFat.length; i++) miniFat[i] = mfView.getUint32(i * 4, true);
  const secs = walk(target.start, miniFat);
  const buf = new Uint8Array(secs.length * miniSize);
  secs.forEach((s, i) => buf.set(miniStream.subarray(s * miniSize, (s + 1) * miniSize), i * miniSize));
  return buf.subarray(0, Math.min(target.size, buf.length));
}

/* ------------------------------------------------------------------ */
/* BIFF8 records                                                       */
/* ------------------------------------------------------------------ */

const R = {
  BOF: 0x0809,
  EOF: 0x000a,
  FILEPASS: 0x002f,
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  CONTINUE: 0x003c,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  RSTRING: 0x00d6,
  NUMBER: 0x0203,
  RK: 0x027e,
  MULRK: 0x00bd,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,
} as const;

function decodeChars(data: Uint8Array, pos: number, count: number, high: boolean): string {
  let s = "";
  const CHUNK = 4096;
  if (high) {
    for (let i = 0; i < count; i += CHUNK) {
      const n = Math.min(CHUNK, count - i);
      const codes = new Array<number>(n);
      for (let j = 0; j < n; j++) {
        const p = pos + (i + j) * 2;
        codes[j] = data[p] | (data[p + 1] << 8);
      }
      s += String.fromCharCode.apply(null, codes);
    }
  } else {
    for (let i = 0; i < count; i += CHUNK) {
      const n = Math.min(CHUNK, count - i);
      s += String.fromCharCode.apply(null, Array.from(data.subarray(pos + i, pos + i + n)));
    }
  }
  return s;
}

/**
 * Reads unicode strings that may be split across CONTINUE records.
 * When a string's character data spans a boundary, the next segment begins
 * with a fresh option byte (fHighByte) — the classic BIFF8 SST gotcha.
 */
class SegmentReader {
  private seg = 0;
  private pos = 0;
  constructor(private readonly segments: Uint8Array[]) {}

  private get data(): Uint8Array | undefined {
    return this.segments[this.seg];
  }
  private settle() {
    while (this.data && this.pos >= this.data.length) {
      this.seg++;
      this.pos = 0;
    }
  }
  get done(): boolean {
    this.settle();
    return !this.data;
  }
  u8(): number {
    this.settle();
    const d = this.data;
    if (!d) throw damaged();
    return d[this.pos++];
  }
  u16(): number {
    return this.u8() | (this.u8() << 8);
  }
  u32(): number {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(n: number) {
    while (n > 0) {
      this.settle();
      const d = this.data;
      if (!d) return;
      const take = Math.min(n, d.length - this.pos);
      this.pos += take;
      n -= take;
    }
  }
  /** XLUnicodeRichExtendedString (SST entries, STRING records). */
  unicodeString(): string {
    const cch = this.u16();
    const flags = this.u8();
    let high = (flags & 0x01) === 1;
    const runs = flags & 0x08 ? this.u16() : 0;
    const ext = flags & 0x04 ? this.u32() : 0;
    let s = "";
    let remaining = cch;
    while (remaining > 0) {
      let d = this.data;
      if (!d) break;
      if (this.pos >= d.length) {
        this.seg++;
        this.pos = 0;
        d = this.data;
        if (!d) break;
        high = (d[this.pos++] & 0x01) === 1;
        continue;
      }
      const width = high ? 2 : 1;
      const take = Math.min(remaining, Math.floor((d.length - this.pos) / width));
      if (take === 0) {
        this.pos = d.length;
        continue;
      }
      s += decodeChars(d, this.pos, take, high);
      this.pos += take * width;
      remaining -= take;
    }
    this.skip(runs * 4);
    this.skip(ext);
    return s;
  }
}

function shortString(data: Uint8Array, pos: number): string {
  const cch = data[pos];
  const high = (data[pos + 1] & 0x01) === 1;
  const available = Math.floor((data.length - pos - 2) / (high ? 2 : 1));
  return decodeChars(data, pos + 2, Math.min(cch, Math.max(0, available)), high);
}

function xlString(data: Uint8Array, pos: number): string {
  if (pos + 3 > data.length) return "";
  const cch = data[pos] | (data[pos + 1] << 8);
  const high = (data[pos + 2] & 0x01) === 1;
  const available = Math.floor((data.length - pos - 3) / (high ? 2 : 1));
  return decodeChars(data, pos + 3, Math.min(cch, Math.max(0, available)), high);
}

function decodeRk(rk: number): number {
  let v: number;
  if (rk & 0x02) {
    v = rk >> 2; // signed 30-bit integer
  } else {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(4, (rk & 0xfffffffc) >>> 0, true);
    v = dv.getFloat64(0, true);
  }
  return rk & 0x01 ? v / 100 : v;
}

export function readXls(bytes: Uint8Array): Workbook {
  const stream = readCfbStream(bytes, ["workbook", "book"]);
  if (!stream) {
    throw new ImportFileError(
      "This looks like an Office file but not an Excel workbook. Upload a CSV, XLS or XLSX file.",
    );
  }
  const sv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const slen = stream.byteLength;

  const recAt = (pos: number) => {
    if (pos + 4 > slen) return null;
    const type = sv.getUint16(pos, true);
    const size = sv.getUint16(pos + 2, true);
    const start = pos + 4;
    const end = Math.min(start + size, slen);
    return { type, start, end, next: start + size, data: stream.subarray(start, end) };
  };

  const bof = recAt(0);
  if (!bof || bof.type !== R.BOF) {
    throw new ImportFileError("This .xls file uses a very old Excel format. Re-save it as .xlsx or CSV.");
  }
  const version = bof.end - bof.start >= 2 ? sv.getUint16(bof.start, true) : 0;
  if (version !== 0x0600) {
    throw new ImportFileError(
      "This .xls was saved in an old Excel 5/95 format. Open it and save as .xlsx or CSV, then try again.",
    );
  }

  // ---- workbook globals ----
  const sheetsMeta: { name: string; pos: number; hidden: boolean; kind: number }[] = [];
  let sst: string[] = [];
  let pos = bof.next;
  for (let guard = 0; ; guard++) {
    const r = recAt(pos);
    if (!r || guard > 2_000_000) break;
    if (r.type === R.EOF) break;
    if (r.type === R.FILEPASS) {
      throw new ImportFileError("This file is password-protected. Remove the password in Excel and try again.");
    }
    if (r.type === R.BOUNDSHEET && r.end - r.start >= 8) {
      sheetsMeta.push({
        pos: sv.getUint32(r.start, true),
        hidden: stream[r.start + 4] !== 0,
        kind: stream[r.start + 5],
        name: shortString(stream.subarray(0, r.end), r.start + 6),
      });
    } else if (r.type === R.SST && r.end - r.start >= 8) {
      const unique = sv.getUint32(r.start + 4, true);
      const segments = [stream.subarray(r.start + 8, r.end)];
      let next = r.next;
      for (;;) {
        const c = recAt(next);
        if (!c || c.type !== R.CONTINUE) break;
        segments.push(c.data);
        next = c.next;
      }
      sst = readSst(segments, unique);
      pos = next;
      continue;
    }
    pos = r.next;
  }

  // ---- worksheets ----
  const sheets: Sheet[] = [];
  for (const meta of sheetsMeta) {
    if (meta.kind !== 0) continue; // skip charts, macro sheets
    const first = recAt(meta.pos);
    if (!first || first.type !== R.BOF) continue;
    const { rows, truncated } = readSheetCells(stream, sv, meta.pos, recAt, sst);
    sheets.push({ name: meta.name || `Sheet ${sheets.length + 1}`, rows, hidden: meta.hidden, truncated });
  }
  if (sheets.length === 0) throw new ImportFileError("This workbook doesn't contain any worksheets.");
  return { format: "xls", sheets };
}

function readSst(segments: Uint8Array[], count: number): string[] {
  const reader = new SegmentReader(segments);
  const out: string[] = [];
  const max = Math.min(count, 5_000_000);
  try {
    for (let i = 0; i < max && !reader.done; i++) out.push(reader.unicodeString());
  } catch {
    // keep whatever decoded cleanly
  }
  return out;
}

type RecAt = (pos: number) => {
  type: number;
  start: number;
  end: number;
  next: number;
  data: Uint8Array;
} | null;

function readSheetCells(
  stream: Uint8Array,
  sv: DataView,
  start: number,
  recAt: RecAt,
  sst: string[],
): { rows: CellValue[][]; truncated: boolean } {
  const rows: CellValue[][] = [];
  let truncated = false;
  const put = (r: number, c: number, v: CellValue) => {
    if (v === null || v === "") return;
    if (r >= LIMITS.maxRows) {
      truncated = true;
      return;
    }
    if (c >= LIMITS.maxCols) return;
    (rows[r] ??= [])[c] = v;
  };

  let pendingString: { r: number; c: number } | null = null;
  const first = recAt(start);
  let pos = first ? first.next : stream.length;

  for (let guard = 0; ; guard++) {
    const rec = recAt(pos);
    if (!rec || guard > 5_000_000) break;
    const { type, start: d, end } = rec;
    const size = end - d;
    pos = rec.next;

    if (type === R.EOF) break;
    if (type === R.BOF) {
      // embedded substream (e.g. a chart object) — skip to its EOF
      let depth = 1;
      while (depth > 0) {
        const inner = recAt(pos);
        if (!inner) break;
        if (inner.type === R.BOF) depth++;
        else if (inner.type === R.EOF) depth--;
        pos = inner.next;
      }
      continue;
    }
    if (size < 6 && type !== R.STRING) continue;

    switch (type) {
      case R.LABELSST:
        if (size >= 10) put(sv.getUint16(d, true), sv.getUint16(d + 2, true), sst[sv.getUint32(d + 6, true)] ?? null);
        break;
      case R.LABEL:
      case R.RSTRING:
        put(sv.getUint16(d, true), sv.getUint16(d + 2, true), xlString(stream.subarray(0, end), d + 6));
        break;
      case R.NUMBER:
        if (size >= 14) put(sv.getUint16(d, true), sv.getUint16(d + 2, true), sv.getFloat64(d + 6, true));
        break;
      case R.RK:
        if (size >= 10) put(sv.getUint16(d, true), sv.getUint16(d + 2, true), decodeRk(sv.getInt32(d + 6, true)));
        break;
      case R.MULRK: {
        const r = sv.getUint16(d, true);
        const c0 = sv.getUint16(d + 2, true);
        const n = Math.floor((size - 6) / 6);
        for (let i = 0; i < n; i++) put(r, c0 + i, decodeRk(sv.getInt32(d + 4 + i * 6 + 2, true)));
        break;
      }
      case R.BOOLERR:
        if (size >= 8 && stream[d + 7] === 0) put(sv.getUint16(d, true), sv.getUint16(d + 2, true), stream[d + 6] !== 0);
        break;
      case R.FORMULA: {
        if (size < 14) break;
        const r = sv.getUint16(d, true);
        const c = sv.getUint16(d + 2, true);
        if (stream[d + 12] === 0xff && stream[d + 13] === 0xff) {
          const kind = stream[d + 6];
          if (kind === 0) pendingString = { r, c };
          else if (kind === 1) put(r, c, stream[d + 8] !== 0);
        } else {
          const v = sv.getFloat64(d + 6, true);
          if (Number.isFinite(v)) put(r, c, v);
        }
        break;
      }
      case R.STRING: {
        if (!pendingString) break;
        const segments = [rec.data];
        for (;;) {
          const c = recAt(pos);
          if (!c || c.type !== R.CONTINUE) break;
          segments.push(c.data);
          pos = c.next;
        }
        try {
          put(pendingString.r, pendingString.c, new SegmentReader(segments).unicodeString());
        } catch {
          /* ignore broken cached string */
        }
        pendingString = null;
        break;
      }
    }
  }

  const dense: CellValue[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const src = rows[r];
    const out: CellValue[] = [];
    if (src) for (let c = 0; c < src.length; c++) out[c] = src[c] ?? null;
    dense.push(out);
  }
  return { rows: dense, truncated };
}
