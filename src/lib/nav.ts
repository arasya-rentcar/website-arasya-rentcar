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
  /** This link is the page being viewed. Drives `aria-current` and the marker. */
  current?: boolean;
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
export function siteNav(locale: Locale, locations: Location[], activePath?: string): NavItem[] {
  const T = tStr(locale);
  const hub = localeHref(locale, 'sewa-mobil');
  const blog = blogHref();

  /**
   * `activePath` is supplied by the screen rather than read from
   * `usePathname()`. Each screen already knows which page it is, and taking it
   * as data keeps every header a server component — a client hook here would
   * pull the whole nav, and the six city links inside it, into the bundle.
   *
   * Articles mark the Blog item, not a separate one: `/blog/x` is inside the
   * blog as far as a reader is concerned.
   */
  const isActive = (href: string) =>
    activePath === href || (href === blog && Boolean(activePath?.startsWith(blog + '/')));

  const toLink = (l: Location): NavLink => {
    const href = cityHref(l, locale);
    return { label: l.name, href, current: isActive(href) };
  };
  const domestic = locations.filter((l) => l.country === 'ID').map(toLink);
  const overseas = locations.filter((l) => l.country !== 'ID').map(toLink);

  const groups: NavGroup[] = [];
  if (domestic.length) groups.push({ label: T.navAreaDomestic, items: domestic });
  if (overseas.length) groups.push({ label: T.navAreaOverseas, items: overseas });

  // The dropdown is "current" for any page it leads to — a city page or the hub
  // — so the header still says where you are while the menu is closed and the
  // marked city is out of sight.
  const areaCurrent =
    isActive(hub) || domestic.some((l) => l.current) || overseas.some((l) => l.current);

  return [
    { label: T.navBeranda, href: localeHref(locale), current: isActive(localeHref(locale)) },
    {
      label: T.navArea,
      // The summary of a <details> cannot itself be a link, so the hub is
      // reachable from the dropdown's footer instead. That is also the better
      // affordance: the six pages people actually want are one click away, and
      // the hub is there for anyone who wants to compare them side by side.
      href: hub,
      current: areaCurrent,
      groups,
      groupsFooter: { label: T.navAllCities, href: hub, current: isActive(hub) },
    },
    {
      label: T.navTravel,
      href: localeHref(locale, 'travel'),
      current: isActive(localeHref(locale, 'travel')),
    },
    { label: T.navBlog, href: blog, current: isActive(blog) },
  ];
}
