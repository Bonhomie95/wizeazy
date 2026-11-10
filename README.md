# Wizeazy — storefront + admin

A fast, animated electronics storefront where customers buy through WhatsApp (or Instagram, Snapchat, Telegram), plus a password-protected admin to manage products, categories and settings. The admin can bulk-import a whole catalogue from **CSV, XLS or XLSX**.

Built with Next.js 14 (App Router), Tailwind CSS, framer-motion and MongoDB.

---

## 1. Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see section 2)
npm run dev                  # http://localhost:3000  ·  admin at /admin
```

If you leave `MONGODB_URI` empty, the app runs on in-memory demo data. That is fine for previewing, but changes are lost on restart. Set a database before going live.

| Command         | What it does                 |
| --------------- | ---------------------------- |
| `npm run dev`   | Development server           |
| `npm run build` | Production build             |
| `npm start`     | Serve the production build   |
| `npm run lint`  | Lint                         |

---

## 2. Environment variables (`.env.local`)

| Variable         | Required        | What it is                                                        |
| ---------------- | --------------- | ----------------------------------------------------------------- |
| `MONGODB_URI`    | Yes (prod)      | MongoDB connection string                                         |
| `MONGODB_DB`     | No              | Database name, default `wizeazy`                                  |
| `ADMIN_PASSWORD` | Yes             | The password that unlocks `/admin`                                |
| `SESSION_SECRET` | Yes (recommended) | Signs the admin login cookie. Falls back to `ADMIN_PASSWORD` if unset |

### How to get each value

**`MONGODB_URI`** (MongoDB Atlas has a free tier):
1. Go to <https://www.mongodb.com/cloud/atlas/register> and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → choose a username and password.
3. **Network Access** → *Add IP Address* → `0.0.0.0/0`. Vercel and Render use changing IPs, so this is needed there. Lock it down if your host has fixed IPs.
4. **Database** → *Connect* → *Drivers* → copy the string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Put your real password in it. URL-encode any special characters (`@` → `%40`).

The first time the app connects to an empty database, it seeds the demo catalogue once. Delete those products from the admin, or use *Settings → Reset* and then import your own.

**`ADMIN_PASSWORD`**: choose a long one, or generate one:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64url'))"
```

**`SESSION_SECRET`**: any long random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Changing it logs out every admin session.

### Deploying (Vercel / Render)
Add the same four variables in the host's dashboard. On Vercel that is *Project → Settings → Environment Variables*; on Render it is *Service → Environment*. Then redeploy. No other configuration is needed.

---

## 3. Bulk import (CSV / XLS / XLSX)

**Admin → Products → Import**

1. **Upload.** Drop a file, choose one, or paste cells copied from Excel or Google Sheets (⌘/Ctrl+V). The file is read **in your browser**. Only the rows you approve are sent to the server.
2. **Review.** Every row shows what will happen: **New**, **Update**, **Skip**, or **Can't import** with the reason. Click a name, price or stock value to fix it in place. Change any row's category, untick rows you don't want, or remap columns.
3. **Import.** Rows are saved in batches with a progress bar. The final screen can **Undo** the whole import, and so can the toast that appears afterwards.

### Recognised columns
Header names are matched automatically, case- and punctuation-insensitive. The *custom import template*, Shopify and WooCommerce exports, and the Wizeazy template all work as-is. Any column can also be mapped by hand in **Columns**.

| Field             | Accepted headers (examples)                                       |
| ----------------- | ----------------------------------------------------------------- |
| Name \*           | Product Title, Title, Name, Product Name                          |
| Price \*          | Selling Price, Price, Regular Price, Variant Price                |
| Sale price        | Sale Price, Discount Price, Promo Price                           |
| Original price    | Compare At Price, Old Price, Was Price, RRP                       |
| Stock             | Stock Qty, Stock, Quantity, Qty, Inventory                        |
| Category          | Collections, Category, Categories, Product Category               |
| Brand             | Featured Brand, Brand, Vendor, Manufacturer                       |
| Description       | Description (Long), Description, Body (HTML)                      |
| Short description | Description (Short …), Summary                                    |
| Main image        | Main Image, Image, Image URL, Image Src                           |
| More images       | Additional Images, Images, Gallery                                |
| SKU               | SKU, Variant SKU, Product Code                                    |
| Featured          | Featured (yes/no)                                                 |
| Specs             | Specs (`Storage: 256GB; Colour: Black`), `Spec: Storage` columns, Option1–3 Type/Value, Weight (kg) |
| Handle            | Handle. Rows with no title but the same handle add their images to the product above (Shopify style) |
| Wizeazy ID        | Wizeazy ID (from an export). Updates that exact product           |

\* required.

### Smart behaviour
- **Prices** can be written as `₦15,750`, `N15k`, `15.750,00`, `NGN 15750`, and so on.
- **Auto-sort into categories** reads product names. "iPad case" goes to Accessories, "JBL Flip 6" to Audio, "PS5 pad" to Gaming. Rows it can't place use the **default category** you pick. If the file names categories you don't have, you can create them.
- **Duplicates.** Products are matched by ID, then SKU, then exact name. Choose **Update** (only cells you filled in change), **Skip**, or **Add new**. Re-importing the same file never creates duplicates.
- **Images.** Only `http(s)` links are kept. Google Drive and Dropbox share links are converted to direct image links automatically.
- **Bulk price/stock changes.** Click **Export**, edit the CSV in Excel, then import it back with *Update*.
- **Template.** Use *Download template* on the upload screen.

### Limits
15 MB per file and 10,000 rows per sheet. Password-protected workbooks and Excel 95 files are not supported; re-save them as `.xlsx` or `.csv`.

> **Images in your current file are hot-linked** from another site (for example `files.chowdeck.com`). If that site removes them or blocks hot-linking, they will stop showing. For long-term reliability, re-host them (Cloudinary, Vercel Blob or similar) and re-import with *Update*.

---

## 4. Admin features
- Product list with search, filters (low stock, out of stock, featured) and sorting
- Stock value total (price × units)
- Tap a stock number to change it in place; ★ toggles featured
- Multi-select actions: move to a category, feature, delete
- Export to CSV
- Categories with inline rename; settings save automatically when you leave a field; every destructive action asks for confirmation
- Branded loaders, toasts, light/dark mode, and a mobile tab bar

## 5. Storefront UX
- Hero with an editorial headline and a swipeable featured-product stage
- Brand marquee and category shelf
- Animated product cards with sections that reveal on scroll in both directions
- The navbar hides when you scroll down and comes back when you scroll up
- Scroll progress bar and a scroll-to-top/bottom button
- ⌘/Ctrl+K jumps to search
- Branded splash once per visit (skipped for reduced-motion users)
- Product sheet with gallery, swipe-to-close and share
- WhatsApp checkout

## 6. Security notes
- All write APIs (`POST`/`PUT`/`DELETE` on products, categories and settings, plus `/api/products/batch` and reset) require the signed, httpOnly admin cookie (see `middleware.ts`).
- Inputs are validated against a field whitelist with size limits (`lib/product-input.ts`). This blocks mass-assignment, NoSQL operator injection and `javascript:` image URLs. Request bodies are size-capped.
- The password check is constant-time and login attempts are rate-limited.
- CSV exports escape formula injection (`=`, `+`, `-`, `@`).
- The spreadsheet parsers are bounds-checked and zip-bomb-capped. They use no third-party parser: the npm `xlsx` package has unpatched CVEs.

## 7. Performance
Measured with Lighthouse (mobile), before → after this redesign:

| Metric                    | Before | After  |
| ------------------------- | ------ | ------ |
| Performance score         | 89     | 97     |
| Accessibility score       | 100    | 100    |
| Largest Contentful Paint  | 3.8 s  | 2.6 s  |
| First Contentful Paint    | 1.4 s  | 1.1 s  |
| Storefront JS (first load) | 255 kB | 131 kB |

How:
- Real products are server-rendered from a short-lived cache, so there is no demo-data flash. The cache is cleared on every admin change.
- The animation engine and the importer are code-split and only load when needed.
- Only the category icons that are used get bundled.
- Reveal animations use one shared IntersectionObserver and CSS transforms.

## 8. Project structure
```
app/                     routes (storefront, /admin, API)
components/              storefront UI · admin/ (dashboard, import/) · ui/ (toasts, confirm, switch…) · brand/ (logo, loader)
lib/import/              spreadsheet readers (csv, xlsx, xls, html) + mapping, validation, auto-category, import plan
lib/db.ts                MongoDB data layer (bulk writes) with in-memory fallback
lib/product-input.ts     server-side validation
lib/cache.ts             storefront data cache + invalidation
```
