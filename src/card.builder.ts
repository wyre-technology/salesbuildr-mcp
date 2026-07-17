/**
 * Quote-card payload builder for the MCP Apps (SEP-1865) UI surface.
 *
 * salesbuildr_quotes_get results get a normalized `_card` object attached
 * (see domains/quotes.ts) that the ui:// quote card renders from. The card
 * is progressive enhancement: every step here is best-effort, and a null
 * return simply means the host renders no card while the JSON payload is
 * unchanged.
 */

import type { SalesbuildrClient } from "./utils/types.js";

export const QUOTE_CARD_RESOURCE_URI = "ui://salesbuildr/quote-card.html";

/** MCP Apps resource MIME (RESOURCE_MIME_TYPE in @modelcontextprotocol/ext-apps). */
export const MCP_APP_RESOURCE_MIME = "text/html;profile=mcp-app";

/**
 * Tool `_meta` advertising the card. Carries both the canonical flat key
 * (RESOURCE_URI_META_KEY in ext-apps) and the nested form ext-apps'
 * registerAppTool emits, so any MCP Apps host revision finds it.
 */
export const QUOTE_CARD_META = {
  "ui/resourceUri": QUOTE_CARD_RESOURCE_URI,
  ui: { resourceUri: QUOTE_CARD_RESOURCE_URI },
} as const;

/** Mirror of Brand in ui/quote-card.ts — keep in sync. */
export interface CardBrand {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  bg?: string;
  text?: string;
}

/** The BRAND_INJECT comment marker baked into the card HTML (see ui/index.html). */
const BRAND_INJECT_RE = /<!--\s*BRAND_INJECT:[\s\S]*?-->/;

/**
 * Serve-time brand injection: replace the BRAND_INJECT marker with an inline
 * `window.__BRAND__` script so self-hosters can theme the card without
 * rebuilding the bundle. An empty brand returns the HTML unchanged (the card
 * renders its neutral defaults). `<` is escaped so brand values can never
 * break out of the script tag.
 */
export function applyBrandInjection(html: string, brand: CardBrand): string {
  if (!brand || Object.values(brand).every((v) => !v)) return html;
  const json = JSON.stringify(brand).replace(/</g, "\\u003c");
  return html.replace(BRAND_INJECT_RE, `<script>window.__BRAND__=${json}</script>`);
}

/**
 * Resolve brand overrides from MCP_BRAND_* environment variables. Guarded for
 * runtimes without `process` (Cloudflare Workers), where this returns an empty
 * brand and the card serves its neutral defaults.
 */
export function resolveBrandFromEnv(): CardBrand {
  if (typeof process === "undefined" || !process.env) return {};
  const env = process.env;
  const brand: CardBrand = {};
  if (env.MCP_BRAND_NAME) brand.name = env.MCP_BRAND_NAME;
  if (env.MCP_BRAND_LOGO_URL) brand.logoUrl = env.MCP_BRAND_LOGO_URL;
  if (env.MCP_BRAND_PRIMARY_COLOR) brand.primaryColor = env.MCP_BRAND_PRIMARY_COLOR;
  if (env.MCP_BRAND_ACCENT_COLOR) brand.accentColor = env.MCP_BRAND_ACCENT_COLOR;
  if (env.MCP_BRAND_BG) brand.bg = env.MCP_BRAND_BG;
  if (env.MCP_BRAND_TEXT) brand.text = env.MCP_BRAND_TEXT;
  return brand;
}

/** Mirror of QuoteCard in ui/quote-card.ts — keep in sync. */
export interface QuoteCard {
  id: string;
  title: string;
  status?: string;
  company?: string;
  contact?: string;
  subtotal?: number;
  total?: number;
  expiresAt?: string;
  createdAt?: string;
  /** Total line-item count when it exceeds the truncated `items` list. */
  itemCount?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total?: number;
    recurring?: string;
  }>;
}

const CARD_ITEM_LIMIT = 8;
const CARD_ITEM_NAME_MAX_LENGTH = 200;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Build the renderable card from a salesbuildr_quotes_get payload. The API
 * returns resolved `companyName` / `contactName` strings alongside ids when
 * available; a missing company name is resolved with one best-effort lookup
 * the repo already has (`client.companies.get`), falling back to `#id`.
 */
export async function buildQuoteCard(
  quote: Record<string, unknown>,
  client: Pick<SalesbuildrClient, "companies">
): Promise<QuoteCard | null> {
  const id = asString(quote?.id);
  const title = asString(quote?.title);
  if (!id || !title) return null;

  const card: QuoteCard = { id, title, items: [] };

  const status = asString(quote.status);
  if (status) card.status = status;

  let company = asString(quote.companyName);
  const companyId = asString(quote.companyId);
  if (!company && companyId) {
    try {
      company = asString((await client.companies.get(companyId))?.name);
    } catch {
      // Best-effort: fall through to the #id label.
    }
    company ??= `#${companyId}`;
  }
  if (company) card.company = company;

  const contact =
    asString(quote.contactName) ??
    (asString(quote.contactId) ? `#${quote.contactId}` : undefined);
  if (contact) card.contact = contact;

  if (typeof quote.subtotal === "number") card.subtotal = quote.subtotal;
  if (typeof quote.total === "number") card.total = quote.total;

  // The repo's Quote type (and tool schema) use `validUntil`; accept
  // `expiresAt` too in case the API returns it directly.
  const expiresAt = asString(quote.expiresAt) ?? asString(quote.validUntil);
  if (expiresAt) card.expiresAt = expiresAt;
  const createdAt = asString(quote.createdAt);
  if (createdAt) card.createdAt = createdAt;

  if (Array.isArray(quote.items)) {
    for (const raw of quote.items) {
      if (card.items.length >= CARD_ITEM_LIMIT) break;
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const name =
        asString(item.name) ?? asString(item.productName) ?? asString(item.description);
      if (!name || typeof item.quantity !== "number" || typeof item.unitPrice !== "number") {
        continue;
      }
      const cardItem: QuoteCard["items"][number] = {
        name: name.slice(0, CARD_ITEM_NAME_MAX_LENGTH),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
      if (typeof item.total === "number") cardItem.total = item.total;
      const recurring =
        asString(item.recurringInterval) ?? asString(item.billingCycle);
      if (recurring) cardItem.recurring = recurring;
      card.items.push(cardItem);
    }
    if (quote.items.length > card.items.length) {
      card.itemCount = quote.items.length;
    }
  }

  return card;
}
