/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

vec3 cam_dir_to_win(vec3 pos_cs, vec3 dir_cs, mat4 projMat) {
	vec4 p = vec4(pos_cs, 1.);
	vec4 n = vec4(dir_cs, 0.);

	vec4 X = (projMat * (p + n));
	vec4 Y = (projMat * p);

	return normalize(
		vec3(frxu_size, 1.0) *
		((X.xyz / X.w) - (Y.xyz / Y.w))
	);
}

const uint power_of_two = 2u;
const uint last_level = 8u;

uint cell_size(uint level) { return 1u << level; }
float cell_size_f(uint level) { return float(cell_size(level)); }
uint cell_mask(uint level) { return cell_size(level) - 1u; }

float position_in_cell(uint texel, float inner, uint level) {
	return float(texel & cell_mask(level)) + inner;
}

float dist_negative(uint texel, float inner, uint level) {
	return position_in_cell(texel, inner, level);
}

float dist_positive(uint texel, float inner, uint level) {
	return cell_size_f(level) - dist_negative(texel, inner, level);
}

float dist_to_axis(uint texel0, float inner0, uint level, float dir0) {
	return mix(dist_negative(texel0, inner0, level), dist_positive(texel0, inner0, level), step(0.0, dir0));
}

float next_cell(inout uvec2 texel, inout vec2 inner, vec2 dir, uint level) {
	vec2 dists_to_axis = vec2(
		dist_to_axis(texel.x, inner.x, level, dir.x),
		dist_to_axis(texel.y, inner.y, level, dir.y)
	);
	vec2 diagonal_dists = dists_to_axis / abs(dir);

	vec2 dir_signs = sign(dir);

	if(diagonal_dists.x < diagonal_dists.y) {
		texel.x -= texel.x & cell_mask(level);

		if(dir_signs.x > 0.0) {
			texel.x += cell_size(level);
			inner.x = 0.0;
		} else {
			texel.x -= 1u;
			inner.x = 1.0;
		}

		float y = inner.y + dir.y * diagonal_dists.x;
		inner.y = fract(y);
		texel.y += uint(int(floor(y)));
		return diagonal_dists.x;
	} else {
		texel.y -= texel.y & cell_mask(level);

		if(dir_signs.y > 0.0) {
			texel.y += cell_size(level);
			inner.y = 0.0;
		} else {
			texel.y -= 1u;
			inner.y = 1.0;
		}

		float x = inner.x + dir.x * diagonal_dists.y;
		inner.x = fract(x);
		texel.x += uint(int(floor(x)));
		return diagonal_dists.y;
	}
}

bool is_out_of_fb(uvec2 texel, float z) {
	return
		any(greaterThanEqual(texel, uvec2(frxu_size))) ||
		z <= 0.0;
}

bool raytrace(in vec3 pos_win, in vec3 dir_ws, in int steps, in sampler2D depths, out vec3 hitPos) {
	pos_win.z -= max(0.0, dir_ws.z * 4.0);
	pos_win.z -= 1.0 / 1000000.0;

	float dir_ws_xy_length = length(dir_ws.xy);
	vec2 dir_xy = dir_ws.xy / dir_ws_xy_length;

	uvec2 texel = uvec2(pos_win.xy);
	vec2 inner = vec2(fract(pos_win.xy));
	float z = pos_win.z;

	while(true) {
		if(steps == 0 || is_out_of_fb(texel, z)) {
			break;
		}
		--steps;

		uint level = last_level;
		float lower_depth = texelFetch(depths, ivec2(texel >> int(last_level)), int(last_level)).r;

		while(z >= lower_depth && level > 0u) {
			level -= power_of_two;
			lower_depth = texelFetch(depths, ivec2(texel >> int(level)), int(level)).r;
		}

		uvec2 prev_texel = texel;
		vec2 prev_inner = inner;
		float prev_z = z;
		float dist_xy = next_cell(texel, inner, dir_xy, level);
		z += dist_xy * (dir_ws.z / dir_ws_xy_length);

		if(z >= lower_depth) {
			if(level == 0u) {
				hitPos.xy = (vec2(prev_texel) + 0.5) / frxu_size;
				hitPos.z = mix(lower_depth, prev_z, step(lower_depth, prev_z));
				return hitPos.z < 1.0 && abs(linearizeDepth(hitPos.z) - linearizeDepth(lower_depth)) < 1.0;
			}
			float mul = (lower_depth - prev_z) / (z - prev_z);
			dist_xy *= mul;

			vec2 diff = prev_inner + dist_xy * dir_xy;

			inner = fract(diff);
			texel = prev_texel + uvec2(ivec2(floor(diff)));

			z = lower_depth;
		}
	}

	// No intersection found
	return false;
}
