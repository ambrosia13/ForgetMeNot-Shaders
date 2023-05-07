// --------------------------------------------------------------------------------------------------------
// Atmosphere taken from https://www.shadertoy.com/view/slSXRW, MIT license. Minimal code changes.
// --------------------------------------------------------------------------------------------------------

#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl 
#include forgetmenot:shaders/lib/inc/sky_display.glsl

uniform sampler2D u_sky;
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
	init();

	vec3 viewDirs[6] = vec3[6] (
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0)
	);
	getCubemapViewDirs(texcoord, viewDirs);

	fragColor0 = vec4(getSkyAndClouds(viewDirs[0], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
	fragColor1 = vec4(getSkyAndClouds(viewDirs[1], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
	fragColor2 = vec4(getSkyAndClouds(viewDirs[2], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
	fragColor3 = vec4(getSkyAndClouds(viewDirs[3], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
	fragColor4 = vec4(getSkyAndClouds(viewDirs[4], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
	fragColor5 = vec4(getSkyAndClouds(viewDirs[5], u_transmittance, u_sky, u_sky_night, 4.0), 1.0);
}