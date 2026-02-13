// ═══════════════════════════════════════════════════════════════════════
//  GLSL Shaders — Eulerian Fluid Simulation (Navier-Stokes)
//  References: PavelDoGreat/WebGL-Fluid-Simulation, GPU Gems Ch.38
// ═══════════════════════════════════════════════════════════════════════

// ── Shared fullscreen vertex ─────────────────────────────────────────
export const baseVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;

  void main() {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position, 1.0);
  }
`;

// ── Advection ────────────────────────────────────────────────────────
// Semi-Lagrangian advection: traces backwards along velocity to find
// the source value. This is the core transport step.
export const advectionFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;

  varying vec2 vUv;

  void main() {
    // Trace backward
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    vec4 result = dissipation * texture2D(uSource, coord);
    gl_FragColor = result;
  }
`;

// ── Curl (for Vorticity Confinement) ─────────────────────────────────
// Computes the scalar curl (ω = ∂vy/∂x − ∂vx/∂y) of the velocity field.
export const curlFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uVelocity;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;

  void main() {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

// ── Vorticity Confinement ────────────────────────────────────────────
// Amplifies existing rotation in the fluid. This is what creates
// the beautiful swirling patterns (the "oily" look).
export const vorticityFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;

  void main() {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 2.4414e-4;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * dt;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// ── Divergence ───────────────────────────────────────────────────────
// Computes ∇·v. A non-zero divergence means the fluid is compressing
// or expanding, which is physically incorrect for incompressible fluids.
export const divergenceFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uVelocity;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;

  void main() {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;

    vec2 C = texture2D(uVelocity, vUv).xy;

    // Boundary handling
    if (vL.x < 0.0) L = -C.x;
    if (vR.x > 1.0) R = -C.x;
    if (vT.y > 1.0) T = -C.y;
    if (vB.y < 0.0) B = -C.y;

    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

// ── Pressure (Jacobi Iteration) ──────────────────────────────────────
// Solves ∇²p = ∇·v iteratively. Each iteration improves the pressure
// estimate. 20-40 iterations gives good results.
export const pressureFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float C = texture2D(uPressure, vUv).x;
    float divergence = texture2D(uDivergence, vUv).x;

    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

// ── Gradient Subtract ────────────────────────────────────────────────
// Final velocity correction: v = v - ∇p
// This makes the velocity field divergence-free (incompressible).
export const gradientSubFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;

  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;

  void main() {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// ── Pressure Clear ───────────────────────────────────────────────────
export const clearFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float value;

  varying vec2 vUv;

  void main() {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

// ── Splat (Force / Density Injection) ────────────────────────────────
// Gaussian splat: injects force into velocity and color into density
// at the mouse position. This is the user interaction.
export const splatFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;

  varying vec2 vUv;

  void main() {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

// ── Display (Final Render) ───────────────────────────────────────────
// Galaxy/Nebula style: starfield + cosmic color grading + vignette + glow
export const displayFrag = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform vec2 texelSize;

  varying vec2 vUv;

  // Hash for star placement
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal brownian motion for nebula clouds
  float fbm(vec2 p) {
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
    vec3 fluid = texture2D(uTexture, vUv).rgb;

    // ── Starfield ──
    float stars = 0.0;
    for (float scale = 300.0; scale <= 900.0; scale += 300.0) {
      vec2 starUv = vUv * scale;
      float h = hash(floor(starUv));
      vec2 center = fract(starUv) - 0.5;
      float dist = length(center);
      // Only ~3% of cells have a star
      if (h > 0.97) {
        float brightness = smoothstep(0.05, 0.0, dist);
        // Twinkle based on position hash
        brightness *= 0.4 + 0.6 * h;
        // Dimmer for smaller scales
        brightness *= scale / 900.0;
        stars += brightness;
      }
    }

    // ── Background nebula (subtle procedural clouds) ──
    float nebula = fbm(vUv * 3.0) * 0.03;
    vec3 nebulaColor = vec3(0.05, 0.02, 0.12) * nebula * 3.0;

    // ── Cosmic color grading ──
    // Shift fluid colors toward more vivid 
    float lum = dot(fluid, vec3(0.299, 0.587, 0.114));
    vec3 cosmicTint = mix(
      vec3(0.15, 0.05, 0.30),  // Deep Violet
      vec3(0.30, 0.10, 0.50),  // Nebula Purple
      lum
    );
    vec3 gradedFluid = mix(fluid, cosmicTint, 0.3) + fluid * 0.5;

    // ── Subtle glow on bright areas ──
    float glow = smoothstep(0.2, 0.8, lum) * 0.15;
    vec3 glowColor = vec3(0.3, 0.15, 0.5) * glow;

    // ── Vignette (darken edges for depth) ──
    vec2 vig = vUv * (1.0 - vUv);
    float vigFactor = pow(vig.x * vig.y * 16.0, 0.25);

    // ── Compose ──
    vec3 color = vec3(0.0);
    color += nebulaColor;              // Background clouds
    color += gradedFluid;              // Fluid with cosmic tint
    color += glowColor;                // Bright area glow
    color += vec3(stars * 0.6);        // Stars
    color *= vigFactor;                // Vignette

    // Film grain
    float grain = (hash(vUv * 1000.0 + fract(lum * 777.0)) - 0.5) * 0.015;
    color += grain;

    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;
