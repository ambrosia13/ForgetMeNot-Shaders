#include forgetmenot:shaders/lib/includes.glsl 

layout(location = 0) out vec4 shadowColor;

void frx_pipelineFragment() {
    shadowColor = frx_fragColor;


    gl_FragDepth = gl_FragCoord.z;
}