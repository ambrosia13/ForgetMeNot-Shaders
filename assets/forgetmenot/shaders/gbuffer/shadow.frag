#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/seasons.glsl

vec3 getClippedWorldSpacePos() {
	return floor(mod(frx_vertex.xyz + frx_cameraPos - 0.1 * frx_vertexNormal.xyz, 3000.0) * 16.0) / 16.0;
}

void frx_pipelineFragment() {
	// vec3 worldSpacePos = getClippedWorldSpacePos();
	// if(fmn_isLeafBlock == 1 && hash13(mod(worldSpacePos * 20.0, 100.0)) > getLeavesFallingThreshold(worldSpacePos)) {
	// 	discard;
	// }

	gl_FragDepth = gl_FragCoord.z;
}