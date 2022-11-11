#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_normal;
uniform sampler2D u_pbr_data;
uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_previous_color;
uniform sampler2D u_previous_reflection;

in vec2 texcoord;

#define texcoord (texcoord*(1.0/SSR_RENDER_SCALE))

layout(location = 0) out vec4 fragColor;

void main() {
     if(clamp01(texcoord) != texcoord) {
          discard;
          return;
     }

     float depth = textureLod(u_depth_mipmaps, texcoord, 0).r;

     vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
     vec3 f0 = pbrData.rrr;
     float roughness = pbrData.b;

     // if(depth == 1.0 || f0.r < 0.01) {
     //      discard;
     //      return;
     // }

     vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;

     vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);

     const int depthLod = 2;

     vec3 reflectionCoord = vec3(0.0);
     bool ssrHit = false;

     vec3 viewSpaceDir = fNormalize(setupViewSpacePos(texcoord, 1.0));
     vec3 viewNormal = frx_normalModelMatrix * normal;
     
     for(int r = 0; r < 8; r++) {
          vec3 screenPos = vec3(texcoord, depth);

          vec3 cosineDistribution = goldNoise3d(r);
          vec3 microfacetNormal = frx_normalModelMatrix * fNormalize(normal + fNormalize(cosineDistribution) * roughness * roughness);

          vec3 viewSpaceReflectionDir = normalize(reflect(viewSpaceDir, viewNormal) + goldNoise3d(r) * roughness * roughness);
          viewSpaceReflectionDir *= mix(-1.0, 1.0, step(0.0, dot(viewSpaceReflectionDir, viewNormal)));

          vec3 screenSpaceReflectionDir = fNormalize(viewSpaceToScreenSpace(viewSpacePos + viewSpaceReflectionDir) - screenPos);

          float stepLength = 1.0 / SSR_QUALITY;

          if((reflect(viewSpacePos, microfacetNormal) + viewSpaceReflectionDir * stepLength).z < 0.0) {
               for(int i = 0; i < SSR_QUALITY; i++) {
                    screenPos += screenSpaceReflectionDir * stepLength * (interleaved_gradient(i) * 0.2 + 0.8);

                    if(clamp01(screenPos.xy) != screenPos.xy) {
                         break;
                    } else {
                         float depthQuery = texelFetch(u_depth_mipmaps, ivec2(screenPos.xy * frxu_size), 0).r;
                         // float ldepth = linearizeDepth(screenPos.z), lsample = linearizeDepth(depthQuery);

                         if(depthQuery == 1.0) {
                              //stepLength = 2.0 / SSR_QUALITY;
                              continue;
                         }

                         float lenience = max(abs((screenSpaceReflectionDir.z)) * 3.0, 0.02 / pow(length(viewSpacePos), 2.0));

                         if(abs(lenience - (screenPos.z - depthQuery)) < lenience) {
                              reflectionCoord = screenPos;
                              ssrHit = true;

                              float binaryStepLength = stepLength * 0.5;
                              reflectionCoord -= screenSpaceReflectionDir * binaryStepLength;
                              for(int i = 0; i < 4; i++) {
                                   reflectionCoord += sign(texelFetch(u_depth_mipmaps, ivec2(reflectionCoord.xy * frxu_size), 0).r - reflectionCoord.z) * screenSpaceReflectionDir * binaryStepLength;
                                   binaryStepLength *= 0.5;
                              }

                              vec3 rView = setupSceneSpacePos(reflectionCoord.xy, reflectionCoord.z);
                              reflectionCoord = lastFrameSceneSpaceToScreenSpace(rView + frx_cameraPos - frx_lastCameraPos);

                              break;
                         }
                    }
               }
          }
     }

     vec3 viewSpaceReflectionDir = normalize(reflect(viewSpaceDir, viewNormal) + goldNoise3d() * roughness * roughness);
     viewSpaceReflectionDir *= mix(-1.0, 1.0, step(0.0, dot(viewSpaceReflectionDir, viewNormal)));

     if(ssrHit) fragColor = texture(u_previous_color, reflectionCoord.xy);
     else fragColor.rgb = getSkyColor(viewSpaceReflectionDir * frx_normalModelMatrix, 1.0 - roughness) * frx_smoothedEyeBrightness.y;

     vec3 prevPos = setupSceneSpacePos(texcoord.xy, depth);
     vec2 prevCoord = lastFrameSceneSpaceToScreenSpace(prevPos + frx_cameraPos - frx_lastCameraPos).xy;

     if(clamp01(prevCoord) == prevCoord && roughness > 0.01) fragColor = mix(fragColor, texture(u_previous_reflection, prevCoord), roughness - 0.1);

}