#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();
	
	vec2 scaledCoord = texcoord * 2.0;

	if(clamp01(scaledCoord) == scaledCoord) fragColor = texture(u_color, scaledCoord);
	else fragColor = vec4(0.0);
}