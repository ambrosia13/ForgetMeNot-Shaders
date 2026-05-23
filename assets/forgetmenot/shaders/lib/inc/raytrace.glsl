/*
#include forgetmenot:shaders/lib/inc/raytrace.glsl

Contains the raytracer from lomo, provided by fewizz.
*/

bool raytrace(inout vec3 pos, vec3 dir, int steps, sampler2D depths, out float depth) {
    const int last_level = 8;
    const int level_step = 2;

    int level = 0;

    while (
        steps-- > 0
        && all(lessThan(pos.xy, frxu_size))
        && all(greaterThanEqual(pos.xy, vec2(0.0)))
        && pos.z > 0.0
    ) {
        depth = texelFetch(depths, ivec2(pos.xy) >> level, level).r;

        vec3 advance; {
            int cell_size = 1 << level; // 1, 4, 16, etc...
            vec2 position_in_cell = mod(pos.xy * sign(dir.xy), cell_size);
            vec2 dists_to_axis = cell_size - position_in_cell;
            vec2 diagonal_dists = dists_to_axis / abs(dir.xy);
            float dist = min(diagonal_dists.x, diagonal_dists.y);
            advance = max(dist, 0.01) * 1.01 * dir;
        }

        if (pos.z + advance.z >= depth) {
            pos += advance * max((depth - pos.z) / advance.z, 0.0); // go back
            if (level > 0) {
                level -= level_step;
            }
            else {
                return true;
            }
        }
        else {
            pos += advance;
            if (level < last_level) {
                level += level_step;
            }
        }
    }

    return false;
}
