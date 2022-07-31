#include frex:shaders/api/header.glsl

#include frex:shaders/api/fog.glsl
#ifndef VERTEX_SHADER
#include frex:shaders/api/fragment.glsl
#else
#include frex:shaders/api/vertex.glsl 
#endif
#include frex:shaders/api/material.glsl
#include frex:shaders/api/player.glsl
#include frex:shaders/api/sampler.glsl
#include frex:shaders/api/view.glsl
#include frex:shaders/api/world.glsl

// Version number. Will increment when new variables are added.
#define FMN_PBR 1

#if FMN_PBR >= 1
    // Flag for whether this material is water. Needed for water fog.
    int fmn_isWater = 0;

    // Amount of subsurface scattering (SSS) to apply for this material. 
    // Not physically based at all; this just ignores the NdotL component of shadowing.
    // Defaulted to 1.0 when diffuse shading is disable.
    float fmn_sssAmount = frx_matDisableDiffuse == 1 ? 1.0 : 0.0;
#endif