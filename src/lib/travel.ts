/**
 * Derivations for the /travel charter page — ported from `Travel.dc.html`.
 *
 * Pure functions shared by the tariff checker, the route list, and the JSON-LD
 * builder, so a price shown on screen and a price in an Offer node can never
 * disagree.
 */
import type { Travel, TravelOrigin, TravelRoute, TravelUnit } from '@/types';
import { formatIdr } from './shared';

export function originOf(travel: Travel, key: string): TravelOrigin {
  return travel.origins.find((o) => o.key === key) ?? { key, code: '', name: '' };
}

export function routesFor(travel: Travel, originKey: string): TravelRoute[] {
  return travel.routes.filter((r) => r.origin === originKey);
}

/** Units actually served on a route — a missing price means "not offered". */
export function unitRows(travel: Travel, route: TravelRoute | null): TravelUnit[] {
  if (!route) return [];
  return travel.units.filter((u) => route.prices[u.key] != null);
}

/** e.g. "BGR-CGK" — the ref-code fragment for per-route attribution. */
export function routeCode(travel: Travel, route: TravelRoute): string {
  return originOf(travel, route.origin).code + '-' + String(route.dest).toUpperCase();
}

/** e.g. "Bogor – Bandung". Note the en dash, matching the prototype. */
export function routeLabel(travel: Travel, route: TravelRoute): string {
  return originOf(travel, route.origin).name + ' – ' + route.destName;
}

export function priceLabel(n: number | null | undefined): string {
  return n == null ? '—' : (formatIdr(n) as string);
}

/** Unit photos reuse the fleet's with-logo set. */
export function unitImage(u: TravelUnit): string | undefined {
  if (!u.img) return undefined;
  if (u.img.startsWith('/') || /^https?:\/\//.test(u.img)) return u.img;
  if (u.img.includes('/')) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return base ? `${base}/storage/v1/object/public/${u.img}` : u.img;
  }
  return `/assets/cars-with-logo/${u.img}.webp`;
}

export interface RouteMessageStrings {
  waRoutePre: string;
  waRouteUnit: string;
  waRoutePrice: string;
  waRoutePost: string;
}

/** Builds the per-route WhatsApp body. Wording is contractual — ops matches on it. */
export function routeMessage(
  travel: Travel,
  route: TravelRoute,
  unit: TravelUnit,
  s: RouteMessageStrings
): string {
  return (
    s.waRoutePre +
    routeLabel(travel, route) +
    s.waRouteUnit +
    unit.name +
    s.waRoutePrice +
    priceLabel(route.prices[unit.key]) +
    s.waRoutePost
  );
}

/** Every place the charter serves, for AutoRental/Service `areaServed`. */
export function travelAreaServed(travel: Travel): string[] {
  return Array.from(
    new Set(travel.routes.flatMap((r) => [originOf(travel, r.origin).name, r.destName]))
  ).filter(Boolean);
}

/** One Offer per route, priced at its cheapest served unit. */
export function travelOffers(travel: Travel) {
  return travel.routes.map((r) => {
    const prices = Object.values(r.prices).filter((n): n is number => typeof n === 'number');
    return { label: routeLabel(travel, r), minPrice: Math.min(...prices) };
  });
}
