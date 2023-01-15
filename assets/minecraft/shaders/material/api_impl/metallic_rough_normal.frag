#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
     #ifdef PBR_ENABLED
          frx_fragReflectance = 1.0;
          frx_fragRoughness = 0.3;
          
          fmn_autoGenNormalStrength = 0.75;
     #endif
}
