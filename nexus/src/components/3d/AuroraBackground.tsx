import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
//  Optimized Volumetric Smoke + Slow Glowing Orbs + Lightning Flashes
//  Reduced loop iterations and orb count for smooth loading.
// ═══════════════════════════════════════════════════════════════════════

const gradientVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const gradientFragment = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uAspect;
  
  // Lightning uniforms
  uniform vec2 uLightningPos;
  uniform float uLightningStrength;
  uniform vec3 uLightningColor;

  varying vec2 vUv;

  // ── Noise ──
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 perm(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float noise(vec3 p) {
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);
    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);
    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);
    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));
    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
    return o4.y * d.y + o4.x * (1.0 - d.y);
  }

  // 5-octave FBM (down from 8)
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    mat3 rot = mat3(0.8,0.6,0.0, -0.6,0.8,0.0, 0.0,0.0,1.0);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }

  // 4-octave ridged FBM (down from 6)
  float ridgedFbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
      v += a * n * n;
      p *= 2.2;
      a *= 0.5;
    }
    return v;
  }

  float blob(vec2 uv, vec2 center, float radius) {
    float d = length((uv - center) * vec2(uAspect, 1.0));
    return smoothstep(radius, 0.0, d);
  }

  // ── Slow flickering light orb ──
  float lightOrb(vec2 uv, vec2 center, float radius, float t, float seed) {
    float d = length((uv - center) * vec2(uAspect, 1.0));
    float glow = exp(-d * d / (radius * radius * 0.5));
    float halo = exp(-d * d / (radius * radius * 2.5)) * 0.35;

    // Slow flicker — long sustained glow
    float flicker = noise(vec3(seed * 5.0, t * 0.4, 0.0)) * 0.6 + 0.4;
    // Occasional slow surge
    float surge = pow(max(0.0, sin(t * 0.25 + seed * 8.0)), 8.0) * 0.6;

    float intensity = flicker + surge;
    return (glow + halo) * intensity;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.035;
    float ft = uTime;

    // ── Mouse depth parallax ──
    float mouseDepth = (uMouse.y - 0.5) * 2.0;
    float mouseX = (uMouse.x - 0.5) * 2.0;

    vec2 uvNear = uv + vec2(mouseX * 0.04, mouseDepth * 0.06);
    vec2 uvMid  = uv + vec2(mouseX * 0.02, mouseDepth * 0.03);
    vec2 uvFar  = uv + vec2(mouseX * 0.01, mouseDepth * 0.01);

    // ── Flowing UVs (one fbm call each) ──
    vec2 flowNear = uvNear;
    float flowN = fbm(vec3(uvNear * 0.8, t * 0.4));
    flowNear += vec2(flowN * 0.09, fbm(vec3(uvNear * 0.8 + 50.0, t * 0.3)) * 0.07);

    vec2 flowMid = uvMid;
    flowMid += vec2(fbm(vec3(uvMid * 0.7 + 20.0, t * 0.25)) * 0.07, fbm(vec3(uvMid * 0.7 + 70.0, t * 0.2)) * 0.05);

    vec2 flowFar = uvFar;
    flowFar += vec2(fbm(vec3(uvFar * 0.5 + 40.0, t * 0.15)) * 0.05);

    // ── Smoke densities (fewer calls) ──
    float sFar1 = fbm(vec3(flowFar * 0.6, t * 0.2));
    float sFar2 = fbm(vec3(flowFar * 0.9 + 10.0, t * 0.25));

    float sMid1 = fbm(vec3(flowMid * 1.2, t * 0.4));
    float sMid2 = ridgedFbm(vec3(flowMid * 1.5 + 5.0, t * 0.5));

    float sNear1 = fbm(vec3(flowNear * 1.6, t * 0.6));
    float sNear2 = ridgedFbm(vec3(flowNear * 2.0 + 20.0, t * 0.5));

    // ── Palette ──
    vec3 baseFog     = vec3(0.05, 0.05, 0.055);     // brighter base — no black
    vec3 deepSmoke   = vec3(0.065, 0.063, 0.07);
    vec3 midSmoke    = vec3(0.09, 0.085, 0.095);
    vec3 lightSmoke  = vec3(0.13, 0.125, 0.13);
    vec3 warmSmoke   = vec3(0.11, 0.09, 0.07);
    vec3 coolSmoke   = vec3(0.07, 0.075, 0.095);
    vec3 denseSmoke  = vec3(0.06, 0.058, 0.065);
    vec3 paleFog     = vec3(0.10, 0.10, 0.11);

    // ═══════════════════════════════════════════════════════
    //  FULL-SCREEN BASE FOG — prevents any holes
    // ═══════════════════════════════════════════════════════

    vec3 color = baseFog;

    // Constant fog layer — always covers everything
    float fogBase = fbm(vec3(uv * 0.4, t * 0.1));
    color = mix(color, deepSmoke, fogBase * 0.8 + 0.3);

    // Second slow fog layer
    float fogBase2 = fbm(vec3(uv * 0.3 + 80.0, t * 0.08));
    color = mix(color, paleFog, fogBase2 * 0.4 + 0.1);

    // ═══════════════════════════════════════════════════════
    //  ⚡ LIGHTNING FLASH LAYER (Behind deep smoke)
    // ═══════════════════════════════════════════════════════
    
    // Only calculate if strength > 0 to save performance
    if (uLightningStrength > 0.01) {
        // Distance from lightning source
        float dFlash = length((uvFar - uLightningPos) * vec2(uAspect, 1.0));
        
        // Soft, large glow (cloud illumination)
        float glow = smoothstep(1.2, 0.1, dFlash);
        
        // Intensity flickers with noise
        float flicker = noise(vec3(uTime * 20.0, 0.0, 0.0)) * 0.3 + 0.7;
        
        // Add color: mainly white/blue, mixed with orange for "storm" feel
        vec3 flashColor = uLightningColor * glow * uLightningStrength * flicker;
        
        // Add to base color, but obscured by density (approximated)
        color += flashColor * 0.8; 
    }

    // ═══════════════════════════════════════════════════════
    //  LAYER 0: 6 GLOWING ORBS — STRONG (deep behind smoke)
    // ═══════════════════════════════════════════════════════

    vec3 orbBright = vec3(1.0, 0.55, 0.08);
    vec3 orbWarm   = vec3(0.9, 0.35, 0.05);
    vec3 orbHot    = vec3(1.0, 0.75, 0.25);
    vec3 orbAmb    = vec3(0.3, 0.12, 0.025);
    vec3 emberGlow = vec3(0.1, 0.05, 0.018);

    // Orbs with reduced drift (stay on screen)
    float orb1 = lightOrb(uvFar, vec2(0.25 + sin(t*0.3)*0.08, 0.4 + cos(t*0.25)*0.08), 0.55, ft, 1.0);
    float orb2 = lightOrb(uvFar, vec2(0.72 + cos(t*0.2)*0.07, 0.55 + sin(t*0.3)*0.07), 0.6, ft, 5.3);
    float orb3 = lightOrb(uvFar, vec2(0.5 + sin(t*0.4)*0.06, 0.75 + cos(t*0.35)*0.06), 0.5, ft, 11.7);
    float orb4 = lightOrb(uvFar, vec2(0.18 + cos(t*0.35)*0.05, 0.6 + sin(t*0.45)*0.07), 0.5, ft, 16.2);
    float orb5 = lightOrb(uvFar, vec2(0.8 + sin(t*0.25)*0.06, 0.28 + cos(t*0.4)*0.06), 0.55, ft, 20.5);
    float orb6 = lightOrb(uvFar, vec2(0.45 + cos(t*0.5)*0.07, 0.18 + sin(t*0.3)*0.05), 0.48, ft, 24.8);

    // Paint orbs — STRONG intensity
    color += orbBright * orb1 * 0.7;
    color += orbWarm * orb2 * 0.8;
    color += orbHot * orb3 * 0.6;
    color += orbWarm * orb4 * 0.65;
    color += orbBright * orb5 * 0.75;
    color += orbHot * orb6 * 0.55;

    // Strong ambient wash from all orbs
    float totalOrb = orb1 + orb2 + orb3 + orb4 + orb5 + orb6;
    color += orbAmb * totalOrb * 0.1;

    // Persistent warm ember zones — large and always visible
    float heat1 = blob(uvFar, vec2(0.3 + sin(t*0.4)*0.08, 0.5 + cos(t*0.3)*0.1), 0.7);
    float heat2 = blob(uvFar, vec2(0.7 + cos(t*0.3)*0.06, 0.35 + sin(t*0.4)*0.08), 0.6);
    float heat3 = blob(uvFar, vec2(0.5 + sin(t*0.2)*0.05, 0.8 + cos(t*0.5)*0.05), 0.55);
    float heat4 = blob(uvFar, vec2(0.15 + cos(t*0.5)*0.04, 0.2 + sin(t*0.3)*0.06), 0.5);
    color += emberGlow * heat1 * 0.8;
    color += emberGlow * heat2 * 0.7;
    color += emberGlow * heat3 * 0.6;
    color += emberGlow * heat4 * 0.5;

    // ═══════════════════════════════════════════════════════
    //  LAYER 1: FAR SMOKE (reduced drift, larger radii)
    // ═══════════════════════════════════════════════════════

    float bf1 = blob(uvFar, vec2(0.3 + sin(t*0.3)*0.1, 0.5 + cos(t*0.2)*0.1), 0.95);
    float bf2 = blob(uvFar, vec2(0.7 + cos(t*0.25)*0.08, 0.4 + sin(t*0.35)*0.08), 0.9);
    float bf3 = blob(uvFar, vec2(0.5 + sin(t*0.4)*0.06, 0.8 + cos(t*0.3)*0.06), 0.85);
    float bf4 = blob(uvFar, vec2(0.15 + cos(t*0.2)*0.05, 0.25 + sin(t*0.3)*0.08), 0.8);

    color = mix(color, deepSmoke,  bf1 * sFar1 * 2.5 + bf1 * 0.15);
    color = mix(color, coolSmoke,  bf2 * sFar2 * 2.0 + bf2 * 0.12);
    color = mix(color, denseSmoke, bf3 * sFar1 * 1.8 + bf3 * 0.1);
    color = mix(color, paleFog,    bf4 * sFar2 * 1.5 + bf4 * 0.1);

    // ═══════════════════════════════════════════════════════
    //  LAYER 2: MID SMOKE
    // ═══════════════════════════════════════════════════════

    float bm1 = blob(uvMid, vec2(0.35 + sin(t*0.5)*0.08, 0.45 + cos(t*0.4)*0.08), 0.8);
    float bm2 = blob(uvMid, vec2(0.65 + cos(t*0.35)*0.07, 0.6 + sin(t*0.55)*0.07), 0.75);
    float bm3 = blob(uvMid, vec2(0.2 + sin(t*0.6)*0.06, 0.7 + cos(t*0.5)*0.06), 0.7);
    float bm4 = blob(uvMid, vec2(0.8 + cos(t*0.4)*0.05, 0.3 + sin(t*0.45)*0.07), 0.65);

    color = mix(color, midSmoke,   bm1 * sMid1 * 2.8 + bm1 * 0.08);
    color = mix(color, warmSmoke,  bm2 * sMid2 * 2.5 + bm2 * 0.06);
    color = mix(color, lightSmoke, bm3 * sMid1 * 2.0 + bm3 * 0.07);
    color = mix(color, coolSmoke,  bm4 * sMid2 * 1.6 + bm4 * 0.05);

    // ═══════════════════════════════════════════════════════
    //  LAYER 3: NEAR SMOKE (foreground)
    // ═══════════════════════════════════════════════════════

    float bn1 = blob(uvNear, vec2(0.4 + sin(t*0.7)*0.06, 0.5 + cos(t*0.6)*0.06), 0.7);
    float bn2 = blob(uvNear, vec2(0.7 + cos(t*0.5)*0.05, 0.35 + sin(t*0.7)*0.05), 0.65);
    float bn3 = blob(uvNear, vec2(0.25 + sin(t*0.8)*0.04, 0.7 + cos(t*0.6)*0.05), 0.6);

    color = mix(color, midSmoke,   bn1 * sNear1 * 2.5 + bn1 * 0.06);
    color = mix(color, denseSmoke, bn2 * sNear2 * 2.2 + bn2 * 0.05);
    color = mix(color, warmSmoke,  bn3 * sNear1 * 1.8 + bn3 * 0.04);

    // ── Smoke bands ──
    float band1 = smoothstep(0.38, 0.58, fbm(vec3(uvMid.x * 2.0, uvMid.y * 0.3 + t * 0.15, t * 0.2)));
    color += coolSmoke * band1 * 0.08;

    // ── Orb light scattering through smoke ──
    float smokeEdge = ridgedFbm(vec3(flowMid * 1.5 + 100.0, t * 0.3));
    color += orbWarm * totalOrb * smokeEdge * 0.025;
    
    // Also scatter lightning
    if (uLightningStrength > 0.01) color += uLightningColor * uLightningStrength * smokeEdge * 0.1;

    // ── Mouse warm glow ──
    float bMouse = blob(uv, uMouse, 0.5);
    color += vec3(0.04, 0.02, 0.006) * bMouse * 0.15;

    // ── Soft vignette ──
    vec2 vig = vUv * (1.0 - vUv);
    float vigFactor = pow(vig.x * vig.y * 15.0, 0.2);
    color *= mix(0.75, 1.0, vigFactor);

    // ── Film grain (cheap) ──
    float fg = (fract(sin(dot(vUv * 1000.0 + uTime * 50.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.004;
    color += fg;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ═══════════════════════════════════════════════════════════════════════
export function AuroraBackground() {
  const { gl, size } = useThree();

  const fbo = useMemo(() => new THREE.WebGLRenderTarget(
    Math.min(size.width, 800),
    Math.min(size.height, 800),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    }
  ), [size.width, size.height]);

  const gp = useMemo(() => {
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: gradientVertex,
      fragmentShader: gradientFragment,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uAspect: { value: size.width / size.height },
        // Lightning uniforms
        uLightningPos: { value: new THREE.Vector2(0.5, 0.5) },
        uLightningStrength: { value: 0 },
        uLightningColor: { value: new THREE.Color('#FF8844') },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);
    return { scene, cam, mat };
  }, [size.width, size.height]);

  const mouse = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX / window.innerWidth;
      mouse.current.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    return () => { fbo.dispose(); };
  }, [fbo]);

  const smoothMouse = useRef(new THREE.Vector2(0.5, 0.5));

  // Lightning state
  const lightningState = useRef({
    active: false,
    timer: 0,
    duration: 0,
    strength: 0,
    targetStrength: 0,
    nextFlashTime: 2.0 + Math.random() * 3.0 // First flash in 2-5s
  });

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Mouse smoothing
    smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.05;
    smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.05;

    // ── Lightning Logic ──
    const ls = lightningState.current;

    // Countdown to next flash
    if (!ls.active) {
      ls.nextFlashTime -= delta;
      if (ls.nextFlashTime <= 0) {
        // Trigger flash
        ls.active = true;
        ls.duration = 2.0 + Math.random() * 1.5; // 2-3.5 seconds long
        ls.timer = ls.duration;
        ls.strength = 0;

        // Random position
        gp.mat.uniforms.uLightningPos.value.set(
          Math.random() * 0.8 + 0.1,
          Math.random() * 0.6 + 0.2
        );

        // Random warm color (orange/yellow/white)
        if (Math.random() > 0.5) {
          gp.mat.uniforms.uLightningColor.value.set('#FF9933'); // Orange
        } else {
          gp.mat.uniforms.uLightningColor.value.set('#FFDDDD'); // Warm White
        }
      }
    } else {
      // Flash active
      ls.timer -= delta;
      const progress = 1.0 - (ls.timer / ls.duration);

      // Attack (fast up), Sustain (flicker), Decay (slow down)
      let target = 0;

      if (progress < 0.1) {
        // Attack
        target = progress * 10.0;
      } else if (progress < 0.7) {
        // Sustain with heavy flicker
        // Perlin noise via sin approximation for flicker
        target = 0.8 + Math.sin(time * 30.0) * 0.2 + Math.cos(time * 55.0) * 0.1;
      } else {
        // Decay
        target = (1.0 - progress) / 0.3; // Fade out
      }

      // Apply smoothing
      ls.strength += (target - ls.strength) * 10.0 * delta;

      if (ls.timer <= 0) {
        ls.active = false;
        ls.strength = 0;
        ls.nextFlashTime = 4.0 + Math.random() * 5.0; // Wait 4-9s between flashes
      }
    }

    gp.mat.uniforms.uLightningStrength.value = Math.max(0, ls.strength);

    // Update other uniforms
    gp.mat.uniforms.uTime.value = time;
    gp.mat.uniforms.uMouse.value.copy(smoothMouse.current);

    gl.setRenderTarget(fbo);
    gl.render(gp.scene, gp.cam);
    gl.setRenderTarget(null);

    state.scene.background = fbo.texture;
  });

  return null;
}
