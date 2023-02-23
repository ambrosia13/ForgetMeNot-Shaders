#include forgetmenot:shaders/lib/inc/header.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
	gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * (frx_vertex + frx_modelToCamera);
}