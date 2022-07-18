#include forgetmenot:shaders/lib/includes.glsl 

layout(location = 0) out vec4 shadowColor;
layout(location = 1) out vec4 shadowNormal;

void frx_pipelineFragment() {
    shadowColor = frx_fragColor;
    shadowNormal = vec4(frx_vertexNormal.xyz * 0.5 + 0.5, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}