// Only include the cloud code if clouds are enabled.
#define INCLUDE_CLOUDS

#include forgetmenot:shaders/lib/includes.glsl 

in vec2 texcoord;

layout(location = 0) out vec4 color_0;
layout(location = 1) out vec4 color_1;
layout(location = 2) out vec4 color_2;
layout(location = 3) out vec4 color_3;
layout(location = 4) out vec4 color_4;
layout(location = 5) out vec4 color_5;

const vec3[] UP_VECS = vec3[] (
     vec3(0, 1, 0),
     vec3(0, 1, 0),
     vec3(0, 0, 1),
     vec3(0, 0, -1),
     vec3(0, 1, 0),
     vec3(0, 1, 0)
);
const vec3[] FORWARD_VECS = vec3[] (
     vec3(1, 0, 0),
     vec3(-1, 0, 0),
     vec3(0, 1, 0),
     vec3(0, -1, 0),
     vec3(0, 0, 1),
     vec3(0, 0, -1)
);
const vec3[] BITANGENT_VECS = vec3[] (
     vec3(0, 0, 1),
     vec3(0, 0, -1),
     vec3(1, 0, 0),
     vec3(1, 0, 0),
     vec3(-1, 0, 0),
     vec3(1, 0, 0)
);

void main() {
     if((frx_cameraPos.y < 50 && frx_smoothedEyeBrightness.y == 0) || ((frx_renderFrames & 8u) != 0u)) {
          discard;
     }

     float clipX = texcoord.x * 2.0 - 1.0;
     float clipY = texcoord.y * 2.0 - 1.0;

     // Credit to Bálint for helping a lot with the math involved here
     // Find their work @ https://balintcsala.com/
     vec3 viewDir0 = fNormalize(FORWARD_VECS[0] - UP_VECS[0] * clipY - BITANGENT_VECS[0] * clipX);
     vec3 viewDir1 = fNormalize(FORWARD_VECS[1] - UP_VECS[1] * clipY - BITANGENT_VECS[1] * clipX);
     vec3 viewDir2 = fNormalize(FORWARD_VECS[2] + UP_VECS[2] * clipY + BITANGENT_VECS[2] * clipX);
     vec3 viewDir3 = fNormalize(FORWARD_VECS[3] + UP_VECS[3] * clipY + BITANGENT_VECS[3] * clipX);
     vec3 viewDir4 = fNormalize(FORWARD_VECS[4] - UP_VECS[4] * clipY - BITANGENT_VECS[4] * clipX);
     vec3 viewDir5 = fNormalize(FORWARD_VECS[5] - UP_VECS[5] * clipY - BITANGENT_VECS[5] * clipX);

     #ifdef CLOUDS
          color_0 = vec4(getClouds(viewDir0, getSkyColorDetailed(viewDir0, viewDir0, 1.0)), 1.0);
          color_1 = vec4(getClouds(viewDir1, getSkyColorDetailed(viewDir1, viewDir1, 1.0)), 1.0);
          color_2 = vec4(getClouds(viewDir2, getSkyColorDetailed(viewDir2, viewDir2, 1.0)), 1.0);
          color_3 = vec4(getSkyColorDetailed(viewDir3, viewDir3, 1.0), 1.0); // Clouds never happen when facing downwards
          color_4 = vec4(getClouds(viewDir4, getSkyColorDetailed(viewDir4, viewDir4, 1.0)), 1.0);
          color_5 = vec4(getClouds(viewDir5, getSkyColorDetailed(viewDir5, viewDir5, 1.0)), 1.0);
     #else
          color_0 = vec4(getSkyColorDetailed(viewDir0, viewDir0, 1.0), 1.0);
          color_1 = vec4(getSkyColorDetailed(viewDir1, viewDir1, 1.0), 1.0);
          color_2 = vec4(getSkyColorDetailed(viewDir2, viewDir2, 1.0), 1.0);
          color_3 = vec4(getSkyColorDetailed(viewDir3, viewDir3, 1.0), 1.0);
          color_4 = vec4(getSkyColorDetailed(viewDir4, viewDir4, 1.0), 1.0);
          color_5 = vec4(getSkyColorDetailed(viewDir5, viewDir5, 1.0), 1.0);
     #endif

}