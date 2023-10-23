#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		frx_fragReflectance = 1.0;
		frx_fragRoughness = 0.3 + 0.2 * frx_luminance(frx_fragColor.rgb);
		
		fmn_autoGenNormalStrength = 1.25;
	#endif
}
