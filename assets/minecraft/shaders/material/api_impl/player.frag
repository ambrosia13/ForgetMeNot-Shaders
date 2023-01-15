#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		fmn_isPlayer = 1;
		fmn_autoGenNormalStrength = 0.0;
	#endif
}