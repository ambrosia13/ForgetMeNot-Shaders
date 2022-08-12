#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    frx_fragEmissive = frx_luminance(frx_fragColor.rgb) * exp(-frx_distance * 0.5);
}
