"use client";

import { useEffect } from "react";

export interface ThirdPartyChatWidgetProps {
  /** Whether the user has given analytics/cookie consent. Default false. */
  readonly consentGiven?: boolean;
}

/**
 * Optional third-party chat widget (R13.4).
 *
 * Loads a script tag for a configured chat widget vendor (Crisp, Tawk,
 * Intercom, etc.) only when:
 *   1. The env var `NEXT_PUBLIC_CHAT_WIDGET_SCRIPT_URL` is set, AND
 *   2. The user has given consent (`consentGiven === true`)
 *
 * When either condition is false, returns null and emits no network
 * request. The widget script is appended to <head> via DOM in a
 * useEffect so it runs only on the client and after consent is granted.
 *
 * Defense-in-depth: both the env var gate and the consent gate must
 * pass independently. Removing either gate must not cause the widget
 * to load — the env var alone is insufficient (R13.4 + Phase 11
 * cookie-consent gate). This satisfies the "consent OR env unset =
 * no script" requirement that pairs with the cookie consent banner
 * built in task 11.2.
 *
 * Mounting integration point: this component is intentionally NOT
 * mounted in `app/[locale]/layout.tsx` by this task. Mounting requires
 * the cookie consent context produced by Phase 11 (see task 11.2).
 * Once that context exists, the parent layout should render
 * `<ThirdPartyChatWidget consentGiven={consent === "granted"} />`
 * inside the `<body>` so this component can hydrate on the client.
 *
 * The script URL is the only configurable input. Vendor-specific init
 * (e.g. window.$crisp = []) must happen via the script itself or via
 * a separate inline script tag — this component does NOT inject
 * vendor-specific globals.
 *
 * Cleanup: on unmount, the script tag is removed from <head>. The
 * widget itself may have left global state in window; we make a
 * best-effort but cannot fully unload all third-party widgets.
 */
export default function ThirdPartyChatWidget({
  consentGiven = false,
}: ThirdPartyChatWidgetProps): React.JSX.Element | null {
  const scriptUrl = process.env.NEXT_PUBLIC_CHAT_WIDGET_SCRIPT_URL;

  useEffect(() => {
    if (!consentGiven) return;
    if (typeof scriptUrl !== "string" || scriptUrl.length === 0) return;
    if (typeof document === "undefined") return;

    // Avoid double-loading the script
    const existing = document.querySelector(
      `script[data-chat-widget="${scriptUrl}"]`,
    );
    if (existing !== null) return;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-chat-widget", scriptUrl);
    document.head.appendChild(script);

    return () => {
      // Best-effort cleanup. The widget may have already attached
      // global state we cannot fully undo, but removing the script tag
      // prevents new initialization on next mount.
      const node = document.querySelector(
        `script[data-chat-widget="${scriptUrl}"]`,
      );
      if (node !== null && node.parentNode !== null) {
        node.parentNode.removeChild(node);
      }
    };
  }, [consentGiven, scriptUrl]);

  // Component renders nothing — the script attaches the widget UI to
  // its own DOM container managed by the vendor.
  return null;
}
