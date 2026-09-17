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

});
