/**
 * PostCSS configuration for Tailwind CSS v4 (design §29.3).
 *
 * Tailwind v4 ships its own high-performance Oxide engine and plugs into the
 * build pipeline through the dedicated `@tailwindcss/postcss` plugin. No
 * `tailwind.config.js` is required — theming is expressed in CSS via `@theme`
 * (see `app/globals.css`, task 2.2).
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
