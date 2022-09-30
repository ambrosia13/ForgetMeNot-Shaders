#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_depth;
uniform sampler2D u_global_illumination_copy;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
     float depth = 

     const float RTAO_BLEND_FACTOR = 0.05;
     vec3 rtao = vec3(1.0);
     vec3 ssgi = vec3(0.0);
     float hit = 0.0;
     vec3 success;
     vec3 lastFrameSuccess;

     vec4 lastFrameSample = vec4(1.0);
     if(clamp01(lastScreenPos.xy) == lastScreenPos.xy) lastFrameSample = texture(u_global_illumination_copy, lastScreenPos.xy);
     vec3 lastFrameRtao = lastFrameSample.aaa;
     float lastFrameHit = lastFrameSample.a;

    if(depth < 1.0) {
          const int SSGI_BOUNCES = 1;
          const int SSGI_STEPS = 100;

          vec3 finalSSGICoords;
          bool ssgiHit = false;

          vec3 ssgiNormal = normal;

          for(int b = 0; b < SSGI_BOUNCES; b++) {
               vec3 rayPos = minViewSpacePos;
               vec3 rayDir = normalize(ssgiNormal + roughness * normalize(goldNoise3d()));
               //success = normalize(rayDir + noise3d(1.0) * 0.25);
               float stepLength = 1.0 / SSGI_STEPS;

               vec3 rayScreen = vec3(texcoord, min_depth);

               vec3 screenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

               // vec3 signDir = (sign(rayDir) - rayScreen) / rayDir;
               //vec3 bn = getBlueNoise(frx_renderFrames & 50u);

               for(int i = 0; i < SSGI_STEPS; i++) {
               if(false) {
                    rayPos += normalize(normal + normalize(noise3d())) * interleaved_gradient(i);

                    rayScreen = viewSpaceToScreenSpace(rayPos);
               } else {
                    rayScreen += screenDir * interleaved_gradient(i) * stepLength;
               }

               if(clamp01(rayScreen) != rayScreen) {
                    break;
               } else {
                    float depthQuery = textureLod(u_depth_mipmaps, rayScreen.xy, 0).r;

                    if(rayScreen.z > depthQuery && abs(linearizeDepth(rayScreen.z) - linearizeDepth(depthQuery)) < 0.05) {
                         finalSSGICoords = rayScreen;
                         ssgiHit = true;
                         break;
                    }
               }

               stepLength *= 1.0;
               }

               // float binaryStepLength = 1.0 / SSGI_STEPS;
               // for(int i = 0; i < 0; i++) {
               //     finalSSGICoords += sign(textureLod(u_depth_mipmaps, finalSSGICoords.xy, 0).r - finalSSGICoords.z) * screenDir * binaryStepLength;
               //     binaryStepLength *= 0.5;
               // }

               vec3 ssgiViewPos = setupViewSpacePos(finalSSGICoords.xy, finalSSGICoords.z);
               finalSSGICoords = lastFrameViewSpaceToScreenSpace(ssgiViewPos + frx_cameraPos - frx_lastCameraPos); 

               if(true) {
               if(ssgiHit) {
                    vec3 emission = textureLod(u_previous_frame, finalSSGICoords.xy, 0).rgb;

                    ssgi += emission * exp2(-b);
                    hit = 1.0;
                    success *= tanh(frx_luminance(emission));
               } else {
                    ssgi += getSkyColor(rayDir) * smoothstep(0.1, 0.2, frx_eyeBrightness.y);
               }
               }

               ssgi = mix(ssgi, vec3(1.0), clamp01(main_color.a));

               ssgiNormal = texture(u_normal, finalSSGICoords.xy).rgb * 2.0 - 1.0;
          }

          ssgi = mix(ssgi, lastFrameSample.rgb, 0.999 * (1.0 - step(0.0001, (1.0 - frx_playerSpectator) + distance(frx_cameraPos, frx_lastCameraPos))));
          if(f0.r < 0.99) main_color *= vec4(ssgi, 1.0);

    }


}