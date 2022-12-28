#ifdef INCLUDE_GENERAL_UTIL
     // Quick clamp functions between 0 and 1
     float clamp01(in float x) {
          return clamp(x, 0.0, 1.0);
     }
     vec2 clamp01(in vec2 x) {
          return clamp(x, vec2(0.0), vec2(1.0));
     }
     vec3 clamp01(in vec3 x) {
          return clamp(x, vec3(0.0), vec3(1.0));
     }
     vec4 clamp01(in vec4 x) {
          return clamp(x, vec4(0.0), vec4(1.0));
     }

     // "faster" normalize functions
     vec2 fNormalize(in vec2 x) {
          return x * inversesqrt(dot(x, x));
     }
     vec3 fNormalize(in vec3 x) {
          return x * inversesqrt(dot(x, x));
     }
     vec4 fNormalize(in vec4 x) {
          return x * inversesqrt(dot(x, x));
     }
     #define normalize(x) (fNormalize(x))

     // Fast power functions
     #define FMN_POW_2 (x * x)
     #define FMN_POW_3 (pow2(x) * x)
     #define FMN_POW_4 (pow2(x) * pow2(x))
     float pow2(float x) {
          return FMN_POW_2;
     }
     vec2 pow2(vec2 x) {
          return FMN_POW_2;
     }
     vec3 pow2(vec3 x) {
          return FMN_POW_2;
     }
     vec4 pow2(vec4 x) {
          return FMN_POW_2;
     }
     float pow3(float x) {
          return FMN_POW_3;
     }
     vec2 pow3(vec2 x) {
          return FMN_POW_3;
     }
     vec3 pow3(vec3 x) {
          return FMN_POW_3;
     }
     vec4 pow3(vec4 x) {
          return FMN_POW_3;
     }
     float pow4(float x) {
          return FMN_POW_4;
     }
     vec2 pow4(vec2 x) {
          return FMN_POW_4;
     }
     vec3 pow4(vec3 x) {
          return FMN_POW_4;
     }
     vec4 pow4(vec4 x) {
          return FMN_POW_4;
     }

     float linearstep(float a, float b, float x) {
          return clamp01((x - a) / (b - a));
     }
     vec2 linearstep(vec2 a, vec2 b, vec2 x) {
          return clamp01((x - a) / (b - a));
     }
     vec3 linearstep(vec3 a, vec3 b, vec3 x) {
          return clamp01((x - a) / (b - a));
     }
     vec4 linearstep(vec4 a, vec4 b, vec4 x) {
          return clamp01((x - a) / (b - a));
     }

     // Angle should be in radians
     vec2 rotate2D(vec2 uv, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          mat2 mat = mat2(c, s, -s, c);
          return mat * uv;
     }
#endif