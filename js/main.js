/* ============================================================
   RS UNIAR — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Navigation scroll effect (scrolled styling only) ──────
  // nav-visible class is managed by IntersectionObserver in hero scrub block
  const nav = document.querySelector('.nav');
  if (nav) {
    const onNavScroll = () => {
      // Only toggle scrolled (white bg) — visibility is handled separately
      if (nav.classList.contains('nav-visible')) {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      }
    };
    window.addEventListener('scroll', onNavScroll, { passive: true });
  }

  // ── Hero — canvas image-sequence scrubber (Apple-style) ───
  (function initHeroCanvasScrub() {
    const heroSection    = document.querySelector('.hero');
    const canvas         = document.querySelector('.hero-canvas');
    const loaderEl       = document.querySelector('.hero-loader');
    const loaderFillEl   = document.querySelector('.hero-loader-fill');
    const progressFillEl = document.querySelector('.hero-progress-fill');
    const hintEl         = document.querySelector('.hero-hint');
    const continueEl     = document.querySelector('.hero-continue');
    const nav            = document.querySelector('.nav');
    const trustStrip     = document.querySelector('.trust-strip');

    // Vapor reveal elements
    const accentEl   = document.querySelector('.hero-accent-line');
    const titleLine1 = document.querySelector('.hero-title-line1');
    const titleLine2 = document.querySelector('.hero-title-line2');
    const subEl      = document.querySelector('.hero-sub');
    const actionsEl  = document.querySelector('.hero-actions');
    const floatEl    = document.querySelector('.hero-float-card');

    // Nav: reveal smoothly when trust strip enters view (past hero)
    if (nav && trustStrip) {
      const navRevealObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // Show nav if trust-strip is visible OR has already scrolled past top
          const show = entry.isIntersecting || entry.boundingClientRect.top < 0;
          nav.classList.toggle('nav-visible', show);
          // Also keep scrolled styling when past hero
          if (show) nav.classList.add('scrolled');
        });
      }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
      navRevealObs.observe(trustStrip);
    }

    if (!canvas || !heroSection) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      if (nav) nav.classList.add('nav-visible');
      return;
    }

    // ── Vapor reveal helpers ─────────────────────────────────
    function smoothstep(t) { return t * t * (3 - 2 * t); }

    function vaporReveal(el, progress, start, end) {
      if (!el) return;
      const raw = (progress - start) / (end - start);
      const t   = smoothstep(Math.max(0, Math.min(1, raw)));
      el.style.opacity = t;
      if (t >= 1) {
        el.style.filter    = '';
        el.style.transform = '';
      } else {
        el.style.filter    = `blur(${(1 - t) * 14}px)`;
        el.style.transform = `translateY(${(1 - t) * 24}px)`;
      }
    }

    function updateVaporReveal(p) {
      vaporReveal(accentEl,   p, 0.05, 0.22);
      vaporReveal(titleLine1, p, 0.10, 0.32);
      vaporReveal(titleLine2, p, 0.18, 0.40);
      vaporReveal(subEl,      p, 0.32, 0.52);
      vaporReveal(actionsEl,  p, 0.50, 0.68);
      vaporReveal(floatEl,    p, 0.62, 0.80);
    }

    // Hide all vapor elements initially
    [accentEl, titleLine1, titleLine2, subEl, actionsEl, floatEl].forEach(el => {
      if (!el) return;
      el.style.opacity   = '0';
      el.style.filter    = 'blur(16px)';
      el.style.transform = 'translateY(28px)';
      el.style.willChange = 'opacity, filter, transform';
    });

    const TOTAL_FRAMES   = 60;
    const SCROLL_PX      = 16; // scroll pixels per frame
    const ctx            = canvas.getContext('2d');
    const images         = new Array(TOTAL_FRAMES).fill(null);
    let loadedCount      = 0;
    let allReady         = false;
    let currentFrameIdx  = -1;

    // Set section height so user can scroll through all frames
    heroSection.style.height = `calc(100vh + ${TOTAL_FRAMES * SCROLL_PX}px)`;

    // ── Canvas sizing (cover behaviour) ─────────────────────
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width  = Math.floor(window.innerWidth  * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width  = window.innerWidth  + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
      drawFrame(currentFrameIdx < 0 ? 0 : currentFrameIdx);
    }
    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();

    // ── Draw one frame (cover-fit) ───────────────────────────
    function drawFrame(idx) {
      const img = images[idx];
      if (!img?.complete || !img.naturalWidth) return;

      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const scale = Math.max(cw / iw, ch / ih);
      const sw    = iw * scale;
      const sh    = ih * scale;
      const sx    = (cw - sw) / 2;
      const sy    = (ch - sh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sw, sh);
      currentFrameIdx = idx;
    }

    // ── Scroll → frame index ─────────────────────────────────
    function getFrameIdx() {
      const scrollable = heroSection.offsetHeight - window.innerHeight;
      const scrolled   = Math.max(0, window.scrollY);
      const progress   = Math.min(1, scrolled / scrollable);
      return {
        idx: Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES)),
        progress,
      };
    }

    // ── rAF-gated scroll handler ─────────────────────────────
    let rafPending = false;
    function onScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const { idx, progress } = getFrameIdx();
        drawFrame(idx);
        if (progressFillEl) progressFillEl.style.transform = `scaleY(${progress})`;
        if (hintEl)         hintEl.style.opacity     = progress < 0.04 ? '1' : '0';
        if (continueEl)     continueEl.style.opacity  = progress > 0.93 ? '1' : '0';
        updateVaporReveal(progress);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Preload all frames in parallel ───────────────────────
    let pending = TOTAL_FRAMES;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i + 1).padStart(4, '0');
      img.src = `videos/frames/frame-${frameNum}.jpg`;
      images[i] = img;

      img.onload = () => {
        loadedCount++;
        pending--;

        // Draw first frame the moment it's loaded
        if (i === 0) { drawFrame(0); }

        // Loading bar
        if (loaderFillEl) {
          loaderFillEl.style.transform = `scaleX(${loadedCount / TOTAL_FRAMES})`;
        }

        // All done
        if (pending === 0) {
          allReady = true;
          if (loaderEl) {
            loaderEl.classList.add('done');
          }
          // Snap to correct frame in case user already scrolled
          onScroll();
        }
      };
      img.onerror = () => { pending--; };
    }
  })();

  // ── Mobile hamburger menu ─────────────────────────────────
  const hamburger = document.querySelector('.nav-hamburger');
  const drawer    = document.querySelector('.nav-drawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    revealEls.forEach(el => revealObs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  // ── Animated counters ─────────────────────────────────────
  function animateCounter(el, target, suffix, duration = 1500) {
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString('pt-BR') + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const statEls = document.querySelectorAll('[data-counter]');
  if (statEls.length && 'IntersectionObserver' in window) {
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el     = entry.target;
          const target = parseInt(el.dataset.counter, 10);
          const suffix = el.dataset.suffix || '';
          animateCounter(el, target, suffix);
          counterObs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statEls.forEach(el => counterObs.observe(el));
  }

  // ── Service accordion ─────────────────────────────────────
  const serviceItems = document.querySelectorAll('.service-item');
  serviceItems.forEach(item => {
    const trigger = item.querySelector('.service-trigger');
    const body    = item.querySelector('.service-body');
    if (!trigger || !body) return;

    // Set initial max-height for the open item
    if (item.classList.contains('open')) {
      body.style.maxHeight = body.scrollHeight + 'px';
    }

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      serviceItems.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.service-body');
        if (b) b.style.maxHeight = '0';
        const t = i.querySelector('.service-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── Segment tabs ──────────────────────────────────────────
  const segmentTabs   = document.querySelectorAll('.segment-tab');
  const segmentPanels = document.querySelectorAll('.segment-panel');

  segmentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;

      segmentTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      segmentPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(`seg-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  // ── FAQ accordion ─────────────────────────────────────────
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item, index) => {
    const trigger = item.querySelector('.faq-trigger');
    const body    = item.querySelector('.faq-body');
    if (!trigger || !body) return;

    // Open first item by default
    if (index === 0) {
      item.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.faq-body');
        if (b) b.style.maxHeight = '0';
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }

      trigger.setAttribute('aria-expanded', !isOpen);
    });

    trigger.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
  });

  // ── WhatsApp tooltip ──────────────────────────────────────
  const wappFab = document.querySelector('.whatsapp-fab');
  if (wappFab) {
    let scrolled = false;

    const showTooltip = () => {
      if (scrolled) return;
      scrolled = true;
      wappFab.classList.add('tooltip-visible');
      setTimeout(() => wappFab.classList.remove('tooltip-visible'), 5000);
    };

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) showTooltip();
    }, { once: true });

    document.addEventListener('click', (e) => {
      if (!wappFab.contains(e.target)) {
        wappFab.classList.remove('tooltip-visible');
      }
    });
  }

  // ── Phone mask ────────────────────────────────────────────
  const phoneInput = document.getElementById('telefone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else {
        v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
      e.target.value = v;
    });
  }

  // ── Form validation & submission ──────────────────────────
  const form = document.getElementById('orcamento-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const requiredFields = form.querySelectorAll('[required]');
      let valid = true;

      requiredFields.forEach(field => {
        field.classList.remove('error');
        if (!field.value.trim()) {
          field.classList.add('error');
          valid = false;
        }
      });

      if (!valid) {
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
      }

      const btn = form.querySelector('.form-submit');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        Enviando...
      `;

      // Simulate form submission (replace with real endpoint)
      await new Promise(r => setTimeout(r, 1500));

      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Solicitação enviada!
      `;
      btn.style.background = '#16A34A';

      form.querySelectorAll('input, select, textarea').forEach(f => f.value = '');

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '';
      }, 4000);
    });
  }

  // ── Active nav link on scroll ─────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const sectionObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.style.color = link.getAttribute('href') === `#${id}`
              ? 'var(--blue-500)'
              : '';
          });
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(s => sectionObs.observe(s));
  }
});

/* Spin keyframe added via JS to avoid CSS duplication */
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

/* ============================================================
   Cookie / LGPD Banner
   ============================================================ */
(function initCookieBanner() {
  const STORAGE_KEY = 'rsuniar_cookie_consent';
  const consent = localStorage.getItem(STORAGE_KEY);
  if (consent) return;

  const banner      = document.getElementById('cookie-banner');
  const configOverlay = document.getElementById('cookie-config-overlay');
  if (!banner) return;

  setTimeout(() => banner.classList.add('visible'), 1200);

  document.getElementById('cookie-accept-btn')?.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true, marketing: true, ts: Date.now() }));
    banner.classList.remove('visible');
  });

  document.getElementById('cookie-config-btn')?.addEventListener('click', () => {
    if (configOverlay) configOverlay.classList.add('open');
  });

  document.getElementById('cookie-config-close')?.addEventListener('click', () => {
    if (configOverlay) configOverlay.classList.remove('open');
  });

  document.getElementById('cookie-save-config-btn')?.addEventListener('click', () => {
    const analytics  = document.getElementById('toggle-analytics')?.checked  ?? false;
    const marketing  = document.getElementById('toggle-marketing')?.checked  ?? false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics, marketing, ts: Date.now() }));
    if (configOverlay) configOverlay.classList.remove('open');
    banner.classList.remove('visible');
  });

  configOverlay?.addEventListener('click', (e) => {
    if (e.target === configOverlay) configOverlay.classList.remove('open');
  });
})();

/* ============================================================
   Calculadora de BTUs
   ============================================================ */
(function initBTUCalculator() {

  /* ── Definição das perguntas ─────────────────────────────── */
  const QUESTIONS = [
    {
      id: 'ambiente',
      title: 'Qual é o tipo de ambiente?',
      sub: 'Selecione o que mais se aproxima do seu caso',
      cols: 3,
      options: [
        { value: 'quarto',     label: 'Quarto',           btuM2: 600,  icon: 'bed' },
        { value: 'sala',       label: 'Sala de Estar',    btuM2: 700,  icon: 'sofa' },
        { value: 'escritorio', label: 'Escritório',       btuM2: 800,  icon: 'briefcase' },
        { value: 'reuniao',    label: 'Sala de Reunião',  btuM2: 1000, icon: 'users' },
        { value: 'cozinha',    label: 'Cozinha / Copa',   btuM2: 1200, icon: 'flame' },
        { value: 'comercial',  label: 'Loja / Comercial', btuM2: 900,  icon: 'store' },
      ],
    },
    {
      id: 'area',
      title: 'Qual a área aproximada do ambiente?',
      sub: 'Comprimento × largura em metros quadrados',
      cols: 2,
      options: [
        { value: 9,    label: 'Até 10 m²',      icon: 'square-small' },
        { value: 12.5, label: '10 a 15 m²',     icon: 'square-medium' },
        { value: 17.5, label: '15 a 20 m²',     icon: 'square-large' },
        { value: 25,   label: '20 a 30 m²',     icon: 'square-xlarge' },
        { value: 35,   label: '30 a 40 m²',     icon: 'square-xxlarge' },
        { value: 50,   label: 'Acima de 40 m²', icon: 'square-max' },
      ],
    },
    {
      id: 'sol',
      title: 'O ambiente recebe sol direto?',
      sub: 'Exposição solar afeta diretamente a carga térmica',
      cols: 3,
      options: [
        { value: 1.0, label: 'Sem sol direto',       sub: 'Sombra ou norte', icon: 'cloud' },
        { value: 1.1, label: 'Sol parcial',           sub: 'Manhã ou tarde',  icon: 'cloud-sun' },
        { value: 1.2, label: 'Sol pleno na fachada',  sub: 'Tarde inteira',   icon: 'sun' },
      ],
    },
    {
      id: 'pessoas',
      title: 'Quantas pessoas ocupam o ambiente?',
      sub: 'Em horário de pico de uso',
      cols: 2,
      options: [
        { value: 0,    label: '1 a 2 pessoas',  icon: 'user' },
        { value: 1200, label: '3 a 5 pessoas',  icon: 'users-sm' },
        { value: 3600, label: '6 a 10 pessoas', icon: 'users-md' },
        { value: 6000, label: 'Acima de 10',    icon: 'users-lg' },
      ],
    },
    {
      id: 'eletronicos',
      title: 'Há muitos equipamentos eletrônicos?',
      sub: 'Computadores, servidores e maquinário geram calor adicional',
      cols: 3,
      options: [
        { value: 1.0, label: 'Poucos',     sub: 'TV e 1 PC',            icon: 'monitor' },
        { value: 1.1, label: 'Moderados',  sub: 'Vários computadores',  icon: 'server-sm' },
        { value: 1.2, label: 'Muitos',     sub: 'Servidores / indústria', icon: 'server-lg' },
      ],
    },
    {
      id: 'estado',
      title: 'Em qual estado fica o imóvel?',
      sub: 'A zona climática influencia no dimensionamento final',
      cols: 3,
      options: [
        { value: 1.0,  label: 'Rio Grande do Sul',  sub: 'Porto Alegre e região', icon: 'map-rs' },
        { value: 1.0,  label: 'Santa Catarina',     sub: 'Florianópolis e região', icon: 'map-sc' },
        { value: 1.05, label: 'Paraná',             sub: 'Curitiba / norte PR',   icon: 'map-pr' },
      ],
    },
  ];

  /* ── Ícones SVG inline ──────────────────────────────────── */
  const ICONS = {
    'bed':          `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M22 4v16"/><path d="M2 8h20"/><path d="M2 16h20"/><path d="M7 8v8"/><path d="M17 8v8"/></svg>`,
    'sofa':         `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z"/><line x1="6" y1="18" x2="6" y2="22"/><line x1="18" y1="18" x2="18" y2="22"/></svg>`,
    'briefcase':    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/><path d="M2 12h20"/></svg>`,
    'users':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'flame':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    'store':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'cloud':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
    'cloud-sun':    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z"/></svg>`,
    'sun':          `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    'user':         `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'users-sm':     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'users-md':     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'users-lg':     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'monitor':      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    'server-sm':    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
    'server-lg':    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
    'square-small':  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`,
    'square-medium': `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>`,
    'square-large':  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>`,
    'square-xlarge': `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="1"/></svg>`,
    'square-xxlarge':`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1h22v22H1z"/></svg>`,
    'square-max':    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
    'map-rs':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    'map-sc':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    'map-pr':        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  };

  /* ── Capacidades padrão (BTU) e nomes de produto ─────────── */
  const CAPACITIES = [
    { btu: 7500,   label: '7.500 BTU',  type: 'Split Hi-Wall',      efficiency: 'A',  area: 'Até 10 m²' },
    { btu: 9000,   label: '9.000 BTU',  type: 'Split Hi-Wall',      efficiency: 'A',  area: '10 a 13 m²' },
    { btu: 12000,  label: '12.000 BTU', type: 'Split Hi-Wall',      efficiency: 'A+', area: '13 a 18 m²' },
    { btu: 18000,  label: '18.000 BTU', type: 'Split Hi-Wall',      efficiency: 'A+', area: '18 a 24 m²' },
    { btu: 24000,  label: '24.000 BTU', type: 'Split Inverter',     efficiency: 'A+', area: '24 a 32 m²' },
    { btu: 30000,  label: '30.000 BTU', type: 'Split Cassete',      efficiency: 'A',  area: '32 a 40 m²' },
    { btu: 36000,  label: '36.000 BTU', type: 'Split Piso-Teto',    efficiency: 'A',  area: 'Acima de 40 m²' },
    { btu: 99999,  label: 'VRF / Chiller', type: 'Sistema Central', efficiency: '—',  area: 'Grande porte' },
  ];

  /* ── Estado da calculadora ──────────────────────────────── */
  let currentStep = 0;
  let answers = {};

  /* ── Elementos DOM ──────────────────────────────────────── */
  const overlay     = document.getElementById('calc-overlay');
  const progressFill= document.getElementById('calc-progress-fill');
  const progressLbl = document.getElementById('calc-step-lbl');
  const stepsEl     = document.getElementById('calc-steps-container');
  const resultEl    = document.getElementById('calc-result');
  const openBtns    = document.querySelectorAll('[data-open-calc]');
  const closeBtns   = document.querySelectorAll('[data-close-calc]');
  if (!overlay) return;

  /* ── Abrir / fechar ─────────────────────────────────────── */
  function openCalc() {
    currentStep = 0;
    answers = {};
    renderStep();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCalc() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtns.forEach(b => b.addEventListener('click', openCalc));
  closeBtns.forEach(b => b.addEventListener('click', closeCalc));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCalc(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCalc(); });

  /* ── Renderização de cada passo ─────────────────────────── */
  function renderStep() {
    const q       = QUESTIONS[currentStep];
    const total   = QUESTIONS.length;
    const pct     = Math.round(((currentStep) / total) * 100);

    progressFill.style.width = pct + '%';
    progressLbl.innerHTML    = `Etapa <span>${currentStep + 1}</span> de ${total}`;

    stepsEl.innerHTML = `
      <p class="calc-question-title">${q.title}</p>
      <p class="calc-question-sub">${q.sub}</p>
      <div class="calc-options${q.cols === 3 ? ' cols-3' : ''}">
        ${q.options.map((opt, i) => `
          <button
            type="button"
            class="calc-option${answers[q.id]?.value === opt.value ? ' selected' : ''}"
            data-idx="${i}"
          >
            <div class="calc-option-icon">${ICONS[opt.icon] || ''}</div>
            <span class="calc-option-label">${opt.label}</span>
            ${opt.sub ? `<span style="font-size:.7rem;color:var(--neutral-500);line-height:1.3">${opt.sub}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;

    /* Ocultar resultado, mostrar passos */
    stepsEl.style.display = '';
    if (resultEl) resultEl.style.display = 'none';
    renderNav();

    stepsEl.querySelectorAll('.calc-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const opt = q.options[idx];
        answers[q.id] = {
          value: opt.value,
          label: opt.label,
          btuM2: opt.btuM2 ?? null,
        };
        if (currentStep < QUESTIONS.length - 1) {
          currentStep++;
          renderStep();
        } else {
          showResult();
        }
      });
    });
  }

  /* ── Barra de navegação (botão Voltar) ──────────────────── */
  function renderNav() {
    const navEl = document.getElementById('calc-nav');
    if (!navEl) return;
    navEl.innerHTML = currentStep > 0
      ? `<button type="button" class="btn btn-outline btn-sm" id="calc-back-btn">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
           Voltar
         </button>`
      : `<span class="calc-nav-left">Selecione uma opção para continuar</span>`;

    document.getElementById('calc-back-btn')?.addEventListener('click', () => {
      if (currentStep > 0) { currentStep--; renderStep(); }
    });
  }

  /* ── Cálculo final ──────────────────────────────────────── */
  function calcBTU() {
    const baseBtuPerM2 = answers['ambiente']?.btuM2 ?? 700;
    const area         = Number(answers['area']?.value)         ?? 15;
    const sol          = Number(answers['sol']?.value)          ?? 1.0;
    const pessoasExtra = Number(answers['pessoas']?.value)      ?? 0;
    const eletro       = Number(answers['eletronicos']?.value)  ?? 1.0;
    const estado       = Number(answers['estado']?.value)       ?? 1.0;

    const total = Math.ceil((baseBtuPerM2 * area * sol * eletro * estado) + pessoasExtra);
    return total;
  }

  function getProduct(btu) {
    return CAPACITIES.find(c => btu <= c.btu) ?? CAPACITIES[CAPACITIES.length - 1];
  }

  /* ── Tela de resultado ──────────────────────────────────── */
  function showResult() {
    progressFill.style.width = '100%';
    progressLbl.innerHTML = `<span>Resultado</span> — Cálculo concluído`;
    stepsEl.style.display  = 'none';

    const btu     = calcBTU();
    const product = getProduct(btu);
    const isVRF   = product.btu === 99999;

    const navEl = document.getElementById('calc-nav');
    if (navEl) navEl.innerHTML = `
      <button type="button" class="btn btn-outline btn-sm" id="calc-restart-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.79"/></svg>
        Refazer cálculo
      </button>`;

    document.getElementById('calc-restart-btn')?.addEventListener('click', () => {
      currentStep = 0; answers = {}; renderStep();
    });

    const wappMsg = encodeURIComponent(
      `Olá! Usei a calculadora de BTUs do site e o resultado indicou *${product.label}* (${product.type}) para o meu ambiente. Gostaria de solicitar um orçamento.`
    );

    resultEl.innerHTML = `
      <div class="calc-result-header">
        <div class="calc-result-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Cálculo concluído
        </div>
        <p class="calc-result-title">Recomendação para o seu ambiente</p>
        <p class="calc-result-sub">${isVRF ? 'Seu ambiente requer um sistema de grande porte. Recomendamos uma visita técnica para dimensionamento preciso.' : 'Com base nas características informadas, o equipamento ideal é:'}</p>
      </div>

      <div class="calc-product-card">
        <div class="calc-product-btu">${isVRF ? 'VRF / Chiller' : product.label}</div>
        <div class="calc-product-type">${product.type}</div>
        <div class="calc-product-detail-grid">
          <div class="calc-product-detail">
            <div class="calc-product-detail-label">Carga térmica calculada</div>
            <div class="calc-product-detail-value">${btu.toLocaleString('pt-BR')} BTU/h</div>
          </div>
          <div class="calc-product-detail">
            <div class="calc-product-detail-label">Capacidade recomendada</div>
            <div class="calc-product-detail-value">${product.label}</div>
          </div>
          <div class="calc-product-detail">
            <div class="calc-product-detail-label">Tipo de equipamento</div>
            <div class="calc-product-detail-value">${product.type}</div>
          </div>
          <div class="calc-product-detail">
            <div class="calc-product-detail-label">Classificação energética</div>
            <div class="calc-product-detail-value">Classe ${product.efficiency}</div>
          </div>
        </div>
        <p class="calc-disclaimer">* Este é um pré-dimensionamento estimado. O valor final pode variar conforme pé-direito, isolamento térmico e normas técnicas específicas. Nossa equipe valida o cálculo na visita técnica gratuita.</p>
      </div>

      <div class="calc-result-ctas">
        <a
          href="#contato"
          class="btn btn-primary btn-md"
          onclick="document.getElementById('calc-overlay').classList.remove('open'); document.body.style.overflow=''; document.getElementById('servico').value='instalacao';"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Solicitar orçamento
        </a>
        <a
          href="https://wa.me/5551999999999?text=${wappMsg}"
          class="btn btn-whatsapp btn-md"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          Falar no WhatsApp
        </a>
      </div>
    `;

    resultEl.style.display = '';
  }

})();
