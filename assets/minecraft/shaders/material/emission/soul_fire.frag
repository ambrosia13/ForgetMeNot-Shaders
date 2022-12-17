#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
     frx_fragEmissive = frx_luminance(frx_fragColor.rgb);
     frx_fragColor.rgb *= vec3(0.6, 1.2, 1.5);
}
