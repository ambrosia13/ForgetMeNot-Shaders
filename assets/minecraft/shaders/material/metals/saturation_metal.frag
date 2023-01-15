#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		float saturation = distance(frx_fragColor.rgb, vec3(frx_luminance(frx_fragColor.rgb)));

		//frx_fragColor *= mix(1.0, 1.0, step(0.05, saturation));
		frx_fragReflectance = 0.1 * step(0.05, saturation);
		//if(!frx_isGui) frx_fragColor.rgb *= mix(1.0, 3.0, step(0.05, saturation));

		frx_fragRoughness = 1.0 - 0.7 * step(0.05, saturation);
	#endif
}
