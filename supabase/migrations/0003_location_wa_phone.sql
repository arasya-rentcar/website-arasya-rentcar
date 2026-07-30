-- Per-entry WhatsApp routing.
--
-- Every CTA on a landing page dials one number. Until now that was the single
-- global `site_settings.settings.waPhone`, so all inbound leads from every city
-- landed in one inbox. `wa_phone` lets each entry route to whichever official
-- number handles that city.
--
-- NULL means "use the global default", so existing rows keep their behaviour and
-- an entry only diverges once someone sets it deliberately.
--
-- IMPORTANT — this value is not free-form. `TrustSection` renders an anti-fraud
-- panel that lists the official numbers and tells visitors to ignore any other
-- number claiming to be Arasya. A CTA dialling a number absent from that list
-- would contradict the page's own warning, so `wa_phone` must always match one
-- of `site_settings.settings.officialPhones`. Enforced by `npm run
-- verify:content` (a DB-level check cannot see the other table's jsonb without a
-- trigger, and a trigger here would fire on every settings edit too).
--
-- Digits only, country code first, no '+' or separators: 6282124024281. That is
-- the form wa.me requires, and `official()` derives the display from it.

alter table locations
  add column if not exists wa_phone text;

alter table locations
  drop constraint if exists locations_wa_phone_digits;
alter table locations
  add constraint locations_wa_phone_digits
  check (wa_phone is null or wa_phone ~ '^[1-9][0-9]{7,17}$');

comment on column locations.wa_phone is
  'WhatsApp number for every CTA on this page. Digits only, country code first. '
  'NULL = use site_settings.settings.waPhone. Must match one of '
  'site_settings.settings.officialPhones — see the anti-fraud panel in TrustSection.';
