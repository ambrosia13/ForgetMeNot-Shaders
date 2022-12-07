#include forgetmenot:shaders/lib/includes.glsl 

uniform samplerCube u_cube;

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

     color_0 = textureLod(u_cube, viewDir0, max(0, frxu_lod - 1));
     color_1 = textureLod(u_cube, viewDir1, max(0, frxu_lod - 1));
     color_2 = textureLod(u_cube, viewDir2, max(0, frxu_lod - 1));
     color_3 = textureLod(u_cube, viewDir3, max(0, frxu_lod - 1));
     color_4 = textureLod(u_cube, viewDir4, max(0, frxu_lod - 1));
     color_5 = textureLod(u_cube, viewDir5, max(0, frxu_lod - 1));
}