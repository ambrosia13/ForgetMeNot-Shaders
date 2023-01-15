#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
            fmn_sssAmount = 1.0;
            fmn_isFoliage = 1;
            fmn_autoGenNormalStrength = 0.5;
    #endif
    frx_fragEnableDiffuse = false;
}
