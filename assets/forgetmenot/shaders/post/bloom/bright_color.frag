#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;
uniform sampler2D u_emissive;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	init();

	fragColor = texture(u_color, texcoord);
}