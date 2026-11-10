import { openZip } from "./zip";
import { attrByLocal, decodeOoxmlEscapes, parseAttrs, walkXml } from "./xml";
import { ImportFileError, LIMITS, type CellValue, type Sheet, type Workbook } from "./types";

/**
 * Reads .xlsx / .xlsm workbooks (Office Open XML).
 * Follows the package relationships instead of guessing part names, so files
 * written by Excel, Google Sheets, Numbers, LibreOffice, WPS or OpenXML SDK
 * (which uses `x:` prefixed tags) all resolve correctly.
 */
export async function readXlsx(bytes: Uint8Array): Promise<Workbook> {
  const zip = openZip(bytes, LIMITS.maxUnzippedBytes);

  if (zip.has("mimetype") && !zip.has("[Content_Types].xml")) {
    throw new ImportFileError(
      "OpenDocument (.ods) files aren't supported yet. Save it as .xlsx or .csv and try again.",
    );
  }
  if (zip.has("index.xml") || zip.names.some((n) => n.toLowerCase().startsWith("index/"))) {
    throw new ImportFileError(
      "Apple Numbers files aren't supported. In Numbers choose File → Export To → Excel or CSV.",
    );
  }

  // 1. Locate the workbook part via the root relationships.
  let workbookPath = "xl/workbook.xml";
  const rootRels = await zip.readText("_rels/.rels");
  if (rootRels) {
    for (const r of parseRels(rootRels, "")) {
      if (r.type.endsWith("/officeDocument")) workbookPath = r.target;
    }
  }
  const workbookXml = await zip.readText(workbookPath);
  if (!workbookXml) throw new ImportFileError("This file isn't a valid Excel workbook.");

  const wbDir = workbookPath.includes("/") ? workbookPath.slice(0, workbookPath.lastIndexOf("/") + 1) : "";
  const wbRelsPath = `${wbDir}_rels/${workbookPath.slice(wbDir.length)}.rels`;
  const wbRels = parseRels((await zip.readText(wbRelsPath)) ?? "", wbDir);
  const relTarget = new Map(wbRels.map((r) => [r.id, r.target]));

  // 2. Shared strings (optional part).
  const sstRel = wbRels.find((r) => r.type.endsWith("/sharedStrings"));
  const sstXml = await zip.readText(sstRel?.target ?? `${wbDir}sharedStrings.xml`);
  const shared = sstXml ? parseSharedStrings(sstXml) : [];

  // 3. Sheets in workbook order.
  const sheetRefs: { name: string; target?: string; hidden: boolean }[] = [];
  walkXml(workbookXml, {
    open(name, raw) {
      if (name !== "sheet") return;
      const a = parseAttrs(raw);
      const rid = attrByLocal(a, "id");
      sheetRefs.push({
        name: a["name"] ?? `Sheet ${sheetRefs.length + 1}`,
        target: rid ? relTarget.get(rid) : undefined,
        hidden: a["state"] === "hidden" || a["state"] === "veryhidden",
      });
    },
  });

  const sheets: Sheet[] = [];
  for (const ref of sheetRefs) {
    if (!ref.target) continue;
    const xml = await zip.readText(ref.target);
    if (!xml) continue; // chartsheets / dialog sheets have no cell data
    const { rows, truncated } = parseWorksheet(xml, shared);
    sheets.push({ name: ref.name, rows, hidden: ref.hidden, truncated });
  }

  if (sheets.length === 0) throw new ImportFileError("This workbook doesn't contain any worksheets.");
  return { format: "xlsx", sheets };
}

interface Rel {
  id: string;
  type: string;
  target: string;
}

function parseRels(xml: string, baseDir: string): Rel[] {
  const out: Rel[] = [];
  walkXml(xml, {
    open(name, raw) {
      if (name !== "relationship") return;
      const a = parseAttrs(raw);
      if ((a["targetmode"] ?? "").toLowerCase() === "external") return;
      const target = a["target"] ?? "";
      out.push({ id: a["id"] ?? "", type: a["type"] ?? "", target: resolvePath(baseDir, target) });
    },
  });
  return out;
}

function resolvePath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (baseDir + target).split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "..") stack.pop();
    else if (p !== "." && p !== "") stack.push(p);
  }
  return stack.join("/");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  let current = "";
  let inSi = false;
  let inT = false;
  let phoneticDepth = 0; // ignore <rPh> (furigana) runs
  walkXml(xml, {
    open(name, _raw, self) {
      if (name === "si") {
        inSi = true;
        current = "";
        if (self) {
          out.push("");
          inSi = false;
        }
      } else if (name === "rph") {
        if (!self) phoneticDepth++;
      } else if (name === "t" && inSi && !self) {
        inT = true;
      }
    },
    close(name) {
      if (name === "si") {
        out.push(decodeOoxmlEscapes(current));
        inSi = false;
      } else if (name === "rph") {
        phoneticDepth = Math.max(0, phoneticDepth - 1);
      } else if (name === "t") {
        inT = false;
      }
    },
    text(t) {
      if (inT && phoneticDepth === 0) current += t;
    },
  });
  return out;
}

function colIndex(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
    else if (c >= 97 && c <= 122) n = n * 26 + (c - 96);
    else break;
  }
  return n - 1;
}

function parseWorksheet(xml: string, shared: string[]): { rows: CellValue[][]; truncated: boolean } {
  const rows: CellValue[][] = [];
  let truncated = false;

  let rowIdx = -1;
  let nextRowIdx = 0;
  let colIdx = -1;
  let cellType = "";
  let value = "";
  let inlineText = "";
  let capture: "v" | "t" | null = null;
  let inCell = false;
  let inInline = false;
  let stop = false;

  walkXml(xml, {
    open(name, raw, self) {
      if (stop) return;
      switch (name) {
        case "row": {
          const a = parseAttrs(raw);
          const r = a["r"] ? parseInt(a["r"], 10) - 1 : nextRowIdx;
          rowIdx = Number.isFinite(r) && r >= 0 ? r : nextRowIdx;
          nextRowIdx = rowIdx + 1;
          colIdx = -1;
          if (rowIdx >= LIMITS.maxRows) {
            truncated = true;
            stop = true;
          }
          break;
        }
        case "c": {
          const a = parseAttrs(raw);
          colIdx = a["r"] ? colIndex(a["r"]) : colIdx + 1;
          cellType = a["t"] ?? "n";
          value = "";
          inlineText = "";
          inCell = !self;
          break;
        }
        case "v":
          if (inCell && !self) capture = "v";
          break;
        case "is":
          if (inCell) inInline = !self;
          break;
        case "t":
          if (inInline && !self) capture = "t";
          break;
      }
    },
    close(name) {
      if (stop) return;
      if (name === "v" || name === "t") capture = null;
      else if (name === "is") inInline = false;
      else if (name === "c" && inCell) {
        inCell = false;
        if (rowIdx < 0 || colIdx < 0 || colIdx >= LIMITS.maxCols) return;
        const cell = toCell(cellType, value, inlineText, shared);
        if (cell === null) return;
        const row = (rows[rowIdx] ??= []);
        row[colIdx] = cell;
      }
    },
    text(t) {
      if (capture === "v") value += t;
      else if (capture === "t") inlineText += t;
    },
  });

  // Fill holes so consumers can rely on dense arrays.
  const dense: CellValue[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const src = rows[r];
    if (!src) {
      dense.push([]);
      continue;
    }
    const out: CellValue[] = new Array(src.length);
    for (let c = 0; c < src.length; c++) out[c] = src[c] ?? null;
    dense.push(out);
  }
  return { rows: dense, truncated };
}

function toCell(type: string, v: string, inline: string, shared: string[]): CellValue {
  switch (type) {
    case "s": {
      const i = parseInt(v, 10);
      const s = Number.isFinite(i) ? shared[i] : undefined;
      return s === undefined || s === "" ? null : s;
    }
    case "inlineStr":
    case "inlinestr": {
      const s = decodeOoxmlEscapes(inline || v);
      return s === "" ? null : s;
    }
    case "str": {
      const s = decodeOoxmlEscapes(v);
      return s === "" ? null : s;
    }
    case "b":
      return v.trim() === "1" || v.trim().toLowerCase() === "true";
    case "e":
      return null; // #N/A, #REF! … treat as empty
    case "d":
      return v || null;
    default: {
      if (v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    }
  }
}
