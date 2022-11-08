#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.01;
    #endif
}
