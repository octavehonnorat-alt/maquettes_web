import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { atomicVertexShader, atomicFragmentShader } from '../shaders';

interface AtomicFieldProps {
    count?: number;
    radius?: number;
}

export function AtomicField({ count = 10000, radius = 15 }: AtomicFieldProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { viewport, pointer } = useThree();

    // Create geometry and material
    const { geometry, material, matrices, colors, scales } = useMemo(() => {
        // Icosahedron for smooth spheres with low poly count
        const geo = new THREE.IcosahedronGeometry(0.02, 1);

        // Custom shader material
        const mat = new THREE.ShaderMaterial({
            vertexShader: atomicVertexShader,
            fragmentShader: atomicFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uMouse: { value: new THREE.Vector3(0, 0, 0) },
                uMouseRadius: { value: 6 },       // Increased from 4
                uForceStrength: { value: 3.5 },   // Increased from 2
                uBaseColor: { value: new THREE.Color('#555555') },  // Darker base
                uAccentColor: { value: new THREE.Color('#FF3300') },
                uScrollVelocity: { value: 0 },
            },
            transparent: false,
            depthWrite: true,
        });

        // Generate positions in a structured grid with some randomness
        const mats: THREE.Matrix4[] = [];
        const cols: Float32Array = new Float32Array(count * 3);
        const scls: Float32Array = new Float32Array(count);

        const gridSize = Math.ceil(Math.cbrt(count));
        const spacing = (radius * 2) / gridSize;

        let index = 0;
        for (let i = 0; i < gridSize && index < count; i++) {
            for (let j = 0; j < gridSize && index < count; j++) {
                for (let k = 0; k < gridSize && index < count; k++) {
                    const matrix = new THREE.Matrix4();

                    // Grid position with slight random offset
                    const x = (i - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.5;
                    const y = (j - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.5;
                    const z = (k - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.5;

                    // Only keep points within sphere
                    const dist = Math.sqrt(x * x + y * y + z * z);
                    if (dist > radius) continue;

                    matrix.setPosition(x, y, z);
                    mats.push(matrix);

                    // Color variation - uniform gray for LiDAR look
                    const brightness = 0.5 + Math.random() * 0.2;
                    cols[index * 3] = brightness;
                    cols[index * 3 + 1] = brightness;
                    cols[index * 3 + 2] = brightness;

                    // Scale variation
                    scls[index] = 0.8 + Math.random() * 0.4;

                    index++;
                }
            }
        }

        return {
            geometry: geo,
            material: mat,
            matrices: mats,
            colors: cols.slice(0, index * 3),
            scales: scls.slice(0, index),
        };
    }, [count, radius]);

    // Set up instance attributes
    useEffect(() => {
        if (!meshRef.current) return;

        const mesh = meshRef.current;

        // Set instance matrices
        matrices.forEach((matrix, i) => {
            mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;

        // Add custom attributes
        mesh.geometry.setAttribute(
            'instanceColor',
            new THREE.InstancedBufferAttribute(colors, 3)
        );
        mesh.geometry.setAttribute(
            'instanceScale',
            new THREE.InstancedBufferAttribute(scales, 1)
        );
    }, [matrices, colors, scales]);

    // Mouse position tracking
    const mouseWorld = useRef(new THREE.Vector3());

    useFrame((_state, delta) => {
        if (!meshRef.current) return;

        const mat = meshRef.current.material as THREE.ShaderMaterial;

        // Update time (capped delta for smooth 120Hz)
        mat.uniforms.uTime.value += Math.min(delta, 0.016);

        // Convert pointer to world coordinates
        const x = pointer.x * viewport.width / 2;
        const y = pointer.y * viewport.height / 2;

        // Smooth interpolation for mouse position
        mouseWorld.current.lerp(new THREE.Vector3(x, y, 0), 0.1);
        mat.uniforms.uMouse.value.copy(mouseWorld.current);

        // Update scroll velocity (would need to be passed in, using 0 as default)
        mat.uniforms.uScrollVelocity.value *= 0.95; // Decay
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, matrices.length]}
            frustumCulled={false}
        />
    );
}

export default AtomicField;
