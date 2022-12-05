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

void main() {
     vec3[] BITANGENT_VECS = vec3[] (
          cross(FORWARD_VECS[0], UP_VECS[0]),
          cross(FORWARD_VECS[1], UP_VECS[1]),
          cross(FORWARD_VECS[2], UP_VECS[2]),
          cross(FORWARD_VECS[3], UP_VECS[3]),
          cross(FORWARD_VECS[4], UP_VECS[4]),
          cross(FORWARD_VECS[5], UP_VECS[5])
     );

     // Credit to Bálint for helping a lot with the math involved here
     // Find their work @ https://balintcsala.com/
     vec3 viewDir0 = normalize(FORWARD_VECS[0] - UP_VECS[0] * (texcoord.y * 2.0 - 1.0) - BITANGENT_VECS[0] * (texcoord.x * 2.0 - 1.0));
     vec3 viewDir1 = normalize(FORWARD_VECS[1] - UP_VECS[1] * (texcoord.y * 2.0 - 1.0) - BITANGENT_VECS[1] * (texcoord.x * 2.0 - 1.0));
     vec3 viewDir2 = normalize(FORWARD_VECS[2] + UP_VECS[2] * (texcoord.y * 2.0 - 1.0) + BITANGENT_VECS[2] * (texcoord.x * 2.0 - 1.0));
     vec3 viewDir3 = normalize(FORWARD_VECS[3] + UP_VECS[3] * (texcoord.y * 2.0 - 1.0) + BITANGENT_VECS[3] * (texcoord.x * 2.0 - 1.0));
     vec3 viewDir4 = normalize(FORWARD_VECS[4] - UP_VECS[4] * (texcoord.y * 2.0 - 1.0) - BITANGENT_VECS[4] * (texcoord.x * 2.0 - 1.0));
     vec3 viewDir5 = normalize(FORWARD_VECS[5] - UP_VECS[5] * (texcoord.y * 2.0 - 1.0) - BITANGENT_VECS[5] * (texcoord.x * 2.0 - 1.0));

     color_0 = texture(u_cube, viewDir0);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
     color_1 = texture(u_cube, viewDir1);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
     color_2 = texture(u_cube, viewDir2);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
     color_3 = texture(u_cube, viewDir3);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
     color_4 = texture(u_cube, viewDir4);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
     color_5 = texture(u_cube, viewDir5);//frx_sampleTent(u_cube, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
}