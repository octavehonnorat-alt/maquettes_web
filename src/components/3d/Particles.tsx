import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Sparkles: Floating bright points ─────────────────────────────────────────
function Sparkles({ count = 100, color = '#FFAA00', size = 0.5, area = 20, speedMultiplier = 1.0 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const [dummy] = useState(() => new THREE.Object3D());

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const xFactor = -25 + Math.random() * 50;
            const yFactor = -25 + Math.random() * 50;
            const zFactor = -25 + Math.random() * 50;
            temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
        }
        return temp;
    }, [count, area]);

    useFrame(() => {
        if (!mesh.current) return;

        particles.forEach((particle, i) => {
            let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
            // Apply speed multiplier
            t = particle.t += (speed / 2) * speedMultiplier;
            const a = Math.cos(t) + Math.sin(t * 1) / 10;
            const b = Math.sin(t) + Math.cos(t * 2) / 10;
            const s = Math.cos(t);

            dummy.position.set(
                (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
                (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
                (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
            );
            dummy.scale.set(s, s, s);
            dummy.rotation.set(s * 5, s * 5, s * 5);
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.05 * size, 0]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
}

// ─── Main Particles Component ─────────────────────────────────────────────────
export function Particles() {
    return (
        <group>
            {/* Golden/Warm Sparkles for contrast - Slower now */}
            <Sparkles count={150} color="#FF5500" size={1.2} speedMultiplier={0.3} />
        </group>
    );
}

export default Particles;
