#include frex:shaders/api/vertex.glsl
#include frex:shaders/api/material.glsl
#include forgetmenot:shaders/lib/includes.glsl 

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
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
        if((!frx_isGui || frx_isHand) && distance(frx_vertex.xyz + frx_cameraPos - frx_eyePos, vec3(0.0, -1.0, 0.0)) > 2.0) gl_Position.xy += TAA_OFFSETS[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight)) * gl_Position.w;
    #endif
}