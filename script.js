document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            hamburger.classList.toggle('toggle');
            links.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
        });
    }

    // Close mobile menu when clicking any nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                if (hamburger) hamburger.classList.remove('toggle');
            }
        });
    });

    // 2. Custom Interactive Orbiting Cursor
    let cursor = document.querySelector('.custom-cursor');
    if (!cursor && window.innerWidth > 768) {
        cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    const animateCursor = () => {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        if (cursor) {
            cursor.style.left = `${cursorX}px`;
            cursor.style.top = `${cursorY}px`;
        }
        requestAnimationFrame(animateCursor);
    };
    if (cursor) animateCursor();

    const addCursorHover = (elements) => {
        elements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor && cursor.classList.add('hovered'));
            el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hovered'));
        });
    };

    const interactiveSelectors = 'a, button, .service-card, .project-card, .blog-card, .skill-item, .sf-logo, .lang-btn';
    addCursorHover(document.querySelectorAll(interactiveSelectors));

    // 3. Inject Shutter-Blinds Overlay
    const injectShutterOverlay = (card) => {
        if (card.querySelector('.shutter-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'shutter-overlay';
        for (let i = 0; i < 8; i++) {
            const stripe = document.createElement('div');
            stripe.className = 'shutter-stripe';
            overlay.appendChild(stripe);
        }
        card.appendChild(overlay);
    };

    document.querySelectorAll('.sf-logo').forEach(injectShutterOverlay);

    // 4. Parallax Scrolling Engine (Scroll-Driven Multi-Layer Motion)
    const parallaxElements = document.querySelectorAll('[data-parallax-speed]');
    const progressIndicator = document.querySelector('.progress-indicator::after');
    const progressNumber = document.querySelector('.progress-number');
    const sections = document.querySelectorAll('.parallax-section');

    const sectionIds = ['home', 'services', 'projects', 'skills', 'blog', 'contact'];

    const updateParallax = () => {
        const scrolled = window.pageYOffset;
        const windowHeight = window.innerHeight;

        // Parallax Motion for elements with data-parallax-speed
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.1;
            const rect = el.getBoundingClientRect();
            // Calculate relative offset based on position in viewport
            if (rect.top < windowHeight && rect.bottom > 0) {
                const offsetY = (rect.top - windowHeight / 2) * speed * 0.3;
                el.style.transform = `translate3d(0, ${offsetY}px, 0)`;
            }
        });

        // Calculate Overall Page Scroll Progress for Side Bar
        const docHeight = document.documentElement.scrollHeight - windowHeight;
        const scrollPercent = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
        
        const progressFill = document.querySelector('.progress-indicator');
        if (progressFill) {
            progressFill.style.setProperty('--progress-height', `${scrollPercent}%`);
        }

        // Active Section ScrollSpy
        let currentSectionIdx = 0;
        sections.forEach((sec, idx) => {
            const top = sec.offsetTop - 200;
            const height = sec.offsetHeight;
            if (scrolled >= top && scrolled < top + height) {
                currentSectionIdx = idx;
            }
        });

        const activeId = sectionIds[currentSectionIdx] || 'home';
        document.querySelectorAll('.nav-links a').forEach(a => {
            const href = a.getAttribute('href');
            a.classList.toggle('active', href === `#${activeId}`);
        });

        if (progressNumber) {
            progressNumber.textContent = `0${currentSectionIdx + 1} / 06`;
        }
    };

    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateParallax);
    }, { passive: true });

    updateParallax(); // Initial run

    // 5. Localization Logic
    const defaultLang = 'de';
    const supportedLangs = ['de', 'en'];

    const getBrowserLang = () => {
        const lang = navigator.language.slice(0, 2);
        return supportedLangs.includes(lang) ? lang : defaultLang;
    };

    const currentLang = localStorage.getItem('lang') || getBrowserLang();

    const loadTranslations = async (lang) => {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) throw new Error('Translation file not found');
            const translations = await response.json();
            window.activeTranslations = translations;
            updateContent(translations);
            updateActiveLang(lang);
            document.documentElement.lang = lang;
            localStorage.setItem('lang', lang);
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    };

    const updateContent = (translations) => {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const keys = key.split('.');
            let value = translations;
            keys.forEach(k => {
                value = value ? value[k] : null;
            });

            if (value) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = value;
                } else {
                    el.innerHTML = value;
                }
            }
        });
    };

    const updateActiveLang = (lang) => {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    };

    loadTranslations(currentLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            loadTranslations(lang);
        });
    });

    // 6. Scroll Observer for Fade Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // Back to top button logic
    const backToTopBtn = document.querySelector('.back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            backToTopBtn.classList.toggle('show', window.scrollY > 400);
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 7. Anti-Spam Contact Form Handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        // Track load timestamp (speed trap)
        const formLoadTime = Date.now();
        const startInput = document.getElementById('form_start_time');
        if (startInput) startInput.value = formLoadTime.toString();

        // Generate dynamic math security challenge
        const num1 = Math.floor(Math.random() * 8) + 2;
        const num2 = Math.floor(Math.random() * 8) + 1;
        const expectedAnswer = num1 + num2;

        const mathExprEl = document.getElementById('spam-math-expr');
        if (mathExprEl) {
            mathExprEl.textContent = `${num1} + ${num2} = ?`;
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusBox = document.getElementById('form-status');
            const submitBtn = contactForm.querySelector('button[type="submit"]');

            const showStatus = (type, messageKey, defaultMessage) => {
                if (!statusBox) return;
                statusBox.className = `form-status-message ${type}`;
                
                const translations = window.activeTranslations;
                let text = defaultMessage;
                if (translations && translations.contact && messageKey && translations.contact[messageKey]) {
                    text = translations.contact[messageKey];
                }
                statusBox.textContent = text;
            };

            // Layer 1: Honeypot trap check
            const gotchaInput = document.getElementById('hp_gotcha');
            if (gotchaInput && gotchaInput.value.trim() !== '') {
                // Silent trap for bots: present fake success
                showStatus('success', 'success_msg', 'Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.');
                contactForm.reset();
                return;
            }

            // Layer 2: Speed Trap (< 2.5 seconds submission speed = automated bot)
            const submissionDuration = Date.now() - formLoadTime;
            if (submissionDuration < 2500) {
                showStatus('error', 'error_spam', 'Bitte beantworte die Sicherheitsfrage korrekt.');
                return;
            }

            // Layer 3: Math Security Challenge
            const answerInput = document.getElementById('spam-answer');
            const userAnswer = parseInt(answerInput ? answerInput.value : '', 10);
            if (isNaN(userAnswer) || userAnswer !== expectedAnswer) {
                showStatus('error', 'error_spam', 'Bitte beantworte die Sicherheitsfrage korrekt.');
                if (answerInput) answerInput.focus();
                return;
            }

            // Layer 4: Rate Limiting (45 seconds minimum delay between submissions)
            const lastSubmitTime = localStorage.getItem('last_contact_submit');
            if (lastSubmitTime && (Date.now() - parseInt(lastSubmitTime, 10)) < 45000) {
                showStatus('error', 'error_rate', 'Du hast vor Kurzem bereits eine Nachricht gesendet. Bitte warte einen Moment.');
                return;
            }

            // Processing submission
            submitBtn.disabled = true;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '⌛ Wird gesendet...';
            showStatus('loading', null, 'Wird gesendet...');

            try {
                const formData = new FormData(contactForm);
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    localStorage.setItem('last_contact_submit', Date.now().toString());
                    showStatus('success', 'success_msg', 'Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.');
                    contactForm.reset();
                } else {
                    const data = await response.json().catch(() => ({}));
                    if (data.errors && data.errors.length > 0) {
                        showStatus('error', null, data.errors.map(err => err.message).join(', '));
                    } else {
                        showStatus('error', null, 'Fehler beim Senden. Bitte versuche es erneut oder per Mail an kev.gadient@gmail.com.');
                    }
                }
            } catch (err) {
                console.error('Contact form submission error:', err);
                showStatus('error', null, 'Netzwerkfehler. Bitte direkt per Mail kontaktieren: kev.gadient@gmail.com');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
});
