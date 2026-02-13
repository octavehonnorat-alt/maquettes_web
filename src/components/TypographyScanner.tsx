import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';


interface TypographyScannerProps {
    lines: string[];
    scrambleDuration?: number;
    revealDelay?: number;
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Premium text scramble hook with proper cleanup
function useTextScramble(text: string, isActive: boolean, duration: number = 1500) {
    const [displayText, setDisplayText] = useState(() => text.split('').map(() => ' ').join(''));
    const frameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive) {
            setDisplayText(text.split('').map(() => ' ').join(''));
            return;
        }

        startTimeRef.current = performance.now();
        const textLength = text.length;

        const animate = (currentTime: number) => {
            if (!startTimeRef.current) return;

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            const result = text.split('').map((char, index) => {
                const charProgress = progress * textLength;

                if (index < charProgress - 2) {
                    return char;
                } else if (index < charProgress + 3) {
                    if (char === ' ') return ' ';
                    return characters[Math.floor(Math.random() * characters.length)];
                } else {
                    return ' ';
                }
            }).join('');

            setDisplayText(result);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayText(text);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [text, isActive, duration]);

    return displayText;
}

// Single line component with scramble effect
function ScrambleLine({
    text,
    delay = 0,
    isInView,
    className = ''
}: {
    text: string;
    delay?: number;
    isInView: boolean;
    className?: string;
}) {
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const displayText = useTextScramble(text, shouldAnimate, 1500);

    useEffect(() => {
        if (isInView) {
            const timer = setTimeout(() => setShouldAnimate(true), delay);
            return () => clearTimeout(timer);
        } else {
            setShouldAnimate(false);
        }
    }, [isInView, delay]);

    return (
        <span className={className} style={{ display: 'block', whiteSpace: 'pre' }}>
            {displayText}
        </span>
    );
}

// Animation variants
const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const lineVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 60,
        rotateX: -15,
    },
    visible: {
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

export function TypographyScanner({
    lines,
    revealDelay = 150
}: TypographyScannerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: true, margin: '-100px' });

    return (
        <motion.div
            ref={containerRef}
            className="typography-scanner"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            style={{
                position: 'relative',
                zIndex: 10,
                perspective: '1000px',
            }}
        >
            {lines.map((line, index) => (
                <motion.div
                    key={index}
                    variants={lineVariants}
                    style={{
                        overflow: 'hidden',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    <ScrambleLine
                        text={line}
                        delay={index * revealDelay}
                        isInView={isInView}
                        className="h1"
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}

// Premium Technical Label with pulse animation
export function TechLabel({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.div
            ref={ref}
            className="label"
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
            animate={isInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

// Animated paragraph with blur reveal
export function AnimatedParagraph({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLParagraphElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <motion.p
            ref={ref}
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            style={{
                color: 'var(--text-secondary)',
                maxWidth: '55ch',
                lineHeight: 2.0,
                fontSize: '1.1rem',
                fontWeight: 400,
                letterSpacing: '-0.005em',
            }}
        >
            {children}
        </motion.p>
    );
}



// Glowing orb decoration (inspired by premium sites)
export function GlowingOrb({
    size = 400,
    color = '#FF4400',
    x = '50%',
    y = '50%',
    blur = 150,
    opacity = 0.15
}: {
    size?: number;
    color?: string;
    x?: string;
    y?: string;
    blur?: number;
    opacity?: number;
}) {
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                background: color,
                borderRadius: '50%',
                filter: `blur(${blur}px)`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}

// Floating particles effect
export function FloatingParticle({ delay = 0 }: { delay?: number }) {
    return (
        <motion.div
            initial={{ y: 0, opacity: 0 }}
            animate={{
                y: [-20, 20, -20],
                opacity: [0, 1, 0],
            }}
            transition={{
                duration: 4,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
            style={{
                width: 4,
                height: 4,
                background: 'var(--accent)',
                borderRadius: '50%',
            }}
        />
    );
}

export default TypographyScanner;
