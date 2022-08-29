#include forgetmenot:shaders/lib/includes.glsl 

layout(location = 0) out vec4 shadowColor;
layout(location = 1) out vec4 shadowNormal;

void frx_pipelineFragment() {
    shadowColor = frx_fragColor;
    shadowNormal = vec4(normalize(frx_vertex.xyz / frx_vertex.w), 1.0);

    // if(step(interleaved_gradient(), 1.0 - fmn_sssAmount * 0.5) > 0.5 && fmn_sssAmount > 0.0) {
    //     discard;
    // }

    gl_FragDepth = gl_FragCoord.z;
}