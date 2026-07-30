/**
 * Whether this deployment may be indexed by search engines.
 *
 * Defaults to NO. Getting a staging or preview domain indexed is expensive and
 * slow to undo — you inherit a domain migration (301s, a Search Console change
 * of address, and a ranking dip) for a URL you never wanted ranked. Forgetting
 * the flag on production merely delays indexing, which is recoverable in a
 * redeploy. So the safe default is the closed one.
 *
 * Set NEXT_PUBLIC_ALLOW_INDEXING=true only on the real production domain.
 *
 * robots.txt alone is not enough: it blocks *crawling*, not *indexing*, so a
 * page linked from elsewhere can still surface in results with no snippet. The
 * `noindex` header in the root layout is what actually keeps it out, and the
 * two are set together from this one flag.
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

/**
 * One line in the build log, in both directions — a silent wrong answer here is
 * either an unindexable launch or an indexed staging site.
 *
 * Called from the robots route rather than at module scope: Next evaluates this
 * module in every build worker, so a top-level log repeats several times.
 */
export function logIndexingMode(canonicalHost: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  console.log(
    ALLOW_INDEXING
      ? `[indexing] INDEXABLE — robots.txt allows crawling and canonicals point at ${canonicalHost}. ` +
          `This must be the production domain.`
      : `[indexing] NOINDEX — robots.txt disallows all, and every page carries ` +
          `<meta name="robots" content="noindex">. ` +
          `Set NEXT_PUBLIC_ALLOW_INDEXING=true on the production deployment.`
  );
}
