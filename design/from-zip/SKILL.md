---
name: spendda-design-system
description: Design system for Spendda — a B2B spend and payroll intelligence platform. Use when designing for Spendda's marketing site (always dark) or in-app portal (light + dark). Enterprise-serious, governed, CFO-grade voice with Geist type, a blue-to-emerald palette on slate canvas, and a luminous lifted-card visual language.
---

# Spendda Design System

A design system for **Spendda** — a governed spend + payroll intelligence platform. Two surfaces share the same tokens:

1. **Marketing** (always dark) — premium landing stack: glowing gradients, pill CTAs, radial washes, synthetic product previews.
2. **App portal** (light + dark) — dense operator tool: 76/292px sidebar, 64px top nav, KPI tiles, recharts, AI Workspace chat.

## When to reach for this system

- Spendda marketing pages (`/`, `/platform`, `/pricing`, `/solutions`, `/trust`, `/security`, `/privacy`, `/book-demo`, `/login`, `/signup`).
- Spendda app surfaces (`/app/dashboard`, `/app/ai-workspace`, `/app/uploads`, `/app/alerts`, `/app/forecasting`, etc.).
- Adjacent CFO/GRC/finance-ops products when the user wants Spendda's exact visual + voice signature.

## Start here

Before writing a line of code:

1. Read **`README.md`** end-to-end. The Content fundamentals, Visual foundations, and Iconography sections are load-bearing — do not skim.
2. Link **`colors_and_type.css`** in every new HTML file. It defines the CSS variables (`--spendda-blue`, `--spendda-green`, `--spendda-navy`, `--brand-primary`, `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--ring`, plus light/dark pairs) that every component depends on.
3. Import **Geist Sans + Geist Mono** from Google Fonts. Negative tracking (`-0.02em` to `-0.035em`) on display/title text is signature — use it.
4. Use **lucide** icons (CDN). Never emoji. Stroke icons only.
5. Use the single brand mark at **`assets/spendda-logo.png`** — always inside a white rounded plate with a tinted ring. Never on dark directly.

## Recreate, don't reinvent

The two UI kits in this folder are reference builds:

- **`ui_kits/marketing/`** — Nav, Hero (+ synthetic product preview), TrustedBy, Solutions, HowItWorks, ROI, Integrations, Pricing, TrustCenter, FAQ, FinalCta, Footer, LoginDrawer.
- **`ui_kits/app/`** — Sidebar (collapsible), TopNav (gradient tint, entity/role selects, AI Workspace pill, theme toggle), Dashboard (KPIs + AreaSpark + Donut + Bars + flag table), AiWorkspace (chat + scope card), Uploads (dropzone + parsed preview), Alerts (severity groups).

When designing a new Spendda screen, **start by reading the nearest existing component in these kits** and lift its class chains. That is faster and more faithful than reconstructing the aesthetic from the README alone.

## Visual signature (do not drift from these)

- **Canvas:** dark navy (`#020617` on marketing) with a full-viewport radial wash — blue from the top, faint emerald from the top-right.
- **Card shadow:** `shadow-[inset_0_1px_0_rgba(255,255,255,0.04),_0_24px_80px_-20px_rgba(0,0,0,0.55)]` + `rounded-2xl` + `border-white/[0.12]`. This is THE Spendda card.
- **Hover tell:** `motion-safe:hover:-translate-y-0.5` + border tints toward primary blue + shadow deepens. Never scale.
- **Transparency stops are exact:** `/[0.02] /[0.03] /[0.04] /[0.06] /[0.08] /[0.12] /[0.14] /22` — never generic `/5 /10 /20`.
- **Eyebrow labels:** ALL CAPS, `tracking-[0.2em]`, 11–12px, in the section's theme color (`text-blue-400/90`, `text-emerald-400/90`, `text-violet-400/90`, `text-amber-400/90`).
- **Pill CTAs:** `rounded-full` + gradient blue primary (`from-blue-500 to-blue-400`) + glowing shadow (`shadow-[0_14px_44px_rgba(37,99,235,0.35)]`).
- **Tabular numbers:** `font-mono` + `tabular-nums` on every stat, KPI, amount, currency figure.

## Voice (do not drift from these)

- Confident, governed, CFO/board-grade. Names the buyer ("finance teams," "the board") instead of using "you."
- Outcomes over features. "Ship decisions, not decks." "Know what matters before it becomes a problem."
- Governance-first asides: "tenant isolation and exports auditors can trace," "scoped to the rows you authorize — not the whole internet."
- Sentence case everywhere except all-caps eyebrow labels.
- Em dashes generously. Slashes for groupings ("CSV / XLSX", "Excel / CSV / API-ready"). Long arrow `→` on closing footer links.
- Every stats block ends with a small gray disclaimer (`text-xs text-slate-500`) to preserve credibility.
- **Never emoji.** Use lucide.

## Files to know

| Path | Purpose |
|---|---|
| `README.md` | Full rationale, token tables, patterns. **Read first.** |
| `colors_and_type.css` | CSS variable set + semantic element styles. Link from every HTML. |
| `assets/spendda-logo.png` | Single brand mark (1024×1024). |
| `reference/globals.css`, `reference/tailwind.config.ts` | Verbatim copies of source tokens — ground-truth lookup. |
| `preview/*.html` | Design System tab cards (colors, type, spacing, components). |
| `ui_kits/marketing/*` | Marketing recreation — copy class chains from here. |
| `ui_kits/app/*` | App recreation — copy class chains from here. |

## Do

- Lift class chains verbatim from `ui_kits/` before inventing your own.
- Pair every CTA and section header with a lucide icon.
- Use synthetic data mocks (divs + recharts/SVG) for product previews — never stock imagery.
- Wrap stats in credibility disclaimers.
- Respect `motion-safe:` / `motion-reduce:` gates.

## Don't

- Don't use emoji, stock photography, hand-drawn SVG illustrations, or warm color accents (no orange, no pink, no yellow except amber severity).
- Don't use generic Tailwind opacity stops like `/5`, `/10`, `/20`. Use the Spendda ladder.
- Don't place the logo on a dark surface — always on a white plate.
- Don't write marketing copy in second-person "you" style; name the buyer instead.
- Don't skip the 1-px inner top highlight on cards; it's the single detail that makes them read as "Spendda."
