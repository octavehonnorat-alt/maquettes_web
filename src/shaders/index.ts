// Atomic Field Shaders - Inline GLSL for InstancedMesh
// Magnetic force field with simplex noise displacement + enhanced effects

export const atomicVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uMouseRadius;
  uniform float uForceStrength;
  uniform float uScrollVelocity;
  
  attribute vec3 instanceColor;
  attribute float instanceScale;
  
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDistance;
  varying float vDepth;
  varying float vNoise;
  
  // Simplex 3D Noise
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vColor = instanceColor;
    vNormal = normalMatrix * normal;
    
    // Get instance position from instance matrix
    vec3 instancePosition = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    
    // Multi-octave noise for more organic movement
    float noiseScale = 0.4;
    float noiseTime = uTime * 0.25;
    float noise1 = snoise(instancePosition * noiseScale + noiseTime);
    float noise2 = snoise(instancePosition * noiseScale * 2.0 + noiseTime * 1.5 + 50.0) * 0.5;
    float noise3 = snoise(instancePosition * noiseScale * 4.0 + noiseTime * 2.0 + 100.0) * 0.25;
    float combinedNoise = noise1 + noise2 + noise3;
    vNoise = combinedNoise;
    
    vec3 noiseOffset = vec3(
      snoise(instancePosition * noiseScale + noiseTime),
      snoise(instancePosition * noiseScale + noiseTime + 100.0),
      snoise(instancePosition * noiseScale + noiseTime + 200.0)
    ) * 0.2;
    
    // Scroll-based wave effect
    float scrollWave = sin(instancePosition.y * 0.5 + uTime * 0.5 + uScrollVelocity * 2.0) * 0.1;
    noiseOffset.z += scrollWave;
    
    // Magnetic repulsion from mouse with ripple effect
    vec3 toMouse = instancePosition - uMouse;
    float distToMouse = length(toMouse);
    vDistance = distToMouse;
    
    vec3 repulsion = vec3(0.0);
    if (distToMouse < uMouseRadius && distToMouse > 0.01) {
      float force = (1.0 - distToMouse / uMouseRadius);
      force = force * force * force; // Cubic falloff
      
      // Add ripple effect
      float ripple = sin(distToMouse * 3.0 - uTime * 4.0) * 0.3;
      force *= (1.0 + ripple);
      
      repulsion = normalize(toMouse) * force * uForceStrength;
    }
    
    // Depth-based size scaling
    float depthScale = 1.0 + (instancePosition.z + 10.0) * 0.02;
    float finalScale = instanceScale * depthScale;
    
    // Apply transformations
    vec3 transformed = position * finalScale;
    vec3 finalPosition = instancePosition + noiseOffset + repulsion;
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPosition + transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    vDepth = -mvPosition.z;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const atomicFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uAccentColor;
  
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vDistance;
  varying float vDepth;
  varying float vNoise;
  
  void main() {
    // Metallic matte material
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Enhanced rim lighting
    float rim = 1.0 - max(0.0, dot(viewDir, normal));
    rim = pow(rim, 2.5) * 0.6;
    
    // Base color with noise-based variation
    float brightness = 0.5 + vNoise * 0.15;
    vec3 color = uBaseColor * brightness;
    
    // Accent color based on mouse proximity with glow
    float accentMix = smoothstep(6.0, 1.5, vDistance);
    color = mix(color, uAccentColor, accentMix * 0.5);
    
    // Add glow for close particles
    if (vDistance < 3.0) {
      float glow = (1.0 - vDistance / 3.0) * 0.3;
      color += uAccentColor * glow;
    }
    
    // Add rim lighting
    color += rim * 0.25;
    
    // Depth-based fog with enhanced falloff
    float depth = length(vViewPosition);
    float fogFactor = smoothstep(8.0, 30.0, depth);
    color = mix(color, vec3(0.02), fogFactor * 0.7);
    
    // Subtle pulsing based on time
    float pulse = sin(uTime * 2.0 + vDepth * 0.1) * 0.03 + 1.0;
    color *= pulse;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Glass/Transmission Shader for Bento Grid sphere
export const glassVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glassFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIorR;
  uniform float uIorG;
  uniform float uIorB;
  uniform float uChromaticAberration;
  uniform float uRefractPower;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    
    // Fresnel effect
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);
    
    // Refraction simulation
    vec3 refractR = refract(-viewDir, normal, 1.0 / uIorR);
    vec3 refractG = refract(-viewDir, normal, 1.0 / uIorG);
    vec3 refractB = refract(-viewDir, normal, 1.0 / uIorB);
    
    // Chromatic aberration simulation
    float r = 0.7 + refractR.x * 0.1;
    float g = 0.7 + refractG.y * 0.1;
    float b = 0.7 + refractB.z * 0.1;
    
    vec3 color = vec3(r, g, b) * 0.3;
    
    // Add edge glow
    color += vec3(1.0) * fresnel * 0.4;
    
    // Subtle animation
    float pulse = sin(uTime * 1.5) * 0.05 + 0.95;
    color *= pulse;
    
    gl_FragColor = vec4(color, 0.5 + fresnel * 0.3);
  }
`;

// Video Distortion Shader for Bento Grid
export const videoDistortionVertex = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const videoDistortionFragment = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uDistortion;
  uniform float uDesaturation;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Chromatic aberration
    float aberration = uDistortion * 0.01;
    float r = texture2D(uTexture, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(aberration, 0.0)).b;
    
    vec3 color = vec3(r, g, b);
    
    // Desaturation
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(gray), uDesaturation);
    
    // Slight contrast boost
    color = (color - 0.5) * 1.1 + 0.5;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Grid Line Shader for background
export const gridLineVertex = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gridLineFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uGridSize;
  uniform vec3 uLineColor;
  uniform float uOpacity;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv * uResolution / uGridSize;
    
    // Create grid lines
    vec2 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
    float line = min(grid.x, grid.y);
    float gridMask = 1.0 - min(line, 1.0);
    
    // Fade based on distance from center
    float dist = length(vUv - 0.5);
    float fade = 1.0 - smoothstep(0.2, 0.7, dist);
    
    vec3 color = uLineColor;
    float alpha = gridMask * uOpacity * fade;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Ripple Distortion Shader
export const rippleVertexShader = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const rippleFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uRippleStrength;
  uniform sampler2D uTexture;
  
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    
    // Calculate distance from mouse
    float dist = distance(uv, uMouse);
    
    // Create ripple effect
    float ripple = sin(dist * 30.0 - uTime * 5.0) * uRippleStrength;
    ripple *= smoothstep(0.5, 0.0, dist);
    
    // Distort UV
    vec2 distortedUv = uv + normalize(uv - uMouse) * ripple * 0.02;
    
    vec4 color = texture2D(uTexture, distortedUv);
    gl_FragColor = color;
  }
`;
