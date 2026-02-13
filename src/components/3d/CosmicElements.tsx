import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
//  Custom shader: Fluid-like vertex displacement + iridescent surface
// ═══════════════════════════════════════════════════════════════════════
const fluidVertex = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uMouse;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;

  // Simplex-like noise
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

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vUv = uv;

    // Flowing noise displacement
    float speed = uTime * 0.3;
    vec3 noisePos = position * 1.5 + vec3(speed, speed * 0.7, speed * 0.4);
    float n = fbm(noisePos) * 2.0 - 1.0;

    // Mouse proximity influence
    float mouseDist = length(position - uMouse);
    float mouseInfluence = smoothstep(3.0, 0.0, mouseDist) * 0.4;

    // Combine displacement
    float displacement = n * uIntensity + mouseInfluence;
    vec3 displaced = position + normal * displacement;

    vDisplacement = displacement;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(displaced, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fluidFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    // Fresnel for edge glow
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    // Iridescent color shift based on viewing angle + displacement
    float shift = fresnel + vDisplacement * 2.0 + uTime * 0.1;
    vec3 col1 = mix(uColor1, uColor2, sin(shift * 3.14) * 0.5 + 0.5);
    vec3 col2 = mix(uColor2, uColor3, cos(shift * 2.5 + 1.0) * 0.5 + 0.5);
    vec3 iridescent = mix(col1, col2, fresnel);

    // Edge glow
    vec3 edgeGlow = uColor3 * fresnel * 0.8;

    // Subtle inner light
    float inner = smoothstep(-0.2, 0.5, vDisplacement) * 0.3;
    vec3 innerGlow = uColor1 * inner;

    vec3 color = iridescent + edgeGlow + innerGlow;

    // Alpha: more transparent in center, glowing at edges
    float alpha = mix(uOpacity * 0.5, uOpacity, fresnel);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════════
//  Fluid Blob — morphing organic shape
// ═══════════════════════════════════════════════════════════════════════
function FluidBlob({
    position: pos,
    scale: sc = 1,
    speed = 1,
    intensity = 0.3,
    color1 = '#2211aa',
    color2 = '#6633ff',
    color3 = '#33ccff',
    opacity = 0.6,
    geometry = 'sphere',
}: {
    position: [number, number, number];
    scale?: number;
    speed?: number;
    intensity?: number;
    color1?: string;
    color2?: string;
    color3?: string;
    opacity?: number;
    geometry?: 'sphere' | 'icosahedron' | 'torus';
}) {
    const ref = useRef<THREE.Mesh>(null);
    const mouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 10;
            mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 10;
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    const material = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: fluidVertex,
        fragmentShader: fluidFragment,
        uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: intensity },
            uMouse: { value: new THREE.Vector3() },
            uColor1: { value: new THREE.Color(color1) },
            uColor2: { value: new THREE.Color(color2) },
            uColor3: { value: new THREE.Color(color3) },
            uOpacity: { value: opacity },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [intensity, color1, color2, color3, opacity]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.elapsedTime * speed;
        material.uniforms.uTime.value = t;
        material.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y, 0);

        // Organic floating motion
        ref.current.position.x = pos[0] + Math.sin(t * 0.3) * 0.5;
        ref.current.position.y = pos[1] + Math.cos(t * 0.4) * 0.3;
        ref.current.position.z = pos[2] + Math.sin(t * 0.2) * 0.2;
        ref.current.rotation.x = t * 0.1;
        ref.current.rotation.y = t * 0.15;
    });

    const geo = useMemo(() => {
        if (geometry === 'icosahedron') return <icosahedronGeometry args={[1, 4]} />;
        if (geometry === 'torus') return <torusKnotGeometry args={[0.8, 0.3, 128, 32]} />;
        return <sphereGeometry args={[1, 64, 64]} />;
    }, [geometry]);

    return (
        <mesh ref={ref} scale={sc} material={material}>
            {geo}
        </mesh>
    );
}

// ═══════════════════════════════════════════════════════════════════════
//  Flowing wireframe ring
// ═══════════════════════════════════════════════════════════════════════
function FlowingRing({
    radius, position: pos, speed, color
}: {
    radius: number;
    position: [number, number, number];
    speed: number;
    color: string;
}) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.elapsedTime * speed;
        ref.current.rotation.x = t;
        ref.current.rotation.z = t * 0.6;
        ref.current.position.y = pos[1] + Math.sin(t * 0.5) * 0.3;
    });

    return (
        <mesh ref={ref} position={pos}>
            <torusGeometry args={[radius, 0.015, 16, 100]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.2}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}

// ═══════════════════════════════════════════════════════════════════════
//  Floating particles (move with the fluid feel)
// ═══════════════════════════════════════════════════════════════════════
function FluidParticles({ count = 150 }: { count?: number }) {
    const ref = useRef<THREE.Points>(null);

    const data = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 25;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
            vel[i * 3] = (Math.random() - 0.5) * 0.005;
            vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
            vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
        }
        return { positions: pos, velocities: vel };
    }, [count]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const positions = ref.current.geometry.attributes.position.array as Float32Array;
        const t = clock.elapsedTime;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Organic flowing motion
            positions[i3] += data.velocities[i3] + Math.sin(t * 0.3 + i) * 0.003;
            positions[i3 + 1] += data.velocities[i3 + 1] + Math.cos(t * 0.4 + i * 0.7) * 0.003;
            positions[i3 + 2] += data.velocities[i3 + 2];

            // Wrap around
            if (positions[i3] > 15) positions[i3] = -15;
            if (positions[i3] < -15) positions[i3] = 15;
            if (positions[i3 + 1] > 10) positions[i3 + 1] = -10;
            if (positions[i3 + 1] < -10) positions[i3 + 1] = 10;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#8866ff"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════
export function CosmicElements() {
    return (
        <group>
            {/* ── Main fluid blobs ── */}
            <FluidBlob
                position={[0, 0, -2]}
                scale={1.8}
                intensity={0.35}
                speed={0.8}
                color1="#1a0044"
                color2="#6622cc"
                color3="#22ccff"
                opacity={0.5}
                geometry="sphere"
            />
            <FluidBlob
                position={[-4, 2, -5]}
                scale={1.0}
                intensity={0.4}
                speed={1.0}
                color1="#001133"
                color2="#4466cc"
                color3="#66ffcc"
                opacity={0.4}
                geometry="icosahedron"
            />
            <FluidBlob
                position={[5, -1, -4]}
                scale={0.7}
                intensity={0.5}
                speed={1.2}
                color1="#220044"
                color2="#cc33aa"
                color3="#ff6644"
                opacity={0.35}
                geometry="torus"
            />

            {/* ── Small satellite blobs ── */}
            <FluidBlob position={[-2, -3, -3]} scale={0.4} intensity={0.6} color3="#44aaff" opacity={0.3} />
            <FluidBlob position={[3, 3, -6]} scale={0.3} intensity={0.5} color2="#aa44ff" opacity={0.25} />
            <FluidBlob position={[6, -3, -7]} scale={0.35} intensity={0.55} color1="#003355" color3="#33ffaa" opacity={0.3} />

            {/* ── Flowing wireframe rings ── */}
            <FlowingRing radius={3.0} position={[0, 0, -3]} speed={0.1} color="#6644cc" />
            <FlowingRing radius={2.0} position={[3, -1, -5]} speed={0.07} color="#4488bb" />
            <FlowingRing radius={1.5} position={[-3, 2, -4]} speed={0.12} color="#aa44cc" />

            {/* ── Fluid particles ── */}
            <FluidParticles count={200} />

            {/* ── Accent lights on blobs ── */}
            <pointLight position={[0, 0, 2]} intensity={0.5} color="#6633ff" distance={12} />
            <pointLight position={[-4, 2, -2]} intensity={0.3} color="#33aaff" distance={10} />
            <pointLight position={[5, -1, 0]} intensity={0.25} color="#ff33aa" distance={8} />
        </group>
    );
}
