#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	float saturation = distance(frx_fragColor.rgb, vec3(frx_luminance(frx_fragColor.rgb)));
	frx_fragEmissive = smoothstep(0.05, 0.5, saturation);

	#ifdef PBR_ENABLED
		fmn_autoGenNormalStrength = 0.5;
	#endif
}
