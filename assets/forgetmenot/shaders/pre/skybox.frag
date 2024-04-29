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
uniform sampler2D u_multiscattering;
uniform sampler2D u_moon_texture;
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

	fragColor0 = vec4(sampleAtmosphere(viewDirs[0], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
	fragColor1 = vec4(sampleAtmosphere(viewDirs[1], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
	fragColor2 = vec4(sampleAtmosphere(viewDirs[2], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
	fragColor3 = vec4(sampleAtmosphere(viewDirs[3], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
	fragColor4 = vec4(sampleAtmosphere(viewDirs[4], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
	fragColor5 = vec4(sampleAtmosphere(viewDirs[5], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
}