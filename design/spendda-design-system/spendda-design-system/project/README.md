# Spendda Design System

Spendda is a B2B spend-and-payroll intelligence platform. It ingests CSV/Excel/QuickBooks/payroll exports and turns them into **governed dashboards, AI-scoped Q&A, risk alerts, forecasts, and board-ready exports** for finance, GRC, ministries, schools, NGOs, and multi-entity operators.

The product's defining stance: **enterprise-serious, calm, governed**. Venture-grade visuals (dark navy canvas, soft blue-to-emerald accents, luminous cards) paired with CFO-grade copy ("defensible answers," "traceable to source rows," "built for teams that cannot afford surprises").

---

## Products represented

1. **Marketing site** (`/`, `/platform`, `/pricing`, `/solutions`, `/trust`, `/security`, `/privacy`, `/book-demo`, `/docs`, `/resources`, `/login`, `/signup`) — a dark, premium landing stack with glowing gradients, pill CTAs, radial background washes, and large product-preview cards.
2. **App portal** (`/app/*`) — a dense operator tool with a dark navy sidebar, a gradient-tinted top nav, KPI tiles, recharts-based analytics, an AI Workspace chat surface, alerts, forecasting, and executive PDF/XLSX report exports.

Both products share the same token system (`globals.css`) but the marketing site leans **always-dark** while the app supports a **light + dark** mode pair.

## Sources consulted

- **Codebase**: `spendda/` (Next.js 16, React 19, Tailwind 3, shadcn/ui + Base UI + Radix primitives, `lucide-react` icons, `recharts`, `react-hook-form`, `zod`, `sonner`, Supabase SSR).
- Key files referenced while building this system:
  - `src/app/globals.css` — full token table (copied to `reference/globals.css`).
  - `tailwind.config.ts` — fontSize scale, shadow scale, color aliases (copied to `reference/tailwind.config.ts`).
  - `src/app/page.tsx` — marketing hero + patterns.
  - `src/components/marketing/*` — nav, footer, hero product preview, product screenshots, trust badges.
  - `src/components/app/sidebar.tsx`, `top-nav.tsx`, `nav-items.ts` — app chrome.
  - `src/components/ui/*` — shadcn primitives (button, card, badge, input, etc.).
  - `src/app/(auth)/login/login-form.tsx` — auth layout + CTA treatments.
  - `src/app/app/dashboard/dashboard-content.tsx`, `src/app/app/ai-workspace/ai-workspace-app.tsx` — in-app KPIs, charts, chat.
  - `public/brand/spendda-logo.png` — single brand mark.

No Figma file was attached; all visual decisions in this system are grounded in the codebase tokens and components.

---

## Content fundamentals

**Voice.** Confident, governed, CFO/board-grade. Speaks to serious buyers. Avoids hype. Rarely uses "you" in marketing — instead names the buyer ("finance teams," "leadership," "procurement," "the board"). Uses "we'll" sparingly in the final CTA.

**Tone signals seen across the codebase:**

- Outcomes over features: "Ship decisions, not decks." / "Know what matters before it becomes a problem."
- Governance-first: "governed AI," "tenant isolation and exports auditors can trace," "scoped to the rows you authorize — not the whole internet."
- Anti-theater: "Less deck theater — more signal per dollar." / "ROI that shows up in the calendar — not only in a slide deck."
- Pragmatic enterprise: "No rip-and-replace ERP," "procurement-aligned rollout," "when IT says go."
- Trust asides (reminds you it's honest, not a demo facade): "Illustrative benchmarks from pilot programs — your mileage depends on data quality and scope." / "Logos shown as categories during pilot — reference customers available under NDA."

**Casing.**

- Sentence case everywhere (titles, buttons, nav, section headers).
- ALL-CAPS is reserved for eyebrow labels with wide tracking (`tracking-[0.2em]`, 11–12px), e.g. `TRUSTED BY TEAMS WHO CANNOT AFFORD SURPRISES`, `HOW IT WORKS`, `PRICING`.
- Button copy is sentence case verbs: "Book a live walkthrough", "Explore the platform", "Schedule the walkthrough".

**Punctuation.**

- Em dashes — used generously to pace the beat.
- Slashes separate integration names and tiers ("PDF / XLSX", "Excel / CSV / API-ready").
- Long arrow `→` on closing footer links; inline `ArrowRight` lucide icon inside pill CTAs.
- Occasional typographic `&` in nav labels ("Data & ingest", "Schools & districts").

**Numbers.** Always tabular, often with punchy shorthand: `10×`, `−35%`, `100%`, `$186K`, `48.2k rows`. Stats are short labels + one-line justification ("Less time in fire drills — Fewer 'what happened?' threads when…").

**Emoji.** Never. The codebase contains zero emoji in product copy. Use lucide icons instead.

**Hedging footers.** Every stats block ends with a small gray disclaimer to preserve credibility with enterprise buyers — `text-xs text-slate-500 text-center`.

---

## Visual foundations

**Canvas.**

- Marketing: near-black `slate-950` (`#020617`) with a fixed full-viewport radial gradient: *blue from the top, faint emerald from the top-right, navy bottom*. Always dark.
- App (dark): `--background: 222 47% 6%`. App (light): `--background: 210 40% 98%` (soft off-white).
- Section alternation uses `bg-white/[0.02]` + `border-y border-white/10` to break the page into rhythm.

**Color system (brand palette).**

| Role | Token | Value |
|---|---|---|
| Primary (brand blue) | `--brand-primary` / `--primary` | `#3b82f6` (hsl 217 91% 53%) |
| Accent (brand green) | `--brand-accent` / `--accent` | `#22c55e` (hsl 142 71% 41%) |
| Navy (signature) | `--spendda-navy` | `#081225` |
| Surface canvas | `--spendda-surface` | `#f8fafc` light / `#0f172a` dark |
| Secondary (slate) | `--brand-secondary` | `#e2e8f0` light / `#1e293b` dark |
| Critical / destructive | `--critical` | hsl `0 72% 51%` |
| Warning | `--warning` | hsl `38 92% 50%` (amber) |
| Success | `--success` | hsl `142 71% 41%` (emerald) |

Semantic pairs expose `*-foreground` for each, so `bg-primary text-primary-foreground` always reads. Extended scales for `risk` (high/medium/low) and `confidence` (high/medium/low) mirror the traffic-light colors and power the risk badges and confidence meters seen on the dashboard.

**Typography.**

- **Heading + body:** `Geist Sans` (Vercel). Loaded via `next/font/google` as `--font-geist-sans`. Heading stack falls through to `Inter`, then system.
- **Mono:** `Geist Mono` for tabular stats (`$186K`, `10×`).
- Scale (from `tailwind.config.ts`):
  - `text-display` = `2.25rem / 1.1 / -0.035em / 600`
  - `text-title-lg` = `1.375rem / 1.25 / -0.02em / 600`
  - `text-title-md` = `1.125rem / 1.35 / -0.015em / 600`
  - `text-caption` = `0.6875rem / 1.35 / 0.08em / 600` ALL CAPS
- Negative letter-spacing (`tracking-tight` / `-0.02em` to `-0.035em`) on all display/title text — **signature Spendda beat**.
- Body paragraphs use `leading-relaxed` (1.625) and `text-pretty` / `text-balance` liberally.

> ⚠️ **Font substitution:** Geist Sans/Mono are loaded from Google Fonts in production. For design tooling use Google Fonts imports of `Geist` and `Geist Mono`. This system uses those Google Fonts imports — they match the production output exactly.

**Spacing & rhythm.**

- 4px base. Exposed via CSS vars `--ds-space-1` → `--ds-space-12`, plus `--ds-page-y: 1.5rem` and `--ds-section-y: 2.5rem`.
- Horizontal shell on marketing: `mx-auto max-w-7xl px-6 lg:px-8`.
- App shell: `mx-auto max-w-[1440px]` with `p-4 sm:p-6 lg:p-8` on the `<main>`.
- Vertical section rhythm: `py-10` → `py-12` → `py-14` stepping up with importance.

**Corner radii.**

- `--radius: 0.875rem` (14px) — the **primary rounding**. Apply via `rounded-lg` in tailwind.
- `--radius-2xl: 1rem` — the signature **card radius** (`rounded-2xl`, used everywhere).
- CTA pills and eyebrow chips are fully `rounded-full`. Logos sit in `rounded-xl` (12px) plates.

**Elevation / shadows.**

- Token ladder: `--shadow-ds-xs` → `-sm` → `-md` → `-card` → `-card-hover`.
- Card shadow combines a **1-px inner top highlight** (`inset 0 1px 0 rgba(255,255,255,0.04)`) + a large diffuse drop (`0 24px 80px -20px rgba(0,0,0,0.55)`). This is the defining Spendda elevation look — cards feel lifted without looking rounded-and-shiny.
- On hover, drop-shadow color shifts toward primary blue: `0 20px 50px -12px hsl(217 91% 53% / 0.12)`.
- Marketing hero has a blurred "glow halo" behind product previews: `bg-gradient-to-br from-blue-500/30 via-blue-600/10 to-emerald-400/20 blur-2xl`.

**Borders.**

- Marketing (dark only): always `border-white/[0.1]` → `border-white/[0.14]` → `border-white/22` on hover.
- App uses `border-border/60` (semantic), which resolves to slate-200-ish in light and slate-800 in dark.
- 1-px hairlines; never heavy borders.

**Backgrounds & surfaces.**

- **Tint-over-black pattern**: `bg-white/[0.03]` to `bg-white/[0.06]` layered on dark — the signature "slightly elevated tile."
- **Glass / backdrop blur**: `backdrop-blur-xl bg-slate-950/80` on the sticky marketing nav, `backdrop-blur-sm supports-[backdrop-filter]:bg-card/85` on cards in the app.
- **Gradient utilities**: inner top highlight (`shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`) is the card signature. Full-bleed page radials bring the blue-to-emerald brand wash to life.
- **No patterns, no textures, no hand-drawn illustrations.** All imagery is synthetic — icons, data mocks, and the single logo PNG.

**Animation & motion.**

- Global easing: `cubic-bezier(0.16, 1, 0.3, 1)` (`--ds-ease-out`). Global duration: `200ms`.
- Named animations: `spendda-fade-in` (0.45s), `spendda-fade-in-up` (0.5s, 8px travel). Section staggers use `animation-delay: 60ms…220ms` to step the page in on load.
- **Hover tells:** `motion-safe:hover:-translate-y-0.5` + shadow deepens + border tints primary. This lift is the singular interactive motif.
- `animate-ping` on small status dots (`h-1.5 w-1.5 rounded-full`) for pulsing "live" badges.
- Typing dots (`.typing-dot`) for AI Workspace.
- All motion gates through `motion-safe:` and `motion-reduce:` — respect reduced motion.

**Hover + press states.**

- Hover lift: `-translate-y-0.5`, border `→ primary/25 or 35`, shadow `→ -card-hover`.
- Ghost / link hover: `hover:bg-white/[0.06] hover:text-white` on dark; `hover:bg-muted/80` in app.
- Active press: `active:not-aria-[haspopup]:translate-y-px` on buttons (1 px down). No scale shrink, no color shift.
- Focus: 3-px ring at `ring/40`-`/45` — `focus-visible:ring-[3px] focus-visible:ring-ring/45`.

**Transparency & blur.**

- Used for nav chrome, card backgrounds over dark canvas, and the glowing halo behind product previews.
- `/[0.02]`, `/[0.03]`, `/[0.04]`, `/[0.06]`, `/[0.08]`, `/[0.12]`, `/[0.14]`, `/22` are the precise stops used — never generic `/5`, `/10`, `/20`.

**Layout rules.**

- Sidebar width: `76px` collapsed / `292px` expanded, with `width` transitioned over `300ms ease-out`.
- Top nav: `h-16` (64px), sticky, with a 1-px top highlight gradient running across.
- Forms and CTAs sit inside max-width content wells; grids prefer `lg:grid-cols-3` for feature/pricing rows and `sm:grid-cols-2` → `lg:grid-cols-3` for responsive cards.

**Imagery vibe.** There is no photographic imagery. Any "screen" shown in the product is a **synthetic mock built from divs and recharts** — this is the Spendda brand personality. Cool, data-forward, blue-green, never warm.

---

## Iconography

**Library:** [`lucide-react`](https://lucide.dev) v1.8.0, used pervasively — every section header, CTA, and navigation item has a lucide icon paired with its label. Stroke icons only.

**Sizing defaults:**

- Inline with text: `h-3.5 w-3.5` (14px) for eyebrow pills, `h-4 w-4` (16px) for button adjunct, `h-5 w-5` (20px) for card-header icons.
- Standalone in a chip/frame: `h-5 w-5` inside a `h-11 w-11 rounded-xl` plate.

**Color usage:**

- Icons inherit parent text color by default.
- Accent-colored icons in cards: `text-blue-200` / `text-blue-300` / `text-emerald-300` / `text-amber-300` / `text-rose-200`.
- Active nav icons get `text-[var(--spendda-blue)]`.

**Emoji & unicode.** Never used. Use lucide.

**Brand assets.** The only brand image is `assets/spendda-logo.png` — a 1024×1024 PNG displayed at 36–56px inside a white rounded plate with a tinted ring. Always render on white, never on dark directly (the mark is dark on light).

**In this system:**

- `assets/spendda-logo.png` — primary brand mark.
- `assets/lucide.js` — we link lucide from CDN in the UI kits so every icon in the original codebase renders faithfully.

---

## Index — what's in this folder

- `README.md` — this file.
- `SKILL.md` — skill manifest for Claude Code / Agent Skills.
- `colors_and_type.css` — the canonical CSS variable set (color + type tokens, semantic element styles).
- `assets/` — brand logo, sample CSVs, icon helper.
- `fonts/` — Geist Sans/Mono loader stub (Google Fonts import).
- `reference/` — verbatim copies of the source `globals.css` and `tailwind.config.ts` for ground-truth lookups.
- `preview/` — small HTML cards shown in the Design System tab (colors, type, spacing, components).
- `ui_kits/marketing/` — recreation of the marketing landing + auth surfaces. Open `ui_kits/marketing/index.html`.
- `ui_kits/app/` — recreation of the in-app portal (sidebar, top nav, dashboard, AI Workspace). Open `ui_kits/app/index.html`.

No slide template was provided — `slides/` is intentionally absent.

---

## Caveats

- **Fonts:** Geist is loaded from Google Fonts at runtime — an exact match to production. No local `.ttf` was needed.
- **Icons:** linked from the lucide CDN rather than copied locally (matches the codebase's `lucide-react` dependency).
- **No Figma:** the single source of truth is the codebase. Confirm interactions against live screens if available.
