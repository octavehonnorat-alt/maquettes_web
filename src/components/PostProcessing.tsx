import { EffectComposer, Bloom, Vignette, Noise, SMAA } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function PostProcessing() {
    return (
        <EffectComposer multisampling={0}>
            <SMAA />

            {/* Bloom — rich glow on highlights */}
            <Bloom
                intensity={1.4}
                luminanceThreshold={0.25}
                luminanceSmoothing={0.9}
                mipmapBlur
            />

            {/* Vignette — cinematic darkened edges */}
            <Vignette
                eskil={false}
                offset={0.2}
                darkness={0.85}
            />

            {/* Film Grain */}
            <Noise
                premultiply
                blendFunction={BlendFunction.OVERLAY}
                opacity={0.2}
            />
        </EffectComposer>
    );
}

export default PostProcessing;
