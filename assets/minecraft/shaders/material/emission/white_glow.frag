#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	frx_fragEmissive = smoothstep(0.85, 1.0, dot((frx_fragColor.rgb), fmn_fNormalize(vec3(1.0, 1.0, 1.0))));
}
