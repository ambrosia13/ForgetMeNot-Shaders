#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	fragColor = textureLod(u_color, texcoord, max(0, frxu_lod - 1));
}