#include forgetmenot:shaders/lib/inc/header.glsl 

uniform int frxu_cascade;

void frx_pipelineVertex() {
	frx_vertex += frx_modelToCamera;
	gl_Position = frx_vertex;

	#ifdef TAA
		// Move to clip space
		gl_Position = frx_viewProjectionMatrix * gl_Position;

		// Apply TAA jitter
		//gl_Position.xy += getTaaOffset(frx_renderFrames) * (1.0 / vec2(frx_viewWidth, frx_viewHeight)) * gl_Position.w;

		gl_Position = frx_inverseViewProjectionMatrix * gl_Position;
	#endif

	gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * gl_Position;
}