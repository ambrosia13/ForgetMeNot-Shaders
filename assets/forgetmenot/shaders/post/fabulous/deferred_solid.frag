#define INCLUDE_SPACES
#define INCLUDE_SKY
#define INCLUDE_IGN
#define INCLUDE_SHADOW
#define INCLUDE_NOISE
#define INCLUDE_CUBEMAPS
#define INCLUDE_PACKING
#define INCLUDE_LIGHTING
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_data;
uniform sampler2D u_depth;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;
uniform sampler2D u_transmittance;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
     init();

     // Sample everything first, use them later to give the GPU time to read the textures
     // packedSampleFloat is sampling an RGB32F image so we put the most distance between the sample and the usage
     vec3 packedSampleFloat = texture(u_data, texcoord).xyz;
     float depth = texture(u_depth, texcoord).r;
     vec3 color = texture(u_color, texcoord).rgb;

     vec3 viewDir = getViewDir();
     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);

     if(isModdedDimension()) {
          color = mix(color, pow(color, vec3(2.2)), floor(depth));
          fragColor = vec4(color, 1.0);
          return;
     }

     float emission = clamp01(frx_luminance(color) - 1.0);

     uvec3 packedSample = floatBitsToUint(packedSampleFloat);
     vec4 unpackedX, unpackedY, unpackedZ;
     unpackedX = unpackUnormArb(packedSample.x, BITS_X);
     unpackedY = unpackUnormArb(packedSample.y, BITS_Y);
     unpackedZ = unpackUnormArb(packedSample.z, BITS_Z);

     vec3 normal = normalize(unpackedX.xyz * 2.0 - 1.0);

     float blockLight = unpackedY.x * unpackedY.x;
     float skyLight = unpackedY.y;
     float vanillaAo = unpackedY.z * unpackedY.z;

     float f0 = unpackedZ.x * unpackedZ.x;
     float roughness = unpackedZ.y * unpackedZ.y;
     float sssAmount = unpackedZ.z;

     float disableDiffuse = step(0.5, unpackedY.w);
     float isWater = step(0.5, unpackedX.w);

     if(f0 > 0.999) {
          fragColor = vec4(color, 1.0);
          return;
     }

     float NdotL = mix(clamp01(dot(normal, frx_skyLightVector)), 1.0, sssAmount);
     
     if(depth < 1.0) {
          color = basicLighting(
               color,
               sceneSpacePos,
               normal,
               blockLight,
               skyLight,
               vanillaAo,
               f0,
               roughness,
               sssAmount,
               isWater,
               u_skybox,
               u_transmittance,
               u_shadow_map,
               u_shadow_tex,
               true,
               8
          );
     } else {
          color = textureLod(u_skybox, viewDir, 0).rgb;
     }

     fragColor = color.rgbb * FMN_MASK.xxxy + FMN_MASK.yyyx;
}