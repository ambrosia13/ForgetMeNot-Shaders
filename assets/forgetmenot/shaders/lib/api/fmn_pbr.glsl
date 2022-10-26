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

// Version number. Will increment when new material flags are added.
#define FMN_PBR 2

#if FMN_PBR >= 1
    // Flag for whether this material is water. Needed for water fog.
    // Water fog color will depend on the water albedo as of FMN_PBR version 3, 
    // so set the albedo of the material to whatever you want the water fog color to be.
    int fmn_isWater = 0;

    // Amount of subsurface scattering (SSS) to apply for this material. 
    // In FMN, this is implemented such that SSS materials have both shadowmap-based SSS and screenspace SSS.
    // Other pipelines may implement fmn_sssAmount in their own way.
    // Defaults to 1.0 when diffuse shading is disabled.
    float fmn_sssAmount = frx_matDisableDiffuse == 1 ? 1.0 : 0.0;

    #if FMN_PBR >= 2
        // Flag for whether this material is a player. 
        int fmn_isPlayer = 0;
    #endif
#endif