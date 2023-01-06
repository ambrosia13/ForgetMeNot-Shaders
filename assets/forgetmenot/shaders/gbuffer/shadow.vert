#include forgetmenot:shaders/lib/includes.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
    if(shouldReprojectFrame()) {
        gl_Position = vec4(vec3(-10.0), 1.0);
        return;
    }
    gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * (frx_vertex + frx_modelToCamera);
}