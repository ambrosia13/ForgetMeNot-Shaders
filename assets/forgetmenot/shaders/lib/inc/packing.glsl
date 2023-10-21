/*
#include forgetmenot:shaders/lib/inc/packing.glsl

Contains functions provided by sixthsurge#3922 for uint encoding.
*/

const uint[6] BITS_X = uint[6] (8u, 8u, 8u, 6u, 1u, 1u);
const uint[5] BITS_Y = uint[5] (8u, 8u, 8u, 5u, 3u);
const uint[3] BITS_Z = uint[3] (11u, 11u, 10u);

// Pack 4 unsigned normalized numbers into a uint32_t with arbitrary precision per channel

uint packUnormArb(vec4 data, const uvec4 bits) {
	vec4 mul = vec4(uvec4(1u) << bits) - 1.0;

	uvec4 shift = uvec4(0, bits.x, bits.x + bits.y, bits.x + bits.y + bits.z);
	uvec4 shifted = uvec4(data * mul + 0.5) << shift;

	return shifted.x | shifted.y | shifted.z | shifted.w;
}

vec4 unpackUnormArb(uint pack, const uvec4 bits) {
	uvec4 maxValue = (uvec4(1u) << bits) - 1u;

	uvec4 shift = uvec4(0u, bits.x, bits.x + bits.y, bits.x + bits.y + bits.z);
	uvec4 unshifted = uvec4(pack) >> shift;
	unshifted = unshifted & maxValue;

	return vec4(unshifted) / vec4(maxValue);
}

uint packUnormArb3Elements(float[3] data, uint[3] bits) {
	float[3] mul;

	for(int i = 0; i < 3; i++) {
		mul[i] = float(1u << bits[i]) - 1.0;
	}

	uint[3] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 3; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[3] shifted;

	for(int i = 0; i < 3; i++) {
		shifted[i] = uint(data[i] * mul[i] + 0.5) << shift[i];
	}

	uint result = 0u;

	for(int i = 0; i < 3; i++) {
		result = result | shifted[i];
	}

	return result;
}
float[3] unpackUnormArb3Elements(uint pack, uint[3] bits) {
	uint[3] maxValue;

	for(int i = 0; i < 3; i++) {
		maxValue[i] = (1u << bits[i]) - 1u;
	}

	uint[3] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 3; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[3] unshifted;

	for(int i = 0; i < 3; i++) {
		unshifted[i] = pack >> shift[i];
		unshifted[i] = unshifted[i] & maxValue[i];
	}

	float[3] result;

	for(int i = 0; i < 3; i++) {
		result[i] = float(unshifted[i]) / float(maxValue[i]);
	}

	return result;
}

uint packUnormArb5Elements(float[5] data, uint[5] bits) {
	float[5] mul;

	for(int i = 0; i < 5; i++) {
		mul[i] = float(1u << bits[i]) - 1.0;
	}

	uint[5] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 5; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[5] shifted;

	for(int i = 0; i < 5; i++) {
		shifted[i] = uint(data[i] * mul[i] + 0.5) << shift[i];
	}

	uint result = 0u;

	for(int i = 0; i < 5; i++) {
		result = result | shifted[i];
	}

	return result;
}
float[5] unpackUnormArb5Elements(uint pack, uint[5] bits) {
	uint[5] maxValue;

	for(int i = 0; i < 5; i++) {
		maxValue[i] = (1u << bits[i]) - 1u;
	}

	uint[5] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 5; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[5] unshifted;

	for(int i = 0; i < 5; i++) {
		unshifted[i] = pack >> shift[i];
		unshifted[i] = unshifted[i] & maxValue[i];
	}

	float[5] result;

	for(int i = 0; i < 5; i++) {
		result[i] = float(unshifted[i]) / float(maxValue[i]);
	}

	return result;
}

uint packUnormArb6Elements(float[6] data, uint[6] bits) {
	float[6] mul;

	for(int i = 0; i < 6; i++) {
		mul[i] = float(1u << bits[i]) - 1.0;
	}

	uint[6] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 6; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[6] shifted;

	for(int i = 0; i < 6; i++) {
		shifted[i] = uint(data[i] * mul[i] + 0.5) << shift[i];
	}

	uint result = 0u;

	for(int i = 0; i < 6; i++) {
		result = result | shifted[i];
	}

	return result;
}
float[6] unpackUnormArb6Elements(uint pack, uint[6] bits) {
	uint[6] maxValue;

	for(int i = 0; i < 6; i++) {
		maxValue[i] = (1u << bits[i]) - 1u;
	}

	uint[6] shift;
	uint currentSum = 0u;

	for(int i = 0; i < 6; i++) {
		shift[i] = currentSum;
		currentSum += bits[i];
	}

	uint[6] unshifted;

	for(int i = 0; i < 6; i++) {
		unshifted[i] = pack >> shift[i];
		unshifted[i] = unshifted[i] & maxValue[i];
	}

	float[6] result;

	for(int i = 0; i < 6; i++) {
		result[i] = float(unshifted[i]) / float(maxValue[i]);
	}

	return result;
}
