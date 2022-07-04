#include forgetmenot:shaders/lib/includes.glsl 
#include forgetmenot:shadows

// Borrowing some canvas stuff for shadow sampling & depth bias
#define SHADOW_MAP_SIZE 2048
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;

in vec4 shadowViewSpacePos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 fragData;
layout(location = 3) out vec4 fragPbrData;
layout(location = 4) out vec4 fragCompositeNormal;

void frx_pipelineFragment() {
    vec4 color = frx_fragColor;
    vec4 unshadedColor = color;
    mat3 tbn = mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );

    #ifdef PBR_ENABLED
        frx_fragNormal = tbn * frx_fragNormal;
        if(frx_isHand) {
            frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
        }
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    fragData = vec4(frx_fragRoughness, frx_fragReflectance, float(fmn_isWater), 1.0);
    fragPbrData = vec4(frx_fragReflectance, frx_fragRoughness, 0.0, 1.0);
    fragCompositeNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}