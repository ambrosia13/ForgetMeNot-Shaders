/* 
#include forgetmenot:shaders/lib/includes.glsl 
*/

uniform ivec2 frxu_size;
uniform int frxu_lod;

#include forgetmenot:atmospherics
#include forgetmenot:lighting
#ifndef SKY_GROUND_FOG
    #define SKY_GROUND_FOG 1.5
    #define MIE_AMOUNT 10.0
    #define SUN_ENERGY 3000.0

    #define BLOCKLIGHT_NEUTRALITY 0.25
#endif

#include forgetmenot:shaders/lib/api_includes.glsl 
#ifdef DEPRESSING_MODE
    #define frx_thunderGradient 1.0
#endif
//#define frx_renderSeconds float(frx_renderFrames)*0.3
//#define frx_renderSeconds 1.0
#include forgetmenot:shaders/lib/constant_variables.glsl
#include forgetmenot:shaders/lib/functions/utility.glsl
// #include forgetmenot:shaders/lib/functions/sky.glsl
#include forgetmenot:shaders/lib/functions/atmosphere.glsl
//#include forgetmenot:shaders/lib/functions/fog.glsl
#include forgetmenot:shaders/lib/functions/fxaa.glsl
