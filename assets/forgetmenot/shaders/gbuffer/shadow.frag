#include forgetmenot:shaders/lib/includes.glsl 

void frx_pipelineFragment() {
    // vec2 pixel = floor(frx_normalizeMappedUV(frx_texcoord) * 16.0) / 16.0;
    // pixel *= 4000.0;

    // if(fmn_isLeafBlock == 1 && step(getLeavesFallingThreshold(frx_vertex.xyz + frx_cameraPos), hash12(pixel)) > 0.5) discard;

    gl_FragDepth = gl_FragCoord.z;
}