#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        frx_fragRoughness = smoothstep(0.3, 1.0, frx_luminance(frx_fragColor.rgb)) * 0.4;
    #endif
}
