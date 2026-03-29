/* ═══════════════════════════════════════════════════════════════
   NEXUS DIGITAL — Shared Scripts v1.0
   Handles: Nav scroll, mobile menu, scroll reveal, 
   VanillaTilt, portfolio filter, particles
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Navigation Scroll Effect ───
  const nav = document.querySelector('.agency-nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── Mobile Menu Toggle ───
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Active Nav Link ───
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ─── Scroll Reveal (IntersectionObserver) ───
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  }

  // ─── VanillaTilt Effect (lightweight, no library) ───
  const tiltCards = document.querySelectorAll('.glass-card[data-tilt]');
  tiltCards.forEach((card) => {
    let rect;
    const maxTilt = 8;

    card.addEventListener('mouseenter', () => {
      rect = card.getBoundingClientRect();
    });

    card.addEventListener('mousemove', (e) => {
      if (!rect) rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltX = ((y - centerY) / centerY) * -maxTilt;
      const tiltY = ((x - centerX) / centerX) * maxTilt;

      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
      card.style.transition = 'transform 0.1s ease-out';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      card.style.transition = 'transform 0.4s ease-out';
      rect = null;
    });
  });

  // ─── Portfolio Filter ───
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  if (filterBtns.length > 0 && portfolioItems.length > 0) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        portfolioItems.forEach((item) => {
          const category = item.dataset.category;
          if (filter === 'all' || category === filter) {
            item.classList.remove('hide');
            item.classList.add('show');
          } else {
            item.classList.remove('show');
            item.classList.add('hide');
          }
        });
      });
    });
  }

  // ─── Animated Counter ───
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            const suffix = el.dataset.suffix || '';
            const duration = 2000;
            const startTime = performance.now();

            function updateCount(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Ease out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.round(eased * target);
              el.textContent = current + suffix;

              if (progress < 1) {
                requestAnimationFrame(updateCount);
              }
            }

            requestAnimationFrame(updateCount);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => counterObserver.observe(el));
  }

  // ─── Particles Background ───
  const particleContainer = document.querySelector('.particles');
  if (particleContainer) {
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      const size = 1 + Math.random() * 3;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      if (Math.random() > 0.5) {
        particle.style.background = 'var(--accent-cyan)';
      }
      particleContainer.appendChild(particle);
    }
  }

  // ─── Smooth Scroll for Anchor Links ───
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Form WhatsApp Redirect ───
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.elements.name?.value || '';
      const service = contactForm.elements.service?.value || '';
      const budget = contactForm.elements.budget?.value || '';
      const message = contactForm.elements.message?.value || '';

      const text = encodeURIComponent(
        `Hi! I'm ${name}.\n\nService: ${service}\nBudget: ${budget}\n\nMessage: ${message}\n\n— Sent from Nexus Digital Website`
      );

      window.open(`https://wa.me/917666765129?text=${text}`, '_blank');
    });
  }

})();
