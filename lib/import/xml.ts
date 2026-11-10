/**
 * A tiny, forgiving XML/HTML tokenizer.
 *
 * Why not DOMParser? It doesn't exist in Node, and for spreadsheet XML we
 * only need a flat stream of open/close/text events. This scanner never
 * resolves DTDs or custom entities, so XXE / "billion laughs" payloads are
 * inert by construction — only the five XML entities, numeric references
 * and a handful of common HTML entities are decoded.
 */

export interface XmlHandlers {
  /** `name` is the local name, lower-cased, without namespace prefix. */
  open?: (name: string, rawAttrs: string, selfClosing: boolean) => void;
  close?: (name: string) => void;
  text?: (text: string) => void;
}

// 1 = "/" for closing tags, 2 = tag name, 3 = attributes, 4 = "/" self-close,
// 5 = CDATA body, 6 = text run. Comments, PIs and doctypes are skipped.
const TOKEN_RE =
  /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|([^<]+)|</g;

export function walkXml(xml: string, h: XmlHandlers): void {
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(xml)) !== null) {
    if (m[2] !== undefined) {
      const name = localName(m[2]);
      if (m[1]) h.close?.(name);
      else h.open?.(name, m[3] ?? "", m[4] === "/");
    } else if (m[5] !== undefined) {
      h.text?.(m[5]);
    } else if (m[6] !== undefined) {
      h.text?.(decodeEntities(m[6]));
    }
    // comments / PIs / doctype / stray "<" are ignored
  }
}

export function localName(qname: string): string {
  const i = qname.indexOf(":");
  return (i === -1 ? qname : qname.slice(i + 1)).toLowerCase();
}

const ATTR_RE = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

/** Parses an attribute string. Keys keep their original (prefixed) form, lower-cased. */
export function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/** Finds an attribute by local name, ignoring any namespace prefix (e.g. `r:id`). */
export function attrByLocal(attrs: Record<string, string>, local: string): string | undefined {
  if (local in attrs) return attrs[local];
  for (const key of Object.keys(attrs)) {
    if (key.endsWith(`:${local}`)) return attrs[key];
  }
  return undefined;
}

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  naira: "₦",
  pound: "£",
  euro: "€",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
};

export function decodeEntities(s: string): string {
  if (s.indexOf("&") === -1) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

/**
 * OOXML escapes characters that can't live in XML as `_xHHHH_`
 * (e.g. `_x000D_` for a carriage return, `_x005F_` for a literal underscore).
 */
export function decodeOoxmlEscapes(s: string): string {
  if (s.indexOf("_x") === -1) return s;
  return s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
