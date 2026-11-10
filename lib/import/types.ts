/**
 * Shared types + hard limits for the spreadsheet importer.
 *
 * Everything under lib/import is pure TypeScript with zero runtime
 * dependencies, so it runs identically in the browser (where parsing
 * happens, for an instant preview) and in Node (tests / server checks).
 */

export type CellValue = string | number | boolean | null;

export interface Sheet {
  name: string;
  /** Rows of cells. Rows may have different lengths; missing cells are null. */
  rows: CellValue[][];
  hidden?: boolean;
  /** True when the sheet had more rows than LIMITS.maxRows and was cut. */
  truncated?: boolean;
}

export type SpreadsheetFormat = "csv" | "tsv" | "xlsx" | "xls" | "html" | "xml" | "paste";

export interface Workbook {
  format: SpreadsheetFormat;
  sheets: Sheet[];
}

/** An error whose message is safe and helpful to show to the admin as-is. */
export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

export const LIMITS = {
  /** Largest file accepted from the picker. */
  maxFileBytes: 15 * 1024 * 1024,
  /** Rows read per sheet (header included). */
  maxRows: 10_000,
  /** Columns read per row. */
  maxCols: 200,
  /** Zip-bomb guard: total bytes we are willing to inflate from an .xlsx. */
  maxUnzippedBytes: 120 * 1024 * 1024,
  /** Excel's own per-cell limit. */
  maxCellChars: 32_767,
} as const;
