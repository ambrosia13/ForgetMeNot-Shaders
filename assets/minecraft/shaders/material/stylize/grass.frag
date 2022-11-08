#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        #if FMN_PBR >= 1
            fmn_sssAmount = 0.75;
        #endif
    #endif
    frx_fragEnableDiffuse = false;
}
