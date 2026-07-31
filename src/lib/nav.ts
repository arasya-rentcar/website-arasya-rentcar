/**
 * The site navigation — one definition, used by every header.
 *
 * There used to be five. Home offered Armada/Layanan/Kota/Travel/Blog, city
 * pages Beranda/Armada/FAQ/Travel/Blog, the hub four items, /travel a different
 * five, and the blog ran its own header component with three. Each was locally
 * reasonable and the set was incoherent: the same site changed shape as you
 * moved through it, and no page could tell you what the others were.
 *
 * Deriving it here means `SiteHeader` and `BlogHeader` cannot drift again, and
 * that in-page anchors are gone from the nav — they were what made every page
 * different, since every page has different sections. `PageAnchors` puts them
 * back where they belong: on the page, under the hero, listing that page's own
 * sections.
 *
 * The labels come from STR alone rather than each screen's own dictionary. The
 * nav is identical everywhere, so it must read from one place or the three
 * dictionaries will disagree about what to call the same link.
 */
import type { Locale, Location } from '@/types';
import { t as tStr } from './i18n';
import { blogHref, cityHref, localeHref } from './localize';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export interface NavItem extends NavLink {
  /** Rendered as a dropdown rather than a plain link. */
  groups?: NavGroup[];
  /** Shown at the foot of the dropdown, e.g. "Semua Kota Layanan →". */
  groupsFooter?: NavLink;
}

/**
 * `locations` is every published entry, in registry order.
 *
 * Indonesia first. The overseas pages exist because Indonesians travel abroad,
 * so the home market is both the commercial priority and the higher-volume
 * search target — it should not sit below Singapore in a menu.
 */
export function siteNav(locale: Locale, locations: Location[]): NavItem[] {
  const T = tStr(locale);

  const toLink = (l: Location): NavLink => ({ label: l.name, href: cityHref(l, locale) });
  const domestic = locations.filter((l) => l.country === 'ID').map(toLink);
  const overseas = locations.filter((l) => l.country !== 'ID').map(toLink);

  const groups: NavGroup[] = [];
  if (domestic.length) groups.push({ label: T.navAreaDomestic, items: domestic });
  if (overseas.length) groups.push({ label: T.navAreaOverseas, items: overseas });

  return [
    { label: T.navBeranda, href: localeHref(locale) },
    {
      label: T.navArea,
      // The summary of a <details> cannot itself be a link, so the hub is
      // reachable from the dropdown's footer instead. That is also the better
      // affordance: the six pages people actually want are one click away, and
      // the hub is there for anyone who wants to compare them side by side.
      href: localeHref(locale, 'sewa-mobil'),
      groups,
      groupsFooter: { label: T.navAllCities, href: localeHref(locale, 'sewa-mobil') },
    },
    { label: T.navTravel, href: localeHref(locale, 'travel') },
    { label: T.navBlog, href: blogHref() },
  ];
}
