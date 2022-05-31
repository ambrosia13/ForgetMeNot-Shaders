/* 
#include forgetmenot:shaders/lib/includes.glsl 
*/

uniform ivec2 frxu_size;
uniform int frxu_lod;

#include forgetmenot:performance_config
#include forgetmenot:clouds
#include forgetmenot:water_reflections
#include forgetmenot:general_config
#include forgetmenot:lighting
#include forgetmenot:experimental

#include forgetmenot:shaders/lib/api_includes.glsl 
#ifdef DEPRESSING_MODE
    #define frx_thunderGradient 1.0
#endif
//#define frx_renderSeconds float(frx_renderFrames)*0.3
//#define frx_renderSeconds 1.0
#include forgetmenot:shaders/lib/constant_variables.glsl
#include forgetmenot:shaders/lib/functions/utility.glsl
#include forgetmenot:shaders/lib/functions/sky.glsl
#include forgetmenot:shaders/lib/functions/fxaa.glsl
