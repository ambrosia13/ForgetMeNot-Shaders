#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	fragColor = textureLod(u_color, texcoord, frxu_lod) * 0.5;//frx_sampleTent(u_color, texcoord, 1.0 / frxu_size, frxu_lod);
}