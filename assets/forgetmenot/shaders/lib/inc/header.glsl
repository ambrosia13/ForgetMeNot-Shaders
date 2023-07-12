#include frex:shaders/api/header.glsl

#include frex:shaders/api/fog.glsl
#include frex:shaders/api/sampler.glsl

#include frex:shaders/api/player.glsl
#include frex:shaders/api/view.glsl
#include frex:shaders/api/world.glsl

#include frex:shaders/lib/face.glsl
#include frex:shaders/lib/math.glsl
#include frex:shaders/lib/color.glsl

#include frex:shaders/lib/sample.glsl

uniform ivec2 frxu_size;
uniform int frxu_lod;

const vec2[] TAA_OFFSETS = vec2[8] (
	#ifdef NO_TAA_JITTER
		vec2(0.0),
		vec2(0.0),
		vec2(0.0),
		vec2(0.0),
		vec2(0.0),
		vec2(0.0),
		vec2(0.0),
		vec2(0.0)
	#else
		vec2( 0.125,-0.375),
		vec2(-0.125, 0.375),
		vec2( 0.625, 0.125),
		vec2( 0.375,-0.625),
		vec2(-0.625, 0.625),
		vec2(-0.875,-0.125),
		vec2( 0.375,-0.875),
		vec2( 0.875, 0.875)
	#endif
);

vec2 getTaaOffset(in uint frame) {
	return TAA_OFFSETS[frame % 8u];
}

// Common between material shaders and pipeline shaders - includes the option includes
#include forgetmenot:shaders/lib/materials_pipeline_common.glsl

// These will always be needed
#include forgetmenot:shaders/lib/inc/utility.glsl 
#include forgetmenot:shaders/lib/inc/general.glsl 
#include forgetmenot:shaders/lib/inc/palette.glsl 
#include forgetmenot:shaders/lib/inc/globals.glsl 
