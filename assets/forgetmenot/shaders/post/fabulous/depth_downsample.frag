#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    // fragColor = vec4(1.0);
    // for(int i = -1; i <= 1; i++) {
    //     for(int j = -1; j <= 1; j++) {
    //         fragColor = min(fragColor, textureLod(u_depth, texcoord + vec2(i, j) / frxu_size, max(0, frxu_lod - 1)));
    //     }
    // }
    fragColor = textureLod(u_depth, texcoord, max(0, frxu_lod - 1));
}