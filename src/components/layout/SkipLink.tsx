import type { Locale } from '@/types';

/** The `<main>` this jumps to. One constant so the two can never disagree. */
export const MAIN_ID = 'konten';

/**
 * "Skip to content", the first thing in the tab order.
 *
 * The header carries eleven tabbable items before any page content — logo, four
 * nav entries, the language pill, the CTA — and repeats them on all twelve
 * pages. Without this, reaching the article on a blog page takes a dozen presses
 * every single time.
 *
 * Hidden off-screen rather than `display: none`, because a display-none element
 * is not focusable and the link would never appear. See `.skip-link` in
 * globals.css.
 */
export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a href={`#${MAIN_ID}`} className="skip-link">
      {locale === 'en' ? 'Skip to content' : 'Lompat ke konten'}
    </a>
  );
}
