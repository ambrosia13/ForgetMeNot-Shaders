// --------------------------------------------------------------------------------------------------------

/*
 * Copyright (C) 2022 Ambrosia
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 */

// --------------------------------------------------------------------------------------------------------
// #include forgetmenot:shaders/lib/includes.glsl 
// --------------------------------------------------------------------------------------------------------

// Forget-me-not uses an "optional include" system to minimize shader compile time. Several macros are 
// available to be defined to include certain parts of the code.
#define INCLUDE_GENERAL_UTIL

uniform ivec2 frxu_size;
uniform int frxu_lod;

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

// Config includes
#include forgetmenot:general
#include forgetmenot:seasons
#include forgetmenot:misc

// General GLSL code
#include forgetmenot:shaders/lib/util/utility.glsl

// Canvas specific code
#include forgetmenot:shaders/lib/api_includes.glsl
#include forgetmenot:shaders/lib/util/space.glsl

// Forget-me-not specific code
#ifdef INCLUDE_GBUFFER
#endif
#include forgetmenot:shaders/lib/util/external/external.glsl
#include forgetmenot:shaders/lib/util/noise.glsl
#include forgetmenot:shaders/lib/util/general.glsl
#include forgetmenot:shaders/lib/util/seasons.glsl
#include forgetmenot:shaders/lib/util/cubemap.glsl

#include forgetmenot:shaders/lib/util/external/sky.glsl

#include forgetmenot:shaders/lib/util/pipeline.glsl
