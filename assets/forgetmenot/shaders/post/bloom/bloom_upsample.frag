#include forgetmenot:shaders/lib/inc/header.glsl 

uniform sampler2D u_prior;
uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	vec4 current = textureLod(u_color, texcoord, frxu_lod);

	if(frxu_lod < 1) {
		current.rgb *= 2.0;
	}

	fragColor = frx_sampleTent(u_prior, texcoord, 2.0 / frxu_size, frxu_lod + 1) + current;
}