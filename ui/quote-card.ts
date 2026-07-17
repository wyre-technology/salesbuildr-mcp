/**
 * Iframe bridge + renderer for the SalesBuildr quote card (MCP Apps, SEP-1865).
 *
 * Runs inside the host's sandboxed iframe. Uses the official MCP Apps client
 * (`App`) to receive the tool result from the host. The card is read-only:
 * it renders the quote and never calls back into the server.
 *
 * The server attaches a normalized `_card` payload to salesbuildr_quotes_get
 * results (see src/card.builder.ts) so this renderer never needs to resolve
 * ids or entity names itself.
 *
 * Rendering uses DOM construction (no innerHTML) — quote titles, company
 * names, and line items are untrusted vendor data, so text only ever lands in
 * text nodes.
 *
 * White-label: the card is neutral by default (no vendor identity) and applies
 * an injected `window.__BRAND__` override (set by the MCP server via
 * MCP_BRAND_* env vars, or a gateway per-org) so the same card can render in
 * any operator's brand.
 */
import { App } from "@modelcontextprotocol/ext-apps";

interface Brand {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bg?: string;
  text?: string;
}
declare global {
  interface Window {
    __BRAND__?: Brand;
  }
}

/** Mirror of QuoteCard in src/card.builder.ts — keep in sync. */
interface QuoteCard {
  id: string;
  title: string;
  status?: string;
  company?: string;
  contact?: string;
  subtotal?: number;
  total?: number;
  expiresAt?: string;
  createdAt?: string;
  itemCount?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total?: number;
    recurring?: string;
  }>;
}

const brand: Brand = window.__BRAND__ ?? {};
const brandName = brand.name ?? "";

// Apply any injected brand overrides onto the CSS custom properties.
function applyBrand(): void {
  const root = document.documentElement.style;
  if (brand.primaryColor) root.setProperty("--brand-primary", brand.primaryColor);
  if (brand.accentColor) root.setProperty("--brand-accent", brand.accentColor);
  if (brand.bg) root.setProperty("--brand-bg", brand.bg);
  if (brand.text) root.setProperty("--brand-text", brand.text);
}

const app = new App({ name: "SalesBuildr Quote Card", version: "1.0.0" });

/** Create an element with a class and (safe, text-node) children. */
function el(
  tag: string,
  className = "",
  ...children: Array<Node | string | null>
): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    if (child == null) continue;
    node.append(child); // strings become text nodes — never parsed as HTML
  }
  return node;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Amounts are formatted as plain grouped numbers — the quote payload carries
 * no currency code, so the card never claims one.
 */
function fmtAmount(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function field(label: string, value: string | undefined): HTMLElement | null {
  if (!value) return null;
  return el(
    "div",
    "field",
    el("div", "field__label", label),
    el("div", "field__value", value),
  );
}

function badge(text: string | undefined, cls: string): HTMLElement | null {
  return text ? el("span", `badge ${cls}`, text.toUpperCase()) : null;
}

function itemEl(i: QuoteCard["items"][number]): HTMLElement {
  const qty = `× ${i.quantity}${i.recurring ? ` / ${i.recurring}` : ""}`;
  const amount = fmtAmount(i.total ?? i.quantity * i.unitPrice);
  return el(
    "div",
    "item",
    el("span", "item__name", i.name),
    el("span", "item__qty", qty),
    el("span", "item__amount", amount),
  );
}

function totalsRow(label: string, amount: number, grand = false): HTMLElement {
  return el(
    "div",
    grand ? "totals__row totals__row--grand" : "totals__row",
    el("span", "", label),
    el("span", "", fmtAmount(amount)),
  );
}

function render(q: QuoteCard): void {
  // Brand identity only renders when a brand was injected — the neutral
  // default shows just the quote number/vendor context in the header.
  let brandId: HTMLElement | null = null;
  if (brandName || brand.logoUrl) {
    brandId = el("span", "brandid");
    if (brand.logoUrl) {
      const logo = document.createElement("img");
      logo.src = brand.logoUrl;
      logo.alt = brandName;
      logo.style.display = "inline-block";
      brandId.append(logo);
    }
    if (brandName) brandId.append(el("span", "brand", brandName));
  }

  const shownCount =
    q.itemCount && q.itemCount > q.items.length
      ? `${q.items.length} of ${q.itemCount}`
      : `${q.items.length}`;
  const itemsSection = el(
    "div",
    "items",
    el("div", "items__h", `Line items (${shownCount})`),
  );
  for (const i of q.items) itemsSection.append(itemEl(i));

  const totals = el("div", "totals");
  if (q.subtotal != null) totals.append(totalsRow("Subtotal", q.subtotal));
  if (q.total != null) totals.append(totalsRow("Total", q.total, true));
  if (totals.childNodes.length > 0) itemsSection.append(totals);

  const body = el(
    "div",
    "card__body",
    el("div", "brandrow", brandId, el("span", "quoteno", `#${q.id} · SalesBuildr`)),
    el("h1", "", q.title),
    el("div", "badges", badge(q.status, "badge--status")),
    el(
      "div",
      "grid",
      field("Company", q.company),
      field("Contact", q.contact),
      field("Created", q.createdAt && fmtDate(q.createdAt)),
      field("Expires", q.expiresAt && fmtDate(q.expiresAt)),
    ),
    itemsSection,
  );

  const root = document.getElementById("root")!;
  root.replaceChildren(el("div", "card", el("div", "card__bar"), body));
}

// salesbuildr-mcp returns the quote JSON directly and attaches the normalized
// card to salesbuildr_quotes_get results as _card.
function extractCard(obj: unknown): QuoteCard | null {
  const card = (obj as { _card?: QuoteCard })?._card;
  return card && typeof card.id === "string" && typeof card.title === "string"
    ? card
    : null;
}

applyBrand();

// Must be set before connect() so the initial tool-result isn't missed.
app.ontoolresult = (result: { content?: Array<{ type: string; text?: string }> }) => {
  const payload = (result.content ?? []).find((c) => c.type === "text");
  if (!payload?.text) return;
  try {
    const card = extractCard(JSON.parse(payload.text));
    if (card) render(card);
  } catch {
    /* ignore malformed payloads */
  }
};

app.connect();
