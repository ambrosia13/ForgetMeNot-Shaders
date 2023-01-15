#include forgetmenot:shaders/lib/includes.glsl

uniform sampler2D u_depth_mips;

layout(location = 0) out float out_minDepth;

void main() {
	init();
	
	const int power_of_two = 2;
	const int cell_size = 1 << power_of_two;

	float minDepth = 1.0;

	for(int x = 0; x < cell_size; ++x) {
		for(int y = 0; y < cell_size; ++y) {
			ivec2 pos = ivec2(gl_FragCoord.xy) << power_of_two;
			pos += ivec2(x, y);
			minDepth = min(
				minDepth,
				texelFetch(u_depth_mips, pos, frxu_lod - power_of_two).r
			);
		}
	}

	out_minDepth = minDepth;
}