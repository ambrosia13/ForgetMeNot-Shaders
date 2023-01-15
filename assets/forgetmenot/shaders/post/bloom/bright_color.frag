#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_emissive;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	fragColor = texture(u_color, texcoord);
}