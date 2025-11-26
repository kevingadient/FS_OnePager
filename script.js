document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li');

    // Mobile Menu Logic
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            // Toggle Nav
            navLinks.classList.toggle('nav-active');

            // Burger Animation
            hamburger.classList.toggle('toggle');

            // Animate Links
            links.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
        });
    }

    // Localization Logic
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
            updateContent(translations);
            updateActiveLang(lang);
            document.documentElement.lang = lang;
            localStorage.setItem('lang', lang);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback: If fetch fails (e.g., file:// protocol), do not break other functionality
            // We could optionally load default text or just log the error.
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

    // Initialize Language
    loadTranslations(currentLang);

    // Language Switcher Event Listeners
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            loadTranslations(lang);
        });
    });

    // Scroll Animation Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
});
