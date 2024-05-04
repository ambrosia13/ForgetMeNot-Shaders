/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

bool raytrace(in vec3 pos_win, in vec3 dir_ws, in int steps, in sampler2D depths, out vec3 hitPos) {
	const int power_of_two = 2;
	const int last_level = 4;

	float linearDepth = linearizeDepth(pos_win.z);

	pos_win.z -= max(0.0, dir_ws.z * 4.0);
	pos_win.z -= 1.0 / 1000000.0;

	float dir_ws_xy_length = length(dir_ws.xy);
	vec2 dir_xy = dir_ws.xy / dir_ws_xy_length;

	vec3 pos = vec3(pos_win.xy, pos_win.z);

	int level = last_level;
	float upper_depth = texelFetch(depths, ivec2(pos.xy) >> (level*power_of_two), level*power_of_two).r;
	bool hit = false;

	while(true) {
		if (
			steps <= 0 ||
			any(greaterThanEqual(pos.xy, frxu_size)) ||
			any(lessThan(pos.xy, vec2(0.0))) ||
			pos.z <= 0.0
		) {
			break;
		}
		--steps;

		while (level > 0 && pos.z >= upper_depth) {
			--level;
			upper_depth = texelFetch(depths, ivec2(pos.xy) >> (level*power_of_two), level*power_of_two).r;
		}

		if (level == 0 && pos.z >= upper_depth) {
			hit = true;
			break;
		}

		float dist_xy; { // advance, save travelled distance in dist_xy
			int cell_size = 1 << (level * power_of_two); // 1, 4, 16, etc...
			vec2 position_in_cell = mod(pos.xy * sign(dir_xy), cell_size);
			vec2 dists_to_axis = cell_size - position_in_cell;
			vec2 diagonal_dists = dists_to_axis / abs(dir_xy);
			dist_xy = max(min(diagonal_dists.x, diagonal_dists.y), 0.001) * 1.001;
		}

		vec3 advance = dist_xy * vec3(dir_xy, dir_ws.z / dir_ws_xy_length);
		pos += advance;

		if (pos.z >= upper_depth) {
			pos.xy -= advance.xy * (pos.z - upper_depth) / advance.z;
			pos.z = upper_depth;
		}
		else {
			level = last_level;
			upper_depth = texelFetch(depths, ivec2(pos.xy) >> (level*power_of_two), level*power_of_two).r;
		}
	}

	hitPos.xy = pos.xy / frxu_size;
	hitPos.z = mix(upper_depth, pos.z, step(upper_depth, pos.z));

	float depth_d = abs(linearizeDepth(hitPos.z) - linearizeDepth(upper_depth));
	return hit && hitPos.z < 1.0 && depth_d < mix(2.0, 10.0, linearstep(10.0, 40.0, linearDepth));
}