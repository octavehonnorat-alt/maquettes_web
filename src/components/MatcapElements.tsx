import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface MatcapShapeProps {
    position?: [number, number, number];
    scale?: number;
    geometry?: 'torus' | 'sphere' | 'octahedron' | 'icosahedron';
    rotationSpeed?: number;
}

// Dynamic Matcap Shape with mouse interaction
export function MatcapShape({
    position = [0, 0, 0],
    scale = 1,
    geometry = 'torus',
    rotationSpeed = 0.3
}: MatcapShapeProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const { pointer } = useThree();

    useFrame((_state, delta) => {
        if (!meshRef.current) return;

        // Base rotation
        meshRef.current.rotation.x += delta * rotationSpeed * 0.5;
        meshRef.current.rotation.y += delta * rotationSpeed;

        // Mouse influence
        const targetRotX = pointer.y * 0.3;
        const targetRotZ = pointer.x * 0.2;
        meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.02;
        meshRef.current.rotation.z += (targetRotZ - meshRef.current.rotation.z) * 0.02;

        // Hover scale
        const targetScale = hovered ? scale * 1.15 : scale;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    const getGeometry = () => {
        switch (geometry) {
            case 'torus':
                return <torusGeometry args={[1, 0.4, 32, 64]} />;
            case 'sphere':
                return <sphereGeometry args={[1, 64, 64]} />;
            case 'octahedron':
                return <octahedronGeometry args={[1, 0]} />;
            case 'icosahedron':
                return <icosahedronGeometry args={[1, 0]} />;
            default:
                return <torusGeometry args={[1, 0.4, 32, 64]} />;
        }
    };

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
            <mesh
                ref={meshRef}
                position={position}
                scale={scale}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                {getGeometry()}
                <meshPhysicalMaterial
                    color="#D36A1B"
                    roughness={0.2}
                    metalness={1}
                    clearcoat={1}
                />
            </mesh>
        </Float>
    );
}

// Floating Chrome Ring
export function ChromeRing({ position = [0, 0, 0] as [number, number, number] }) {
    const ringRef = useRef<THREE.Mesh>(null);
    // const [matcap] = useMatcapTexture('C7C7D7_4C4E5A_818393_6C6C74', 256); // Chrome silver

    useFrame((state, delta) => {
        if (!ringRef.current) return;
        ringRef.current.rotation.x += delta * 0.2;
        ringRef.current.rotation.y += delta * 0.5;

        // Wobble effect
        const time = state.clock.elapsedTime;
        ringRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.1;
    });

    return (
        <mesh ref={ringRef} position={position}>
            <torusGeometry args={[0.8, 0.15, 16, 48]} />
            <meshStandardMaterial color="#C7C7D7" roughness={0.1} metalness={1} />
        </mesh>
    );
}

// Metallic Octahedron
export function MetallicOctahedron({ position = [0, 0, 0] as [number, number, number] }) {
    const meshRef = useRef<THREE.Mesh>(null);
    // const [matcap] = useMatcapTexture('2E763A_78A0B7_B3D1CF_14F209', 256); // Green metal

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.y += delta * 0.4;
        meshRef.current.rotation.z += delta * 0.2;

        // Pulse
        const time = state.clock.elapsedTime;
        const pulseScale = 1 + Math.sin(time * 2) * 0.05;
        meshRef.current.scale.setScalar(pulseScale);
    });

    return (
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
            <mesh ref={meshRef} position={position}>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color="#2E763A" roughness={0.3} metalness={0.8} />
            </mesh>
        </Float>
    );
}

// Orange Glow Sphere
export function OrangeGlowSphere({ position = [0, 0, 0] as [number, number, number] }) {
    const meshRef = useRef<THREE.Mesh>(null);
    // const [matcap] = useMatcapTexture('FBB82D_FBEDBF_FBDE7D_FB7E05', 256); // Bright orange/gold

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;

        // Orbit movement
        meshRef.current.position.x = position[0] + Math.sin(time * 0.5) * 0.5;
        meshRef.current.position.z = position[2] + Math.cos(time * 0.5) * 0.5;

        // Rotation
        meshRef.current.rotation.y = time * 0.5;
    });

    return (
        <mesh ref={meshRef} position={position} scale={0.3}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
                color="#FBB82D"
                emissive="#FB7E05"
                emissiveIntensity={0.5}
                roughness={0.4}
            />
        </mesh>
    );
}

// Black Chrome Torus Knot
export function BlackChromeTorus({ position = [0, 0, 0] as [number, number, number], scale = 0.5 }) {
    const meshRef = useRef<THREE.Mesh>(null);
    // const [matcap] = useMatcapTexture('1A1A1A_3A3A43_595959_2E2E2E', 256); // Dark chrome
    const { pointer } = useThree();

    useFrame((_state, delta) => {
        if (!meshRef.current) return;

        // Auto rotation
        meshRef.current.rotation.x += delta * 0.15;
        meshRef.current.rotation.y += delta * 0.25;

        // Mouse tracking
        const targetRotY = pointer.x * 0.5;
        meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * 0.03;
    });

    return (
        <Float speed={1} rotationIntensity={0.15} floatIntensity={0.25}>
            <mesh ref={meshRef} position={position} scale={scale}>
                <torusKnotGeometry args={[1, 0.35, 128, 16]} />
                <meshPhysicalMaterial
                    color="#1A1A1A"
                    roughness={0.1}
                    metalness={0.9}
                    clearcoat={1}
                />
            </mesh>
        </Float>
    );
}

export default MatcapShape;
