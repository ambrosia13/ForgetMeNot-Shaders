#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		frx_fragReflectance = 0.05;
		frx_fragRoughness = mix(smoothstep(0.3, 1.0, frx_luminance(frx_fragColor.rgb)) * 0.4, 0.7 * smoothstep(0.0, 0.5, frx_luminance(frx_fragColor.rgb)), 1.0 - step(0.8, dot(frx_fragColor.rgb, vec3(1.0, 1.0, 0.0))));
	
		fmn_autoGenNormalStrength = 0.5;
	#endif
}
