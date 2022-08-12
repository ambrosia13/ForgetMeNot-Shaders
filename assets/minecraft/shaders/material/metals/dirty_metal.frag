#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 1.0;
        frx_fragRoughness = frx_luminance(pow(frx_fragColor.rgb, vec3(2.0)));
    #endif
}
