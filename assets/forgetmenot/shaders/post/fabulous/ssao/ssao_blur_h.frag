#define INCLUDE_SPACES
#include forgetmenot:shaders/lib/includes.glsl
#include forgetmenot:shaders/post/fabulous/ssao/ssao_common/depth_aware_blur.glsl

uniform sampler2D u_ssao;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	fragColor = depthAwareBlur(u_ssao, u_depth, texcoord, vec2(0.0, 1.0));
}