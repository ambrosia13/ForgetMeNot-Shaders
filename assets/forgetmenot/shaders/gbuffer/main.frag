#define INCLUDE_PACKING
#define INCLUDE_NOISE
#define INCLUDE_SEASONS
#define INCLUDE_SKY
#define INCLUDE_IGN
#define INCLUDE_SHADOW
#define INCLUDE_NOISE
#define INCLUDE_CUBEMAPS
#define INCLUDE_GBUFFER

#define INCLUDE_LIGHTING
#include frex:shaders/api/fragment.glsl
#include frex:shaders/api/material.glsl
#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
#include forgetmenot:shaders/lib/includes.glsl

uniform samplerCube u_skybox;
uniform sampler2D u_transmittance;
uniform sampler2D u_glint;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragCompositeData;
layout(location = 2) out vec4 fragData;

bool isInventory;
vec3 gamma;
mat3 tbn;

vec3 lightmap;

void resolveMaterials() {
     isInventory = frx_isGui && !frx_isHand;
     gamma = vec3(isInventory ? 1.0 : 2.2);

     lightmap = vec3(1.0);

     #ifdef SEASONS
          vec3 worldSpacePos = mod(frx_vertex.xyz + frx_cameraPos.xyz, vec3(10000.0));
          worldSpacePos = floor(worldSpacePos * 16.0) / 16.0;

          vec3 rcpVertexColor = 1.0 / frx_vertexColor.rgb;
          frx_fragColor.rgb *= mix(vec3(1.0), rcpVertexColor * getSeasonColor(frx_vertexColor.rgb, fmn_isLeafBlock, worldSpacePos), 0.5 * fmn_isFoliage * step(0.001, distance(frx_vertexColor.rgb, vec3(1.0))));
     
          frx_fragColor.a *= mix(1.0, step(hash13(worldSpacePos), getLeavesFallingThreshold(worldSpacePos)), fmn_isLeafBlock);
     #endif

     // Put color into linear color space
     frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
     
     if(!isInventory) {
          if(isModdedDimension()) {
               lightmap = texture(frxs_lightmap, frx_vertexLight.xy).rgb;
               lightmap *= mix(frx_vertexLight.z, 1.0, frx_matDisableAo);

               lightmap = mix(lightmap, vec3(1.0), frx_fragEmissive);

               lightmap = pow(lightmap, gamma);
          }

          #ifdef ENABLE_BLOOM
               float emissiveBoost = frx_isHand ? EMISSION * 0.25 : EMISSION * 0.5;

               frx_fragColor.rgb *= 1.0 + emissiveBoost * frx_fragEmissive;
               frx_fragColor.rgb += frx_fragColor.rgb * 1.0 * EMISSION * frx_fragEmissive;
          #endif

          // Implement some canvas material conditions
          // frx_matHurt - red flash on hurt entities
          // frx_matFlash - white flash on things like tnt
          frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(1.0, 0.0, 0.0), 0.5 * frx_matHurt); 
          frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(2.0), 0.5 * frx_matFlash); 
     } else {
          frx_fragColor.rgb *= dot(frx_vertexNormal.xyz, fNormalize(vec3(0.2, 0.8, 0.6))) * 0.4 + 0.6;
     }

     if(frx_matGlint == 1) {
          // Not entirely vanilla implementation of enchantment glint
          vec3 glint = texture(u_glint, fract(frx_normalizeMappedUV(frx_texcoord) * 0.5 + frx_renderSeconds * 0.1)).rgb;
          glint = pow(glint, vec3(4.0));
          frx_fragColor.rgb += glint;
     }

     // Fix up lightmap values
     frx_fragLight.xy = smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.xy);
     frx_fragLight.z = mix(frx_fragLight.z, 1.0, frx_matDisableAo);

     #ifdef PBR_ENABLED
          // Convert tangent space frx_fragNormal to world space
          tbn = mat3(
               frx_vertexTangent.xyz, 
               cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
               frx_vertexNormal.xyz
          );

          frx_fragNormal = tbn * frx_fragNormal;
          if(frx_isHand) {
               // Fix hand normals
               frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
          }
     #else
          // safeguard - shouldn't really be necessary
          #define frx_fragNormal frx_vertexNormal
     #endif

     fmn_sssAmount = max(fmn_sssAmount, float(frx_matDisableDiffuse));
}

void frx_pipelineFragment() {
     resolveMaterials();

     vec4 color = frx_fragColor;

     // A non-vanilla dimension is loaded, we don't want to touch lighting.
     //frx_fragRoughness = 0.0001;
     //frx_fragReflectance = 0.5;
     if(isModdedDimension()) {
          color.rgb *= lightmap;
          color.rgb = mix(color.rgb, pow(frx_fogColor.rgb, gamma), frx_smootherstep(frx_fogStart, frx_fogEnd, length(frx_vertex.xyz)));
     } else if((!frx_renderTargetSolid || frx_isHand)) {
          // Non-solid lighting, in vanilla dimensions only.
          color.rgb = basicLighting(
               color.rgb,
               frx_vertex.xyz,
               frx_fragNormal,
               frx_fragLight.x,
               frx_fragLight.y,
               frx_fragLight.z,
               pow2(frx_fragReflectance),
               pow2(frx_fragRoughness),
               fmn_sssAmount,
               float(fmn_isWater),
               u_skybox,
               u_transmittance,
               frxs_shadowMap,
               frxs_shadowMapTexture,
               false,
               4
          );
     }

     vec4 dataX = vec4(clamp01(frx_fragNormal.xyz * 0.5 + 0.5), clamp(float(fmn_isWater), 0.02, 0.6));
     uint packedX = packUnormArb(dataX, BITS_X);

     vec4 dataY = vec4(frx_fragLight.xy, mix(frx_fragLight.z, 1.0, frx_matDisableAo), 0.0);
     uint packedY = packUnormArb(dataY, BITS_Y);

     vec4 dataZ = vec4(frx_fragReflectance, frx_fragRoughness, fmn_sssAmount, 1.0);
     uint packedZ = packUnormArb(dataZ, BITS_Z);

     vec3 packedFinal = uintBitsToFloat(uvec3(packedX, packedY, packedZ));

     if(color.a < 0.0001) discard;
     color = max(color, vec4(0.0005));

     fragColor = color;
     fragCompositeData = vec4(packedFinal, 1.0);
     fragData = vec4(packedFinal, 1.0);
     gl_FragDepth = gl_FragCoord.z;
}