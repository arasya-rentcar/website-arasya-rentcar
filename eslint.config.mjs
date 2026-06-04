// ESLint 9 flat config (design §29.1).
//
// - Loads `eslint-config-next` (core-web-vitals + typescript) for the Next.js,
//   React, jsx-a11y, import and TypeScript rule set used across the repo.
// - Registers the local `arasya` plugin backed by
//   `lib/eslint-rules/no-service-key-in-client.mjs`, and enables that rule as
//   an error on every client-reachable source file (R21.8, design §22).
// - Server-only modules (Route Handlers under `app/api/**`, files named
//   `lib/**/server.ts`, migration/scripts/supabase tooling) are excluded from
//   the rule — `SUPABASE_SERVICE_ROLE_KEY` is legitimately read there.

import { createRequire } from "node:module";

import noServiceKeyInClient from "./lib/eslint-rules/no-service-key-in-client.mjs";

// `eslint-config-next` ships as CommonJS flat-config arrays; load them through
// `createRequire` so we can spread them directly into the ESM flat config.
const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypeScript = require("eslint-config-next/typescript");

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // Global ignores — ESLint treats a config object that only contains
  // `ignores` as a global ignore list.
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "pnpm-lock.yaml",
    ],
  },

  // Next.js + React + TypeScript preset from `eslint-config-next`.
  // `core-web-vitals` extends the base config with Core Web Vitals rules;
  // `typescript` layers the TS parser + recommended TS rules on top.
  ...nextCoreWebVitals,
  ...nextTypeScript,

  // Local plugin + rule registration.
  {
    name: "arasya/plugins",
    plugins: {
      arasya: {
        rules: {
          "no-service-key-in-client": noServiceKeyInClient,
        },
      },
    },
  },

  // Enforce R21.8 on every client-reachable source file. The rule runs on
  // the broad glob below and the `ignores` entry carves out server-only
  // modules where `SUPABASE_SERVICE_ROLE_KEY` is legitimately read.
  {
    name: "arasya/no-service-key-in-client",
    files: [
      "app/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "components/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "lib/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "hooks/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "providers/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "content/**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "middleware.ts",
    ],
    ignores: [
      // Server-only surfaces allowed to reference the service-role key.
      "app/api/**",
      "lib/**/server.ts",
      "lib/**/server.tsx",
      "lib/supabase/server.ts",
      "scripts/**",
      "supabase/**",
      // The lint rule itself documents the forbidden identifier in strings
      // and docs comments; exempt it from its own check.
      "lib/eslint-rules/**",
    ],
    rules: {
      "arasya/no-service-key-in-client": "error",
    },
  },
];

export default eslintConfig;
