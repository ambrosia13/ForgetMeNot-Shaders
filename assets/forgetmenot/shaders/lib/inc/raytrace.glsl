/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

bool raytrace(inout vec3 pos, vec3 dir, int steps, sampler2D depths, out float depth) {
	const int power_of_two = 2;
	const int last_level = 4;

	vec2 dir_xy = dir.xy / length(dir.xy);

	int level = last_level;

	while(true) {
		if (
			steps <= 0
			|| any(greaterThanEqual(pos.xy, frxu_size))
			|| any(lessThan(pos.xy, vec2(0.0)))
			|| pos.z <= 0.0
		) {
			return false;
		}
		--steps;

		while (true) {
			depth = texelFetch(depths, ivec2(pos.xy) >> (level*power_of_two), level*power_of_two).r;
			if (pos.z >= depth) {
				if (level == 0) {
					return true;
				}
				--level;
			}
			else {
				break;
			}
		}

		vec3 advance; {
			int cell_size = 1 << (level * power_of_two); // 1, 4, 16, etc...
			vec2 position_in_cell = mod(pos.xy * sign(dir_xy), cell_size);
			vec2 dists_to_axis = cell_size - position_in_cell;
			vec2 diagonal_dists = dists_to_axis / abs(dir_xy);
			float dist_xy = max(min(diagonal_dists.x, diagonal_dists.y), 0.001) * 1.001;
			advance = dist_xy * vec3(dir_xy, dir.z / length(dir.xy));
		}

		pos += advance;

		if (pos.z >= depth) { // we hit the depth while advancing
			pos.xy -= advance.xy * (pos.z - depth) / advance.z; // go back
			pos.z = depth;
			if (level == 0) {
				return true;
			}
			--level;
		}
		else {
			level = last_level;
		}
	}
}