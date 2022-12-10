// Only include the cloud code if clouds are enabled.
#define INCLUDE_CLOUDS

#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_cumulus_tex;
uniform sampler2D u_cirrus_tex;

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

     vec3[] viewDir = vec3[6](0.0);
     {
          vec3 a = fNormalize(vec3(texcoord - 0.5, 0.5));
          
          viewDir[0] = vec3( a.z, -a.y, -a.x);
          viewDir[1] = vec3(-a.z, -a.y,  a.x);
          viewDir[2] = vec3( a.x,  a.z,  a.y);
          viewDir[3] = vec3( a.x, -a.z, -a.y);
          viewDir[4] = vec3( a.x, -a.y,  a.z);
          viewDir[5] = vec3(-a.x, -a.y, -a.z);
     }

     bool doClouds = false;
     #ifdef CLOUDS
          doClouds = true;
     #endif

     if(doClouds && frx_worldIsOverworld == 1) {
          color_0 = vec4(getClouds(viewDir[0], getSkyColorDetailed(viewDir[0], viewDir[0], 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
          color_1 = vec4(getClouds(viewDir[1], getSkyColorDetailed(viewDir[1], viewDir[1], 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
          color_2 = vec4(getClouds(viewDir[2], getSkyColorDetailed(viewDir[2], viewDir[2], 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
          color_3 = vec4(getSkyColorDetailed(viewDir[3], viewDir[3], 1.0), 1.0); // Clouds never happen when facing downwards
          color_4 = vec4(getClouds(viewDir[4], getSkyColorDetailed(viewDir[4], viewDir[4], 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
          color_5 = vec4(getClouds(viewDir[5], getSkyColorDetailed(viewDir[5], viewDir[5], 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
     } else {
          color_0 = vec4(getSkyColorDetailed(viewDir[0], viewDir[0], 1.0), 1.0);
          color_1 = vec4(getSkyColorDetailed(viewDir[1], viewDir[1], 1.0), 1.0);
          color_2 = vec4(getSkyColorDetailed(viewDir[2], viewDir[2], 1.0), 1.0);
          color_3 = vec4(getSkyColorDetailed(viewDir[3], viewDir[3], 1.0), 1.0);
          color_4 = vec4(getSkyColorDetailed(viewDir[4], viewDir[4], 1.0), 1.0);
          color_5 = vec4(getSkyColorDetailed(viewDir[5], viewDir[5], 1.0), 1.0);
     }
}