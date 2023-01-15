#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
     #ifdef PBR_ENABLED
          frx_fragReflectance = 0.0;
          frx_fragRoughness = 1.0;

          fmn_autoGenNormalStrength = 0.5;
     #endif
}
