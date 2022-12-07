#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_main_color;
uniform sampler2D u_previous_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_particles_depth;

uniform sampler2D u_solid_normal;
uniform sampler2D u_pbr_data;
uniform sampler2D u_material_data;
uniform sampler2D u_light_data;

uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_depth_no_player;
uniform sampler2D u_blue_noise;

uniform samplerCube u_skybox;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

vec3 getBlueNoise() {
     ivec2 coord = ivec2(gl_FragCoord.xy + frx_renderFrames % 1000u * 100u);
     vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;

     return fNormalize(r) * 2.0 - 1.0;
}

void main() {
     vec4 main_color = texture(u_main_color, texcoord);
     float translucent_depth = texture(u_translucent_depth, texcoord).r;
     float particles_depth = texture(u_particles_depth, texcoord).r;

     vec3 normal = fNormalize(texture(u_solid_normal, texcoord).rgb * 2.0 - 1.0);
     vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
     vec4 materialData = texture(u_material_data, texcoord);
     vec3 light = texture(u_light_data, texcoord).rgb;

     float max_depth = max(translucent_depth, particles_depth);
     float min_depth = min(translucent_depth, particles_depth);

     vec3 sceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
     vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
     vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
     vec3 viewDir = fNormalize(setupSceneSpacePos(texcoord, 1.0));

     vec3 color = main_color.rgb;

     // Clouds contribute to direct and indirect lighting
     vec3 upColor = sampleCubemapFaces(u_skybox) * 0.35;
     vec3 sunColor = textureLod(u_skybox, frx_skyLightVector, 3).rgb;


     vec3 skyLightColor; float skyIlluminance;
     {
          vec3 ambientLightColor = upColor;
          skyIlluminance = frx_luminance(ambientLightColor * 12.0) + frx_skyLightVector.y * frx_skyLightVector.y * 2.0;

          skyLightColor = fNormalize(sunColor) * (skyIlluminance);
     }

     vec3 tdata = getTimeOfDayFactors();

     bool isMetal = pbrData.r > 0.99;

     float emission = materialData.r;
     float disableDiffuse = materialData.g;
     float sssAmount = materialData.b;

     float blockLight = light.r;
     float skyLight = mix(light.g, 1.0, 1.0 - frx_worldIsOverworld);
     vec3 ao = light.bbb;

     bool doDeferredLighting = frx_worldIsEnd + frx_worldIsNether + frx_worldIsOverworld >= 1;
     #ifdef ALL_DIMENSIONS_OVERWORLD
          doDeferredLighting = true;
     #endif

     if(isMetal) {
          fragColor = main_color;
          return;
     } else if(doDeferredLighting) {
          float NdotL = clamp01(dot(normal, frx_skyLightVector));
     
          vec4 shadowViewPos = frx_shadowViewMatrix * vec4(sceneSpacePos, 1.0);
          int cascade = selectShadowCascade(shadowViewPos);

          vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
          vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

          float shadowMap;

          // this is not anywhere near exact so we undershoot it
          bool inShadowMap = length(sceneSpacePos) < 128.0;

          float penumbraSize = 2.0;
          float dither = (interleaved_gradient());

          // Blocker search, adjusts penumbraSize accordingly
          #ifdef VARIABLE_PENUMBRA_SHADOWS
               float blockerCount;
               float blockers;

               for(int i = 0; i < VPS_SEARCH_SAMPLES; i++) {
                    vec2 offset = diskSampling(i, VPS_SEARCH_SAMPLES, interleaved_gradient(i) * TAU) * (10.0 * cascade);
                    vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;

                    float depthQuery = texture(u_shadow_tex, vec3(sampleCoord, cascade)).r;
                    float diff = max(0.0, shadowScreenPos.z - depthQuery) * mix(1000.0, 16000.0, fmn_rainFactor);

                    blockers += diff;
                    blockerCount += 1.0;
               }
               blockers /= blockerCount;

               penumbraSize = blockers;
               penumbraSize = min(penumbraSize, 20.0 * (cascade));
               penumbraSize = max(penumbraSize, 2.0);

               // SSS approximation, blur backface shadows
               penumbraSize = mix(penumbraSize, 8.0 * cascade, sssAmount * step(0.0, -NdotL));
          #endif

          float cutoutBias = 0.00005 + 0.00005 * (1.0 - frx_skyLightVector.y) + 0.00005 * clamp01(1.0 - NdotL) + 0.0001 * (3 - cascade);
          
          #ifdef BIAS_MULT
               float biasMult = 1.05 + 0.2 * max(0, 2 - cascade);
          #else
               float biasMult = 1.0;
          #endif

          shadowScreenPos.z -= biasMult * cutoutBias;

          for(int i = 0; i < SHADOW_FILTER_SAMPLES; i++) {
               vec2 offset = diskSampling(i, SHADOW_FILTER_SAMPLES, interleaved_gradient(i) * TAU) * penumbraSize;
               vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;
               shadowMap += texture(u_shadow_map, vec4(sampleCoord, cascade, shadowScreenPos.z)) / SHADOW_FILTER_SAMPLES;
          }
          
          #ifdef CONTACT_SHADOWS
          {
               vec3 shadowRayPos = vec3(texcoord, max_depth);
               vec3 shadowRayViewPos = maxViewSpacePos;
               vec3 shadowRayViewDir = frx_normalModelMatrix * frx_skyLightVector;
               vec3 shadowRayDir = fNormalize(viewSpaceToScreenSpace(shadowRayViewPos + shadowRayViewDir) - shadowRayPos);
               
               // almost pixel perfect raytrace
               float shadowRayStep = 0.01 - 0.005 * sssAmount;

               float shadowRayDither = (getBlueNoise().x) * 0.3 + 0.7;
               if((sssAmount > 0.04 || NdotL > 0.0) && (shadowRayViewPos + shadowRayViewDir).z < 0.0) {
                    for(int i = 0; i < 12; i++) {
                         shadowRayPos += shadowRayDir * shadowRayStep * shadowRayDither;

                         if(clamp01(shadowRayPos.xy) != shadowRayPos.xy) {
                              break;
                         } else {
                              float depthQuery = texture(u_particles_depth, shadowRayPos.xy).r;

                              if(shadowRayPos.z > depthQuery && abs(linearizeDepth(shadowRayPos.z) - linearizeDepth(depthQuery)) < (inShadowMap ? 0.00015 : 0.01)) {
                                   if(sssAmount < 0.04 || !inShadowMap)  {
                                        shadowMap *= 0.0;
                                        break;
                                   } else {
                                        shadowMap *= 0.75;
                                   }
                              }
                         }

                         //shadowRayStep *= 2.0;
                    }
               }
          }
          #endif

          shadowMap = clamp01(shadowMap);
          shadowMap *= mix(smoothstep(-0.0, 0.1, NdotL), 1.0, sssAmount); // skip NdotL shading to approximate SSS

          shadowMap = mix(shadowMap, 0.0, tdata.z);
          shadowMap = mix(0.0, shadowMap, frx_worldIsOverworld);

          #ifdef SKYLIGHT_LEAK_FIX
               shadowMap *= smoothstep(1.0 / 16.0, 15.0 / 16.0, skyLight);
          #endif

          vec3 lightmap = vec3(0.0);

          float lambertFactor = mix(NdotL * 0.5 + 0.5, 1.0, disableDiffuse);

          //upColor = upColor * 0.9 + 0.1;
          vec3 ambientColor = mix(vec3(0.05), max(vec3(0.0), (2.0 + 1.0 * normal.y) * (upColor)), skyLight);

          if(frx_worldIsEnd == 1) {
               // Never thought I'd ever name a variable NdotPlanet
               float NdotPlanet = dot(normal, fNormalize(vec3(0.8, 0.3, -0.5)));
               ambientColor = mix(ambientColor, 2.0 * vec3(0.1, 0.2, 0.15), smoothstep(0.5, 1.0, NdotPlanet));
               ambientColor = mix(ambientColor, 2.0 * vec3(0.5, 0.05, 0.85), smoothstep(0.0, 1.0, 1.0 - NdotPlanet));

               ambientColor = ambientColor * 0.75 + 0.25;
          } else if(frx_worldIsNether == 1) {
               upColor = upColor * 1.8 + 0.2;
               ambientColor = 2.0 * mix(vec3(1.5, 0.5, 0.25), upColor, 0.5 + 0.5 * normal.y);
          }

          vec3 ambientLight = ambientColor * ao * ao;

          #ifdef SSGI
          {
               const int RTAO_RAYS = SSGI_QUALITY;
               const int RTAO_STEPS = 4;

               ambientLight = vec3(0.0);
               float hit = 0.0;
               vec3 gi = vec3(0.0);

               vec3 viewNormal = frx_normalModelMatrix * normal;

               vec3 rtaoRayPos = maxViewSpacePos;
               vec3 rayScreen = vec3(texcoord, max_depth);

               vec3 unoccludedRayDir = fNormalize(viewNormal + goldNoise3d());

               for(int i = 0; i < RTAO_RAYS; i++) {
                    vec3 rayDir = fNormalize(viewNormal + goldNoise3d(i) - vec3(0.0, 1.0, 0.0) * frx_worldIsNether * (1.0 - blockLight));
                    vec3 rayScreenDir = fNormalize(viewSpaceToScreenSpace(rtaoRayPos + rayDir) - rayScreen);
                    float stepLength = 0.0625 / RTAO_STEPS;

                    vec3 rayScreenMarch = rayScreen;

                    if(min_depth == max_depth && max_depth < 1.0 && (rtaoRayPos + rayDir).z < 0.0) {
                         for(int j = 0; j < RTAO_STEPS; j++) {
                              rayScreenMarch += rayScreenDir * stepLength * (interleaved_gradient(i + j) * 0.9 + 0.1);

                              if(clamp01(rayScreenMarch) != rayScreenMarch) {
                                   break;
                              } else {
                                   float depthQuery = texelFetch(u_depth_mipmaps, ivec2(rayScreenMarch.xy * frxu_size * 0.25), 2).r;

                                   if(rayScreenMarch.z > depthQuery && abs(linearizeDepth(rayScreenMarch.z) - linearizeDepth(depthQuery)) < 0.005) {
                                        vec3 prevTracePos = setupSceneSpacePos(rayScreenMarch.xy, rayScreenMarch.z);
                                        rayScreenMarch = lastFrameSceneSpaceToScreenSpace(prevTracePos + frx_cameraPos - frx_lastCameraPos);

                                        //gi += texture(u_previous_color, rayScreenMarch.xy).rgb / RTAO_RAYS;
                                        hit += 1.0 / RTAO_RAYS;
                                        break;
                                   }
                              }

                              stepLength *= 2.0;
                         }
                    }
               }

               ambientLight = mix(ambientColor, gi, hit);
               ao = mix(vec3(1.0), gi, hit);

               #ifdef DRAW_AO
                    fragColor = vec4(ao, 1.0);
                    return;
               #endif
          }
          #endif

          float sunlightStrength = 0.0004;
          sunlightStrength *= 5.0;

          lightmap.rgb += ambientLight;
          lightmap += skyIlluminance * sunlightStrength * lambertFactor * sunColor * shadowMap;
          
          lightmap.rgb = mixmax(lightmap.rgb, vec3(6.0, 3.0, 1.2) * ao, blockLight * blockLight);

          // handheld light
          float heldLightFactor = 1.0 / (1.0 + pow(distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos), 2.0));//frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));
          heldLightFactor *= mix(clamp01(dot(-normal, fNormalize((sceneSpacePos + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
          heldLightFactor *= frx_smootherstep(frx_heldLight.a * 15.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));
          heldLightFactor *= frx_heldLight.a + 1.0;

          #ifdef RAYTRACED_HANDHELD_LIGHT_OCCLUSION
          {
               float depthNoPlayer = textureLod(u_depth_no_player, texcoord, 0).r;
               float occlusion = 1.0;

               const int HELD_LIGHT_STEPS = 10;

               vec3 heldLightPos = sceneSpaceToViewSpace(((sceneSpacePos.xyz + vec3(0.1, 0.0, 0.1)) + frx_cameraPos - frx_eyePos) + vec3(-0.1, -1.5, 0.0));

               vec2 seed = vec2(fmn_time);
               heldLightPos += vec3(smoothHash(seed), smoothHash(seed - 100.0), smoothHash(seed + 100.0)) * 0.1;

               vec3 rayPos = vec3(texcoord, depthNoPlayer);
               vec3 rayViewDir = (fNormalize(-heldLightPos) + 0.01 * goldNoise3d());
               vec3 rayDir = fNormalize(viewSpaceToScreenSpace(minViewSpacePos + rayViewDir) - rayPos);

               float stepLength = 0.025 / HELD_LIGHT_STEPS;

               if(!all(equal(frx_heldLight.rgb, vec3(1.0))) && (minViewSpacePos + rayViewDir).z < 0.0) {
                    for(int i = 0; i < HELD_LIGHT_STEPS; i++) {
                    rayPos += (rayDir * stepLength) * interleaved_gradient(i);

                    if(clamp01(rayPos) != rayPos) {
                         break;
                    } else {
                         float depthQuery = textureLod(u_depth_no_player, rayPos.xy, 0).r;

                         if(rayPos.z > depthQuery && abs(linearizeDepth(rayPos.z) - linearizeDepth(depthQuery)) < 0.005) {
                              occlusion *= 0.0;
                              break;
                         }
                    }

                    stepLength *= 1.5;
                    }
               }

               if(max_depth != depthNoPlayer) occlusion = 1.0;

               heldLightFactor *= occlusion;
          }
          #endif

          if(frx_heldLight.rgb != vec3(1.0)) lightmap = mixmax(lightmap, (pow(frx_heldLight.rgb * (1.0 + frx_heldLight.a), vec3(2.2)) * ao), heldLightFactor);

          lightmap = mix(lightmap, (lightmap * 0.5 + 0.5) * ao, frx_effectNightVision * frx_effectModifier);

          main_color.rgb *= mix(lightmap, vec3(1.0), emission);
     } else {
          fragColor = main_color;
     }

     fragColor = main_color;
}