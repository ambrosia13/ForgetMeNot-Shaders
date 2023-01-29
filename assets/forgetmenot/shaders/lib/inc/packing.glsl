/*
#include forgetmenot:shaders/lib/inc/packing.glsl

Contains functions provided by sixthsurge#3922 for uint encoding.
*/

const uvec4 BITS_X = uvec4(10u, 10u, 10u, 2u);
const uvec4 BITS_Y = uvec4(10u, 10u, 10u, 2u);
const uvec4 BITS_Z = uvec4(14u, 12u, 4u, 2u);

// Pack 4 unsigned normalized numbers into a uint32_t with arbitrary precision per channel

uint packUnormArb(vec4 data, const uvec4 bits) {
	vec4 mul = exp2(vec4(bits)) - 1.0;

	uvec4 shift = uvec4(0, bits.x, bits.x + bits.y, bits.x + bits.y + bits.z);
	uvec4 shifted = uvec4(data * mul + 0.5) << shift;

	return shifted.x | shifted.y | shifted.z | shifted.w;
}

vec4 unpackUnormArb(uint pack, const uvec4 bits) {
	uvec4 maxValue  = uvec4(exp2(vec4(bits)) - 1);
	uvec4 shift	= uvec4(0, bits.x, bits.x + bits.y, bits.x + bits.y + bits.z);
	uvec4 unshifted = uvec4(pack) >> shift;
	unshifted = unshifted & maxValue;

	return vec4(unshifted) / vec4(maxValue);
}
