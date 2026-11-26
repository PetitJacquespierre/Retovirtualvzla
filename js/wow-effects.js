/* ========================================= */
/* WOW EFFECTS - LÓGICA JAVASCRIPT           */
/* ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    /* 1. SCROLL REVEAL (INTERSECTION OBSERVER) */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    /* 2. BOTONES MAGNÉTICOS */
    const magneticButtons = document.querySelectorAll('.btn-magnetic');
    
    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Fuerza magnética (el divisor controla la intensidad)
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px)';
        });
    });

    /* 3. CURSOR PERSONALIZADO (DESACTIVADO POR EL USUARIO) */
    // Lógica del cursor eliminada para mantener el diseño más limpio y sencillo.

    /* 4. TARJETAS CON BRILLO (GLOW CARDS) */
    document.querySelectorAll('.glow-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    /* 5. TEXTO REVELADO (ILUMINADO) */
    const textRevealElements = document.querySelectorAll('.text-reveal');
    
    textRevealElements.forEach(element => {
        // Envolvemos cada palabra en un span para iluminarla individualmente
        const words = element.innerText.split(' ');
        element.innerHTML = '';
        words.forEach(word => {
            const span = document.createElement('span');
            span.innerText = word + ' ';
            element.appendChild(span);
        });

        window.addEventListener('scroll', () => {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Calculamos qué porcentaje del texto debería estar iluminado según el scroll
            let scrollPercent = (windowHeight - rect.top) / (windowHeight / 1.5);
            
            if(scrollPercent < 0) scrollPercent = 0;
            if(scrollPercent > 1) scrollPercent = 1;

            const spans = element.querySelectorAll('span');
            const wordsToIlluminate = Math.floor(scrollPercent * spans.length);

            spans.forEach((span, index) => {
                if (index < wordsToIlluminate) {
                    span.classList.add('iluminado');
                } else {
                    span.classList.remove('iluminado');
                }
            });
        });
    });

    /* 6. INICIALIZACIÓN DE PARTÍCULAS EN EL HERO (SI EXISTE EL CONTENEDOR) */
    if (document.getElementById('particles-hero') && typeof tsParticles !== 'undefined') {
        tsParticles.load("particles-hero", {
            fpsLimit: 60,
            particles: {
                number: { value: 50, density: { enable: true, value_area: 800 } },
                color: { value: "#00D2FF" },
                shape: { type: "circle" },
                opacity: { value: 0.3 },
                size: { value: 2 },
                line_linked: { enable: true, distance: 150, color: "#00D2FF", opacity: 0.15, width: 1 },
                move: { enable: true, speed: 0.8, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
            },
            interactivity: {
                detect_on: "window",
                events: {
                    onhover: { enable: true, mode: "grab" },
                    resize: true
                },
                modes: {
                    grab: { distance: 200, line_linked: { opacity: 0.4 } }
                }
            },
            retina_detect: true
        });
    }

    /* 7. GROW STUDIO - EASTER EGG B: CONSOLA F12 PARA CURIOSOS */
    const gsBanner = `%c 🎨 GROW STUDIO DIGITAL ENGINE %c PROTOCOLO KDOG_K %c
⚡ Arquitectura visual deportiva de alto valor ($5,000+ USD) calibrada para producción.
🌐 Hablemos de tu próximo desarrollo: https://growstudioweb.vercel.app/`;
    console.log(
        gsBanner,
        'background: #001E50; color: #00D2FF; font-size: 13px; font-weight: 900; padding: 6px 12px; border-radius: 6px 0 0 6px; border: 1px solid #00D2FF;',
        'background: #00D2FF; color: #001E50; font-size: 13px; font-weight: 900; padding: 6px 12px; border-radius: 0 6px 6px 0;',
        'color: #94a3b8; font-size: 11px; margin-top: 6px; font-family: monospace;'
    );

    /* 8. GROW STUDIO - TRÍADA DE EASTER EGGS: CONFETI + TARJETA (5 TOQUES) Y PULSO (LONG-PRESS) */
    const logos = document.querySelectorAll('nav img[alt*="Reto Virtual"], .rv-logo img, header img');
    
    // Función para disparar confeti
    const lanzarConfetiGrowStudio = () => {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#00D2FF', '#FF5500', '#001E50', '#FFFFFF', '#10B981']
            });
        } else {
            // Carga dinámica de canvas-confetti si no está en la página
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
            script.onload = () => {
                if (typeof confetti === 'function') {
                    confetti({
                        particleCount: 120,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#00D2FF', '#FF5500', '#001E50', '#FFFFFF', '#10B981']
                    });
                }
            };
            document.head.appendChild(script);
        }

        // Mostrar tarjeta flotante de Grow Studio
        const cardId = 'gs-easter-egg-card';
        let card = document.getElementById(cardId);
        if (!card) {
            card = document.createElement('div');
            card.id = cardId;
            card.className = 'gs-easter-toast';
            card.innerHTML = `
                <div class="gs-easter-icon">⚡</div>
                <div>
                    <div class="gs-easter-title">CRAFTED BY GROW STUDIO</div>
                    <div class="gs-easter-subtitle">Experiencia running digital • Protocolo KDOG_K activo</div>
                </div>
            `;
            document.body.appendChild(card);
        }
        card.classList.remove('active');
        void card.offsetWidth; // Forzar reflow
        card.classList.add('active');
        setTimeout(() => {
            if (card) card.classList.remove('active');
        }, 4000);
    };

    logos.forEach(logo => {
        let pressTimer;
        let tapCount = 0;
        let tapTimer = null;

        const triggerMagic = () => {
            logo.classList.remove('grow-magic-active');
            void logo.offsetWidth; // Forzar reflow
            logo.classList.add('grow-magic-active');
            setTimeout(() => logo.classList.remove('grow-magic-active'), 1400);
        };

        // Detector de 5 toques para Confeti + Tarjeta Grow Studio
        logo.addEventListener('click', (e) => {
            tapCount++;
            clearTimeout(tapTimer);

            if (tapCount >= 5) {
                tapCount = 0;
                triggerMagic();
                lanzarConfetiGrowStudio();
                e.preventDefault();
                return;
            }

            // Si no llega a 5 toques en 2 segundos, reiniciar cuenta
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 2000);
        });

        // Mantener presionado 1.2s para efecto de pulso/giro
        logo.addEventListener('mousedown', () => {
            pressTimer = setTimeout(triggerMagic, 1200);
        });
        logo.addEventListener('mouseup', () => clearTimeout(pressTimer));
        logo.addEventListener('mouseleave', () => clearTimeout(pressTimer));
        logo.addEventListener('touchstart', () => {
            pressTimer = setTimeout(triggerMagic, 1200);
        }, { passive: true });
        logo.addEventListener('touchend', () => clearTimeout(pressTimer));
        logo.addEventListener('touchcancel', () => clearTimeout(pressTimer));
    });

    /* 9. ACTUALIZACIÓN AUTOMÁTICA DEL AÑO DINÁMICO EN FOOTERS */
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = currentYear;
    });
});

