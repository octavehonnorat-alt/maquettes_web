import { useState, useEffect, useCallback } from 'react';

interface Spark {
    id: number;
    x: number;
    y: number;
}

// Simple spark particle to avoid heavy motion/dom overhead
const Sparkle = ({ x, y }: { x: number; y: number }) => {
    return (
        <div style={{ position: 'absolute', left: x, top: y }}>
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = i * 45;
                // Randomize distance slightly
                const dist = 50 + Math.random() * 30;
                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            width: 3,
                            height: 12,
                            background: i % 2 === 0 ? '#FF5500' : '#FFDDAA',
                            borderRadius: 2,
                            transform: `rotate(${angle}deg) translateY(0)`,
                            transformOrigin: '50% 100%',
                            animation: `sparkFly-${i} 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        }}
                    >
                        <style>
                            {`
                @keyframes sparkFly-${i} {
                  0% { transform: rotate(${angle}deg) translateY(0) scale(0); opacity: 1; }
                  20% { opacity: 1; }
                  100% { transform: rotate(${angle}deg) translateY(-${dist}px) scale(0); opacity: 0; }
                }
              `}
                        </style>
                    </div>
                );
            })}
        </div>
    );
};

export function ClickSpark() {
    const [sparks, setSparks] = useState<Spark[]>([]);

    const handleClick = useCallback((e: MouseEvent) => {
        const newSpark = { id: Date.now(), x: e.clientX, y: e.clientY };
        setSparks((prev) => [...prev, newSpark]);

        // Cleanup after animation
        setTimeout(() => {
            setSparks((prev) => prev.filter((s) => s.id !== newSpark.id));
        }, 600);
    }, []);

    useEffect(() => {
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [handleClick]);

    return (
        <>
            <style>
                {`
          @keyframes sparkBurst {
            0% {
              transform: rotate(var(--rot)) translateY(0px) scale(0);
              opacity: 1;
            }
            15% {
              opacity: 1;
              transform: rotate(var(--rot)) translateY(-15px) scale(1.5);
            }
            100% {
              transform: rotate(var(--rot)) translateY(-60px) scale(0);
              opacity: 0;
            }
          }
          
          .click-spark-particle {
             /* We inject the rotation var via inline style in the loop above? 
                Actually easier to just hardcode standard burst in JS loop 
                or use specific classes. Let's stick to inline styles for rotation. */
          }
        `}
            </style>

            {/* Portal-like overlay */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
                {sparks.map((s) => (
                    <Sparkle key={s.id} x={s.x} y={s.y} />
                ))}
            </div>
        </>
    );
}
