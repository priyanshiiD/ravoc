/**
 * main.js — Core initialization
 * Navigation scrollspy, stat counters, IntersectionObserver reveals,
 * scroll progress bar, and section wiring.
 */

(function () {
  'use strict';

  // ─── Scroll Progress ───────────────────────────────────────────
  const progressBar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const total = document.body.scrollHeight - window.innerHeight;
    const pct   = total > 0 ? (window.scrollY / total) * 100 : 0;
    if (progressBar) progressBar.style.width = `${pct}%`;
  }, { passive: true });

  // ─── Nav Scroll Behavior ───────────────────────────────────────
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // ─── Scrollspy (Active Nav Link) ──────────────────────────────
  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  const sections = Array.from(document.querySelectorAll('.section[id]'));

  function updateActiveNavLink() {
    let current = '';
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.45) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === current);
    });
  }

  window.addEventListener('scroll', updateActiveNavLink, { passive: true });
  updateActiveNavLink();

  // ─── Section Reveal (IntersectionObserver) ────────────────────
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-in-view');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.section').forEach(el => sectionObserver.observe(el));

  // ─── Feature Cards (staggered reveal) ─────────────────────────
  const featureCards = document.querySelectorAll('.feature-card');
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  featureCards.forEach(card => cardObserver.observe(card));

  // ─── How-Steps (staggered slide-in reveal) ────────────────────
  const howSteps = document.querySelectorAll('.how-step');
  const howObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx   = Array.from(howSteps).indexOf(entry.target);
        const delay = idx * 80;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        howObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  howSteps.forEach(el => howObserver.observe(el));


  // ─── Stat Cards (staggered reveal + counter) ──────────────────
  const statCards = document.querySelectorAll('.stat-card');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx   = Array.from(statCards).indexOf(entry.target);
        const delay = idx * 120;
        entry.target.style.setProperty('--delay', `${delay}ms`);
        setTimeout(() => entry.target.classList.add('visible'), delay);

        const valueEl = entry.target.querySelector('.stat-value');
        if (valueEl && !valueEl.dataset.animated) {
          valueEl.dataset.animated = true;
          const target = parseInt(valueEl.dataset.target || 0);
          animateCounter(valueEl, 0, target, 1400, delay);
        }
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  statCards.forEach(card => statObserver.observe(card));

  function animateCounter(el, from, to, duration, delay = 0) {
    const start = performance.now() + delay;
    function step(now) {
      if (now < start) { requestAnimationFrame(step); return; }
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── Smooth scroll for nav links and CTAs ─────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Hotspot pulsing rings on anatomy section ──────────────────
  // (handled in anatomy.js via canvas)

  // ─── Canvas resize handler registry ───────────────────────────
  // (individual canvas modules handle their own resize)

  // ─── Performance: pause canvas animation when tab hidden ──────
  document.addEventListener('visibilitychange', () => {
    // Canvas RAF loops check this automatically via animation frame skip
  });

  // ─── Log project info to console ──────────────────────────────
  console.log(
    '%cROVAC\u2122 | Animated Product Explainer\n' +
    '%cHTML5 Canvas \xb7 CSS Animations \xb7 Vanilla JavaScript\n' +
    'Concepts: 2D Transforms \xb7 Ray Casting \xb7 Particle Systems \xb7 Animation Loops',
    'color:#00D4FF;font-size:16px;font-weight:bold;',
    'color:#7A8BAF;font-size:11px;'
  );
})();
