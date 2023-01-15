// --------------------------------------------------------------------------------------------------------
// External functions.
// --------------------------------------------------------------------------------------------------------

#ifdef INCLUDE_IGN
	// --------------------------------------------------------------------------------------------------------
	// Interleaved Gradient Noise with better precision
	// From LowellCamp#8190
	// Slightly modified
	// --------------------------------------------------------------------------------------------------------
	#ifdef FRAGMENT_SHADER
		const ivec2 interleave_vec = ivec2(1125928, 97931);
		const float interleaved_z = 52.9829189;
		const float fixed2float = 1.0 / exp2(24.0);
		const int ref_fixed_point = int(exp2(24.0));

		float interleavedGradient(ivec2 seed, int t) {
			ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
			int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
			return fract(float(internal_modulus) * (fixed2float * interleaved_z));
		}

		float interleavedGradient() {
			ivec2 seed = ivec2(gl_FragCoord.xy);
			int t = int(frx_renderFrames % 1000u);

			return interleavedGradient(seed, t);
		}

		// accepts sampleOffset parameter
		float interleavedGradient(int sampleOffset) {
			ivec2 seed = ivec2(gl_FragCoord.xy) + sampleOffset;
			int t = int(frx_renderFrames % 10000u);

			return interleavedGradient(seed, t);
		}
	#endif
	// --------------------------------------------------------------------------------------------------------
#endif

// #ifdef INCLUDE_LDEPTH
//	 // --------------------------------------------------------------------------------------------------------
//	 // From Lumi Lights by spiralhalo
//	 // --------------------------------------------------------------------------------------------------------
//	 float linearizeDepth(float depth) {
//		 float nearZ = 0.0001 * (32.0 * 16.0) / frx_viewDistance;
//		 const float farZ = 1.0;
//		 return 2.0 * (nearZ * farZ) / (farZ + nearZ - (depth * 2.0 - 1.0) * (farZ - nearZ));
//	 }
//	 // --------------------------------------------------------------------------------------------------------
// #endif

#ifdef INCLUDE_SHADOW
	// --------------------------------------------------------------------------------------------------------
	// https://github.com/spiralhalo/CanvasTutorial/wiki/Chapter-4
	// Utility functions for cascaded shadow maps
	// --------------------------------------------------------------------------------------------------------
	#ifdef FRAGMENT_SHADER
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
#endif

#ifdef INCLUDE_PACKING
	// --------------------------------------------------------------------------------------------------------
	// Packing functions from sixthsurge#3922. 
	// Found in the shaderLABS discord @ #snippets.
	// --------------------------------------------------------------------------------------------------------
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
	// --------------------------------------------------------------------------------------------------------
#endif

#ifdef INCLUDE_NOISE
	// --------------------------------------------------------------------------------------------------------
	// Hash Without Sine from https://www.shadertoy.com/view/4djSRW
	// Code released under the MIT license.
	// --------------------------------------------------------------------------------------------------------
	// 1 out, 2 in...
	float hash12(vec2 p) {
		vec3 p3  = fract(vec3(p.xyx) * 0.1031);
		p3 += dot(p3, p3.yzx + 33.33);
		return fract((p3.x + p3.y) * p3.z);
	}
	//  1 out, 3 in...
	float hash13(vec3 p3) {
		p3  = fract(p3 * 0.1031);
		p3 += dot(p3, p3.zyx + 31.32);
		return fract((p3.x + p3.y) * p3.z);
	}
	// --------------------------------------------------------------------------------------------------------
#endif