"use client";

import { useState } from "react";
import {
  useForm,
  type FieldError,
  type SubmitErrorHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trackBookingFormError } from "@/lib/analytics/events";
import {
  bookingSchema,
  type BookingInput,
  type BookingParsed,
} from "@/lib/booking/schema";
import type { Locale } from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { WHATSAPP_LABELS } from "@/lib/whatsapp/labels";

/**
 * BookingForm — client-side Booking_Form rendering surface
 * (R10.1–R10.15, R15.4 + design §14, §29.5).
 *
 * Validates user input inline against {@link bookingSchema} via
 * `@hookform/resolvers/zod`, surfaces field-level errors with
 * `aria-invalid` + `aria-describedby` wiring (R15.4), and delegates the
 * actual submission to a parent-provided `onSubmit` callback. Network
 * I/O (`/api/booking`), the `wa.me` open, and post-submit navigation
 * belong to task 8.17 — this component stays I/O-free so it can be
 * unit-tested without a network or a router.
 *
 * The schema's `whatsappNumber` field carries a transform that emits a
 * branded `+62…` E.164 string on success, so the `data` argument the
 * parent receives is already canonicalised.
 *
 * The honeypot input (`name="website"`) is rendered absolutely
 * off-screen but kept tab-able by bots that walk the DOM. When it is
 * non-empty on submit the handler silently no-ops (R12.7 / R19.7) — no
 * error is shown, no callback fires.
 *
 * Locale-aware label / option strings come from two sources:
 *   - {@link WHATSAPP_LABELS} for the `tripType` enum display strings,
 *     because that map is the single source of truth used by the
 *     WhatsApp_Handler when it composes the prefilled message — keeping
 *     the form picker and the WhatsApp message in lock-step avoids a
 *     "Sewa pernikahan" / "Wedding rental" mismatch between what the
 *     visitor selected and what the Admin sees.
 *   - Inline `id` / `en` ternaries for everything else (field labels,
 *     section legends, rental-duration display strings).
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BookingFormProps {
  readonly locale: Locale;
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
  /**
   * Optional initial values for prefill. CoverageTemplate passes the
   * visitor's city of interest as `pickupCity`; city / vehicle pages
   * pre-select `preferredVehicle`.
   */
  readonly defaults?: Partial<BookingInput>;
  /**
   * Called when the form is submitted with valid, parsed values. Task
   * 8.17 will pass an async function that posts to `/api/booking` and
   * navigates to the confirmation screen.
   */
  readonly onSubmit: (values: BookingParsed) => Promise<void> | void;
  /**
   * Whether the form is currently submitting. Disables inputs and
   * swaps the submit button label to a localized progress copy.
   */
  readonly isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Localized error copy (covers every machine code emitted by the schema)
// ---------------------------------------------------------------------------

/**
 * Schema-emitted error codes that this component knows how to localise.
 * Anything outside this set falls through to the schema's English text
 * via the `?? msg` fallback in {@link localizeError}.
 */
type ErrorCode =
  | "invalid_phone"
  | "invalid_phone_e164"
  | "fullName_digits_only"
  | "invalid_date_format"
  | "date_in_past"
  | "invalid_time_format"
  | "need_2h_lead";

const ERROR_COPY: Record<Locale, Record<ErrorCode, string>> = {
  id: {
    invalid_phone: "Nomor WhatsApp tidak valid.",
    invalid_phone_e164: "Nomor WhatsApp tidak valid.",
    fullName_digits_only: "Nama tidak boleh hanya angka.",
    invalid_date_format: "Format tanggal tidak valid.",
    date_in_past: "Tanggal tidak boleh di masa lalu.",
    invalid_time_format: "Format jam tidak valid.",
    need_2h_lead: "Waktu penjemputan minimal 2 jam dari sekarang (WIB).",
  },
  en: {
    invalid_phone: "WhatsApp number is invalid.",
    invalid_phone_e164: "WhatsApp number is invalid.",
    fullName_digits_only: "Name cannot be digits only.",
    invalid_date_format: "Invalid date format.",
    date_in_past: "Date cannot be in the past.",
    invalid_time_format: "Invalid time format.",
    need_2h_lead: "Pickup must be at least 2 hours from now (WIB).",
  },
};

/**
 * Translate a raw RHF/Zod error message into a user-facing string.
 *
 * The schema emits machine-readable keys (`invalid_phone`,
 * `date_in_past`, `need_2h_lead`, …) for every project-specific check,
 * so this layer can localise them without re-running the validator.
 * Zod's default messages (e.g. "Required", "String must contain at
 * least 3 character(s)") pass through unchanged via the `?? msg`
 * fallback.
 */
function localizeError(
  msg: string | undefined,
  locale: Locale,
): string | undefined {
  if (!msg) return undefined;
  const copy = ERROR_COPY[locale] as Record<string, string>;
  return copy[msg] ?? msg;
}

// ---------------------------------------------------------------------------
// Static option ordering (parallels schema enums)
// ---------------------------------------------------------------------------

/**
 * Ordered list of `rentalDuration` options. Mirrors `rentalDurationEnum`
 * keys so adding a new tier is a compile-time error here (the
 * `Record` is exhaustive).
 */
const RENTAL_DURATION_ORDER: ReadonlyArray<BookingInput["rentalDuration"]> = [
  "half_day_4h",
  "full_day_10h",
  "overnight_24h",
  "multi_day",
];

const RENTAL_DURATION_LABELS: Record<
  BookingInput["rentalDuration"],
  Record<Locale, string>
> = {
  half_day_4h: { id: "Setengah hari (4 jam)", en: "Half day (4 hours)" },
  full_day_10h: { id: "Sehari penuh (10 jam)", en: "Full day (10 hours)" },
  overnight_24h: { id: "Menginap (24 jam)", en: "Overnight (24 hours)" },
  multi_day: { id: "Beberapa hari", en: "Multi-day" },
};

/**
 * Ordered list of `tripType` options. Mirrors the order used in
 * `WHATSAPP_LABELS[locale].serviceTypeValues` so the picker reads
 * naturally (transfer → corporate → tour → wedding → out-of-city →
 * other).
 */
const TRIP_TYPE_ORDER: ReadonlyArray<BookingInput["tripType"]> = [
  "airport_transfer",
  "corporate",
  "city_tour",
  "wedding",
  "out_of_city",
  "other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Today's date in `YYYY-MM-DD` form, used as the `min` attribute of the
 * pickup-date input. UX hint only — the schema independently enforces
 * the Asia/Jakarta lower bound at parse time (R10.7), so a host whose
 * system clock differs from Jakarta by a few hours cannot let an
 * actually-past date through.
 */
function todayIso(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

/**
 * Shared className for native `<select>` elements. Mirrors the look of
 * the shadcn `<Input>` so the form reads as a single visual family.
 */
const SELECT_CLASS =
  "border-[var(--input)] aria-invalid:border-[var(--destructive)] aria-invalid:ring-[var(--destructive)]/20 focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/50 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingForm(
  props: BookingFormProps,
): React.JSX.Element {
  const { locale, dict, defaults, onSubmit, isSubmitting = false } = props;
  const isId = locale === "id";
  const labels = WHATSAPP_LABELS[locale];

  // Honeypot state. Not registered with RHF — the schema doesn't model
  // this field, and keeping it out of `BookingParsed` means a bot's
  // value never lands in the parsed payload.
  const [honeypot, setHoneypot] = useState("");

  // RHF setup. Three type parameters: TFieldValues (raw form state) /
  // TContext (unused) / TTransformedValues (post-zod payload). The
  // third parameter is what `handleSubmit` hands to the success
  // callback when validation passes — it carries the branded E.164
  // phone, etc.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingInput, unknown, BookingParsed>({
    resolver: zodResolver(bookingSchema),
    // `onTouched` matches the project's "respond after the user
    // finishes interacting" UX: errors don't appear while typing the
    // first character, but do refresh on every keystroke after a blur.
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      whatsappNumber: "",
      pickupCity: "",
      pickupLocation: "",
      destination: "",
      pickupDate: "",
      pickupTime: "",
      passengers: 1,
      preferredVehicle: "",
      notes: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      sourcePage: "",
      // Caller defaults next so they win over the seed values for any
      // field the caller pre-fills (e.g. CoverageTemplate passing
      // `pickupCity`).
      ...defaults,
      // `locale` is pinned *after* the spread: it is fixed by the
      // rendering page, so a stale `defaults.locale` must never win
      // over the actual locale the schema's enum will be checked
      // against.
      locale,
    },
  });

  /**
   * RHF success handler. Drops bot submissions silently when the
   * honeypot is non-empty, otherwise forwards the parsed payload to
   * the parent. `data` is the post-zod `BookingParsed` shape because
   * we declared `useForm<BookingInput, unknown, BookingParsed>` above.
   */
  const onValid = async (data: BookingParsed): Promise<void> => {
    if (honeypot.trim() !== "") {
      // Silent drop (R12.7 / R19.7). No error UI, no callback, no
      // analytics. We also clear the honeypot so a frustrated bot
      // doesn't keep tripping the same submission state.
      setHoneypot("");
      return;
    }
    await onSubmit(data);
  };

  /**
   * RHF failure handler. Fires one `booking_form_error` analytics
   * event per offending field (R18.4). The rejected input value is
   * deliberately not included — only the field name and the active
   * locale travel with the event, per the requirement and the typed
   * helper signature in `lib/analytics/events.ts`.
   *
   * Each `trackBookingFormError` call is wrapped in a try/catch so a
   * misbehaving analytics layer can never block the user from seeing
   * the actual field errors RHF surfaces alongside this handler.
   */
  const onInvalid: SubmitErrorHandler<BookingInput> = (formErrors) => {
    for (const fieldName of Object.keys(formErrors)) {
      try {
        trackBookingFormError({ locale, field_name: fieldName });
      } catch (err) {
        console.error("[bookingForm] error event failed", err);
      }
    }
  };

  // ---------------------------------------------------------------------
  // Locale-scoped UI strings
  // ---------------------------------------------------------------------
  const t = isId
    ? {
        formAriaLabel: "Formulir pemesanan",
        sectionContact: "Informasi kontak",
        sectionTrip: "Detail perjalanan",
        sectionService: "Preferensi layanan",
        fullName: "Nama lengkap",
        whatsappNumber: "Nomor WhatsApp",
        whatsappHint: "Format: 08123456789 atau +628123456789",
        pickupCity: "Kota penjemputan",
        pickupLocation: "Lokasi penjemputan",
        destination: "Tujuan",
        destinationHint: "Opsional",
        pickupDate: "Tanggal penjemputan",
        pickupTime: "Jam penjemputan",
        rentalDuration: "Durasi sewa",
        rentalDurationPlaceholder: "Pilih durasi",
        passengers: "Jumlah penumpang",
        preferredVehicle: "Armada pilihan",
        preferredVehicleHint: "Opsional",
        tripType: "Jenis layanan",
        tripTypePlaceholder: "Pilih jenis layanan",
        notes: "Catatan",
        notesHint: "Opsional, maks. 500 karakter",
        submitting: "Mengirim...",
      }
    : {
        formAriaLabel: "Booking form",
        sectionContact: "Contact information",
        sectionTrip: "Trip details",
        sectionService: "Service preferences",
        fullName: "Full name",
        whatsappNumber: "WhatsApp number",
        whatsappHint: "Format: 08123456789 or +628123456789",
        pickupCity: "Pickup city",
        pickupLocation: "Pickup location",
        destination: "Destination",
        destinationHint: "Optional",
        pickupDate: "Pickup date",
        pickupTime: "Pickup time",
        rentalDuration: "Rental duration",
        rentalDurationPlaceholder: "Select duration",
        passengers: "Passenger count",
        preferredVehicle: "Preferred vehicle",
        preferredVehicleHint: "Optional",
        tripType: "Service type",
        tripTypePlaceholder: "Select service type",
        notes: "Notes",
        notesHint: "Optional, max 500 characters",
        submitting: "Submitting...",
      };

  // Field-id helper. A static prefix is enough — there is no realistic
  // case where two booking forms share a single page.
  const fid = (name: string) => `bf-${name}`;
  const eid = (name: string) => `bf-${name}-error`;
  const hid = (name: string) => `bf-${name}-hint`;

  /**
   * Build the `aria-describedby` token list for a field that may carry
   * a hint paragraph, an error message, or both (R15.4). Returns
   * `undefined` when neither applies so the attribute is omitted from
   * the DOM rather than rendered as an empty string — assistive tech
   * still tries to resolve an empty `aria-describedby`, and the
   * resulting "no element with that id" warnings clutter axe runs.
   */
  const describedBy = (
    name: string,
    opts: { hasHint: boolean; hasError: boolean },
  ): string | undefined => {
    const ids = [
      opts.hasHint ? hid(name) : null,
      opts.hasError ? eid(name) : null,
    ].filter((v): v is string => v !== null);
    return ids.length > 0 ? ids.join(" ") : undefined;
  };

  /** Resolve a field error to its localised message, if any. */
  const errMsg = (err: FieldError | undefined): string | undefined =>
    localizeError(err?.message, locale);

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit(onValid, onInvalid)}
      noValidate
      className="flex flex-col gap-8"
      aria-label={t.formAriaLabel}
    >
      {/*
       * Hidden locale field. Registered so the value lands in the
       * submitted payload alongside the rest of the form state, but
       * never shown in UI — locale is fixed by the rendering page.
       */}
      <input type="hidden" {...register("locale")} />

      {/*
       * Honeypot. Off-screen via inline `position:absolute; left:-9999px`
       * so sighted users never see it; tab-able to a determined bot
       * that walks the DOM. `aria-hidden` + `tabIndex={-1}` keep AT
       * users out of it. Not registered with RHF — controlled by
       * `useState` so its value never lands in `BookingParsed`.
       */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      />

      {/* ---------------------------------------------------------------
       * Section 1 — Contact information (R10.1, R10.2, R10.3)
       * ------------------------------------------------------------- */}
      <fieldset disabled={isSubmitting} className="space-y-4 border-0 p-0">
        <legend className="text-base font-semibold text-[var(--foreground)]">
          {t.sectionContact}
        </legend>

        <div className="space-y-2">
          <label
            htmlFor={fid("fullName")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.fullName}
          </label>
          <Input
            id={fid("fullName")}
            type="text"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? eid("fullName") : undefined}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p
              id={eid("fullName")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.fullName)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={fid("whatsappNumber")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.whatsappNumber}
          </label>
          <Input
            id={fid("whatsappNumber")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08123456789"
            aria-invalid={!!errors.whatsappNumber}
            aria-describedby={describedBy("whatsappNumber", {
              hasHint: true,
              hasError: !!errors.whatsappNumber,
            })}
            {...register("whatsappNumber")}
          />
          <p
            id={hid("whatsappNumber")}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {t.whatsappHint}
          </p>
          {errors.whatsappNumber ? (
            <p
              id={eid("whatsappNumber")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.whatsappNumber)}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* ---------------------------------------------------------------
       * Section 2 — Trip details (R10.4–R10.10)
       * ------------------------------------------------------------- */}
      <fieldset disabled={isSubmitting} className="space-y-4 border-0 p-0">
        <legend className="text-base font-semibold text-[var(--foreground)]">
          {t.sectionTrip}
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={fid("pickupCity")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.pickupCity}
            </label>
            <Input
              id={fid("pickupCity")}
              type="text"
              autoComplete="address-level2"
              aria-invalid={!!errors.pickupCity}
              aria-describedby={
                errors.pickupCity ? eid("pickupCity") : undefined
              }
              {...register("pickupCity")}
            />
            {errors.pickupCity ? (
              <p
                id={eid("pickupCity")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.pickupCity)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={fid("pickupLocation")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.pickupLocation}
            </label>
            <Input
              id={fid("pickupLocation")}
              type="text"
              autoComplete="street-address"
              aria-invalid={!!errors.pickupLocation}
              aria-describedby={
                errors.pickupLocation ? eid("pickupLocation") : undefined
              }
              {...register("pickupLocation")}
            />
            {errors.pickupLocation ? (
              <p
                id={eid("pickupLocation")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.pickupLocation)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={fid("destination")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.destination}
          </label>
          <Input
            id={fid("destination")}
            type="text"
            aria-invalid={!!errors.destination}
            aria-describedby={describedBy("destination", {
              hasHint: true,
              hasError: !!errors.destination,
            })}
            {...register("destination")}
          />
          <p
            id={hid("destination")}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {t.destinationHint}
          </p>
          {errors.destination ? (
            <p
              id={eid("destination")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.destination)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={fid("pickupDate")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.pickupDate}
            </label>
            <Input
              id={fid("pickupDate")}
              type="date"
              min={todayIso()}
              aria-invalid={!!errors.pickupDate}
              aria-describedby={
                errors.pickupDate ? eid("pickupDate") : undefined
              }
              {...register("pickupDate")}
            />
            {errors.pickupDate ? (
              <p
                id={eid("pickupDate")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.pickupDate)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={fid("pickupTime")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.pickupTime}
            </label>
            <Input
              id={fid("pickupTime")}
              type="time"
              aria-invalid={!!errors.pickupTime}
              aria-describedby={
                errors.pickupTime ? eid("pickupTime") : undefined
              }
              {...register("pickupTime")}
            />
            {errors.pickupTime ? (
              <p
                id={eid("pickupTime")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.pickupTime)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor={fid("rentalDuration")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.rentalDuration}
            </label>
            {/*
             * Native <select>: register-able directly through RHF, no
             * Controller wrapper needed. The blank first <option>
             * surfaces the placeholder until the user picks; the
             * schema's enum check rejects the blank value at parse
             * time.
             */}
            <select
              id={fid("rentalDuration")}
              className={SELECT_CLASS}
              aria-invalid={!!errors.rentalDuration}
              aria-describedby={
                errors.rentalDuration ? eid("rentalDuration") : undefined
              }
              defaultValue=""
              {...register("rentalDuration")}
            >
              <option value="" disabled>
                {t.rentalDurationPlaceholder}
              </option>
              {RENTAL_DURATION_ORDER.map((value) => (
                <option key={value} value={value}>
                  {RENTAL_DURATION_LABELS[value][locale]}
                </option>
              ))}
            </select>
            {errors.rentalDuration ? (
              <p
                id={eid("rentalDuration")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.rentalDuration)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor={fid("passengers")}
              className="text-sm font-medium text-[var(--foreground)]"
            >
              {t.passengers}
            </label>
            <Input
              id={fid("passengers")}
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              step={1}
              aria-invalid={!!errors.passengers}
              aria-describedby={
                errors.passengers ? eid("passengers") : undefined
              }
              {...register("passengers", { valueAsNumber: true })}
            />
            {errors.passengers ? (
              <p
                id={eid("passengers")}
                role="alert"
                className="text-sm text-[var(--destructive)]"
              >
                {errMsg(errors.passengers)}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      {/* ---------------------------------------------------------------
       * Section 3 — Service preferences (R10.11–R10.13)
       * ------------------------------------------------------------- */}
      <fieldset disabled={isSubmitting} className="space-y-4 border-0 p-0">
        <legend className="text-base font-semibold text-[var(--foreground)]">
          {t.sectionService}
        </legend>

        <div className="space-y-2">
          <label
            htmlFor={fid("preferredVehicle")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.preferredVehicle}
          </label>
          <Input
            id={fid("preferredVehicle")}
            type="text"
            aria-invalid={!!errors.preferredVehicle}
            aria-describedby={describedBy("preferredVehicle", {
              hasHint: true,
              hasError: !!errors.preferredVehicle,
            })}
            {...register("preferredVehicle")}
          />
          <p
            id={hid("preferredVehicle")}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {t.preferredVehicleHint}
          </p>
          {errors.preferredVehicle ? (
            <p
              id={eid("preferredVehicle")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.preferredVehicle)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={fid("tripType")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.tripType}
          </label>
          {/*
           * Native <select>. Option labels come from
           * `WHATSAPP_LABELS[locale].serviceTypeValues` so the picker
           * label stays in lock-step with the WhatsApp message line
           * the Admin sees when this lead arrives (see design §15).
           */}
          <select
            id={fid("tripType")}
            className={SELECT_CLASS}
            aria-invalid={!!errors.tripType}
            aria-describedby={errors.tripType ? eid("tripType") : undefined}
            defaultValue=""
            {...register("tripType")}
          >
            <option value="" disabled>
              {t.tripTypePlaceholder}
            </option>
            {TRIP_TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {labels.serviceTypeValues[value]}
              </option>
            ))}
          </select>
          {errors.tripType ? (
            <p
              id={eid("tripType")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.tripType)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor={fid("notes")}
            className="text-sm font-medium text-[var(--foreground)]"
          >
            {t.notes}
          </label>
          <Textarea
            id={fid("notes")}
            rows={4}
            maxLength={500}
            aria-invalid={!!errors.notes}
            aria-describedby={describedBy("notes", {
              hasHint: true,
              hasError: !!errors.notes,
            })}
            {...register("notes")}
          />
          <p
            id={hid("notes")}
            className="text-xs text-[var(--muted-foreground)]"
          >
            {t.notesHint}
          </p>
          {errors.notes ? (
            <p
              id={eid("notes")}
              role="alert"
              className="text-sm text-[var(--destructive)]"
            >
              {errMsg(errors.notes)}
            </p>
          ) : null}
        </div>
      </fieldset>

      {/* ---------------------------------------------------------------
       * Submit. `type="submit"` so an Enter key in any text input
       * still triggers it. The label swaps to the localised "Submitting…"
       * copy while `isSubmitting` so users see the in-flight state
       * directly; the disabled state mirrors the fieldsets above so
       * the button matches the rest of the form's interaction state.
       *
       * `dict.cta.primaryBooking` and the inline `"Mengirim..." /
       * "Submitting..."` strings are deliberately separate: the first
       * is the canonical CTA wording (shared with hero / coverage
       * pages), the second is a status message and shouldn't share
       * the dictionary key.
       * ------------------------------------------------------------- */}
      <div className="pt-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t.submitting : dict.cta.primaryBooking}
        </Button>
      </div>
    </form>
  );
}
