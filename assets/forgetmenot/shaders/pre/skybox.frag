// --------------------------------------------------------------------------------------------------------
// Atmosphere taken from https://www.shadertoy.com/view/slSXRW, MIT license. Minimal code changes.
// --------------------------------------------------------------------------------------------------------

#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl 
#include forgetmenot:shaders/lib/inc/sky_display.glsl

uniform sampler2D u_sky_day;
uniform sampler2D u_sky_night;
uniform sampler2D u_transmittance;
uniform samplerCube u_clouds;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor0;
layout(location = 1) out vec4 fragColor1;
layout(location = 2) out vec4 fragColor2;
layout(location = 3) out vec4 fragColor3;
layout(location = 4) out vec4 fragColor4;
layout(location = 5) out vec4 fragColor5;

void main() {
	initGlobals();

	vec3 viewDirs[6] = vec3[6] (
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0)
	);
	getCubemapViewDirs(texcoord, viewDirs);

	#ifdef CLOUDS_CONTRIBUTE_TO_LIGHT
		fragColor0 = vec4(getSkyAndClouds(viewDirs[0], pow2(texture(u_clouds, viewDirs[0]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor1 = vec4(getSkyAndClouds(viewDirs[1], pow2(texture(u_clouds, viewDirs[1]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor2 = vec4(getSkyAndClouds(viewDirs[2], pow2(texture(u_clouds, viewDirs[2]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor3 = vec4(getSkyAndClouds(viewDirs[3], pow2(texture(u_clouds, viewDirs[3]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor4 = vec4(getSkyAndClouds(viewDirs[4], pow2(texture(u_clouds, viewDirs[4]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor5 = vec4(getSkyAndClouds(viewDirs[5], pow2(texture(u_clouds, viewDirs[5]).rg), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
	#else
		fragColor0 = vec4(getSkyAndClouds(viewDirs[0], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor1 = vec4(getSkyAndClouds(viewDirs[1], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor2 = vec4(getSkyAndClouds(viewDirs[2], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor3 = vec4(getSkyAndClouds(viewDirs[3], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor4 = vec4(getSkyAndClouds(viewDirs[4], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
		fragColor5 = vec4(getSkyAndClouds(viewDirs[5], vec2(1.0, 0.0), u_transmittance, u_sky_day, u_sky_night, 4.0, false), 1.0);
	#endif
}