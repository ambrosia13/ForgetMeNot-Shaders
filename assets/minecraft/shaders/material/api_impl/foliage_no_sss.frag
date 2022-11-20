#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
          #if FMN_PBR >= 3
               fmn_isFoliage = 1;
          #endif
    #endif
}