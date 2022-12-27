// --------------------------------------------------------------------------------------------------------
// Pipeline internals.
// --------------------------------------------------------------------------------------------------------

const uvec4 BITS_X = uvec4(9u, 9u, 9u, 5u);
const uvec4 BITS_Y = uvec4(10u, 10u, 10u, 2u);
const uvec4 BITS_Z = uvec4(14u, 14u, 2u, 2u);

#ifdef FRAGMENT_SHADER
     bool shouldReprojectFrame() {
          #ifdef REPROJECTION_RENDERING
               return frx_renderFrames % 2u == 0u;
          #else
               return false;
          #endif
     }

     void init() {
          if(shouldReprojectFrame()) {
               discard;
          }
     }
#endif

bool isModdedDimension() {
     return frx_worldIsOverworld + frx_worldIsNether + frx_worldIsEnd == 0;
}

#ifdef INCLUDE_RAYTRACER
     // DISCLAIMER: this raytracer only half works.
     // rayPos and rayDir should be in view space.
     bool raytrace(in vec3 rayPos, in vec3 rayDir, in int steps, in sampler2D depths, out vec3 hitPos) {
          vec3 rayScreenPos = viewSpaceToScreenSpace(rayPos);
          vec3 rayScreenDir = fNormalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreenPos);

          // Naive raytracer
          /*
          float stepSize = 1.0 / steps;
          const int sampleLod = 0;

          for(int i = 0; i < steps; i++) {
               rayScreenPos += rayScreenDir * stepSize;

               if(clamp01(rayScreenPos.xy) != rayScreenPos.xy) {
                    break;
               } else {
                    float depthQuery = texelFetch(depths, ivec2(rayScreenPos.xy * frxu_size / exp2(sampleLod)), sampleLod).r;

                    if(rayScreenPos.z > depthQuery) {
                         hitPos = rayScreenPos;
                         return true;
                    }
               }
          }
          */

          // Hi-z raytracer
          // /*
          float stepSize = 30.0 / max(frxu_size.x, frxu_size.y);

          const int startLod = 7;
          int lod = startLod;

          for(int i = 0; i < steps; i++) {
               // Select the step size to move over to the next texel at the current lod.
               float lodMult = (exp2(lod));
               vec3 rayStep = rayScreenDir * stepSize * lodMult * interleavedGradient(i);

               // Step the ray forward.
               rayScreenPos += rayStep;

               // The ray is out of bounds
               if(clamp01(rayScreenPos.xy) != rayScreenPos.xy) {
                    if(lod > 0) {
                         // Step back and check lower lod to get a perfect cutoff
                         rayScreenPos -= rayStep;
                         lod--;
                         continue;
                    }

                    break;
               } else {
                    float depthQuery = texelFetch(depths, ivec2(rayScreenPos.xy * frxu_size / lodMult), lod).r;

                    if(rayScreenPos.z > depthQuery && depthQuery < 1.0) {
                         // If there's an intersection at the current lod, check lower lod.
                         if(lod > 0) {
                              rayScreenPos -= rayStep;
                              lod--;
                              continue;
                         }

                         // If we're back at lod = 0, we found an intersection.
                         hitPos = rayScreenPos;
                         return true;
                    }
               }
          }
          // */

          // No intersection found
          return false;
     }
#endif

#ifdef INCLUDE_LIGHTING
     // Basic diffuse lighting
     vec3 basicLighting(
          in vec3 albedo,
          in vec3 sceneSpacePos,
          in vec3 normal,
          in float blockLight,
          in float skyLight,
          in float vanillaAo,
          in float f0,
          in float roughness,
          in float sssAmount,
          in samplerCube skybox,
          in sampler2D transmittanceLut,
          in sampler2DArrayShadow shadowMap,
          in sampler2DArray shadowMapTexture,
          bool doPcss,
          int shadowMapSamples
     ) {
          float emission = clamp01(frx_luminance(albedo) - 1.0);
          float NdotL = mix(clamp01(dot(normal, frx_skyLightVector)), 1.0, sssAmount);

          vec3 totalLighting = vec3(0.0);
          vec3 directLighting = vec3(0.0);
          vec3 ambientLighting = vec3(0.0);

          // Direct lighting
          {
               vec4 shadowViewPos = frx_shadowViewMatrix * vec4(sceneSpacePos + normal * 0.1, 1.0);
               int cascade = selectShadowCascade(shadowViewPos);
               float cascadeF = float(cascade);

               vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
               vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

               shadowScreenPos.z -= 0.0005 * (3 - cascade) * (1.0 - NdotL);

               float shadowFactor = 0.0;
               float penumbraSize = 0.5;
               
               if(doPcss) {
                    for(int i = 0; i < shadowMapSamples; i++) {
                         vec2 offset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i + shadowMapSamples)) * TAU) * (10.0 * cascade);
                         vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;

                         float depthQuery = texture(shadowMapTexture, vec3(sampleCoord, cascade)).r;
                         float diff = max(0.0, shadowScreenPos.z - depthQuery) * 500.0 * mix(mix(mix(0.5, 1.0, step(0.5, cascadeF)), 2.0, step(1.5, cascadeF)), 3.0, step(2.5, cascadeF));

                         penumbraSize += min(1.0 * cascade, diff / shadowMapSamples);
                    }
               } else {
                    penumbraSize = 2.0;
               }

               penumbraSize = mix(penumbraSize, 5.0 * cascade, sssAmount * (-sign(dot(normal, frx_skyLightVector)) * 0.5 + 0.5));

               for(int i = 0; i < shadowMapSamples; i++) {
                    vec2 offset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i)) * TAU) * penumbraSize / SHADOW_MAP_SIZE;
                    shadowFactor += texture(shadowMap, vec4(shadowScreenPos.xy + offset, cascade, shadowScreenPos.z)) / shadowMapSamples;
               }

               vec3 directLightTransmittance = getValFromTLUT(transmittanceLut, skyViewPos + 40.0 * vec3(0.0, (0.000001 * (sceneSpacePos.y + frx_cameraPos.y) - 0.000065), 0.0), frx_skyLightVector);
               directLighting = 4.0 * directLightTransmittance * NdotL * frx_skyLightTransitionFactor * shadowFactor;
               if(frx_worldIsMoonlit == 1) directLighting *= moonFlux;
          }

          // Ambient lighting
          {
               ambientLighting = sampleAllCubemapFaces(skybox).rgb * (2.0 + normal.y);
               ambientLighting = mix(vec3(0.025), ambientLighting, skyLight);

               ambientLighting += 2.0 * pow2(blockLight * 1.5) * vec3(2.0, 0.98, 0.32);
               
               // handheld light
               {
                    float heldLightFactor = 1.0 / (1.0 + pow2(distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos)));//frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));
                    heldLightFactor *= mix(clamp01(dot(-normal, fNormalize((sceneSpacePos + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
                    //heldLightFactor *= frx_smootherstep(frx_heldLight.a * 15.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));
                    heldLightFactor *= 2.0 * step(0.01, frx_heldLight.a);
                    ambientLighting += pow(frx_heldLight.rgb * (1.0 + frx_heldLight.a), vec3(2.2)) * heldLightFactor;
               }

               ambientLighting *= vanillaAo;
          }

          totalLighting += directLighting + ambientLighting;

          vec3 color = albedo * mix(totalLighting, vec3(1.0), emission);
          return color;
     }
#endif