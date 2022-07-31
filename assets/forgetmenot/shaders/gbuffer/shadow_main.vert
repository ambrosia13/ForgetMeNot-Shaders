#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;
out vec4 originalPos;

// Offsets from Chocapic13 shaders
vec2 taaOffsets[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);

void frx_pipelineVertex() {
    originalPos = frx_vertex;
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(gl_Position.xyz);
    } else {
        frx_vertex += frx_modelToCamera;
        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
        shadowViewPos = (frx_shadowViewMatrix * frx_vertex);

        gl_Position.xy += (taaOffsets[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight))) * gl_Position.w;
    }

}