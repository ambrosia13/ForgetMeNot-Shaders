#include forgetmenot:shaders/lib/inc/header.glsl

uniform sampler2D u_exposure;

uniform mat4 frxu_frameProjectionMatrix;

out vec2 texcoord;
out float exposure;

void main() {
	vec2 screen = (frxu_frameProjectionMatrix * vec4(in_vertex.xy * frxu_size, 0.0, 1.0)).xy;

	gl_Position = vec4(screen, 0.2, 1.0);
	texcoord = in_uv;

	#ifdef ENABLE_BLOOM
		exposure = texelFetch(u_exposure, ivec2(0), 0).r;
	#else
		exposure = 1.0;
	#endif
}