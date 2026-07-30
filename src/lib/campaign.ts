'use client';

/**
 * Campaign attribution — port of `shared.js campaignTag()`.
 *
 * Ad parameters are captured from the URL on first landing, persisted for the
 * session, and appended to every outbound WhatsApp message as a `[Src: …]`
 * suffix. That suffix is how the ops team ties a conversation back to the
 * campaign that paid for it, so the format is contractual — do not reformat.
 *
 * Client-side by necessity: it reads `location.search` and `sessionStorage`.
 * Statically rendered pages therefore build WhatsApp hrefs without the tag and
 * upgrade them in the browser — see `useWaHref`.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'arasya-campaign';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'] as const;

/** Reads ad params from the URL, merges them into sessionStorage, returns the tag. */
export function campaignTag(): string {
  try {
    const sp = new URLSearchParams(location.search);
    let st: Record<string, string> = {};
    try {
      st = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      /* corrupt entry — start fresh */
    }
    let dirty = false;
    for (const k of PARAMS) {
      const v = sp.get(k);
      if (v) {
        st[k] = String(v).slice(0, 48);
        dirty = true;
      }
    }
    if (dirty) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(st));

    const parts: string[] = [];
    if (st.utm_source) parts.push(st.utm_source + (st.utm_medium ? '/' + st.utm_medium : ''));
    if (st.utm_campaign) parts.push(st.utm_campaign);
    if (st.gclid) parts.push('gclid');
    if (st.fbclid) parts.push('fbclid');
    return parts.join(' · ');
  } catch {
    return '';
  }
}

/** Appends the `[Src: …]` suffix, unless the message already carries one. */
export function withCampaignTag(message: string, tag: string): string {
  if (!tag || String(message).indexOf('[Src:') !== -1) return message;
  return message + ' [Src: ' + tag + ']';
}

/**
 * Rewrites a wa.me href built at build time so its `text` payload carries the
 * campaign suffix. Returns the input unchanged when there is nothing to add.
 */
export function taggedWaHref(href: string, tag: string): string {
  if (!tag) return href;
  try {
    const url = new URL(href);
    const text = url.searchParams.get('text');
    if (!text) return href;
    url.searchParams.set('text', withCampaignTag(text, tag));
    return url.toString();
  } catch {
    return href;
  }
}

/**
 * Resolves the campaign tag after hydration. Empty on the server and on first
 * paint, so the static HTML stays identical across visitors and cacheable.
 */
export function useCampaignTag(): string {
  const [tag, setTag] = useState('');
  useEffect(() => {
    setTag(campaignTag());
  }, []);
  return tag;
}

/** `const wa = useWaHref(); <a href={wa(staticHref)}>` */
export function useWaHref(): (href: string) => string {
  const tag = useCampaignTag();
  return useCallback((href: string) => taggedWaHref(href, tag), [tag]);
}
