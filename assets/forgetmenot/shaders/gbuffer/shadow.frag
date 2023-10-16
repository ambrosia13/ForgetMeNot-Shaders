#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/seasons.glsl

void frx_pipelineFragment() {
	gl_FragDepth = gl_FragCoord.z;
}