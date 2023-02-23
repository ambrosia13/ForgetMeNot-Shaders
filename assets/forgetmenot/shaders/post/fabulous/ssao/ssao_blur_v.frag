#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/post/fabulous/ssao/ssao_common/depth_aware_blur.glsl

uniform sampler2D u_ssao;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	init();

	fragColor = depthAwareBlur(u_ssao, u_depth, texcoord, vec2(1.0, 0.0));
}