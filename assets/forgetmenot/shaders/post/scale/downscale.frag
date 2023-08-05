#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/post/scale/scale.glsl

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();
	
	vec2 clip = texcoord * frxu_size;
	vec2 unjittered = clip - getTaaOffset(frx_renderFrames) / frxu_size;

	vec2 scaledCoord = (unjittered / frxu_size) / RESOLUTION;
	scaledCoord += jitter();

	if(clamp01(scaledCoord) == scaledCoord) fragColor = vec4(texture(u_color, scaledCoord).rgb, 1.0);
	else fragColor = vec4(0.0);
}