#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = 0.0;
    } else {
        frx_vertex += frx_modelToCamera;

        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
    }

    shadowViewPos = (frx_shadowViewMatrix * vec4(frx_vertex.xyz, 1.0));

    if(!frx_isGui || frx_isHand) gl_Position.xy += (taaOffsets[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight))) * gl_Position.w;
}