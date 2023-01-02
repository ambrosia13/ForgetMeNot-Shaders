#define INCLUDE_CUBEMAPS
#include forgetmenot:shaders/lib/includes.glsl

uniform samplerCube u_cube;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor0;
layout(location = 1) out vec4 fragColor1;
layout(location = 2) out vec4 fragColor2;
layout(location = 3) out vec4 fragColor3;
layout(location = 4) out vec4 fragColor4;
layout(location = 5) out vec4 fragColor5;

void main() {
     vec3 viewDirs[6] = vec3[6] (
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0)
     );

     getCubemapViewDirs(texcoord, viewDirs);

     fragColor0 = textureLod(u_cube, viewDirs[0], frxu_lod - 1);
     fragColor1 = textureLod(u_cube, viewDirs[1], frxu_lod - 1);
     fragColor2 = textureLod(u_cube, viewDirs[2], frxu_lod - 1);
     fragColor3 = textureLod(u_cube, viewDirs[3], frxu_lod - 1);
     fragColor4 = textureLod(u_cube, viewDirs[4], frxu_lod - 1);
     fragColor5 = textureLod(u_cube, viewDirs[5], frxu_lod - 1);
}