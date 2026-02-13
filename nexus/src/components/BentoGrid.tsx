import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// ─── Animated counter with easing ─────────────────────────────────────────────
function AnimatedCounter({
    value,
    suffix = '',
    prefix = '',
    duration = 2
}: {
    value: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
}) {
    const [displayValue, setDisplayValue] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });
    const startedRef = useRef(false);

    useEffect(() => {
        if (!isInView || startedRef.current) return;
        startedRef.current = true;

        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(value * eased));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        requestAnimationFrame(animate);
    }, [isInView, value, duration]);

    return (
        <div ref={ref} className="data-value">
            {prefix}{displayValue.toLocaleString()}<span className="data-unit">{suffix}</span>
        </div>
    );
}

// ─── Enhanced Wireframe Sphere ────────────────────────────────────────────────
function WireframeSphere() {
    const meshRef = useRef<THREE.Mesh>(null);
    const outerRef = useRef<THREE.Mesh>(null);
    const edgesRef = useRef<THREE.LineSegments>(null);
    const edges2Ref = useRef<THREE.LineSegments>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const targetRotation = useRef({ x: 0, y: 0 });

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
        const pointer = state.pointer;

        targetRotation.current.x = pointer.y * 0.3;
        targetRotation.current.y = pointer.x * 0.3;

        if (groupRef.current) {
            groupRef.current.rotation.x += (targetRotation.current.x - groupRef.current.rotation.x) * 0.05;
            groupRef.current.rotation.y += (targetRotation.current.y - groupRef.current.rotation.y) * 0.05;
        }

        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.15;
            meshRef.current.rotation.x += delta * 0.05;
        }
        if (outerRef.current) {
            outerRef.current.rotation.y -= delta * 0.1;
            outerRef.current.rotation.z += delta * 0.04;
        }
        if (edgesRef.current) {
            edgesRef.current.rotation.y += delta * 0.15;
            edgesRef.current.rotation.x += delta * 0.05;
        }
        if (edges2Ref.current) {
            edges2Ref.current.rotation.y -= delta * 0.08;
            edges2Ref.current.rotation.x -= delta * 0.03;
        }
        if (coreRef.current) {
            const scale = 1 + Math.sin(time * 2.5) * 0.15;
            coreRef.current.scale.setScalar(scale);
        }
    });

    const geometry = new THREE.IcosahedronGeometry(1.2, 2);
    const outerGeometry = new THREE.IcosahedronGeometry(1.5, 1);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const outerEdgesGeometry = new THREE.EdgesGeometry(outerGeometry);

    return (
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.15}>
            <group ref={groupRef}>
                <lineSegments ref={edges2Ref} geometry={outerEdgesGeometry}>
                    <lineBasicMaterial color="#F0F0F0" transparent opacity={0.15} />
                </lineSegments>
                <lineSegments ref={edgesRef} geometry={edgesGeometry}>
                    <lineBasicMaterial color="#F0F0F0" transparent opacity={0.5} />
                </lineSegments>
                <mesh ref={meshRef} scale={0.92}>
                    <icosahedronGeometry args={[1.2, 3]} />
                    <meshPhysicalMaterial
                        color="#1a1a1a"
                        metalness={0.1}
                        roughness={0.1}
                        transmission={0.9}
                        thickness={0.5}
                        envMapIntensity={1}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        ior={1.5}
                    />
                </mesh>
                <mesh ref={outerRef} scale={0.85}>
                    <icosahedronGeometry args={[1.2, 2]} />
                    <meshBasicMaterial
                        color="#FF3300"
                        transparent
                        opacity={0.05}
                        side={THREE.BackSide}
                    />
                </mesh>
                <mesh ref={coreRef}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshBasicMaterial color="#FF3300" />
                </mesh>
                <mesh scale={0.25}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshBasicMaterial
                        color="#FF3300"
                        transparent
                        opacity={0.1}
                    />
                </mesh>
            </group>
        </Float>
    );
}

// ─── 3D Cell component ────────────────────────────────────────────────────────
function Cell3D() {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(255,51,0,0.02) 0%, transparent 70%)'
        }}>
            <Canvas
                camera={{ position: [0, 0, 3.5], fov: 45 }}
                dpr={[1, 2]}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <pointLight position={[0, 0, 2]} intensity={0.3} color="#FF3300" />
                <WireframeSphere />
            </Canvas>
        </div>
    );
}

// ─── Magnetic BentoCell with proximity attraction ─────────────────────────────
interface CellProps {
    className?: string;
    children?: React.ReactNode;
    delay?: number;
}

function BentoCell({ className = '', children, delay = 0 }: CellProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const [isHovered, setIsHovered] = useState(false);

    const [hasAppeared, setHasAppeared] = useState(false);

    useEffect(() => {
        if (isInView) {
            setHasAppeared(true);
        }
    }, [isInView]);

    // Magnetic attraction values
    const magnetX = useMotionValue(0);
    const magnetY = useMotionValue(0);
    const springX = useSpring(magnetX, { stiffness: 60, damping: 20, mass: 1.5 });
    const springY = useSpring(magnetY, { stiffness: 60, damping: 20, mass: 1.5 });

    // Tilt values
    const tiltX = useMotionValue(0);
    const tiltY = useMotionValue(0);
    const springTiltX = useSpring(tiltX, { stiffness: 100, damping: 20 });
    const springTiltY = useSpring(tiltY, { stiffness: 100, damping: 20 });

    // Glow position
    const glowX = useMotionValue(50);
    const glowY = useMotionValue(50);

    // Scale on hover
    const scaleValue = useMotionValue(1);
    const springScale = useSpring(scaleValue, { stiffness: 100, damping: 20 });

    // Border glow intensity
    const glowIntensity = useMotionValue(0);
    const springGlow = useSpring(glowIntensity, { stiffness: 100, damping: 20 });
    const borderColor = useTransform(springGlow, [0, 1], ['rgba(255,255,255,0.05)', 'rgba(255,51,0,0.3)']);
    const shadowOpacity = useTransform(springGlow, [0, 1], [0, 0.4]);

    // Global mouse listener for proximity detection (magnetic pull from distance)
    useEffect(() => {
        const MAGNETIC_RADIUS = 250; // px — distance at which attraction starts
        const MAGNETIC_STRENGTH = 25; // px — max translation

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distX = e.clientX - centerX;
            const distY = e.clientY - centerY;
            const distance = Math.sqrt(distX * distX + distY * distY);

            if (distance < MAGNETIC_RADIUS) {
                // Normalized [0,1] where 1 = closest
                const strength = 1 - distance / MAGNETIC_RADIUS;
                const eased = strength * strength; // ease-in for smoother feel
                magnetX.set(distX * eased * (MAGNETIC_STRENGTH / MAGNETIC_RADIUS) * 3);
                magnetY.set(distY * eased * (MAGNETIC_STRENGTH / MAGNETIC_RADIUS) * 3);
                glowIntensity.set(eased);
            } else {
                magnetX.set(0);
                magnetY.set(0);
                glowIntensity.set(0);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [magnetX, magnetY, glowIntensity]);

    // Mouse move on card for tilt + glow follow
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        tiltX.set((y - 0.5) * -20);
        tiltY.set((x - 0.5) * 20);
        glowX.set(x * 100);
        glowY.set(y * 100);
        scaleValue.set(1.04);
    }, [tiltX, tiltY, glowX, glowY, scaleValue]);

    const handleMouseLeave = useCallback(() => {
        tiltX.set(0);
        tiltY.set(0);
        scaleValue.set(1);
        setIsHovered(false);
    }, [tiltX, tiltY, scaleValue]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    // Staggered entrance variants
    const entranceVariants = {
        hidden: {
            opacity: 0,
            filter: 'blur(10px)',
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            transition: {
                duration: 1.2,
                delay: delay * 0.12,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            },
        },
    };

    return (
        <motion.div
            ref={ref}
            className={`bento-cell ${className}`}
            variants={entranceVariants}
            initial="hidden"
            animate={hasAppeared ? 'visible' : 'hidden'}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            style={{
                x: springX,
                y: springY,
                rotateX: springTiltX,
                rotateY: springTiltY,
                scale: springScale,
                perspective: 800,
                borderColor: borderColor,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Cursor-following radial glow */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    zIndex: 0,
                    background: `radial-gradient(600px circle at ${glowX.get()}% ${glowY.get()}%, rgba(255,51,0,0.06), transparent 40%)`,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                }}
            />

            {/* Shimmer sweep effect on hover */}
            <div
                className={`bento-shimmer ${isHovered ? 'active' : ''}`}
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    zIndex: 1,
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                    transform: isHovered ? 'translateX(400%)' : 'translateX(0)',
                    transition: isHovered ? 'transform 0.8s ease' : 'none',
                }} />
            </div>

            {/* Scanline overlay on hover */}
            <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: 1,
                background: isHovered
                    ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)'
                    : 'none',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.5s ease',
            }} />

            {/* Accent border glow */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    zIndex: 0,
                    boxShadow: useTransform(shadowOpacity, (v) => `0 0 30px rgba(255,51,0,${v * 0.15}), inset 0 0 30px rgba(255,51,0,${v * 0.03})`),
                }}
            />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2, display: 'contents' }}>
                {children}
            </div>
        </motion.div>
    );
}

// ─── Glitch effect on hover ───────────────────────────────────────────────────
function GlitchCard({ children }: { children: React.ReactNode }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
            }}
        >
            {/* Scanline overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isHovered
                    ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,51,0,0.03) 2px, rgba(255,51,0,0.03) 4px)'
                    : 'none',
                transition: 'background 0.3s ease',
                pointerEvents: 'none',
                zIndex: 1,
            }} />
            <div style={{
                filter: isHovered ? 'contrast(1.1) brightness(1.05)' : 'none',
                transition: 'filter 0.3s ease',
            }}>
                {children}
            </div>
        </div>
    );
}

// ─── Typing text effect ───────────────────────────────────────────────────────
function TypingText({ text, delay: startDelay = 0 }: { text: string; delay?: number }) {
    const [displayText, setDisplayText] = useState('');
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });
    const startedRef = useRef(false);

    useEffect(() => {
        if (!isInView || startedRef.current) return;
        startedRef.current = true;

        let i = 0;
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 30);
        }, startDelay);

        return () => clearTimeout(timeout);
    }, [isInView, text, startDelay]);

    return (
        <span ref={ref}>
            {displayText}
            <span style={{
                display: 'inline-block',
                width: '2px',
                height: '1em',
                background: 'var(--accent)',
                marginLeft: '2px',
                animation: 'cursorBlink 1s step-end infinite',
                verticalAlign: 'text-bottom',
            }} />
        </span>
    );
}

// ─── Floating particles background for a cell ─────────────────────────────────
function FloatingParticles() {
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: 2,
                        height: 2,
                        background: 'rgba(255,51,0,0.4)',
                        borderRadius: '50%',
                        left: `${15 + i * 15}%`,
                        top: `${20 + (i % 3) * 25}%`,
                        animation: `floatParticle${i % 3} ${3 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                        boxShadow: '0 0 6px rgba(255,51,0,0.3)',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Pulsing ring for status ──────────────────────────────────────────────────
function PulsingRing() {
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <span
                className="accent-dot animate-pulse"
                style={{ marginBottom: 'var(--space-sm)' }}
            />
            <div style={{
                position: 'absolute',
                inset: -8,
                border: '1px solid rgba(255,51,0,0.2)',
                borderRadius: '50%',
                animation: 'pulseRing 2s ease-out infinite',
            }} />
            <div style={{
                position: 'absolute',
                inset: -16,
                border: '1px solid rgba(255,51,0,0.1)',
                borderRadius: '50%',
                animation: 'pulseRing 2s ease-out infinite 0.5s',
            }} />
        </div>
    );
}

// ─── Progress bar animation ───────────────────────────────────────────────────
function AnimatedBar({ value, color = 'var(--accent)', delay: barDelay = 0 }: { value: number; color?: string; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-50px' });

    return (
        <div ref={ref} style={{
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            overflow: 'hidden',
            marginTop: 'var(--space-xs)',
        }}>
            <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: `${value}%` } : {}}
                transition={{ duration: 1.5, delay: barDelay, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    borderRadius: 2,
                    boxShadow: `0 0 8px ${color}44`,
                }}
            />
        </div>
    );
}

// ─── Main Bento Grid ──────────────────────────────────────────────────────────
export function BentoGrid() {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <section ref={containerRef} className="section" style={{ padding: 'var(--space-lg) 0' }}>
            <div className="container">
                <motion.div
                    className="bento-grid"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    {/* ──── Large cell — Neural Lace ──── */}
                    <BentoCell className="bento-cell--large" delay={0}>
                        <Cell3D />
                        <FloatingParticles />
                        <div style={{
                            position: 'relative',
                            zIndex: 2,
                            background: 'linear-gradient(to top, var(--bg-secondary) 50%, transparent)',
                            padding: 'var(--space-md)',
                            margin: 'calc(var(--space-md) * -1)',
                            marginTop: 'auto',
                        }}>
                            <motion.span
                                className="mono-sm"
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                            >
                                Neural Lace
                            </motion.span>
                            <motion.h3
                                style={{ marginTop: 'var(--space-xs)' }}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                            >
                                <TypingText text="Mémoire Vectorielle Infinie" delay={600} />
                            </motion.h3>
                            <div className="data-display" style={{ marginTop: 'var(--space-md)' }}>
                                <motion.div
                                    className="data-item"
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.6, duration: 0.6 }}
                                >
                                    <span className="label">CONTEXT</span>
                                    <span className="value" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>∞ TB</span>
                                    <AnimatedBar value={100} delay={1} />
                                </motion.div>
                                <motion.div
                                    className="data-item"
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.75, duration: 0.6 }}
                                >
                                    <span className="label">RECALL</span>
                                    <span className="value" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>0.04ms</span>
                                    <AnimatedBar value={98} color="#FF5511" delay={1.2} />
                                </motion.div>
                            </div>
                        </div>
                    </BentoCell>

                    {/* ──── Tall cell — Air-Gapped Core ──── */}
                    <BentoCell className="bento-cell--tall" delay={1}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            justifyContent: 'space-between',
                        }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <div className="badge-military">
                                    <span>●</span>
                                    GRADE: MILITARY
                                </div>
                            </motion.div>
                            <div>
                                <motion.span
                                    className="mono-sm"
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4 }}
                                >
                                    Privacy Vault
                                </motion.span>
                                <motion.h3
                                    style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                >
                                    Air-Gapped Core
                                </motion.h3>
                                <motion.p
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.6,
                                    }}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.6, duration: 0.8 }}
                                >
                                    Déploiement local. Zéro fuite de données.
                                    Isolation complète du réseau externe.
                                </motion.p>
                            </div>
                            <div className="divider" style={{ marginTop: 'var(--space-md)' }} />
                            <motion.div
                                style={{ display: 'flex', gap: 'var(--space-lg)' }}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.7, duration: 0.6 }}
                            >
                                <div>
                                    <span className="mono-sm" style={{ fontSize: '0.6rem' }}>ENCRYPTION</span>
                                    <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>AES-256</div>
                                    <AnimatedBar value={100} color="#F0F0F0" delay={1} />
                                </div>
                                <div>
                                    <span className="mono-sm" style={{ fontSize: '0.6rem' }}>ZERO-TRUST</span>
                                    <motion.div
                                        style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        ACTIVE
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </BentoCell>

                    {/* ──── Medium cell — Multimodal Engine ──── */}
                    <BentoCell className="bento-cell--medium" delay={2}>
                        <GlitchCard>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, rgba(255,51,0,0.05) 0%, transparent 50%)',
                            }} />
                            <FloatingParticles />
                            <div style={{ position: 'relative', zIndex: 2 }}>
                                <motion.span
                                    className="mono-sm"
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Spectral Analysis
                                </motion.span>
                                <motion.h3
                                    style={{ marginTop: 'var(--space-xs)' }}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.4, duration: 0.6 }}
                                >
                                    Multimodal Engine
                                </motion.h3>
                                <motion.p
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.85rem',
                                        marginTop: 'var(--space-sm)',
                                    }}
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                >
                                    Traitement audio, vidéo, texte, code en temps réel.
                                </motion.p>

                                {/* Animated frequency bars */}
                                <div style={{
                                    display: 'flex',
                                    gap: 3,
                                    marginTop: 'var(--space-md)',
                                    height: 30,
                                    alignItems: 'flex-end',
                                }}>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            style={{
                                                width: 3,
                                                background: 'linear-gradient(to top, var(--accent), rgba(255,51,0,0.3))',
                                                borderRadius: 1,
                                            }}
                                            animate={{
                                                height: [
                                                    `${8 + Math.random() * 22}px`,
                                                    `${5 + Math.random() * 25}px`,
                                                    `${10 + Math.random() * 20}px`,
                                                ],
                                            }}
                                            transition={{
                                                duration: 0.8 + Math.random() * 0.5,
                                                repeat: Infinity,
                                                repeatType: 'mirror',
                                                ease: 'easeInOut',
                                                delay: i * 0.05,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </GlitchCard>
                    </BentoCell>

                    {/* ──── Small cell — Reasoning ──── */}
                    <BentoCell className="bento-cell--small" delay={3}>
                        <motion.span
                            className="mono-sm"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Reasoning Depth
                        </motion.span>
                        <AnimatedCounter value={128} suffix="K tokens" />
                        <AnimatedBar value={85} delay={0.8} />
                    </BentoCell>

                    {/* ──── Small cell — Latency ──── */}
                    <BentoCell className="bento-cell--small" delay={4}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle at 30% 30%, rgba(255,51,0,0.08), transparent 60%)',
                        }} />
                        <motion.span
                            className="mono-sm"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Latency
                        </motion.span>
                        <div className="data-value" style={{ fontSize: '2rem' }}>
                            &lt;1<span className="data-unit">ms</span>
                        </div>

                        {/* Animated ping wave */}
                        <div style={{ position: 'relative', marginTop: 'var(--space-sm)' }}>
                            <motion.div
                                style={{
                                    width: 40,
                                    height: 2,
                                    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                                    borderRadius: 1,
                                }}
                                animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        </div>
                    </BentoCell>

                    {/* ──── Wide cell — Description ──── */}
                    <BentoCell className="bento-cell--wide" delay={5}>
                        <div style={{ maxWidth: '65ch' }}>
                            <motion.span
                                className="mono-sm"
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                            >
                                Architecture Déterministe
                            </motion.span>
                            <motion.p
                                style={{
                                    marginTop: 'var(--space-sm)',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.75,
                                    fontSize: '0.95rem',
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                            >
                                AEX-1 utilise une architecture neuronale déterministe conçue pour
                                les environnements critiques. Chaque calcul est reproductible,
                                auditable et conforme aux standards de sécurité les plus stricts.
                                Aucune hallucination. Aucune approximation.
                            </motion.p>
                        </div>
                        {/* Scrolling code-like decoration on the right */}
                        <div style={{
                            position: 'absolute',
                            right: 'var(--space-md)',
                            top: 'var(--space-md)',
                            bottom: 'var(--space-md)',
                            width: 120,
                            overflow: 'hidden',
                            opacity: 0.15,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.55rem',
                            color: 'var(--accent)',
                            lineHeight: 1.8,
                            pointerEvents: 'none',
                            maskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
                        }}>
                            <motion.div
                                animate={{ y: [-200, 0] }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                                {Array.from({ length: 30 }).map((_, i) => (
                                    <div key={i}>{`0x${(Math.random() * 0xFFFFFF).toString(16).slice(0, 6).toUpperCase()}`}</div>
                                ))}
                            </motion.div>
                        </div>
                    </BentoCell>

                    {/* ──── Medium cell — Processing ──── */}
                    <BentoCell className="bento-cell--medium" delay={6}>
                        <FloatingParticles />
                        <motion.span
                            className="mono-sm"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Processing Power
                        </motion.span>
                        <AnimatedCounter value={1200} suffix=" TFLOPS" />
                        <motion.div
                            className="mono-sm"
                            style={{ marginTop: 'var(--space-sm)', color: 'var(--accent)' }}
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            +847% vs. Standard
                        </motion.div>
                        <AnimatedBar value={95} delay={1} />
                    </BentoCell>

                    {/* ──── Small cell — Uptime ──── */}
                    <BentoCell className="bento-cell--small" delay={7}>
                        <motion.span
                            className="mono-sm"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            Uptime SLA
                        </motion.span>
                        <AnimatedCounter value={99} suffix=".999%" />
                        <AnimatedBar value={100} color="#00FF88" delay={1.2} />
                    </BentoCell>

                    {/* ──── Small cell — Status ──── */}
                    <BentoCell className="bento-cell--small" delay={8}>
                        <PulsingRing />
                        <motion.span
                            className="mono-sm"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                        >
                            System Status
                        </motion.span>
                        <motion.div
                            className="data-value"
                            style={{ fontSize: '1.5rem', color: 'var(--accent)' }}
                            animate={{
                                textShadow: [
                                    '0 0 10px rgba(255,51,0,0)',
                                    '0 0 20px rgba(255,51,0,0.5)',
                                    '0 0 10px rgba(255,51,0,0)',
                                ],
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            NOMINAL
                        </motion.div>
                    </BentoCell>
                </motion.div>
            </div>
        </section>
    );
}

export default BentoGrid;
