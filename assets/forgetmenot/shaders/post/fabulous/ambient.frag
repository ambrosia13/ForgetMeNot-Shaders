#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_lightmap;
uniform sampler2D u_normal;
uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_history;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

float taaBlendFactor(in vec2 currentCoord, in vec2 previousCoord) {
    vec2 velocity = (currentCoord - previousCoord) * frxu_size;

    float blendFactor = float(clamp01(previousCoord) == previousCoord);
    blendFactor *= exp(-length(velocity)) * 0.1 + 0.8;

    return blendFactor;
}

void main() {
     vec3 ambientLight = vec3(0.0);
     float noHit = 1.0;

     float depth = textureLod(u_depth_mipmaps, texcoord, 0).r;
     vec3 normal = normalize(texture(u_normal, texcoord).rgb * 2.0 - 1.0);

     #define RTAO
     #ifdef RTAO
          const int RTAO_RAYS = 1;
          #define RTAO_STEPS 10

          vec3 rayPos = setupViewSpacePos(texcoord, depth);
          vec3 rayScreen = vec3(texcoord, depth);

          vec3 rayDir = normalize(normal + goldNoise3d());
          vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

          float stepLength = 0.1 / RTAO_STEPS;

          //vec3 bn = getBlueNoise(frx_renderFrames & 50u);

          for(int i = 0; i < RTAO_STEPS; i++) {
               stepLength = min(stepLength, 1.0 / RTAO_STEPS);

               rayScreen += rayScreenDir * stepLength * interleaved_gradient(i);

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
     #endif


     ambientLight += 1.0 * noHit;

    vec3 viewPos = setupViewSpacePos(texcoord, depth);
    vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
    vec3 lastScreenPos = lastFrameViewSpaceToScreenSpace(viewPos + positionDifference);

     if(clamp01(lastScreenPos.xy) == lastScreenPos.xy)
     ambientLight = mix(ambientLight, normalAwareBlur(u_history, lastScreenPos.xy, 2.0, 3, u_normal).rgb, taaBlendFactor(texcoord, lastScreenPos.xy));

     fragColor = vec4(ambientLight, 1.0);
}