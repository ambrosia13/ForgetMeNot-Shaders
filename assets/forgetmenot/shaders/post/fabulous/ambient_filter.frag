#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_rtao;
uniform sampler2D u_normal;
uniform sampler2D u_depth;
uniform sampler2D u_history;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

float taaBlendFactor(in vec2 currentCoord, in vec2 previousCoord) {
    vec2 velocity = (currentCoord - previousCoord) * frxu_size;

    float blendFactor = float(clamp01(previousCoord) == previousCoord);
    blendFactor *= exp(-length(velocity)) * 0.15 + 0.8;

    return blendFactor;
}
// Neighborhood clipping from "Temporal Reprojection Anti-Aliasing in INSIDE"
// Code by Belmu#4066
vec3 clipAABB(vec3 prevColor, vec3 minColor, vec3 maxColor) {
    vec3 pClip = 0.5 * (maxColor + minColor); // Center
    vec3 eClip = 0.5 * (maxColor - minColor); // Size

    vec3 vClip  = prevColor - pClip;
    vec3 aUnit  = abs(vClip / eClip);
    float denom = max(aUnit.x, max(aUnit.y, aUnit.z));

    return denom > 1.0 ? pClip + vClip / denom : prevColor;
}

#define NEIGHBORHOOD_SIZE 1
vec3 neighbourhoodClipping(sampler2D currTex, vec3 prevColor) {
    vec3 minColor = vec3(1e5), maxColor = vec3(-1e5);

    for(int x = -NEIGHBORHOOD_SIZE; x <= NEIGHBORHOOD_SIZE; x++) {
        for(int y = -NEIGHBORHOOD_SIZE; y <= NEIGHBORHOOD_SIZE; y++) {
            vec3 color = texelFetch(currTex, ivec2(gl_FragCoord.xy) + ivec2(x, y), 0).rgb;
            minColor = min(minColor, color); maxColor = max(maxColor, color); 
        }
    }
    return clipAABB(prevColor, minColor, maxColor);
}

void main() {
    vec4 color = normalAwareBlur(u_rtao, texcoord, 12.0, 3, u_normal, u_depth);

    vec3 scenePos = setupSceneSpacePos(texcoord, texture(u_depth, texcoord).r);
    vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
    vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(scenePos + positionDifference);
    vec4 previousColor = texture(u_history, lastScreenPos.xy);
    //color *= color.a;

    vec3 tempColor = neighbourhoodClipping(u_rtao, previousColor.rgb);
    color.rgb = mix(color.rgb, tempColor, 0.9);

    fragColor = color;
}