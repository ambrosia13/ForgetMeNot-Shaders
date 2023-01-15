#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        fmn_isFoliage = 1;
        fmn_autoGenNormalStrength = 0.5;
    #endif
}