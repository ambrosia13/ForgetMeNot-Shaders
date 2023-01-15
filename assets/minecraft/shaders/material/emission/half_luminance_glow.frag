#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	frx_fragEmissive = 0.5 * frx_luminance(frx_fragColor.rgb);

	#ifdef PBR_ENABLED
		fmn_autoGenNormalStrength = 0.5;
	#endif
}
