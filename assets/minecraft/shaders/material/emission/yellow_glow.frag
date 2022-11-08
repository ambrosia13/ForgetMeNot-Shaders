#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    frx_fragEmissive = smoothstep(0.7, 0.9, dot((frx_fragColor.rgb), fmn_fNormalize(vec3(1.0, 1.0, 0.0))));
}
