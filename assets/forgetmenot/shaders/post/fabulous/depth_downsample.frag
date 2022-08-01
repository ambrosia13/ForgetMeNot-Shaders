#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor.r = textureLod(u_depth, texcoord, max(0, frxu_lod - 1)).r;
    fragColor.gba = vec3(0.0, 0.0, 1.0);
}