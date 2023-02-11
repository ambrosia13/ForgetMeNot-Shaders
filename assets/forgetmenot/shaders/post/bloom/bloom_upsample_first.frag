#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	fragColor = textureLod(u_color, texcoord, frxu_lod);//frx_sampleTent(u_color, texcoord, 1.0 / frxu_size, frxu_lod);
}