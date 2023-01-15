#include forgetmenot:shaders/lib/includes.glsl 

void frx_pipelineFragment() {
	gl_FragDepth = gl_FragCoord.z;
}