// --------------------------------------------------------------------------------------------------------
// Universal header file - includes all frex api vars and utility functions
// #include forgetmenot:shaders/lib/includes.glsl 
// --------------------------------------------------------------------------------------------------------

uniform ivec2 frxu_size;
uniform int frxu_lod;

// FREX API includes
#include forgetmenot:shaders/lib/api_includes.glsl 

// From lumi lights by spiralhalo
float linearizeDepth(float depth) {
	float nearZ = 0.0001 * (32. * 16.) / frx_viewDistance;
	const float farZ = 1.0;
	return 2.0 * (nearZ * farZ) / (farZ + nearZ - (depth * 2.0 - 1.0) * (farZ - nearZ));
}

// Global defines
#define fmn_time (mod(frx_renderSeconds, 100000.0))
#define fmn_rainFactor ((0.5 * frx_smoothedRainGradient + 0.5 * frx_smoothedThunderGradient) * frx_worldIsOverworld)

// Offsets from Chocapic13 shaders
const vec2 TAA_OFFSETS[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);
const vec3 UNDERWATER_FOG_COLOR = vec3(0.0, 0.16, 0.09);

// Config includes
#include forgetmenot:atmospherics
#include forgetmenot:weather
#include forgetmenot:shadows
#include forgetmenot:lighting
#include forgetmenot:post_processing
#include forgetmenot:performance
#include forgetmenot:debug

// File includes
#include forgetmenot:shaders/lib/functions/external.glsl
#include forgetmenot:shaders/lib/functions/noise.glsl
#include forgetmenot:shaders/lib/functions/utility.glsl
#include forgetmenot:shaders/lib/functions/pbr_utils.glsl
#include forgetmenot:shaders/lib/functions/atmosphere.glsl

// FMN API
#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
