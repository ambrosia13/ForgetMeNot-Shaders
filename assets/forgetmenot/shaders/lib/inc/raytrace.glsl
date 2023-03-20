/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

const uint power_of_two = 2u;
const uint last_level = 8u;

float next_cell(inout uvec2 texel, inout vec2 inner, vec2 dir, uint level) {
	uint cell_size = 1u << level;
	vec2 distance_in_cell = (texel & (cell_size - 1u)) + inner;

	vec2 dists_to_axis = cell_size - distance_in_cell;
	vec2 diagonal_dists = dists_to_axis / dir;

	if(diagonal_dists.x < diagonal_dists.y) {
		texel.x = ((texel.x >> level) + 1u) << level;
		inner.x = 0.0;

		float y = inner.y + dir.y * diagonal_dists.x;
		uint uy = uint(y);
		inner.y = y - uy;
		texel.y += uy;

		return diagonal_dists.x;
	} else {
		texel.y = ((texel.y >> level) + 1u) << level;
		inner.y = 0.0;

		float x = inner.x + dir.x * diagonal_dists.y;
		uint ux = uint(x);
		inner.x = x - ux;
		texel.x += ux;

		return diagonal_dists.y;
	}
}

bool raytrace(in vec3 pos_win, in vec3 dir_ws, in int steps, in sampler2D depths, out vec3 hitPos) {
	float linearDepth = linearizeDepth(pos_win.z);

	pos_win.z -= max(0.0, dir_ws.z * 4.0);
	pos_win.z -= 1.0 / 1000000.0;

	float dir_ws_xy_length = length(dir_ws.xy);
	vec2 dir_xy = dir_ws.xy / dir_ws_xy_length;
	vec2 sgn_xy = sign(dir_xy);
	vec2 dir_xy_abs = dir_xy * sgn_xy;
	ivec2 isgn_xy = ivec2(sgn_xy);

	uvec2 texel = uvec2(ivec2(pos_win.xy * sgn_xy));
	vec2 inner = fract(pos_win.xy * sgn_xy);
	float z = pos_win.z;

	while(
		steps > 0 &&
		all(lessThan(uvec2(ivec2(texel) * isgn_xy), frxu_size)) &&
		z > 0.0
	) {
		--steps;

		uint level = last_level;
		ivec2 itexel = ivec2(texel) * isgn_xy;
		float lower_depth = texelFetch(depths, itexel >> last_level, int(last_level)).r;

		while(z >= lower_depth && level > 0u) {
			level -= power_of_two;
			lower_depth = texelFetch(depths, itexel >> level, int(level)).r;
		}

		uvec2 prev_texel = texel;
		vec2 prev_inner = inner;
		float prev_z = z;
		float dist_xy = next_cell(texel, inner, dir_xy_abs, level);
		z += dist_xy * (dir_ws.z / dir_ws_xy_length);

		if(z >= lower_depth) {
			if(level == 0u) {
				hitPos.xy = (vec2(ivec2(prev_texel) * isgn_xy) + 0.5) / frxu_size;
				hitPos.z = mix(lower_depth, prev_z, step(lower_depth, prev_z));

				return hitPos.z < 1.0 && abs(linearizeDepth(hitPos.z) - linearizeDepth(lower_depth)) < mix(2.0, 10.0, linearstep(10.0, 40.0, linearDepth));
			}

			float mul = (lower_depth - prev_z) / (z - prev_z);
			dist_xy *= mul;

			vec2 diff = prev_inner + dist_xy * dir_xy_abs;
			uvec2 udiff = uvec2(diff);
			inner = diff - udiff;
			texel = prev_texel + udiff;

			z = lower_depth;
		}
	}

	// No intersection found
	return false;
}
