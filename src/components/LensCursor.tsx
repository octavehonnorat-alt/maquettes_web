import { useEffect, useCallback } from 'react';
import gsap from 'gsap';

// Magnetic interaction effects for interactive elements
export function LensCursor() {

    const checkMagnetic = useCallback((e: MouseEvent) => {
        // Target buttons, links, and bento cells
        const magneticElements = document.querySelectorAll('.btn, a, button, .bento-cell, .magnetic');

        magneticElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);

            // Different thresholds based on element type
            const isBentoCell = el.classList.contains('bento-cell');
            const isButton = el.classList.contains('btn') || el.tagName === 'BUTTON';

            let threshold: number;
            let pull: number;

            if (isBentoCell) {
                threshold = 300; // Massive magnetic field
                pull = 0.15;    // Smooth pull — not jerky
            } else if (isButton) {
                threshold = 200; // Large button field
                pull = 0.35;    // Satisfying pull
            } else {
                threshold = 120; // Links
                pull = 0.22;
            }

            if (dist < threshold) {
                const strength = Math.pow(1 - dist / threshold, 2.0); // Smooth quadratic
                gsap.to(el, {
                    x: (e.clientX - centerX) * pull * strength,
                    y: (e.clientY - centerY) * pull * strength,
                    duration: 0.25,
                    ease: 'power2.out'
                });
            } else {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    duration: 1.2,
                    ease: 'power4.out'
                });
            }
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            checkMagnetic(e);
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [checkMagnetic]);

    return null;
}

export default LensCursor;
