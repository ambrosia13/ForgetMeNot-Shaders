#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		frx_fragReflectance = 0.01;
		frx_fragRoughness = 0.6;
		
		fmn_autoGenNormalStrength = 1.25;
	#endif
}
