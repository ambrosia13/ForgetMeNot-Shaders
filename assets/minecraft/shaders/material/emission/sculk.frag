#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	frx_fragEmissive = frx_luminance(frx_fragColor.rgb * 3.0) * exp(-frx_distance * 0.25);

	#ifdef PBR_ENABLED
		fmn_autoGenNormalStrength = 0.5;
	#endif
}
