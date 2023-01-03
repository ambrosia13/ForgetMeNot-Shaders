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

          // From Jessie
          vec3 generateUnitVector(vec2 xy) {
               xy.x *= TAU; xy.y = 2.0 * xy.y - 1.0;
               return vec3(sincos(xy.x) * sqrt(1.0 - xy.y * xy.y), xy.y);
          }

          vec3 generateCosineVector(vec3 vector, vec2 xy) {
               return normalize(vector + generateUnitVector(xy));
          }
          // -----------------------------------------------------------------------------------------------

          vec3 generateCosineVector(vec3 vector) {
               return normalize(
                    vector + 
                    generateUnitVector(
                         vec2(
                              randF(), randF()
                         )
                    )
               );
          }
          vec3 generateCosineVector(vec3 vector, float roughness) {
               return mix(vector, generateCosineVector(vector), roughness);
          }
     #endif

     // Smooth noise function
     float smoothHash(in vec2 st) {
          // "Value Noise" from Inigo Quilez
          // https://www.shadertoy.com/view/lsf3WH
          vec2 i = (floor(st));
          vec2 f = fract(st);
               
          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(
               mix(
                    hash12(i + vec2(0.0,0.0)), 
                    hash12(i + vec2(1.0,0.0)),
                    u.x
               ),
               mix(
                    hash12(i + vec2(0.0,1.0)), 
                    hash12(i + vec2(1.0,1.0)),
                    u.x
               ),
               u.y
          );
     }
     float smoothHashBlocky(in vec2 st) {
          // "Value Noise" from Inigo Quilez
          // https://www.shadertoy.com/view/lsf3WH
          vec2 i = floor(st);
          vec2 f = fract(st);
               
          vec2 u = smoothstep(0.3, 0.7, f);

          return mix(
               mix(
                    hash12(i + vec2(0.0,0.0)), 
                    hash12(i + vec2(1.0,0.0)),
                    u.x
               ),
               mix(
                    hash12(i + vec2(0.0,1.0)), 
                    hash12(i + vec2(1.0,1.0)),
                    u.x
               ),
               u.y
          ) * 2.0 - 1.0;
     }

     // Precalculated rotation matrix to make things a tiny bit faster.
     const mat2 ROTATE_30_DEGREES = mat2(
          0.99995824399, 0.00913839539,
          -0.00913839539, 0.99995824399
     );

     // FBM Hash noise that accepts a time parameter
     float fbmHash(vec2 uv, int octaves, float lacunarity, float t) {
          float noise = 0.01;
          float amp = 0.5;

          for (int i = 0; i < octaves; i++) {
               noise += amp * (smoothHash(uv));
               uv = ROTATE_30_DEGREES * uv * lacunarity + mod(frx_renderSeconds * t, 1000.0);
               amp *= 0.5;
          }

          return noise * (octaves + 1.0) / octaves;
     }
     float fbmHash(vec2 uv, int octaves) {
          return fbmHash(uv, octaves, 2.0, 0.0);
     }
     float fbmHash(vec2 uv, int octaves, float t) {
          return fbmHash(uv, octaves, 2.0, t);
     }
#endif