#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	frx_fragEmissive = smoothstep(0.7, 1.0, frx_luminance(frx_fragColor.rgb));
}
