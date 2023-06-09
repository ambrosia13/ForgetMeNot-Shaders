#include forgetmenot:shaders/lib/inc/header.glsl 

void frx_pipelineVertex() {
	init();

	if(frx_modelOriginScreen) {
		gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
		frx_distance = 0.0;
	} else {
		// Move model coordinates
		frx_vertex += frx_modelToCamera;
				
		// Move to clip space
		gl_Position = frx_viewProjectionMatrix * frx_vertex;

		// block distance
		frx_distance = length(frx_vertex.xyz);
	}

	#ifdef TAA
		// These offsets are used for TAA so we can move the world around a little bit each frame so we can see a little bit more of the world,
		// giving subpixel detail for advanced anti-aliasing.
		if(!frx_isGui || frx_isHand) gl_Position.xy += getTaaOffset(frx_renderFrames) * (1.0 / vec2(frx_viewWidth, frx_viewHeight)) * gl_Position.w;
	#endif
}