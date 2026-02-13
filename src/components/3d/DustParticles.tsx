import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
//  "Luxe Dust" - High-end, satisfying particles with physics
//  Features:
//  - Variable Gravity (some float up, some fall)
//  - Fictional Wind (gentle horizontal drift)
//  - Mouse Influence (smooth, viscous repulsion)
//  - Chic Aesthetic (soft glow, varied opacity, warm/cool mix)
// ═══════════════════════════════════════════════════════════════════════

const dustVertex = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute float aSpeed;
  attribute float aGravity; // -1 to 1 (fall vs rise)
  attribute float aOffset;  // Random offset for motion

  uniform float uTime;
  uniform vec3 uMouse3D;
  uniform vec3 uWind;     // Fictional wind direction/strength
  uniform float uPixelRatio;

  varying float vOpacity;
  varying float vSize;
  varying float vHighlight; // For that "chic" shimmer

  // Simplex-like noise for organic movement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.xxx
    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vec3 pos = position;

    // ── 1. Gravity & Wind System ──
    // Time-based movement with wrapping
    float t = uTime * 0.5 * aSpeed;
    
    // Vertical motion (Gravity)
    // aGravity > 0: rises, < 0: falls
    pos.y += t * aGravity; 
    
    // Horizontal motion (Wind + Noise)
    // Add raw wind force
    pos += uWind * t * 0.5;
    
    // Add noise turbulence
    float noiseVal = snoise(pos * 0.1 + vec3(t * 0.1));
    pos.x += noiseVal * 0.5;
    pos.z += noiseVal * 0.2;

    // ── 2. Seamless Wrapping ──
    // Wrap particles to keep them in the frustum
    // Box dimensions roughly: X: -25..25, Y: -15..15, Z: -10..15
    float boxW = 50.0;
    float boxH = 30.0;
    float boxD = 25.0;

    pos.x = mod(pos.x + 25.0, boxW) - 25.0;
    pos.y = mod(pos.y + 15.0, boxH) - 15.0;
    pos.z = mod(pos.z + 10.0, boxD) - 10.0;

    // ── 3. Mouse Interaction (The "Satisfying" Part) ──
    // Fluid-like repulsion
    vec3 mouseDiff = pos - uMouse3D;
    float dist = length(mouseDiff);
    
    // Smooth, large radius interaction
    // Repulse strongly when close, gently when far
    float repulseRadius = 8.0;
    float strength = smoothstep(repulseRadius, 0.0, dist);
    
    // Add "curl" - push sideways for fluid feel (cross product)
    vec3 curl = cross(vec3(0.0, 0.0, 1.0), normalize(mouseDiff));
    
    // Combine radial push + tangential curl
    vec3 force = normalize(mouseDiff) * strength * 4.0 + curl * strength * 0.5;
    
    // Apply force eased by distance
    pos += force;

    // ── 4. Rendering Prep ──
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Perspective scale
    gl_PointSize = aSize * uPixelRatio * (15.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    // Fade by distance
    vOpacity = aOpacity * smoothstep(40.0, 10.0, -mvPosition.z);
    vSize = aSize;
    
    // Highlight based on noise/time (twinkle)
    vHighlight = smoothstep(0.4, 0.6, snoise(pos * 0.5 + t * 2.0));
  }
`;

const dustFragment = /* glsl */ `
  precision highp float;

  varying float vOpacity;
  varying float vSize;
  varying float vHighlight;

  void main() {
    // Soft circular particle
    vec2 xy = gl_PointCoord.xy - 0.5;
    float d = length(xy);
    
    if (d > 0.5) discard;

    // ── Luxe Look ──
    // Core glow
    float core = smoothstep(0.5, 0.0, d);
    // Outer halo (make it soft/dusty)
    float halo = smoothstep(0.5, 0.2, d) * 0.5;
    
    float alpha = (core + halo) * vOpacity;

    // ── Color Grading ──
    // Base "Dust" colors: warm beige / cool grey mix
    vec3 warmColor = vec3(0.95, 0.9, 0.85); // Creamy
    vec3 coolColor = vec3(0.8, 0.85, 0.9);  // Silvery
    
    // Mix based on highlight varying
    vec3 finalColor = mix(coolColor, warmColor, vHighlight);
    
    // Boost brightness for "sparkle"
    finalColor += vec3(0.1) * vHighlight;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const COUNT = 1500; // More particles for better density

export function DustParticles() {
    const ref = useRef<THREE.Points>(null);
    const { viewport } = useThree();

    // Generate Attributes
    const { positions, sizes, opacities, speeds, gravities } = useMemo(() => {
        const pos = new Float32Array(COUNT * 3);
        const sz = new Float32Array(COUNT);
        const op = new Float32Array(COUNT);
        const sp = new Float32Array(COUNT);
        const grav = new Float32Array(COUNT);

        for (let i = 0; i < COUNT; i++) {
            // Position: large volume
            pos[i * 3] = (Math.random() - 0.5) * 50;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 25;

            // Size: small dust vs "motes"
            // Most are very small, some are larger bokeh-like
            let s = Math.random();
            sz[i] = s < 0.9 ? Math.random() * 1.5 + 0.5 : Math.random() * 4.0 + 2.0;

            // Opacity: varied for depth
            op[i] = Math.random() * 0.5 + 0.1;

            // Speed: varies movement rate
            sp[i] = Math.random() * 0.8 + 0.2;

            // Gravity:
            // -0.5 to 0.5 range.
            // Some float up (heat/dust), some fall slowly.
            grav[i] = (Math.random() - 0.5) * 0.4;
        }
        return { positions: pos, sizes: sz, opacities: op, speeds: sp, gravities: grav };
    }, []);

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: {
            uTime: { value: 0 },
            uMouse3D: { value: new THREE.Vector3(0, 0, 0) },
            uWind: { value: new THREE.Vector3(0.02, 0, 0) }, // Very slight rightward drift
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // Glowy accumulation
    }), []);

    const mouse = useRef({ x: 0, y: 0 });
    // Track real mouse for interaction
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            // Normalize to rough scene units
            mouse.current.x = (e.clientX / window.innerWidth - 0.5) * viewport.width;
            mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * viewport.height;
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, [viewport]);

    const smoothMouse = useRef(new THREE.Vector3(0, 0, 0));

    useFrame(({ clock }) => {
        if (!ref.current) return;

        // Fluid mouse following
        // Lerp factor controls "viscosity"
        smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * 0.1;
        smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * 0.1;

        material.uniforms.uTime.value = clock.elapsedTime;
        material.uniforms.uMouse3D.value.set(smoothMouse.current.x, smoothMouse.current.y, 0);

        // Dynamic Wind?
        // Oscillate wind slightly
        const t = clock.elapsedTime;
        material.uniforms.uWind.value.x = 0.05 + Math.sin(t * 0.3) * 0.02; // Very gentle breeze
        material.uniforms.uWind.value.y = Math.cos(t * 0.2) * 0.01;     // Micro vertical drafts
    });

    return (
        <points ref={ref} material={material} frustumCulled={false}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
                <bufferAttribute attach="attributes-aOpacity" args={[opacities, 1]} />
                <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
                <bufferAttribute attach="attributes-aGravity" args={[gravities, 1]} />
            </bufferGeometry>
        </points>
    );
}
