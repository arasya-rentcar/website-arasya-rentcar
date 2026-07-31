-- Car classes become structured objects.
--
-- `generic_units` held four bare labels — "MPV 7 kursi", "Van 11–14 kursi" — so
-- text[] was the right column for it. The overseas pages now show capacity,
-- luggage and typical use per class, which text[] cannot carry: Postgres
-- silently coerced each object to its JSON *text* representation, and the site
-- read back an array of strings that happened to look like JSON. `npm run
-- db:verify` is what caught it.
--
-- Every other structured column here is jsonb for exactly this reason.
--
-- The conversion handles both shapes a live database can be in, because the
-- migration may run against a deployment seeded before this change:
--
--   - an element that already looks like a JSON object is parsed back into one
--   - a plain label becomes {"name": <label>}, preserving the only fact it holds
--
-- The second case leaves classes without seats/luggage/useCase, which renders as
-- a card with empty specs rather than wrong ones. Run `npm run db:seed`
-- afterwards to restore the full copy; `npm run db:verify` fails until you do.

-- Two steps rather than one: ALTER ... USING may not contain a subquery
-- (SQLSTATE 0A000), and unpacking an array to re-aggregate it needs one. So the
-- type change uses the scalar `to_jsonb`, which turns text[] into an array of
-- JSON strings, and the element repair happens in an UPDATE below.

alter table site_settings
  alter column generic_units drop default;

alter table site_settings
  alter column generic_units type jsonb using to_jsonb(generic_units);

alter table site_settings
  alter column generic_units set default '[]'::jsonb;

update site_settings
set generic_units = coalesce(
  (
    select jsonb_agg(
      case
        -- Written by a seed that already produced objects, which text[] then
        -- flattened to their JSON text. Parse it back.
        when jsonb_typeof(elem) = 'string' and (elem #>> '{}') ~ '^\s*\{'
          then (elem #>> '{}')::jsonb
        -- An original bare label. Keep the one fact it carries.
        when jsonb_typeof(elem) = 'string'
          then jsonb_build_object('name', elem #>> '{}')
        else elem
      end
      order by ord
    )
    from jsonb_array_elements(generic_units) with ordinality as t(elem, ord)
  ),
  '[]'::jsonb
);

comment on column site_settings.generic_units is
  'Car classes for pages that do not publish a fleet grid — array of '
  '{name, seats, luggage, useCase}. Shown where Arasya does not own the cars '
  '(overseas, supplied by a local partner), so it deliberately carries no model '
  'names and no photos. `name` doubles as the quote form option value.';
