#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewSpacePos;

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(gl_Position.xyz);
    } else {
        frx_vertex += frx_modelToCamera;
        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
        shadowViewSpacePos = (frx_shadowViewMatrix * (vec4(frx_vertex.xyz + 0.0 * frx_vertexNormal.xyz, frx_vertex.w)));

    }
}