#include forgetmenot:shaders/lib/inc/header.glsl

uniform sampler2D u_luminance;

in vec2 texcoord;

layout(location = 0) out float luminanceOut;

void main() {
    // clamp brightness when downsampling to not poison auto exposure
    // TODO: maybe consolidate or combine with another pass to avoid minor performance cost
    ivec2 dstTexel = ivec2(gl_FragCoord.xy);
    ivec2 srcTexel = dstTexel * 2;

    int sampledLod = max(0, frxu_lod - 1);
    
    // manually sample the four src texels
    float luminance = 
        0.25 * texelFetch(u_luminance, srcTexel + ivec2(0, 0), sampledLod).r +
        0.25 * texelFetch(u_luminance, srcTexel + ivec2(1, 0), sampledLod).r +
        0.25 * texelFetch(u_luminance, srcTexel + ivec2(0, 1), sampledLod).r +
        0.25 * texelFetch(u_luminance, srcTexel + ivec2(1, 1), sampledLod).r;
    
    luminanceOut = luminance;
}
