/**
 * Locale-keyed label dictionary used by the WhatsApp_Handler
 * (`lib/whatsapp/handler.ts`) to compose prefilled `wa.me` messages from
 * a validated Booking_Form payload (design §15).
 *
 * Requirements:
 * - R11.2 The WhatsApp_Handler SHALL read the official Admin number
 *   exclusively from the configured environment variable. (This module
 *   does NOT read env vars; it only owns localized strings.)
 * - R11.4 The prefilled WhatsApp message SHALL include, each on its own
 *   line in the current Locale with a translated label followed by `: `,
 *   greeting + name + WhatsApp number + pickup city + pickup location +
 *   destination (when non-empty) + pickup date + pickup time + rental
 *   duration + passengers + preferred vehicle (when non-empty) + trip
 *   type + notes (when non-empty). All labels for those fields live
 *   here.
 *
 * The `serviceTypeValues` map is keyed by the *schema enum* values from
 * {@link "@/lib/booking/schema".tripTypeEnum} (`airport_transfer`,
 * `corporate`, `city_tour`, `wedding`, `out_of_city`, `other`) so the
 * handler can do a direct lookup by `form.tripType` without an extra
 * snake_case → camelCase conversion step.
 *
 * Pure module: no I/O, no env reads, no React imports. Safe for both
 * client and server bundles.
 */

import type { Locale } from "@/lib/content";

/**
 * Localized labels for every line in a Booking_Form WhatsApp message.
 *
 * The label keys are camelCase (TypeScript-friendly), but the
 * `serviceTypeValues` keys mirror the booking schema's `tripTypeEnum`
 * snake_case strings exactly so the WhatsApp_Handler can map a parsed
 * `tripType` value to its localized display string with a single
 * lookup. Adding a new trip type to the schema requires a matching
 * entry here.
 */
export interface WhatsAppLabels {
  /** First line of the prefilled message. Sets a friendly tone and
   *  identifies the recipient as the official Arasya admin. */
  readonly greeting: string;
  /** Label for `fullName` (R11.4). */
  readonly fullName: string;
  /** Label for `whatsappNumber` (R11.4). */
  readonly whatsappNumber: string;
  /** Label for `pickupCity` (R11.4). */
  readonly pickupCity: string;
  /** Label for `pickupLocation` (R11.4). */
  readonly pickupLocation: string;
  /** Label for the optional `destination` field (R11.4). The schema
   *  field is named "destination"; the user-facing label uses
   *  "drop-off / tujuan" because that is how Visitors describe it. */
  readonly dropoffLocation: string;
  /** Label for `pickupDate` rendered as `YYYY-MM-DD` (R11.4). */
  readonly pickupDate: string;
  /** Label for `pickupTime` rendered as `HH:mm` (R11.4). */
  readonly pickupTime: string;
  /** Label for the `rentalDuration` enum (R11.4). The handler renders
   *  the raw enum value next to it; localizing the *label* is sufficient
   *  per R11.2. */
  readonly rentalDuration: string;
  /** Label for `passengers` (R11.4). The schema field is numeric;
   *  the user-facing label says "passenger count" for clarity. */
  readonly passengerCount: string;
  /** Label for the optional `preferredVehicle` field (R11.4). */
  readonly preferredVehicle: string;
  /** Label for `tripType`, displayed alongside the localized value
   *  resolved through {@link WhatsAppLabels.serviceTypeValues}. */
  readonly serviceType: string;
  /** Label for the optional `notes` field (R11.4). */
  readonly notes: string;
  /**
   * Localized display strings for each `tripTypeEnum` value defined in
   * `lib/booking/schema.ts`. Keys are the schema's snake_case values
   * verbatim so the handler can look up `form.tripType` directly with
   * no key conversion.
   */
  readonly serviceTypeValues: {
    readonly airport_transfer: string;
    readonly corporate: string;
    readonly city_tour: string;
    readonly wedding: string;
    readonly out_of_city: string;
    readonly other: string;
  };
  /** Polite closing line appended at the end of the message body. */
  readonly closingPolite: string;
}

/**
 * The locale → labels map (R11.4).
 *
 * Indonesian copy uses formal-but-friendly register (Anda-form,
 * "Halo Admin Arasya"). English copy uses a professional register
 * suitable for international visitors.
 *
 * Adding a new Locale requires a new entry here; TypeScript will fail
 * the build if any locale is missing because the index signature is
 * `Record<Locale, WhatsAppLabels>`.
 */
export const WHATSAPP_LABELS: Record<Locale, WhatsAppLabels> = {
  id: {
    greeting: "Halo Admin Arasya,",
    fullName: "Nama lengkap",
    whatsappNumber: "Nomor WhatsApp",
    pickupCity: "Kota penjemputan",
    pickupLocation: "Lokasi penjemputan",
    dropoffLocation: "Tujuan",
    pickupDate: "Tanggal penjemputan",
    pickupTime: "Jam penjemputan",
    rentalDuration: "Durasi sewa",
    passengerCount: "Jumlah penumpang",
    preferredVehicle: "Armada pilihan",
    serviceType: "Jenis layanan",
    notes: "Catatan",
    serviceTypeValues: {
      airport_transfer: "Transfer bandara",
      corporate: "Sewa korporat",
      city_tour: "Tur dalam kota",
      wedding: "Sewa pernikahan",
      out_of_city: "Sewa luar kota",
      other: "Lainnya",
    },
    closingPolite: "Mohon konfirmasi ketersediaan. Terima kasih.",
  },
  en: {
    greeting: "Hi Arasya admin,",
    fullName: "Full name",
    whatsappNumber: "WhatsApp number",
    pickupCity: "Pickup city",
    pickupLocation: "Pickup location",
    dropoffLocation: "Drop-off",
    pickupDate: "Pickup date",
    pickupTime: "Pickup time",
    rentalDuration: "Rental duration",
    passengerCount: "Passenger count",
    preferredVehicle: "Preferred vehicle",
    serviceType: "Service type",
    notes: "Notes",
    serviceTypeValues: {
      airport_transfer: "Airport transfer",
      corporate: "Corporate rental",
      city_tour: "City tour",
      wedding: "Wedding rental",
      out_of_city: "Out-of-town rental",
      other: "Other",
    },
    closingPolite: "Please confirm availability. Thank you.",
  },
};
