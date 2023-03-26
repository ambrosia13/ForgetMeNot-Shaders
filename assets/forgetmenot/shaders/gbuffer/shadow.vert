#include forgetmenot:shaders/lib/inc/header.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
	vec4 sceneSpacePos = frx_vertex + frx_modelToCamera;
	gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * sceneSpacePos;
}