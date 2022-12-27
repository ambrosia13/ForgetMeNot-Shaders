#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
     ivec2 pos = ivec2(texcoord * frxu_size) << 1;

     fragColor =                texelFetch(u_color, pos + ivec2(0, 0), max(0, frxu_lod - 1));
     fragColor = min(fragColor, texelFetch(u_color, pos + ivec2(1, 0), max(0, frxu_lod - 1)));
     fragColor = min(fragColor, texelFetch(u_color, pos + ivec2(1, 1), max(0, frxu_lod - 1)));
     fragColor = min(fragColor, texelFetch(u_color, pos + ivec2(0, 1), max(0, frxu_lod - 1)));
}