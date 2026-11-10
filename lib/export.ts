import { toCsv } from "./import/csv";
import type { Category, Product } from "./types";

/** Columns shared by the template and exports, so an export can be edited and re-imported. */
const HEADERS = [
  "Wizeazy ID",
  "Product Title",
  "Selling Price",
  "Sale Price",
  "Stock Qty",
  "Category",
  "Brand",
  "Description",
  "Main Image",
  "Additional Images",
  "SKU",
  "Featured",
  "Specs",
];

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportProductsCsv(products: Product[], categories: Category[]) {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.price,
    p.salePrice ?? "",
    p.quantity,
    catName.get(p.categoryId) ?? "",
    p.brand,
    p.description ?? "",
    p.images[0] ?? "",
    p.images.slice(1).join("\n"),
    p.sku ?? "",
    p.featured ? "yes" : "no",
    (p.specs ?? []).map((s) => `${s.label}: ${s.value}`).join("; "),
  ]);
  download(`wizeazy-products-${today()}.csv`, toCsv([HEADERS, ...rows]));
}

export function downloadTemplate() {
  const rows = [
    [
      "",
      "iPhone 15 Pro Max 256GB",
      1650000,
      1549000,
      5,
      "Smartphones",
      "Apple",
      "Titanium design, A17 Pro chip and a 5x telephoto camera.",
      "https://example.com/images/iphone-15-pro-max.jpg",
      "https://example.com/images/iphone-15-pro-max-back.jpg",
      "IP15PM-256",
      "yes",
      "Storage: 256GB; Colour: Natural Titanium",
    ],
    [
      "",
      "Oraimo 27000mAh Power Bank",
      38500,
      "",
      12,
      "Accessories",
      "Oraimo",
      "",
      "https://example.com/images/oraimo-powerbank.jpg",
      "",
      "",
      "no",
      "Capacity: 27000mAh",
    ],
  ];
  download("wizeazy-import-template.csv", toCsv([HEADERS, ...rows]));
}

/** Rows that couldn't be imported, with the reason, for fixing in Excel. */
export function downloadIssuesCsv(rows: { rowNumber: number; name: string; problems: string }[]) {
  download(
    `wizeazy-import-issues-${today()}.csv`,
    toCsv([["Row", "Product", "What to fix"], ...rows.map((r) => [r.rowNumber, r.name, r.problems])]),
  );
}
