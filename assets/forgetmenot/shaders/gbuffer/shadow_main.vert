#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz + frx_modelToCamera.xyz);

        // shadowViewPos = (frx_shadowViewMatrix * (frx_vertex + frx_modelToCamera));
    } else {
        // if(frx_isHand) {
        //     frx_vertex.xz = rotate2D(frx_vertex.xz, atan(frx_cameraView.x, -frx_cameraView.z));
        // }
        frx_vertex += frx_modelToCamera;
        //frx_vertex.xz = rotate2D(frx_vertex.xz, 2*PI / float(2));
        //frx_vertex.y *= acos(frx_cameraView.y);


        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);

        gl_Position.xy += (taaOffsets[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight))) * gl_Position.w;
    }

        shadowViewPos = (frx_shadowViewMatrix * frx_vertex);
}