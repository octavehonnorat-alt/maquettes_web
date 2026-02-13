import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import {
    baseVertex,
    advectionFrag,
    curlFrag,
    vorticityFrag,
    divergenceFrag,
    pressureFrag,
    gradientSubFrag,
    clearFrag,
    splatFrag,
} from './shaders';

// ═══════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════
const SIM = 128;
const DYE = 512;
const JACOBI = 20;
const CURL = 30;
const VEL_DISS = 0.98;
const DYE_DISS = 0.999;
const PRES_DISS = 0.8;
const FORCE = 6000;
const RADIUS = 1.5 / 100;
const AUTO_SPLAT_INTERVAL = 120; // Frames between auto-splats (~2s at 60fps)

const PALETTE = [
    [0.15, 0.05, 0.30],  // Deep Violet
    [0.30, 0.10, 0.50],  // Nebula Purple
    [0.05, 0.25, 0.40],  // Cyan Glow
    [0.10, 0.15, 0.45],  // Astral Blue
    [0.05, 0.30, 0.25],  // Aurora Green
    [0.40, 0.08, 0.30],  // Cosmic Pink
];

// ═══════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════
function createRT(w: number, h: number, linear = false) {
    return new THREE.WebGLRenderTarget(w, h, {
        minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
        magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
    });
}

function makeMat(frag: string, uniforms: Record<string, THREE.IUniform>) {
    return new THREE.ShaderMaterial({
        vertexShader: baseVertex,
        fragmentShader: frag,
        uniforms: { texelSize: { value: new THREE.Vector2() }, ...uniforms },
        depthTest: false,
        depthWrite: false,
    });
}

// ═══════════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export function FluidSimulation() {
    const { gl, size } = useThree();
    const aspect = size.width / size.height;

    // ── GPGPU: scene + camera + quad (ALL created in useMemo, so the
    //    quad is in the scene BEFORE the first useFrame runs) ──
    const gp = useMemo(() => {
        const scene = new THREE.Scene();
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        scene.add(quad); // <── CRITICAL: added during render phase, not in useEffect
        return { scene, cam, quad };
    }, []);

    // ── FBOs ──
    const fbo = useMemo(() => ({
        vel: [createRT(SIM, SIM, true), createRT(SIM, SIM, true)],
        dye: [createRT(DYE, DYE, true), createRT(DYE, DYE, true)],
        pres: [createRT(SIM, SIM), createRT(SIM, SIM)],
        curl: createRT(SIM, SIM),
        div: createRT(SIM, SIM),
    }), []);

    const simTx = useMemo(() => new THREE.Vector2(1 / SIM, 1 / SIM), []);

    // ── Materials ──
    const mats = useMemo(() => ({
        adv: makeMat(advectionFrag, {
            uVelocity: { value: null }, uSource: { value: null },
            dt: { value: 0.016 }, dissipation: { value: VEL_DISS },
        }),
        curl: makeMat(curlFrag, { uVelocity: { value: null } }),
        vort: makeMat(vorticityFrag, {
            uVelocity: { value: null }, uCurl: { value: null },
            curl: { value: CURL }, dt: { value: 0.016 },
        }),
        div: makeMat(divergenceFrag, { uVelocity: { value: null } }),
        pres: makeMat(pressureFrag, {
            uPressure: { value: null }, uDivergence: { value: null },
        }),
        grad: makeMat(gradientSubFrag, {
            uPressure: { value: null }, uVelocity: { value: null },
        }),
        clr: makeMat(clearFrag, {
            uTexture: { value: null }, value: { value: PRES_DISS },
        }),
        splat: makeMat(splatFrag, {
            uTarget: { value: null }, aspectRatio: { value: aspect },
            color: { value: new THREE.Vector3() },
            point: { value: new THREE.Vector2() },
            radius: { value: RADIUS },
        }),
    }), [aspect]);

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            gp.quad.geometry.dispose();
            Object.values(fbo).flat().forEach(rt => {
                if (rt instanceof THREE.WebGLRenderTarget) rt.dispose();
            });
        };
    }, [gp, fbo]);

    // ── Mouse tracking via WINDOW events (not R3F pointer) ──
    // R3F's `pointer` doesn't update if HTML overlays block the Canvas.
    // Window events always work regardless of DOM layering.
    const mouse = useRef({ x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5 });
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX / window.innerWidth;
            mouse.current.y = 1.0 - e.clientY / window.innerHeight;
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    // ── Blit helper ──
    const blit = (target: THREE.WebGLRenderTarget, mat: THREE.ShaderMaterial, tx: THREE.Vector2) => {
        mat.uniforms.texelSize.value.copy(tx);
        gp.quad.material = mat;
        gl.setRenderTarget(target);
        gl.render(gp.scene, gp.cam);
    };

    // ── Full splat (velocity + dye) — for auto-generation ──
    const doSplat = (x: number, y: number, dx: number, dy: number, rgb: number[]) => {
        const s = mats.splat;
        // Inject velocity
        s.uniforms.uTarget.value = fbo.vel[0].texture;
        s.uniforms.point.value.set(x, y);
        s.uniforms.color.value.set(dx * FORCE, dy * FORCE, 0);
        s.uniforms.aspectRatio.value = aspect;
        blit(fbo.vel[1], s, simTx);
        [fbo.vel[0], fbo.vel[1]] = [fbo.vel[1], fbo.vel[0]];
        // Inject dye color
        s.uniforms.uTarget.value = fbo.dye[0].texture;
        s.uniforms.color.value.set(rgb[0], rgb[1], rgb[2]);
        blit(fbo.dye[1], s, simTx);
        [fbo.dye[0], fbo.dye[1]] = [fbo.dye[1], fbo.dye[0]];
    };

    // ── Velocity-only splat — for mouse push (no dye injection) ──
    const pushVelocity = (x: number, y: number, dx: number, dy: number) => {
        const s = mats.splat;
        s.uniforms.uTarget.value = fbo.vel[0].texture;
        s.uniforms.point.value.set(x, y);
        s.uniforms.color.value.set(dx * FORCE, dy * FORCE, 0);
        s.uniforms.aspectRatio.value = aspect;
        blit(fbo.vel[1], s, simTx);
        [fbo.vel[0], fbo.vel[1]] = [fbo.vel[1], fbo.vel[0]];
    };

    const inited = useRef(false);
    const colIdx = useRef(0);
    const frameCount = useRef(0);

    // ═══════════════════════════════════════════════════════════════════
    //  SIMULATION LOOP
    // ═══════════════════════════════════════════════════════════════════
    useFrame((state) => {
        frameCount.current++;

        // ── Initial splats ──
        if (!inited.current) {
            inited.current = true;
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const r = 0.15 + Math.random() * 0.25;
                const c = PALETTE[i % PALETTE.length];
                doSplat(
                    0.5 + Math.cos(a) * r,
                    0.5 + Math.sin(a) * r,
                    Math.cos(a + 1) * 0.15,
                    Math.sin(a + 1) * 0.15,
                    [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6]
                );
            }
        }

        // ── Auto-generate splats continuously ──
        if (frameCount.current % AUTO_SPLAT_INTERVAL === 0) {
            const x = 0.1 + Math.random() * 0.8;
            const y = 0.1 + Math.random() * 0.8;
            const a = Math.random() * Math.PI * 2;
            const c = PALETTE[colIdx.current % PALETTE.length];
            colIdx.current++;
            doSplat(
                x, y,
                Math.cos(a) * 0.08,
                Math.sin(a) * 0.08,
                [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7]
            );
        }

        // ── 1. Curl ──
        mats.curl.uniforms.uVelocity.value = fbo.vel[0].texture;
        blit(fbo.curl, mats.curl, simTx);

        // ── 2. Vorticity ──
        mats.vort.uniforms.uVelocity.value = fbo.vel[0].texture;
        mats.vort.uniforms.uCurl.value = fbo.curl.texture;
        blit(fbo.vel[1], mats.vort, simTx);
        [fbo.vel[0], fbo.vel[1]] = [fbo.vel[1], fbo.vel[0]];

        // ── 3. Advect velocity ──
        mats.adv.uniforms.uVelocity.value = fbo.vel[0].texture;
        mats.adv.uniforms.uSource.value = fbo.vel[0].texture;
        mats.adv.uniforms.dissipation.value = VEL_DISS;
        blit(fbo.vel[1], mats.adv, simTx);
        [fbo.vel[0], fbo.vel[1]] = [fbo.vel[1], fbo.vel[0]];

        // ── 4. Advect dye ──
        mats.adv.uniforms.uVelocity.value = fbo.vel[0].texture;
        mats.adv.uniforms.uSource.value = fbo.dye[0].texture;
        mats.adv.uniforms.dissipation.value = DYE_DISS;
        blit(fbo.dye[1], mats.adv, simTx);
        [fbo.dye[0], fbo.dye[1]] = [fbo.dye[1], fbo.dye[0]];

        // ── 5. Mouse push (VELOCITY ONLY — no dye injection) ──
        const { x, y, prevX, prevY } = mouse.current;
        const dx = x - prevX;
        const dy = y - prevY;
        if (dx * dx + dy * dy > 0.000001) {
            pushVelocity(x, y, dx, dy);
        }
        mouse.current.prevX = x;
        mouse.current.prevY = y;

        // ── 6. Divergence ──
        mats.div.uniforms.uVelocity.value = fbo.vel[0].texture;
        blit(fbo.div, mats.div, simTx);

        // ── 7. Pressure clear ──
        mats.clr.uniforms.uTexture.value = fbo.pres[0].texture;
        blit(fbo.pres[1], mats.clr, simTx);
        [fbo.pres[0], fbo.pres[1]] = [fbo.pres[1], fbo.pres[0]];

        // ── 8. Jacobi pressure solve ──
        mats.pres.uniforms.uDivergence.value = fbo.div.texture;
        for (let i = 0; i < JACOBI; i++) {
            mats.pres.uniforms.uPressure.value = fbo.pres[0].texture;
            blit(fbo.pres[1], mats.pres, simTx);
            [fbo.pres[0], fbo.pres[1]] = [fbo.pres[1], fbo.pres[0]];
        }

        // ── 9. Gradient subtract ──
        mats.grad.uniforms.uPressure.value = fbo.pres[0].texture;
        mats.grad.uniforms.uVelocity.value = fbo.vel[0].texture;
        blit(fbo.vel[1], mats.grad, simTx);
        [fbo.vel[0], fbo.vel[1]] = [fbo.vel[1], fbo.vel[0]];

        // ── 10. Display: set scene background to dye texture ──
        gl.setRenderTarget(null);
        state.scene.background = fbo.dye[0].texture;
    });

    return null;
}
