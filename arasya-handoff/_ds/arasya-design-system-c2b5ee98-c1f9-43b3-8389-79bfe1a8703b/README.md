# Arasya Design System — conventions for building screens

Arasya Rent Car is a **premium car rental with driver** (Indonesia). Copy is Indonesian-first, formal, editorial (Traveloka-style). Never position as self-drive ("lepas kunci"), never mention partners/vendors/third-party fulfillment. Primary CTA text: **"Pesan Sekarang"**; quote flows end in a WhatsApp handoff.

## 1. Always wrap in `ArasyaProvider`

Every screen's root must be `ArasyaProvider`. It renders the `.ar-root` scope that applies the brand font (Plus Jakarta Sans), text color, and background — components outside it render with the host page's typography and look broken.

```jsx
<ArasyaProvider>
  {/* everything */}
</ArasyaProvider>
```

## 2. Styling idiom: component props + `var(--ar-*)` tokens

Components carry their own styles via internal `ar-*` classes — never write or invent `ar-*` class names yourself. For your own layout glue (wrappers, grids, spacing), use inline styles or your own classes built from the design tokens defined in `styles.css`'s import chain:

- **Brand color**: `--ar-color-primary` (#046bd2), `--ar-color-primary-hover`, `--ar-color-accent` (gold), `--ar-color-whatsapp`; scales `--ar-blue-50…950`, `--ar-gold-50…700`, `--ar-gray-25…900`
- **Semantic**: `--ar-color-text`, `--ar-color-text-secondary`, `--ar-color-text-muted`, `--ar-color-bg`, `--ar-color-surface`, `--ar-color-border`, `--ar-color-success|warning|danger|info` (+ `-subtle` variants)
- **Type**: `--ar-font-sans`, sizes `--ar-text-xs…4xl`, weights `--ar-weight-regular|medium|semibold|bold`
- **Layout**: spacing `--ar-space-1…16`, radii `--ar-radius-sm|md|lg|xl|full`, shadows `--ar-shadow-sm…xl`, `--ar-container-max`

Key component APIs: `Button` `variant="primary|secondary|outline|ghost|gold|whatsapp"` (whatsapp auto-adds the WhatsApp icon; `href` renders it as a link), `Card` `variant="elevated|outline|filled|dark"` with `CardHeader/CardBody/CardFooter`, `Badge` `tone="primary|gold|success|warning|danger|info|neutral"` `variant="solid|subtle"`, `Chip` (selectable filters), `Avatar`, `Divider label=`, `IconButton` (requires `aria-label`), `Spinner`.

City-page blocks — always prefer these over hand-built equivalents:

- **`QuoteForm`** — THE conversion block. `cityName`, `cityCode` (ref prefix, e.g. "BGR"), `phone`, `carOptions: string[]`; fully wired: generates ref code, builds the WhatsApp message, opens wa.me on submit. Analytics via `onFormStart`/`onSubmit` callbacks. Never hand-build a quote form.
- **`FleetTable`** — tarif table: `cars: FleetCar[]` (`{name, priceFrom?, priceLabel?, capacity?, badge?}`); `priceFrom: null` rows show "Hubungi untuk harga terbaik"; optional `onQuote` adds per-row WhatsApp CTA.
- **`Accordion`** — FAQ: `items: {question, answer}[]`, `defaultOpen?: number`.
- **`StickyCtaBar`** — fixed-bottom mobile bar: `phone` + `waHref` (or `onWhatsApp`).
- **`TrustStrip`** — `items: {title, description?, preset?}[]`, presets `shield|car|users|phone|check|star`. Only real, verified claims — never invented ratings/counts.
- **`SectionHeading`** — `eyebrow?`, `title`, `subtitle?`, `align="left|center"` for editorial sections (Mengenal {City}, Destinasi Populer).
- **`TextField`** / **`Select`** — form fields with label/hint/error chrome; TextField takes any input `type` (`date`, `time`).

Utilities (import from the same bundle): `formatIDR(700000)` → `"Rp700.000"`, `formatIDRCompact`, `generateRefCode("BDG")` → `"BDG-7F3K"`, `buildQuoteMessage(input)` (field is `cityName`), `buildWaHref(phone, message)` — use these for prices and WhatsApp quote flows, never hand-format.

## 3. Where the truth lives

Read `styles.css` (imports `fonts/fonts.css` and `_ds_bundle.css` — tokens + all component CSS) before styling anything. Per-component API + usage: `components/general/<Name>/<Name>.d.ts` and `<Name>.prompt.md`.

## 4. Idiomatic example

```jsx
<ArasyaProvider>
  <Card variant="elevated" padding="none" style={{ maxWidth: 340 }}>
    <CardHeader>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Innova Reborn</strong>
        <Badge tone="success">Tersedia</Badge>
      </div>
    </CardHeader>
    <CardBody>
      <Badge tone="primary">Termasuk Supir</Badge>
      <p>Mulai dari <strong>{formatIDR(700000)}</strong> / 12 jam</p>
    </CardBody>
    <CardFooter>
      <Button variant="whatsapp" fullWidth href={buildWaHref('6281399909602', buildQuoteMessage({ refCode: generateRefCode('BGR'), cityName: 'Bogor', pickupLocation: 'Stasiun Bogor', dropoffLocation: 'Puncak', carType: 'Innova Reborn', duration: '12 jam', pickupTime: '08:00' }))}>
        Minta Penawaran
      </Button>
    </CardFooter>
  </Card>
</ArasyaProvider>
```

# ArasyaDS (@arasya/design-system@0.1.0)

This design system is the published @arasya/design-system React library, bundled as a single
browser global. All 20 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.ArasyaDS`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.ArasyaDS.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Accordion } = window.ArasyaDS;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Accordion />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<ArasyaProvider>{children}</ArasyaProvider>
```

## Tokens

101 CSS custom properties from @arasya/design-system. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (36): `--ar-color-primary`, `--ar-color-primary-hover`, `--ar-color-primary-active`, …
- **spacing** (10): `--ar-space-1`, `--ar-space-2`, `--ar-space-3`, …
- **typography** (5): `--ar-font-sans`, `--ar-weight-regular`, `--ar-weight-medium`, …
- **radius** (5): `--ar-radius-sm`, `--ar-radius-md`, `--ar-radius-lg`, …
- **shadow** (4): `--ar-shadow-sm`, `--ar-shadow-md`, `--ar-shadow-lg`, …
- **other** (41): `--ar-blue-50`, `--ar-blue-100`, `--ar-blue-200`, …

## Components

### general
- `Accordion` — FAQ accordion on native details/summary  no JS state, statically renderable.
- `ArasyaProvider` — Root wrapper for every Arasya screen. Applies the base font, text color and
- `Avatar`
- `Badge`
- `Button`
- `Card`
- `CardBody`
- `CardFooter`
- `CardHeader`
- `Chip`
- `Divider`
- `FleetTable`
- `IconButton`
- `QuoteForm`
- `SectionHeading`
- `Select`
- `Spinner`
- `StickyCtaBar` — Fixed bottom action bar for mobile  WhatsApp CTA always reachable (PRD 11).
- `TextField`
- `TrustStrip`
