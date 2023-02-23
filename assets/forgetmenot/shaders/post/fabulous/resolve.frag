#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 

uniform sampler2D u_current;
uniform sampler2D u_previous;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	init();

	fragColor = texture(u_current, texcoord);
}