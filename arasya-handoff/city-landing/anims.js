// GSAP animation helpers shared by the Arasya landing templates.
// From-states are applied by JS only — crawlers/no-JS/print see full content.
export function startAnims(host) {
  host._animated = new WeakSet();
  host._gsapPoll = setInterval(() => {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (!document.querySelector('[data-hero]')) return; // template not committed yet
    if (document.documentElement.scrollHeight <= window.innerHeight + 200) return; // layout still collapsed
    clearInterval(host._gsapPoll);
    window.gsap.registerPlugin(window.ScrollTrigger);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.gsap.from('[data-hero]', { autoAlpha: 0, y: 22, duration: 0.75, ease: 'power2.out', stagger: 0.1, clearProps: 'opacity,visibility,transform' });
    const heroImg = document.querySelector('.ar-hero-img');
    if (heroImg) {
      window.gsap.fromTo(heroImg, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
      window.gsap.to(heroImg, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger: heroImg.closest('section'), start: 'top top', end: 'bottom top', scrub: true },
      });
    }
    const fab = document.getElementById('wa-fab');
    if (fab) window.gsap.from(fab, { scale: 0, duration: 0.5, delay: 0.9, ease: 'back.out(1.7)', clearProps: 'scale' });
    host._animsReady = true;
    revealNew(host);
  }, 80);
}

export function revealNew(host) {
  if (!host._animsReady) return;
  cancelAnimationFrame(host._animRaf);
  host._animRaf = requestAnimationFrame(() => {
    const trustworthy = document.documentElement.scrollHeight > window.innerHeight + 200;
    document.querySelectorAll('.ar-reveal').forEach((el) => {
      if (host._animated.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        if (trustworthy) host._animated.add(el); // genuinely above the fold: leave untouched
        return;
      }
      host._animated.add(el);
      window.gsap.from(el, {
        autoAlpha: 0,
        y: 26,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
  });
}

export function stopAnims(host) {
  if (host._gsapPoll) clearInterval(host._gsapPoll);
  cancelAnimationFrame(host._animRaf);
  if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill());
}
