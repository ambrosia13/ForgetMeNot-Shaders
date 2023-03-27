/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

bool raytrace(in vec3 pos_win, in vec3 dir_ws, in int steps, in sampler2D depths, out vec3 hitPos) {
	const uint power_of_two = 2u;
	const uint last_level = 8u;

	float linearDepth = linearizeDepth(pos_win.z);

	pos_win.z -= max(0.0, dir_ws.z * 4.0);
	pos_win.z -= 1.0 / 1000000.0;

	float dir_ws_xy_length = length(dir_ws.xy);
	vec2 dir_xy = dir_ws.xy / dir_ws_xy_length;
	vec2 sgn_xy = sign(dir_xy);
	dir_xy *= sgn_xy;
	ivec2 isgn_xy = ivec2(sgn_xy);

	uvec2 texel = uvec2(ivec2(pos_win.xy * sgn_xy));
	vec2 inner = fract(pos_win.xy * sgn_xy);
	float z = pos_win.z;

	while(
		steps > 0 &&
		all(lessThan(ivec2(texel) * isgn_xy, frxu_size)) &&
		z > 0.0
	) {
		--steps;

		uint level = last_level;
		ivec2 itexel = ivec2(texel) * isgn_xy;
		float upper_depth = texelFetch(depths, itexel >> last_level, int(last_level)).r;

		while(z >= upper_depth && level > 0u) {
			level -= power_of_two;
			upper_depth = texelFetch(depths, itexel >> level, int(level)).r;
		}
		// position before advance
		uvec2 prev_texel = texel;
		vec2 prev_inner = inner;
		float prev_z = z;

		float dist_xy; { // advance, save travelled distance in dist_xy
			uint cell_size = 1u << level; // 1, 4, 16, etc...
			vec2 position_in_cell = (texel & (cell_size - 1u)) + inner;

			vec2 dists_to_axis = cell_size - position_in_cell;
			vec2 diagonal_dists = dists_to_axis / dir_xy;

			uint closest_dim = diagonal_dists.x < diagonal_dists.y ? 0u : 1u;
			dist_xy = diagonal_dists[closest_dim];

			texel[closest_dim] = ((texel[closest_dim] >> level) + 1u) << level;
			inner[closest_dim] = 0.0;

			uint farther_dim = 1u - closest_dim;
			float farther_dist = inner[farther_dim] + dir_xy[farther_dim] * dist_xy;
			uint ufarther_dist = uint(farther_dist);

			texel[farther_dim] += ufarther_dist;
			inner[farther_dim] = farther_dist - ufarther_dist;
		}
		// z addition = dir.z per len(dir.xy) * distance
		z += dist_xy * (dir_ws.z / dir_ws_xy_length);
		// we didn't hit upper depth yet, continue advancing
		if(z < upper_depth) continue;

		if(level == 0u) {
			hitPos.xy = (vec2(ivec2(prev_texel) * isgn_xy) + 0.5) / frxu_size;
			hitPos.z = mix(upper_depth, prev_z, step(upper_depth, prev_z));

			float depth_d = abs(linearizeDepth(hitPos.z) - linearizeDepth(upper_depth));
			return hitPos.z < 1.0 && depth_d < mix(2.0, 10.0, linearstep(10.0, 40.0, linearDepth));
		}
		// restore position to hit point
		dist_xy *= (upper_depth - prev_z) / (z - prev_z);

		vec2 diff = prev_inner + dist_xy * dir_xy;
		uvec2 udiff = uvec2(diff);
		inner = diff - udiff;
		texel = prev_texel + udiff;

		z = upper_depth;
	}

	// No intersection found
	return false;
}
