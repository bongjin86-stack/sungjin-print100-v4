# sungjin-print100-nagi (v2)

## Project Overview

Online print ordering system (v2). Astro 5 SSR + React 19 interactive components.
Customers select paper, size, print options, upload files, and place orders.
Admin manages products via ProductBuilder, orders, and site content.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Astro 5 (SSR, `output: "server"`) |
| UI | React 19 (`client:only="react"` for interactive components) |
| Styling | Tailwind CSS 4 (CSS layers), SCSS |
| Backend | Supabase (DB, Auth, Storage) |
| Deployment | Vercel |
| Package Manager | pnpm |
| Editor | BlockNote (rich text), Toast UI (markdown) |

## Development Workflow

1. Make changes
2. Build check: `pnpm build`
3. Lint: `pnpm lint`
4. Format: `pnpm format`
5. Dev server: `pnpm dev` (port 4321)

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin pages (React, client:only)
│   │   ├── ProductBuilder/  # Product creation/editing (MONOLITH index.jsx)
│   │   ├── *Manager.tsx     # DB entity managers (Papers, Sizes, etc.)
│   │   └── *Form.tsx        # CMS content forms (Hero, About, etc.)
│   ├── product/         # Customer-facing product view
│   ├── order/           # Checkout, upload, order status
│   ├── layout/          # Header, Footer, Navigation
│   ├── sections/        # Landing page sections
│   └── ui/              # Reusable UI components
│
├── lib/                 # Core business logic
│   ├── priceEngine.ts   # Price calculation (ALL pricing logic here)
│   ├── dbService.ts     # DB data loading (cached)
│   ├── builderData.ts   # Product templates & types
│   ├── businessDays.ts  # Business day calculation
│   ├── orderService.js  # Order CRUD
│   ├── shippingCalculator.js  # Shipping cost
│   ├── packagingCalculator.js # Packaging cost
│   ├── emailService.js  # Order notification emails
│   ├── siteConfigService.js   # Site settings
│   └── supabase.ts      # Supabase client (single instance)
│
├── pages/               # Astro pages (.astro files)
│   ├── admin/           # Admin routes
│   ├── product/         # Product detail pages
│   ├── api/             # API endpoints
│   └── *.astro          # Public pages
│
├── styles/              # Global styles
│   ├── global.css       # Tailwind imports (@layer)
│   ├── global.scss      # Reset (MUST be @layer base)
│   ├── tokens.css       # CSS custom properties (--c-*, --sp-*, --fs-*)
│   ├── fonts.css        # @font-face declarations
│   └── builder.css      # Admin builder styles (.admin-content scoped)
│
├── layouts/             # Astro layouts
├── config/              # Site configuration
├── data/                # Static data
└── types/               # TypeScript type definitions
```

## Critical Rules

### Never Create Duplicates
These are already implemented. Modify the existing files:

| Feature | File | Notes |
|---------|------|-------|
| Price calculation | `src/lib/priceEngine.ts` | ALL price logic here |
| Shipping cost | `src/lib/shippingCalculator.js` | |
| Packaging cost | `src/lib/packagingCalculator.js` | |
| Business days | `src/lib/businessDays.ts` | Holiday-aware |
| Order processing | `src/lib/orderService.js` | |
| DB connection | `src/lib/supabase.ts` | Single client instance |
| DB data loading | `src/lib/dbService.ts` | Cached lookups |

### CSS Cascade Layers - CRITICAL
- Tailwind v4 uses `@layer` (base/components/utilities)
- **Unlayered CSS beats ALL layered CSS** regardless of specificity
- `global.scss` MUST be wrapped in `@layer base { ... }`
- `tokens.css` (`:root` variables only) is safe unlayered
- `builder.css` variables scoped to `.admin-content` (not `:root`)

### ProductBuilder is a MONOLITH
- `src/components/admin/ProductBuilder/index.jsx` contains ALL code inline
- Separate files (`BlockSettings.jsx`, `PreviewBlock.jsx`) exist but are NOT imported
- **ALWAYS modify `index.jsx` directly**

### Astro + React Integration
- React components in `.astro` pages need `client:only="react"` directive
- Use `@/` path aliases (configured in tsconfig.json)
- SSR mode: `output: "server"` with Vercel adapter

### Pricing System
- `innerColor`/`innerSide`: Binding products use these keys (NOT `color`/`side`)
- Binding finishing block sets `customer.finishing.*` fields
- Single-layer finishing also uses `customer.finishing.*`
- Delivery percent: +30% (same day), +15% (1 day), 0% (2 days), -5% (3 days)

## Routing

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Landing page | Public homepage |
| `/product/:slug` | ProductView | Customer product page |
| `/upload` | Upload | File upload |
| `/checkout` | Checkout | Order form |
| `/order-complete` | OrderComplete | Order confirmation |
| `/order/:uuid` | CustomerOrderStatus | Order tracking |
| `/admin` | Admin dashboard | Admin area |
| `/admin/builder` | ProductBuilder | Product creation/editing |
| `/admin/orders` | AdminOrders | Order management |
| `/admin/products` | Product list | Product management |
| `/admin/db/*` | DB managers | Papers, sizes, finishing, etc. |
| `/admin/settings` | Site settings | General settings |

## Supabase
- Access ONLY through `src/lib/supabase.ts`
- Never call `createClient` directly
- Environment variables in `.env.local`
