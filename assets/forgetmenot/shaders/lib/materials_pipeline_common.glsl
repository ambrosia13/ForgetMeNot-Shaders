/*
#include forgetmenot:shaders/lib/materials_pipeline_common.glsl

Common things that should be available to both pipeline and material shaders.
*/

#include forgetmenot:atmosphere
#include forgetmenot:clouds
#include forgetmenot:lighting
#include forgetmenot:water
#include forgetmenot:camera
#include forgetmenot:dimensions
#include forgetmenot:general
#include forgetmenot:seasons
#include forgetmenot:misc

#define WATER_COLOR (vec3(WATER_COLOR_R, WATER_COLOR_G, WATER_COLOR_B))
#define END_MIST_COLOR (vec3(END_MIST_COLOR_R, END_MIST_COLOR_G, END_MIST_COLOR_B))