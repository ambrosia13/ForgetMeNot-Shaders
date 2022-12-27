#ifdef INCLUDE_NOISE
     // Credit goes to Belmu#4066 for helping me solve my shadow sampling issues through the following two functions.
     vec2 sincos(float x) {
          return vec2(sin(x), cos(x));
     }
     vec2 diskSampling(float i, float n, float phi) {
          float theta = (i + phi) / n; 
          return sincos(theta * TAU * n * 1.618033988749894) * theta;
     }

     // Provided by Belmu.
     // Noise distribution: https://www.pcg-random.org/
     void pcg(inout uint seed) {
          uint state = seed * 747796405u + 2891336453u;
          uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
          seed = (word >> 22u) ^ word;
     }

     #ifdef FRAGMENT_SHADER
          uint rngState = 185730u * frx_renderFrames + uint(gl_FragCoord.x + gl_FragCoord.y * frxu_size.x);

          float randF() { 
               pcg(rngState); 
               return float(rngState) / float(0xffffffffu); 
          }
     #endif

     // Smooth noise function
     float smoothHash(in vec2 st) {
          vec2 p = floor(st);
          vec2 f = fract(st);
               
          float n = p.x + p.y*57.0;

          float a =  hash12(vec2(n + 0.0)) * 2.0 - 1.0;
          float b =  hash12(vec2(n + 1.0)) * 2.0 - 1.0;
          float c = hash12(vec2(n + 57.0)) * 2.0 - 1.0;
          float d = hash12(vec2(n + 58.0)) * 2.0 - 1.0;
          
          vec2 f2 = f * f;
          vec2 f3 = f2 * f;
          
          vec2 t = 3.0 * f2 - 2.0 * f3;
          
          float u = t.x;
          float v = t.y;

          float noise = a + (b - a) * u +(c - a) * v + (a - b + d - c) * u * v;

          return noise;
     }

     // Precalculated rotation matrix to make things a tiny bit faster.
     const mat2 ROTATE_30_DEGREES = mat2(
          0.99995824399, 0.00913839539,
          -0.00913839539, 0.99995824399
     );

     // FBM Hash noise that accepts a time parameter
     float fbmHash(vec2 uv, int octaves, float t) {
          float noise = 0.01;
          float amp = 0.5;

          for (int i = 0; i < octaves; i++) {
               noise += amp * (smoothHash(uv) * 0.5 + 0.5);
               uv = ROTATE_30_DEGREES * uv * 2.0 + mod(frx_renderSeconds * t, 1000.0);
               amp *= 0.5;
          }

          return noise * (octaves + 1) / octaves;
     }
     float fbmHash(vec2 uv, int octaves) {
          return fbmHash(uv, octaves, 0.0);
     }
#endif