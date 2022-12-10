// --------------------------------------------------------------------------------------------------------
// Credit to Belmu#4066 from the shaderLABS discord channel #snippets - no changes made.
// https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849
// --------------------------------------------------------------------------------------------------------
void contrast(inout vec3 color, float contrast) {
    color = (color - 0.5) * contrast + 0.5;
}
void vibrance(inout vec3 color, float intensity) {
    float mn       = min(color.r, min(color.g, color.b));
    float mx       = max(color.r, max(color.g, color.b));
    float sat      = (1.0 - clamp(mx - mn, 0.0, 1.0)) * clamp(1.0 - mx, 0.0, 1.0) * frx_luminance(color) * 5.0;
    vec3 lightness = vec3((mn + mx) * 0.5);

    // Vibrance
    color = mix(color, mix(lightness, color, intensity), sat);
    // Negative vibrance
    color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Hash without Sine
// MIT License...
/* Copyright (c)2014 David Hoskins.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/

//----------------------------------------------------------------------------------------
//  1 out, 1 in...
float hash11(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

//  1 out, 2 in...
float hash12(vec2 p) {
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

//  1 out, 3 in...
float hash13(vec3 p3) {
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

//  2 out, 2 in...
vec2 hash22(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

//  3 out, 2 in...
vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy+p3.yzz)*p3.zyx);
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// https://github.com/spiralhalo/CanvasTutorial/wiki/Chapter-4
// Utility functions for cascaded shadow maps
// --------------------------------------------------------------------------------------------------------
#ifndef VERTEX_SHADER
    // Helper function
    vec3 shadowDist(int cascade, vec4 pos) {
        vec4 c = frx_shadowCenter(cascade);
        return abs((c.xyz - pos.xyz) / c.w);
    }

    // Function for obtaining the cascade level
    int selectShadowCascade(vec4 shadowViewSpacePos) {
        vec3 d3 = shadowDist(3, shadowViewSpacePos);
        vec3 d2 = shadowDist(2, shadowViewSpacePos);
        vec3 d1 = shadowDist(1, shadowViewSpacePos);

        int cascade = 0;

        if (d3.x < 1.0 && d3.y < 1.0 && d3.z < 1.0) {
            cascade = 3;
        } else if (d2.x < 1.0 && d2.y < 1.0 && d2.z < 1.0) {
            cascade = 2;
        } else if (d1.x < 1.0 && d1.y < 1.0 && d1.z < 1.0) {
            cascade = 1;
        }

        return cascade;
    }
#endif
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// From LowellCamp#8190, better interleaved gradient noise
// --------------------------------------------------------------------------------------------------------
const ivec2 interleave_vec = ivec2(1125928, 97931);
const float interleaved_z = 52.9829189;
const float fixed2float = 1.0 / exp2(24.0);
const int ref_fixed_point = int(exp2(24.0));

float interleaved_gradient(ivec2 seed, int t) {
    ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
    int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
    return fract(float(internal_modulus) * (fixed2float * interleaved_z));
}
#ifndef VERTEX_SHADER
float interleaved_gradient() {
    ivec2 seed = ivec2(gl_FragCoord.xy);
    int t = int(frx_renderFrames % 100u);
    ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
    int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
    return fract(float(internal_modulus) * (fixed2float * interleaved_z));
}

// accepts offset parameter
float interleaved_gradient(int offset) {
    ivec2 seed = ivec2(gl_FragCoord.xy) + offset;
    int t = int(frx_renderFrames % 100u);
    ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
    int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
    return fract(float(internal_modulus) * (fixed2float * interleaved_z));
}
#endif
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// https://www.shadertoy.com/view/ltB3zD
// --------------------------------------------------------------------------------------------------------
float gold_noise(in vec2 xy, in float seed) {
  return fract(tan(distance(xy * 1.61803398874989484820459, xy)*seed)*xy.x);
}
// --------------------------------------------------------------------------------------------------------
