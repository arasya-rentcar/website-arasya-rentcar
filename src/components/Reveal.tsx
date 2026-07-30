'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal animations — port of `city-landing/anims.js`.
 *
 * Critical property preserved from the original: from-states are applied by JS
 * only. Crawlers, no-JS visitors, and print all see fully rendered content, and
 * elements already in the viewport are left untouched rather than faded in.
 * That is why this is an effect over existing markup rather than an animated
 * wrapper component — nothing depends on JS to become visible.
 *
 * GSAP is imported dynamically so it stays out of the initial bundle; LCP
 * budget is 2.5s and the reveals are decoration.
 */
export function Reveals() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let killed = false;
    const triggers: { kill: () => void }[] = [];

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      gsap.from('[data-hero]', {
        autoAlpha: 0,
        y: 22,
        duration: 0.75,
        ease: 'power2.out',
        stagger: 0.1,
        clearProps: 'opacity,visibility,transform',
      });

      const heroImg = document.querySelector<HTMLElement>('.ar-hero-img');
      if (heroImg) {
        gsap.fromTo(heroImg, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
        const section = heroImg.closest('section');
        if (section) {
          gsap.to(heroImg, {
            yPercent: 10,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
          });
        }
      }

      const fab = document.getElementById('wa-fab');
      if (fab) {
        gsap.from(fab, {
          scale: 0,
          duration: 0.5,
          delay: 0.9,
          ease: 'back.out(1.7)',
          clearProps: 'scale',
        });
      }

      document.querySelectorAll<HTMLElement>('.ar-reveal').forEach((el) => {
        const r = el.getBoundingClientRect();
        // Genuinely above the fold — leave it alone rather than fading it in.
        if (r.top < window.innerHeight && r.bottom > 0) return;
        const tween = gsap.from(el, {
          autoAlpha: 0,
          y: 26,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'opacity,visibility,transform',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });
    })();

    return () => {
      killed = true;
      for (const t of triggers) t.kill();
    };
  }, []);

  return null;
}
