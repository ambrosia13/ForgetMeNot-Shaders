/* 
#include forgetmenot:shaders/lib/includes.glsl 
*/

uniform ivec2 frxu_size;
uniform int frxu_lod;

#include forgetmenot:atmospherics
#include forgetmenot:weather
#include forgetmenot:shadows
#include forgetmenot:lighting
#include forgetmenot:post_processing
#include forgetmenot:performance
#include forgetmenot:debug

#ifndef SKY_GROUND_FOG
    #define SKY_GROUND_FOG 1.5
    #define MIE_AMOUNT 10.0
    #define SUN_ENERGY 3000.0

    #define BLOCKLIGHT_NEUTRALITY 0.25
#endif

#include forgetmenot:shaders/lib/api_includes.glsl 

// Offsets from Chocapic13 shaders
vec2 taaOffsets[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);

// From lumi lights by spiralhalo
float linearizeDepth(float depth) {
	float nearZ = 0.0001 * (32. * 16.) / frx_viewDistance;
	const float farZ = 1.0;
	return 2.0 * (nearZ * farZ) / (farZ + nearZ - (depth * 2.0 - 1.0) * (farZ - nearZ));
}

//#define frx_renderSeconds (float(frx_renderFrames))
//#define frx_renderSeconds 600.0

#define fmn_time (mod(frx_renderSeconds, 100000.0))
#define fmn_rainFactor ((0.5 * frx_smoothedRainGradient + 0.5 * frx_smoothedThunderGradient) * frx_worldIsOverworld)

const vec3 UNDERWATER_FOG_COLOR = vec3(0.0, 0.16, 0.09);

#include forgetmenot:shaders/lib/constant_variables.glsl
#include forgetmenot:shaders/lib/functions/utility.glsl
#include forgetmenot:shaders/lib/functions/atmosphere.glsl
#include forgetmenot:shaders/lib/functions/fxaa.glsl
#include forgetmenot:shaders/lib/functions/kernels.glsl
#include forgetmenot:shaders/lib/functions/temporal.glsl

#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
