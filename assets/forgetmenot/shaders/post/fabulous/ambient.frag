#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_lightmap;
uniform sampler2D u_normal;
uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_history;
uniform sampler2D u_blue_noise;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

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

vec3 getBlueNoise() {
    ivec2 coord = ivec2(rotate2D(texcoord, frx_renderFrames % 500u) * frxu_size + (frx_renderFrames % 500u) * 100u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return normalize(r) * 2.0 - 1.0;
}
vec3 getBlueNoise(float offset) {
    ivec2 coord = ivec2(rotate2D(texcoord, offset) * frxu_size + frx_renderFrames * 100u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return normalize(r) * 2.0 - 1.0;
}

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
     vec3 ambientLight = vec3(0.0);
     float noHit = 1.0;
     vec2 coordJittered = ((texcoord * 2.0 - 1.0) + taaOffsets[frx_renderFrames % 8u] / (frxu_size)) * 0.5 + 0.5;

     float depth = textureLod(u_depth_mipmaps, coordJittered, 0).r;
     vec3 normal = normalize(texture(u_normal, coordJittered).rgb * 2.0 - 1.0);

     #define RTAO
     #ifdef RTAO
          const int RTAO_RAYS = 1;
          #define RTAO_STEPS 10

          vec3 rayPos = setupViewSpacePos(coordJittered, depth);
          vec3 rayScreen = vec3(coordJittered, depth);

          vec3 rayDir = normalize(normal + goldNoise3d());
          vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

          float stepLength = 0.005;

          vec3 bn = getBlueNoise(frx_renderFrames & 50u);

          for(int i = 0; i < RTAO_STEPS; i++) {
               stepLength = min(stepLength, 1.0 / RTAO_STEPS);

               rayScreen += rayScreenDir * stepLength * (bn.r * 0.5 + 0.5);

               if(clamp01(rayScreen) != rayScreen) {
                    break;
               } else {
                    float depthQuery = textureLod(u_depth_mipmaps, rayScreen.xy, 2).r;

                    if(rayScreen.z > depthQuery && abs(linearizeDepth(rayScreen.z) - linearizeDepth(depthQuery)) < 0.001) {
                         noHit *= 0.0;
                         break;
                    }
               }

               stepLength *= 2.0;
          }

          //noHit = 1.0 - clamp01(((RTAO_STEPS + 1) / RTAO_STEPS) * (1.0 - noHit));
     #else
          #define SSAO_SAMPLES 4

          vec3 rayPos = setupViewSpacePos(coordJittered, depth);
          vec3 rayScreen = vec3(coordJittered, depth);

          vec3 rayDir = normalize(normal + goldNoise3d());
          // vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

          float stepLength = 0.2 / SSAO_SAMPLES;

          for(int i = 0; i < SSAO_SAMPLES; i++) {
               vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

               vec3 samplePos = rayScreen + rayScreenDir * stepLength * interleaved_gradient(i);

               if(clamp01(samplePos) != samplePos) {
                    break;
               } else {
                    float depthQuery = textureLod(u_depth_mipmaps, samplePos.xy, 2).r;

                    if(samplePos.z > depthQuery && abs(linearizeDepth(samplePos.z) - linearizeDepth(depthQuery)) < 0.001) {
                         noHit *= 0.0;
                         break;
                    }
               }
          }
     #endif


     ambientLight += 1.0 * noHit;

     vec3 viewPos = setupViewSpacePos(coordJittered, depth);
     vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
     vec3 lastScreenPos = lastFrameViewSpaceToScreenSpace(viewPos + positionDifference);
     
     vec3 previousColor = texture(u_history, lastScreenPos.xy).rgb;

     if(clamp01(lastScreenPos.xy) == lastScreenPos.xy)
     //ambientLight = mix(ambientLight, normalAwareBlur(u_history, lastScreenPos.xy, 2.0, 3, u_normal).rgb, taaBlendFactor(texcoord, lastScreenPos.xy));
     ambientLight = mix(ambientLight, previousColor, 0.9);

     fragColor = vec4(ambientLight, 1.0);
}