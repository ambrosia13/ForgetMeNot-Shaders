/* 
#include forgetmenot:shaders/lib/includes.glsl 
*/

uniform ivec2 frxu_size;
uniform int frxu_lod;


#include forgetmenot:atmospherics
#include forgetmenot:shadows
#include forgetmenot:lighting
#include forgetmenot:debug

#ifndef SKY_GROUND_FOG
    #define SKY_GROUND_FOG 1.5
    #define MIE_AMOUNT 10.0
    #define SUN_ENERGY 3000.0

    #define BLOCKLIGHT_NEUTRALITY 0.25
#endif

#include forgetmenot:shaders/lib/api_includes.glsl 

//#define frx_renderSeconds (float(frx_renderFrames))
//#define frx_renderSeconds 600.0

#define fmn_time (mod(frx_renderSeconds, 100000.0))

#include forgetmenot:shaders/lib/constant_variables.glsl
#include forgetmenot:shaders/lib/functions/utility.glsl
#include forgetmenot:shaders/lib/functions/atmosphere.glsl
#include forgetmenot:shaders/lib/functions/fxaa.glsl
#include forgetmenot:shaders/lib/functions/kernels.glsl
#include forgetmenot:shaders/lib/functions/temporal.glsl

#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
