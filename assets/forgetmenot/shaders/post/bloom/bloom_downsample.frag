#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	fragColor = frx_sampleTent(u_color, texcoord, 2.0 / frxu_size, max(0, frxu_lod - 1));
}