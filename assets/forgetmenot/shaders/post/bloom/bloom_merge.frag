#include forgetmenot:shaders/lib/inc/header.glsl

uniform sampler2D u_color;
uniform sampler2D u_bloom;

layout(location = 0) out vec4 fragColor;

in vec2 texcoord;

void main() {
	vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
	vec4 bloom = frx_sampleTent(u_bloom, texcoord, 1. / frxu_size, 0) / 6.0;
	//bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));

	float bloomLuminance = pow(frx_luminance(bloom.rgb), 1.0 / 1.5);

	fragColor = mix(color, bloom, 0.2);
}