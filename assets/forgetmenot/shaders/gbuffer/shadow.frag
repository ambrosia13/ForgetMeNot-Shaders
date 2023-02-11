#include forgetmenot:shaders/lib/inc/header.glsl 

void frx_pipelineFragment() {
	gl_FragDepth = gl_FragCoord.z;
}