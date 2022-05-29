#include forgetmenot:shaders/lib/includes.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
    gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * ((frx_vertex - 0.0 * vec4(frx_vertexNormal, 1.0)) + frx_modelToCamera) + 0.00013;
}