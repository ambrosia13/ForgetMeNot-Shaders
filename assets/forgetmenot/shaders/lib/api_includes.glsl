#include frex:shaders/api/fog.glsl
#ifndef VERTEX_SHADER
#include frex:shaders/api/fragment.glsl
#else
#include frex:shaders/api/vertex.glsl 
#endif
#include frex:shaders/api/header.glsl
#include frex:shaders/api/material.glsl
#include frex:shaders/api/player.glsl
#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/view.glsl
#include frex:shaders/api/world.glsl

#include frex:shaders/lib/bitwise.glsl
#include frex:shaders/lib/color.glsl
#include frex:shaders/lib/face.glsl
#include frex:shaders/lib/math.glsl
#include frex:shaders/lib/sample.glsl
#include frex:shaders/lib/noise/noise2d.glsl
#include frex:shaders/lib/noise/classicnoise2d.glsl
#include frex:shaders/lib/noise/cellular2d.glsl
#include frex:shaders/lib/noise/cellular2x2.glsl
#include frex:shaders/lib/noise/noise3d.glsl

uniform ivec2 frxu_size;
uniform int frxu_lod;