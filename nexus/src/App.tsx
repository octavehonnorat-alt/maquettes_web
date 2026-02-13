import { useState, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Environment, Preload } from '@react-three/drei';
import Lenis from '@studio-freight/lenis';
import { create } from 'zustand';
import * as THREE from 'three';
import { Routes, Route, Link } from 'react-router-dom';

import {
  TypographyScanner,
  TechLabel,
  AnimatedParagraph,
  BentoGrid,
  LensCursor,
  PostProcessing,
  AuroraBackground,
  DustParticles,
  Particles,
  ClickSpark,
  MagneticButton
} from './components';
import SystemePage from './pages/SystemePage';
import ArchitecturePage from './pages/ArchitecturePage';
import DeploiementPage from './pages/DeploiementPage';
import LegalPage from './pages/LegalPage';
import './index.css';

// Global state store with Zustand
interface AppState {
  scrollProgress: number;
  mousePosition: { x: number; y: number };
  scrollVelocity: number;
  setScrollProgress: (progress: number) => void;
  setMousePosition: (x: number, y: number) => void;
  setScrollVelocity: (velocity: number) => void;
}

const useStore = create<AppState>((set) => ({
  scrollProgress: 0,
  mousePosition: { x: 0, y: 0 },
  scrollVelocity: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  setMousePosition: (x, y) => set({ mousePosition: { x, y } }),
  setScrollVelocity: (velocity) => set({ scrollVelocity: velocity }),
}));

// Cursor-following orange light
function CursorLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { pointer, viewport } = useThree();

  useFrame(() => {
    if (lightRef.current) {
      const x = pointer.x * viewport.width / 2;
      const y = pointer.y * viewport.height / 2;
      lightRef.current.position.lerp(new THREE.Vector3(x, y, 5), 0.1);
    }
  });

  return (
    <pointLight
      ref={lightRef}
      color="#FF3300"
      intensity={1.5}
      distance={20}
      decay={2}
    />
  );
}

// Scene with 3D content
function Scene() {
  return (
    <>
      {/* Background handled by FluidSimulation — no scene color */}

      {/* Cinematic Fog for depth ("Brouillard") */}
      <fog attach="fog" args={['#050505', 10, 50]} /> // Dark background match, starts at 10 units, fully obscures at 50

      <ambientLight intensity={0.03} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.25}
        color="#FFFFFF"
      />
      <directionalLight
        position={[-10, -5, -5]}
        intensity={0.08}
        color="#FF3300"
      />

      {/* Cursor-following flashlight effect */}
      <CursorLight />

      {/* Premium animated gradient background */}
      <AuroraBackground />

      {/* Luxe Dust Particles */}
      <DustParticles />

      {/* New Extra Particles (Sparkles & Cyber Cubes) */}
      <Particles />

      {/* Post-processing: bloom, chromatic aberration, vignette */}
      <PostProcessing />

      <Environment preset="night" />
      <Preload all />
    </>
  );
}

// Spring-based camera controller with mouse parallax
function CameraController() {
  const { camera, pointer } = useThree();
  const scrollProgress = useStore((state) => state.scrollProgress);
  const scrollVelocity = useStore((state) => state.scrollVelocity);

  // Target values
  const targetPos = useRef(new THREE.Vector3(0, 0, 18));
  const targetRot = useRef(new THREE.Euler(0, 0, 0));

  // Current smoothed values
  const currentPos = useRef(new THREE.Vector3(0, 0, 18));
  const currentRot = useRef(new THREE.Euler(0, 0, 0));

  useFrame((_state, delta) => {
    // Calculate target position based on scroll
    targetPos.current.set(
      pointer.x * 2.0,  // Strong mouse parallax X
      scrollProgress * 2 + pointer.y * 1.2,  // Scroll + mouse parallax Y
      18 - scrollProgress * 5  // Zoom on scroll
    );

    // Calculate target rotation
    targetRot.current.set(
      -scrollProgress * 0.1 - pointer.y * 0.08,  // Tilt on scroll + mouse
      pointer.x * 0.12,  // Stronger yaw from mouse
      scrollVelocity * 0.0005  // Roll on fast scroll
    );

    // Smoother spring interpolation
    const lerpSpeed = 3.5 * delta;
    currentPos.current.lerp(targetPos.current, lerpSpeed);
    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * lerpSpeed;
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * lerpSpeed;
    currentRot.current.z += (targetRot.current.z - currentRot.current.z) * lerpSpeed * 0.5;

    // Apply to camera
    camera.position.copy(currentPos.current);
    camera.rotation.set(currentRot.current.x, currentRot.current.y, currentRot.current.z);
  });

  return null;
}



// Floating grid lines for depth
function FloatingGrid() {
  return (
    <div className="floating-grid">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="floating-grid-line"
          style={{
            top: `${20 + i * 15}%`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

// Navigation with glassmorphism - Full Width
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: isScrolled ? 'var(--space-sm) var(--container-padding)' : 'var(--space-md) var(--container-padding)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: isScrolled
        ? 'rgba(5, 5, 5, 0.8)'
        : 'transparent',
      backdropFilter: isScrolled ? 'blur(16px) saturate(1.2)' : 'none',
      WebkitBackdropFilter: isScrolled ? 'blur(16px) saturate(1.2)' : 'none',
      borderBottom: isScrolled
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid transparent',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div className="mono-sm" style={{ color: '#F0F0F0', fontWeight: 500, letterSpacing: '0.2em' }}>
        AEX<span style={{ color: 'var(--accent)' }}>-</span>1
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        {[
          { label: 'Système', path: '/systeme' },
          { label: 'Architecture', path: '/architecture' },
          { label: 'Déploiement', path: '/deploiement' },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="mono-sm nav-link"
            style={{
              color: '#F0F0F0',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// Hero section with enhanced parallax and centered layout
function HeroSection() {
  return (
    <section className="section" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
      paddingBottom: '140px', // Increased breathing room
    }}>
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>

        <TechLabel>AEX-1 • Moteur Computationnel</TechLabel>

        <div style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <TypographyScanner
            lines={[
              'RAISONNEMENT',
              'DÉTERMINISTE',
            ]}
          />
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AnimatedParagraph>
            AEX-1 ne prédit pas. Il calcule. Architecture neuronale de niveau
            militaire pour systèmes critiques. Déploiement local, zéro latence,
            précision mathématique absolue.
          </AnimatedParagraph>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-lg)',
          marginTop: 'calc(var(--space-xl) * 0.8)',
          justifyContent: 'center',
        }}>
          <MagneticButton variant="primary" to="/systeme">
            [ INITIALISER LE SYSTÈME ]
          </MagneticButton>
          <MagneticButton variant="secondary" to="/architecture">
            Documentation
          </MagneticButton>
        </div>

        {/* Status indicator - Absolute to screen/section bottom right */}
        <div style={{
          position: 'absolute',
          right: 'var(--container-padding)',
          bottom: '1.5rem', // Lowered significantly
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 'var(--space-xs)',
          opacity: 0.7,
        }}>
          <span className="mono-sm">SYS.STATUS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span className="accent-dot animate-pulse" />
            <span className="mono" style={{ color: 'var(--text-primary)' }}>OPÉRATIONNEL</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem', // Lowered significantly to avoid overlap
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        opacity: 0.5,
      }}>
        <span className="mono-sm" style={{ fontSize: '0.6rem' }}>SCROLL</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}

// Divider
function TechDivider() {
  return (
    <div style={{ padding: 'var(--space-lg) 0' }}>
      <div className="container">
        <div className="divider" />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--space-sm)',
        }}>
          <span className="mono-sm">SECTION.02</span>
          <span className="mono-sm">SPÉCIFICATIONS TECHNIQUES</span>
          <span className="mono-sm">2026.Q1</span>
        </div>
      </div>
    </div>
  );
}

// Footer

function Footer() {
  const links = {
    Système: ['Neural Core', 'Mémoire Vectorielle', 'Analyse Spectrale'],
    Ressources: ['Documentation', 'API Référence', 'Livre Blanc'],
    Contact: ['Ventes Entreprise', 'Support Technique', 'Carrières'],
  };

  return (
    <footer style={{
      position: 'relative',
      padding: 'var(--space-xl) 0',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(5, 5, 5, 0.75)',
      backdropFilter: 'blur(16px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-lg)',
        }}>
          <div>
            <div className="mono" style={{ marginBottom: 'var(--space-md)', letterSpacing: '0.2em' }}>
              AEX<span style={{ color: 'var(--accent)' }}>-</span>1
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Moteur Computationnel Déterministe pour systèmes critiques de niveau militaire.
            </p>
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <span className="mono-sm">{title}</span>
              <ul style={{
                listStyle: 'none',
                marginTop: 'var(--space-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
              }}>
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="footer-link">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 'var(--space-xl)',
          paddingTop: 'var(--space-md)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span className="mono-sm">© 2026 AEX-1 SYSTEMS</span>

          <Link
            to="/mentions-legales"
            className="mono-sm footer-link"
            style={{
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            MENTIONS LÉGALES & CONFIDENTIALITÉ
          </Link>

          <span className="mono-sm">CLASSIFICATION: RESTRICTED</span>
        </div>
      </div>
    </footer>
  );
}

// Main App
function App() {
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const setScrollVelocity = useStore((state) => state.setScrollVelocity);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      setScrollProgress(progress);
      setScrollVelocity(velocity);
      lastScrollRef.current = progress;
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, [setScrollProgress, setScrollVelocity]);

  return (
    <>
      <LensCursor />
      <ClickSpark />

      <FloatingGrid />

      <div className="grid-overlay" />

      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 0, 18], fov: 50, near: 0.1, far: 1000 }}
          dpr={[1, 2]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
        >
          <CameraController />
          <Scene />
          <PostProcessing />
        </Canvas>
      </div>

      <Navigation />

      <div className="content-overlay">
        <Routes>
          <Route path="/" element={
            <>
              <HeroSection />
              <TechDivider />
              <BentoGrid />
              <Footer />
            </>
          } />
          <Route path="/systeme" element={<SystemePage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/deploiement" element={<DeploiementPage />} />
          <Route path="/mentions-legales" element={<LegalPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
