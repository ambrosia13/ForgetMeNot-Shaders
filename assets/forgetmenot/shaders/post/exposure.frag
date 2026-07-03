#include forgetmenot:shaders/lib/inc/header.glsl

uniform sampler2D u_luminance;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out float avgLuminance;

void main() {
    initGlobals();

    avgLuminance = 0.0;
    const int luminanceLod = 7;

    vec2 size = textureSize(u_luminance, luminanceLod);
    ivec2 isize = ivec2(floor(size));

    for (int x = 0; x < isize.x; x++) {
        for (int y = 0; y < isize.y; y++) {
            float currentSample = texelFetch(u_luminance, ivec2(x, y), luminanceLod).r;
            avgLuminance += currentSample;
        }
    }

    avgLuminance /= size.x * size.y;

    float prevLuminance = texelFetch(u_previous, ivec2(0), 0).r;

    float smoothingFactor = 1.0 - exp(-1.0 / 30.0);
    if (frx_renderFrames > 1u) avgLuminance = max(0.0, mix(prevLuminance, avgLuminance, smoothingFactor));
}
