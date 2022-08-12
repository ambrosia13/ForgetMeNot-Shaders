#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        if(abs(max(frx_fragColor.r, max(frx_fragColor.g, frx_fragColor.b)) - frx_fragColor.g) < 0.01) {
            frx_fragReflectance = 0.05;
            frx_fragRoughness = pow(frx_luminance(frx_fragColor.rgb), 4.0);
        } else {
            frx_fragReflectance = 1.0;
            frx_fragRoughness = 0.2;
        }
    #endif
}
