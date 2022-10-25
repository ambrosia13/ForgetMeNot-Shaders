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
    
    return fNormalize(r) * 2.0 - 1.0;
}
vec3 getBlueNoise(float offset) {
    ivec2 coord = ivec2(rotate2D(texcoord, offset) * frxu_size + frx_renderFrames * 100u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return fNormalize(r) * 2.0 - 1.0;
}

void main() {
     vec3 ambientLight = vec3(0.0);
     float noHit = 1.0;
     vec2 coordJittered = ((texcoord * 2.0 - 1.0) + taaOffsets[frx_renderFrames % 8u] / (frxu_size)) * 0.5 + 0.5;

     float depth = textureLod(u_depth_mipmaps, coordJittered, 0).r;
     vec3 normal = frx_normalModelMatrix * fNormalize(texture(u_normal, coordJittered).rgb * 2.0 - 1.0);
     vec3 lightmap = texture(u_lightmap, texcoord).rgb;

     #define RTAO
     #ifdef RTAO
          const int RTAO_RAYS = 1;

          vec3 rayPos = setupViewSpacePos(coordJittered, depth);
          vec3 rayScreen = vec3(coordJittered, depth);

          vec3 rayDir = fNormalize(normal + goldNoise3d());
          vec3 rayWorldDir = fNormalize(normal * frx_normalModelMatrix + goldNoise3d());
          vec3 rayScreenDir = fNormalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

          float stepLength = 0.005;

          vec3 bn = getBlueNoise(frx_renderFrames & 50u);


          if(depth < 1.0 && (rayPos + rayDir).z < 0.0) {
               for(int i = 0; i < RTAO_STEPS; i++) {
                    stepLength = min(stepLength, 0.1);

                    rayScreen += rayScreenDir * stepLength * (bn.r * 0.5 + 0.5);

                    if(clamp01(rayScreen) != rayScreen) {
                         break;
                    } else {
                         float depthQuery = textureLod(u_depth_mipmaps, rayScreen.xy, 0).r;

                         if(rayScreen.z > depthQuery && abs(linearizeDepth(rayScreen.z) - linearizeDepth(depthQuery)) < 0.001) {
                              noHit *= 0.0;
                              break;
                         }
                    }

                    stepLength *= 2.0;
               }
          }
          //noHit = 1.0 - clamp01(((RTAO_STEPS + 1) / RTAO_STEPS) * (1.0 - noHit));
     #else
          vec3 random3D = goldNoise3d();
          vec3 tangent = fNormalize(random3D - normal * dot(random3D, normal));
          vec3 bitangent = cross(normal, tangent);
          mat3 tbn = mat3(tangent, bitangent, normal);

          vec3 scenePos = setupSceneSpacePos(texcoord, depth);

          float occlusion = 0.0;
          for(int i = 0; i < 10; i++) {
               vec3 samplePos = tbn * goldNoise3d(i);
               samplePos = scenePos + samplePos * 0.5;

               vec3 screenPos = sceneSpaceToScreenSpace(samplePos);
               occlusion += float(screenPos.z > texture(u_depth_mipmaps, screenPos.xy).r);
          }

          noHit = 1.0 - occlusion;
     #endif



     ambientLight += mix(vec3(0.01), getSkyColor(rayWorldDir, 0.0), lightmap.g) * noHit;

     vec3 viewPos = setupSceneSpacePos(coordJittered, depth);
     vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
     vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(viewPos + positionDifference);
     
     vec3 previousColor = texture(u_history, lastScreenPos.xy).rgb;

     if(clamp01(lastScreenPos.xy) == lastScreenPos.xy)
     //ambientLight = mix(ambientLight, normalAwareBlur(u_history, lastScreenPos.xy, 2.0, 3, u_normal).rgb, taaBlendFactor(texcoord, lastScreenPos.xy));
     ambientLight = mix(ambientLight, previousColor, 0.0);

     fragColor = vec4(ambientLight, noHit);
}