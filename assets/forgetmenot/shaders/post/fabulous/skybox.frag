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

void main() {
     if((frx_cameraPos.y < 50 && frx_smoothedEyeBrightness.y == 0) || ((frx_renderFrames & 8u) != 0u)) {
          discard;
     }

     vec3 a = fNormalize(vec3(texcoord - 0.5, 0.5));
     
     vec3 viewDir0 = vec3( a.z, -a.y, -a.x);
     vec3 viewDir1 = vec3(-a.z, -a.y,  a.x);
     vec3 viewDir2 = vec3( a.x,  a.z,  a.y);
     vec3 viewDir3 = vec3( a.x, -a.z, -a.y);
     vec3 viewDir4 = vec3( a.x, -a.y,  a.z);
     vec3 viewDir5 = vec3(-a.x, -a.y, -a.z);

     bool doClouds = false;
     #ifdef CLOUDS
          doClouds = true;
     #endif

     if(frx_worldIsOverworld == 1 && doClouds) {
          #ifdef CLOUDS
               color_0 = vec4(getClouds(viewDir0, getSkyColorDetailed(viewDir0, viewDir0, 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
               color_1 = vec4(getClouds(viewDir1, getSkyColorDetailed(viewDir1, viewDir1, 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
               color_2 = vec4(getClouds(viewDir2, getSkyColorDetailed(viewDir2, viewDir2, 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
               color_3 = vec4(getSkyColorDetailed(viewDir3, viewDir3, 1.0), 1.0); // Clouds never happen when facing downwards
               color_4 = vec4(getClouds(viewDir4, getSkyColorDetailed(viewDir4, viewDir4, 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
               color_5 = vec4(getClouds(viewDir5, getSkyColorDetailed(viewDir5, viewDir5, 1.0), u_cumulus_tex, u_cirrus_tex), 1.0);
          #else
               color_0 = vec4(getSkyColorDetailed(viewDir0, viewDir0, 1.0), 1.0);
               color_1 = vec4(getSkyColorDetailed(viewDir1, viewDir1, 1.0), 1.0);
               color_2 = vec4(getSkyColorDetailed(viewDir2, viewDir2, 1.0), 1.0);
               color_3 = vec4(getSkyColorDetailed(viewDir3, viewDir3, 1.0), 1.0);
               color_4 = vec4(getSkyColorDetailed(viewDir4, viewDir4, 1.0), 1.0);
               color_5 = vec4(getSkyColorDetailed(viewDir5, viewDir5, 1.0), 1.0);
          #endif
     } else {
          color_0 = vec4(getSkyColorDetailed(viewDir0, viewDir0, 1.0), 1.0);
          color_1 = vec4(getSkyColorDetailed(viewDir1, viewDir1, 1.0), 1.0);
          color_2 = vec4(getSkyColorDetailed(viewDir2, viewDir2, 1.0), 1.0);
          color_3 = vec4(getSkyColorDetailed(viewDir3, viewDir3, 1.0), 1.0);
          color_4 = vec4(getSkyColorDetailed(viewDir4, viewDir4, 1.0), 1.0);
          color_5 = vec4(getSkyColorDetailed(viewDir5, viewDir5, 1.0), 1.0);
     }

}