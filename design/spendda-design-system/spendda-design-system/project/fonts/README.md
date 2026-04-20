# Fonts

**Geist Sans** and **Geist Mono** power all Spendda typography. The codebase loads them at runtime via `next/font/google`, so no local `.ttf`/`.woff` files exist in the source tree.

This design system pulls the same families from Google Fonts via the `@import` at the top of `colors_and_type.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap");
```

Weights used across the product: `400` (body), `500` (medium UI / nav), `600` (semibold — all titles, buttons, pills), occasionally `700` (bold numeric).

No substitution. If Google Fonts is unreachable at design time, the stack falls through to Inter → ui-sans-serif → system, which is visually close for mockups but should not ship to production.
