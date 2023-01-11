// --------------------------------------------------------------------------------------------------------
// Pipeline internals.
// --------------------------------------------------------------------------------------------------------

const uvec4 BITS_X = uvec4(9u, 9u, 9u, 5u);
const uvec4 BITS_Y = uvec4(10u, 10u, 10u, 2u);
const uvec4 BITS_Z = uvec4(14u, 12u, 4u, 2u);

// For converting some assignments into MADs
const vec2 FMN_MASK = vec2(1.0, 0.0);

bool shouldReprojectFrame() {
     #ifdef REPROJECTION_RENDERING
          return frx_renderFrames % 2u == 0u;
     #else
          return false;
     #endif
}
#ifdef FRAGMENT_SHADER
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
     vec3 cam_dir_to_win(vec3 pos_cs, vec3 dir_cs, mat4 projMat) {
          vec4 p = vec4(pos_cs, 1.);
          vec4 n = vec4(dir_cs, 0.);

          vec4 X = (projMat * (p + n));
          vec4 Y = (projMat * p);

          return normalize(
               vec3(frxu_size, 1.0) *
               ((X.xyz / X.w) - (Y.xyz / Y.w))
          );
     }

     const uint power_of_two = 2u;
     const uint last_level = 8u;

     uint cell_size(uint level) { return 1u << level; }
     float cell_size_f(uint level) { return float(cell_size(level)); }
     uint cell_mask(uint level) { return cell_size(level) - 1u; }

     float position_in_cell(uint texel, float inner, uint level) {
          return float(texel & cell_mask(level)) + inner;
     }

     float dist_negative(uint texel, float inner, uint level) {
          return position_in_cell(texel, inner, level);
     }

     float dist_positive(uint texel, float inner, uint level) {
          return cell_size_f(level) - dist_negative(texel, inner, level);
     }

     float dist_to_axis(uint texel0, float inner0, uint level, float dir0) {
          return mix(dist_negative(texel0, inner0, level), dist_positive(texel0, inner0, level), step(0.0, dir0));
     }

     float next_cell(inout uvec2 texel, inout vec2 inner, vec2 dir, uint level) {
          vec2 dists_to_axis = vec2(
               dist_to_axis(texel.x, inner.x, level, dir.x),
               dist_to_axis(texel.y, inner.y, level, dir.y)
          );
          vec2 diagonal_dists = dists_to_axis / abs(dir);

          vec2 dir_signs = sign(dir);

          if(diagonal_dists.x < diagonal_dists.y) {
               texel.x -= texel.x & cell_mask(level);

               if(dir_signs.x > 0.0) {
                    texel.x += cell_size(level);
                    inner.x = 0.0;
               } else {
                    texel.x -= 1u;
                    inner.x = 1.0;
               }

               float y = inner.y + dir.y * diagonal_dists.x;
               inner.y = fract(y);
               texel.y += uint(int(floor(y)));
               return diagonal_dists.x;
          } else {
               texel.y -= texel.y & cell_mask(level);

               if(dir_signs.y > 0.0) {
                    texel.y += cell_size(level);
                    inner.y = 0.0;
               } else {
                    texel.y -= 1u;
                    inner.y = 1.0;
               }

               float x = inner.x + dir.x * diagonal_dists.y;
               inner.x = fract(x);
               texel.x += uint(int(floor(x)));
               return diagonal_dists.y;
          }
     }

     bool is_out_of_fb(uvec2 texel, float z) {
          return
               any(greaterThanEqual(texel, uvec2(frxu_size))) ||
               z <= 0.0;
     }

     bool raytrace(in vec3 pos_win, in vec3 dir_ws, in int steps, in sampler2D depths, out vec3 hitPos) {
          pos_win.z -= max(0.0, dir_ws.z * 4.0);
          pos_win.z -= 1.0 / 1000000.0;

          float dir_ws_xy_length = length(dir_ws.xy);
          vec2 dir_xy = dir_ws.xy / dir_ws_xy_length;

          uvec2 texel = uvec2(pos_win.xy);
          vec2 inner = vec2(fract(pos_win.xy));
          float z = pos_win.z;

          while(true) {
               if(steps == 0 || is_out_of_fb(texel, z)) {
                    break;
               }
               --steps;

               uint level = last_level;
               float lower_depth = texelFetch(depths, ivec2(texel >> int(last_level)), int(last_level)).r;

               while(z >= lower_depth && level > 0u) {
                    level -= power_of_two;
                    lower_depth = texelFetch(depths, ivec2(texel >> int(level)), int(level)).r;
               }

               uvec2 prev_texel = texel;
               vec2 prev_inner = inner;
               float prev_z = z;
               float dist_xy = next_cell(texel, inner, dir_xy, level);
               z += dist_xy * (dir_ws.z / dir_ws_xy_length);

               if(z >= lower_depth) {
                    if(level == 0u) {
                         hitPos.xy = (vec2(prev_texel) + vec2(0.5)) / frxu_size;
                         hitPos.z = prev_z >= lower_depth ? prev_z : lower_depth;
                         return hitPos.z < 1.0 && abs(linearizeDepth(hitPos.z) - linearizeDepth(lower_depth)) < 1.0;
                    }
                    float mul = (lower_depth - prev_z) / (z - prev_z);
                    dist_xy *= mul;

                    vec2 diff = prev_inner + dist_xy * dir_xy;

                    inner = fract(diff);
                    texel = prev_texel + uvec2(ivec2(floor(diff)));

                    z = lower_depth;
               }
          }

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
          in float isWater,
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
                         vec2 sampleOffset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i + shadowMapSamples)) * TAU) * (10.0 * cascade);
                         vec2 sampleCoord = shadowScreenPos.xy + sampleOffset / SHADOW_MAP_SIZE;

                         float depthQuery = texture(shadowMapTexture, vec3(sampleCoord, cascade)).r;
                         float diff = max(0.0, shadowScreenPos.z - depthQuery) * 500.0 * mix(mix(mix(0.5, 1.0, step(0.5, cascadeF)), 2.0, step(1.5, cascadeF)), 3.0, step(2.5, cascadeF));

                         penumbraSize += min(1.0 * cascade, diff / shadowMapSamples);
                    }
               } else {
                    penumbraSize = 2.0;
               }

               penumbraSize = mix(penumbraSize, 5.0 * cascade, sssAmount * (-sign(dot(normal, frx_skyLightVector)) * 0.5 + 0.5));

               for(int i = 0; i < shadowMapSamples; i++) {
                    vec2 sampleOffset = diskSampling(i, shadowMapSamples, sqrt(interleavedGradient(i)) * TAU) * penumbraSize / SHADOW_MAP_SIZE;
                    shadowFactor += texture(shadowMap, vec4(shadowScreenPos.xy + sampleOffset, cascade, shadowScreenPos.z)) / shadowMapSamples;
               }
               shadowFactor *= skyLight;

               shadowFactor = mix(shadowFactor, shadowFactor * 0.5 + 0.5, isWater);

               vec3 directLightTransmittance = getValFromTLUT(transmittanceLut, skyViewPos + 40.0 * vec3(0.0, (0.000001 * (sceneSpacePos.y + frx_cameraPos.y) - 0.000065), 0.0), frx_skyLightVector);
               directLighting = 10.0 * directLightTransmittance * NdotL * frx_skyLightTransitionFactor * shadowFactor;
               if(frx_worldIsMoonlit == 1) directLighting *= moonFlux;
          }

          // Ambient lighting
          {
               ambientLighting = sampleAllCubemapFaces(skybox).rgb * (1.5 + 0.5 * normal.y) * 0.5;
               ambientLighting = mix(vec3(0.01), ambientLighting, skyLight);

               ambientLighting += 1.0 * blockLight * vec3(1.3, 1.0, 0.7);
               
               // handheld light
               {
                    float heldLightFactor = 1.0 / (1.0 + pow2(distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos)));//frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, sceneSpacePos + frx_cameraPos));

                    heldLightFactor *= mix(clamp01(dot(-normal, fNormalize((sceneSpacePos + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), sceneSpacePos + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo

                    #ifdef frx_isHand
                         heldLightFactor = mix(heldLightFactor, 0.1, float(frx_isHand));
                    #endif

                    heldLightFactor *= 2.0 * step(0.01, frx_heldLight.a);
                    ambientLighting += pow(frx_heldLight.rgb * (1.0 + frx_heldLight.a), vec3(2.2)) * heldLightFactor;
               }

               ambientLighting *= vanillaAo;
          }

          totalLighting += directLighting + ambientLighting;
          totalLighting = mix(totalLighting, vec3(frx_luminance(totalLighting)), isWater);

          vec3 color = albedo * mix(totalLighting, vec3(1.0), emission);
          return color;
     }
#endif