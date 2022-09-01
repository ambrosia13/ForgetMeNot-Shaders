#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_lightmap;
uniform sampler2D u_normal;
uniform sampler2D u_depth_mipmaps;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
     vec3 ambientLight = vec3(0.0);

     #ifdef RTAO
          const int RTAO_RAYS = 1;
          //const int RTAO_STEPS = 5;

          vec3 rayPos = minViewSpacePos;
          vec3 rayScreen = vec3(texcoord, max_depth);
          vec3 rayDir = normalize(normal + noise3d());
          rayDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);
          float stepLength = 0.25 / RTAO_STEPS;

          //vec3 bn = getBlueNoise(frx_renderFrames & 50u);

          for(int i = 0; i < RTAO_STEPS; i++) {
               rayScreen += rayDir * stepLength * (interleaved_gradient());

               if(clamp01(rayScreen) != rayScreen) {
               break;
               } else {
               float depthQuery = textureLod(u_depth_mipmaps, rayScreen.xy, 0).r;

               if(rayScreen.z > depthQuery && abs(linearizeDepth(rayScreen.z) - linearizeDepth(depthQuery)) < 0.005) {
                    rtao *= 0.05;
                    break;
               }
               }

               //stepLength *= 2.0;
          }

          rtao = 1.0 - clamp01(((RTAO_STEPS + 1) / RTAO_STEPS) * (1.0 - rtao));

          composite *= mix(lastFrameRtao, rtao, 1.0);
     #else
}