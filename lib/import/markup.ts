import { parseAttrs, walkXml } from "./xml";
import { LIMITS, type CellValue, type Sheet } from "./types";

/**
 * Many web apps "export to Excel" by saving an HTML table (or the old
 * SpreadsheetML 2003 XML) with an .xls extension. Excel opens those happily,
 * so we do too.
 */

/** HTML <table> → rows. Picks the largest table on the page. */
export function readHtmlTables(html: string): Sheet[] {
  const tables: CellValue[][][] = [];
  let depth = 0;
  let table: CellValue[][] | null = null;
  let row: CellValue[] | null = null;
  let cell: string | null = null;
  let span = 1;
  let skip = 0; // inside <script>/<style>

  const endCell = () => {
    if (row && cell !== null) {
      const text = cell.replace(/[ \t\f\v ]+/g, " ").replace(/ *\n */g, "\n").trim();
      row.push(text === "" ? null : text);
      for (let i = 1; i < span && row.length < LIMITS.maxCols; i++) row.push(null);
    }
    cell = null;
    span = 1;
  };
  const endRow = () => {
    endCell();
    if (table && row && table.length < LIMITS.maxRows) table.push(row);
    row = null;
  };

  walkXml(html, {
    open(name, raw, self) {
      if (name === "script" || name === "style") {
        if (!self) skip++;
        return;
      }
      if (skip) return;
      if (name === "table") {
        depth++;
        if (depth === 1) table = [];
      } else if (depth !== 1) {
        return;
      } else if (name === "tr") {
        endRow();
        row = [];
      } else if (name === "td" || name === "th") {
        if (!row) row = [];
        endCell();
        cell = "";
        const colspan = parseInt(parseAttrs(raw)["colspan"] ?? "1", 10);
        span = Number.isFinite(colspan) ? Math.min(Math.max(colspan, 1), 50) : 1;
      } else if ((name === "br" || name === "p" || name === "div") && cell !== null) {
        cell += "\n";
      }
    },
    close(name) {
      if (name === "script" || name === "style") {
        skip = Math.max(0, skip - 1);
        return;
      }
      if (skip) return;
      if (name === "table") {
        if (depth === 1 && table) {
          endRow();
          tables.push(table);
          table = null;
        }
        depth = Math.max(0, depth - 1);
      } else if (depth === 1) {
        if (name === "tr") endRow();
        else if (name === "td" || name === "th") endCell();
      }
    },
    text(t) {
      if (!skip && cell !== null) cell += t;
    },
  });

  return tables
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length)
    .map((rows, i) => ({ name: i === 0 ? "Table" : `Table ${i + 1}`, rows }));
}

/** SpreadsheetML 2003 (`<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">`). */
export function readSpreadsheetMl(xml: string): Sheet[] {
  const sheets: Sheet[] = [];
  let current: Sheet | null = null;
  let row: CellValue[] | null = null;
  let col = 0;
  let cellType = "String";
  let data: string | null = null;
  let mergeAcross = 0;

  walkXml(xml, {
    open(name, raw, self) {
      if (name === "worksheet") {
        const a = parseAttrs(raw);
        current = { name: a["ss:name"] ?? a["name"] ?? `Sheet ${sheets.length + 1}`, rows: [] };
      } else if (name === "row" && current) {
        const a = parseAttrs(raw);
        const index = parseInt(a["ss:index"] ?? a["index"] ?? "", 10);
        if (Number.isFinite(index)) while (current.rows.length < index - 1) current.rows.push([]);
        row = [];
        col = 0;
        if (self) {
          current.rows.push(row);
          row = null;
        }
      } else if (name === "cell" && row) {
        const a = parseAttrs(raw);
        const index = parseInt(a["ss:index"] ?? a["index"] ?? "", 10);
        if (Number.isFinite(index)) col = index - 1;
        mergeAcross = parseInt(a["ss:mergeacross"] ?? "0", 10) || 0;
        if (self) col += 1 + mergeAcross;
      } else if (name === "data" && row) {
        cellType = parseAttrs(raw)["ss:type"] ?? "String";
        data = self ? null : "";
      }
    },
    close(name) {
      if (name === "data" && row && data !== null) {
        let v: CellValue = data;
        if (cellType === "Number") {
          const n = Number(data);
          v = Number.isFinite(n) ? n : data;
        } else if (cellType === "Boolean") {
          v = data.trim() === "1";
        }
        if (col < LIMITS.maxCols) row[col] = v === "" ? null : v;
        data = null;
      } else if (name === "cell" && row) {
        col += 1 + mergeAcross;
        mergeAcross = 0;
      } else if (name === "row" && current && row) {
        for (let i = 0; i < row.length; i++) row[i] ??= null;
        if (current.rows.length < LIMITS.maxRows) current.rows.push(row);
        else current.truncated = true;
        row = null;
      } else if (name === "worksheet" && current) {
        sheets.push(current);
        current = null;
      }
    },
    text(t) {
      if (data !== null) data += t;
    },
  });
  return sheets;
}
