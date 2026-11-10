import { decodeText, readDelimitedText } from "./csv";
import { readHtmlTables, readSpreadsheetMl } from "./markup";
import { ImportFileError, LIMITS, type Workbook } from "./types";
import { isCfb, readXls } from "./xls";
import { readXlsx } from "./xlsx";
import { isZip } from "./zip";

export const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt", ".xls", ".xlsx", ".xlsm"];
export const ACCEPT_ATTR =
  ".csv,.tsv,.txt,.xls,.xlsx,.xlsm,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Reads any supported spreadsheet. The format is detected from the file's
 * magic bytes — never trusted from the extension — so a CSV renamed to .xls
 * or an HTML table saved as .xls still opens correctly.
 */
export async function readSpreadsheet(buffer: ArrayBuffer, fileName = ""): Promise<Workbook> {
  if (buffer.byteLength === 0) throw new ImportFileError("This file is empty.");
  if (buffer.byteLength > LIMITS.maxFileBytes) {
    throw new ImportFileError(
      `This file is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB. The limit is ${LIMITS.maxFileBytes / 1024 / 1024} MB — split it into smaller files.`,
    );
  }
  const bytes = new Uint8Array(buffer);

  if (isZip(bytes)) return readXlsx(bytes);
  if (isCfb(bytes)) return readXls(bytes);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    throw new ImportFileError("That's a PDF. Export your product list as CSV or Excel instead.");
  }

  const text = decodeText(bytes);
  return readText(text, fileName);
}

/** Text that was pasted (e.g. cells copied from Excel / Google Sheets). */
export function readPastedText(text: string): Workbook {
  const wb = readText(text, "pasted.tsv");
  return { ...wb, format: "paste" };
}

function readText(text: string, fileName: string): Workbook {
  const head = text.slice(0, 4096).trimStart().toLowerCase();

  if (head.startsWith("<?xml") || head.startsWith("<workbook")) {
    if (head.includes("urn:schemas-microsoft-com:office:spreadsheet") || head.includes("<workbook")) {
      const sheets = readSpreadsheetMl(text);
      if (sheets.length) return { format: "xml", sheets };
    }
  }
  if (head.startsWith("<") && /<table[\s>]/i.test(text.slice(0, 500_000))) {
    const sheets = readHtmlTables(text);
    if (sheets.length) return { format: "html", sheets };
  }
  if (head.startsWith("<")) {
    throw new ImportFileError("This file doesn't contain a table we can read. Upload a CSV, XLS or XLSX file.");
  }

  const { rows, delimiter, truncated } = readDelimitedText(text, fileName);
  return {
    format: delimiter === "\t" ? "tsv" : "csv",
    sheets: [{ name: fileName.replace(/\.[^.]+$/, "") || "Sheet 1", rows, truncated }],
  };
}
