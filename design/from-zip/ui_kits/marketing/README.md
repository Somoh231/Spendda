# Marketing UI kit

High-fidelity recreation of the Spendda marketing surface. Open `index.html` — it renders the full landing page (hero → trusted by → solutions → how it works → ROI → integrations → pricing → trust → FAQ → final CTA → footer) with light click-through interactions and an in-page login drawer.

## What's in here

- `index.html` — full marketing landing page, composed from the JSX modules below.
- `tokens.jsx` — CSS custom properties extracted from `globals.css` + Tailwind utility shims (`shell`, `card`, `cardLink`, `label`, `reveal`, fade keyframes).
- `Nav.jsx` — sticky marketing nav with dark glass chrome, pill CTAs, and mobile menu.
- `Hero.jsx` — hero section with eyebrow pill, headline, CTA pair, proof bullets, and a mock product preview glow.
- `TrustedBy.jsx` — category-logo placeholder row.
- `Solutions.jsx` — 6 industry cards with lucide icons and hover-lift chevron.
- `HowItWorks.jsx` — 3-step numbered tiles with dual-icon treatment.
- `ScreensPreview.jsx` — stylized screenshot tabs + captions.
- `ROI.jsx` — 3-stat tiles with blue blur halo.
- `Integrations.jsx` — gradient-bordered integration chips.
- `Pricing.jsx` — 3-tier pricing preview (middle tier featured gradient card).
- `TrustCenter.jsx` — 3 CTAs + compliance badge row.
- `FAQ.jsx` — accordion.
- `FinalCta.jsx` — gradient cap section with white-on-dark primary button.
- `Footer.jsx` — dark footer with logo block + columns + copyright.
- `LoginDrawer.jsx` — side drawer that demonstrates the auth form (shadcn Input/Label/Button).

Every component copies the exact class chain from `src/components/marketing/*` and `src/app/page.tsx`. Nothing is reinvented.
