#include forgetmenot:shaders/lib/inc/header.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
	frx_vertex += frx_modelToCamera;
	gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * frx_vertex;
}