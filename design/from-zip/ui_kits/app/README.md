# App UI kit

High-fidelity recreation of the Spendda in-app portal (`/app/*`). Open `index.html` — it boots to the **Dashboard** with a dark-sidebar shell, tenant/entity selector, and KPI tiles. Click the sidebar nav items to switch between Dashboard, AI Workspace, Uploads, and Alerts.

## What's in here

- `index.html` — app shell with sidebar, top nav, route switcher, and content surface.
- `tokens.jsx` — CSS variables + lucide icon helper + tiny inline Recharts substitute built with SVG.
- `Sidebar.jsx` — 292/76px collapsible sidebar with grouped nav (Overview / Data & ingest / Intelligence / Organization / Administration), lucide icons, and the signature white logo plate.
- `TopNav.jsx` — 64px top nav with gradient-tinted background, search input, entity/role selects, AI Workspace pill, theme toggle, bell, and avatar menu.
- `Dashboard.jsx` — KPI tiles, spend trend area chart, department bar chart, risk donut, recent flags table, data readiness score — all sourced from mock JSON.
- `AiWorkspace.jsx` — chat surface with suggestion chips, typing dots, markdown answer card with follow-up chips and KPI badges.
- `Uploads.jsx` — file dropzone with a parsed-spend preview card and the column-mapping confirmation.
- `Alerts.jsx` — severity-grouped alert list with filters and the "escalate" action.

Every surface copies the exact Tailwind class chains from `src/components/app/*` and `src/app/app/*`.
