#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
     #ifdef PBR_ENABLED
          #if FMN_PBR >= 2
               fmn_isPlayer = 1;
          #endif
     #endif
}
