/**
 * ESLint rule: no-service-key-in-client
 *
 * Enforces Requirement R21.8: `SUPABASE_SERVICE_ROLE_KEY` and the server-only
 * Supabase client factory (`supabaseService` from `lib/supabase/server`) must
 * never be referenced from any file that is reachable from a Client Component
 * boundary (i.e., code that ships to the browser).
 *
 * What this rule flags in files it runs on:
 *   1. Any `MemberExpression` that reads `process.env.SUPABASE_SERVICE_ROLE_KEY`.
 *   2. Any `ImportDeclaration` whose source resolves to the server-only
 *      Supabase factory module (`lib/supabase/server`, `@/lib/supabase/server`,
 *      or a relative path ending in `supabase/server`).
 *   3. Any `ImportSpecifier` importing the `supabaseService` symbol.
 *   4. Any string literal or template literal that contains the token
 *      `SUPABASE_SERVICE_ROLE_KEY` (catches dynamic `process.env["…"]` lookups,
 *      `new URL("…SUPABASE_SERVICE_ROLE_KEY…")`, docs strings, etc.).
 *
 * Scope of "client-reachable" is controlled by the flat-config `files` /
 * `ignores` globs (see `eslint.config.mjs`). This rule does not maintain its
 * own hard-coded path allowlist; the flat-config file filter is the source of
 * truth. A build-time transitive-import check (design §22) complements this
 * rule.
 *
 * References:
 *   - Requirement R21.8 (requirements.md, Requirement 21 criterion 8)
 *   - Design §22 "Supabase Client Factory"
 */

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow references to SUPABASE_SERVICE_ROLE_KEY or the server-only Supabase factory in client-reachable modules (R21.8).",
      recommended: true,
      url: "https://github.com/arasya-rentcar/website/blob/main/.kiro/specs/arasya-rentcar-website/design.md#22-supabase-client-factory-r217-r218",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          serverModulePatterns: {
            type: "array",
            items: { type: "string" },
            description:
              "Regex patterns (strings) matched against import sources to identify the server-only Supabase factory module.",
          },
          serverSymbolNames: {
            type: "array",
            items: { type: "string" },
            description:
              "Named exports from the server module that must not be imported in client-reachable code.",
          },
        },
      },
    ],
    messages: {
      processEnvAccess:
        "R21.8 violation: `process.env.SUPABASE_SERVICE_ROLE_KEY` must not be referenced from client-reachable code. Move the access into a server-only module (see design §22).",
      importFromServerModule:
        "R21.8 violation: importing the server-only Supabase factory (`{{source}}`) from a client-reachable module is forbidden. Use `lib/supabase/client` for browser reads; server writes belong in Route Handlers only (design §22).",
      importServerSymbol:
        "R21.8 violation: `{{name}}` is a server-only Supabase symbol and must not be imported from client-reachable code (design §22).",
      literalMentionsKey:
        "R21.8 violation: the identifier `SUPABASE_SERVICE_ROLE_KEY` must not appear in client-reachable code, even as a string. Route secrets through a server-only module (design §22).",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const serverModulePatterns = (
      options.serverModulePatterns ?? [
        // "@/lib/supabase/server", "lib/supabase/server",
        // "./…/supabase/server", "../…/supabase/server"
        "^(?:@/)?(?:\\.{1,2}/)?(?:.*/)?lib/supabase/server(?:\\.(?:ts|tsx|js|mjs|cjs))?$",
        "^(?:\\.{1,2}/)+(?:.*/)?supabase/server(?:\\.(?:ts|tsx|js|mjs|cjs))?$",
      ]
    ).map((p) => new RegExp(p));
    const serverSymbolNames = new Set(
      options.serverSymbolNames ?? ["supabaseService"],
    );

    const KEY_TOKEN = "SUPABASE_SERVICE_ROLE_KEY";

    function sourceMatchesServerModule(sourceValue) {
      if (typeof sourceValue !== "string") return false;
      return serverModulePatterns.some((re) => re.test(sourceValue));
    }

    function checkLiteralNode(node, rawValue) {
      if (typeof rawValue !== "string") return;
      if (rawValue.includes(KEY_TOKEN)) {
        context.report({ node, messageId: "literalMentionsKey" });
      }
    }

    return {
      // 1. process.env.SUPABASE_SERVICE_ROLE_KEY
      MemberExpression(node) {
        const { object, property, computed } = node;

        // Detect `process.env.X`
        const isProcessEnv =
          object &&
          object.type === "MemberExpression" &&
          !object.computed &&
          object.object &&
          object.object.type === "Identifier" &&
          object.object.name === "process" &&
          object.property &&
          object.property.type === "Identifier" &&
          object.property.name === "env";

        if (!isProcessEnv) return;

        // Non-computed: process.env.SUPABASE_SERVICE_ROLE_KEY
        if (
          !computed &&
          property &&
          property.type === "Identifier" &&
          property.name === KEY_TOKEN
        ) {
          context.report({ node, messageId: "processEnvAccess" });
          return;
        }

        // Computed: process.env["SUPABASE_SERVICE_ROLE_KEY"]
        if (
          computed &&
          property &&
          property.type === "Literal" &&
          property.value === KEY_TOKEN
        ) {
          context.report({ node, messageId: "processEnvAccess" });
        }
      },

      // 2 & 3. import … from "<server module>" / import { supabaseService } …
      ImportDeclaration(node) {
        const sourceValue = node.source && node.source.value;
        if (sourceMatchesServerModule(sourceValue)) {
          context.report({
            node: node.source,
            messageId: "importFromServerModule",
            data: { source: String(sourceValue) },
          });
        }
        for (const spec of node.specifiers ?? []) {
          if (
            spec.type === "ImportSpecifier" &&
            spec.imported &&
            spec.imported.type === "Identifier" &&
            serverSymbolNames.has(spec.imported.name)
          ) {
            context.report({
              node: spec,
              messageId: "importServerSymbol",
              data: { name: spec.imported.name },
            });
          }
        }
      },

      // Also cover dynamic `import("…/lib/supabase/server")`.
      ImportExpression(node) {
        if (
          node.source &&
          node.source.type === "Literal" &&
          sourceMatchesServerModule(node.source.value)
        ) {
          context.report({
            node: node.source,
            messageId: "importFromServerModule",
            data: { source: String(node.source.value) },
          });
        }
      },

      // And `require("…/lib/supabase/server")`.
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "Literal" &&
          sourceMatchesServerModule(node.arguments[0].value)
        ) {
          context.report({
            node: node.arguments[0],
            messageId: "importFromServerModule",
            data: { source: String(node.arguments[0].value) },
          });
        }
      },

      // 4. Any string literal or template literal containing the token.
      Literal(node) {
        checkLiteralNode(node, node.value);
      },
      TemplateElement(node) {
        // Template literals — check raw cooked text of each chunk.
        const cooked = node.value && node.value.cooked;
        if (typeof cooked === "string" && cooked.includes(KEY_TOKEN)) {
          context.report({ node, messageId: "literalMentionsKey" });
        }
      },
    };
  },
};

export default rule;
