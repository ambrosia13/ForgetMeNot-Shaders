#include forgetmenot:shaders/lib/inc/header.glsl 

void frx_pipelineVertex() {
	initGlobals();

	if(frx_modelOriginScreen) {
		gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
		frx_distance = 0.0;
	} else {
		frx_vertex += frx_modelToCamera;
		gl_Position = frx_viewProjectionMatrix * frx_vertex;

		frx_distance = length(frx_vertex.xyz);
	}

	#ifdef TAA
		if(!frx_isGui || frx_isHand) gl_Position.xy += getTaaOffset(frx_renderFrames) * (1.0 / vec2(frx_viewWidth, frx_viewHeight)) * gl_Position.w;
	#endif
}