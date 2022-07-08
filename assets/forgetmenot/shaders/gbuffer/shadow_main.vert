#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(gl_Position.xyz);
    } else {
        frx_vertex += frx_modelToCamera;
        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
        shadowViewPos = (frx_shadowViewMatrix * frx_vertex);
    }

}