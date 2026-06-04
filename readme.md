# Arasya Rentcar Website

WhatsApp-first chauffeur-only car rental website for Arasya Rentcar.

## Stack

- **Framework:** Next.js 16.2 (App Router)
- **UI:** React 19.2 + TypeScript 5.9
- **Runtime:** Node.js 24 LTS ("Jod")
- **Package manager:** pnpm 10.31

Full architecture, data model, and versioning details live in
[`.kiro/specs/arasya-rentcar-website/design.md`](./.kiro/specs/arasya-rentcar-website/design.md).

## Prerequisites

- Node.js `>=24.0.0 <25.0.0` — the `.nvmrc` pins this; run `nvm use`.
- pnpm `>=10.31 <11.0.0` — install with `npm i -g pnpm@10.31`.

## Getting started

```bash
pnpm install
pnpm dev       # start the dev server on http://localhost:3000
pnpm build     # production build
pnpm start     # run the production build
```

## Chauffeur-only policy

Arasya Rentcar is a chauffeur-only rental service. The codebase enforces
this positioning at six layers: DB CHECK constraints, MDX frontmatter
zod schemas, a build-time marker validator, a phrase-presence check, a
forbidden-phrase lint, and a non-goal leak detector. See
[docs/policies/chauffeur-only.md](docs/policies/chauffeur-only.md) for the
full policy and contributor guide.

## Status

Phase 1 bootstrap (task 1.1) complete. Later phases add tooling (ESLint, Prettier,
env validation), design system, Supabase data layer, content layer, routing, the
booking flow, and the full conversion stack.

See [`.kiro/specs/arasya-rentcar-website/tasks.md`](./.kiro/specs/arasya-rentcar-website/tasks.md)
for the full implementation plan.
