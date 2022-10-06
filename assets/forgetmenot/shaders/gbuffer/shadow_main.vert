#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;

// Offsets from Chocapic13 shaders
vec2 taaOffsets[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);

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
    }

        shadowViewPos = (frx_shadowViewMatrix * vec4(frx_vertex.xyz, 1.0));

    if(!frx_isGui || frx_isHand) gl_Position.xy += (taaOffsets[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight))) * gl_Position.w;
}