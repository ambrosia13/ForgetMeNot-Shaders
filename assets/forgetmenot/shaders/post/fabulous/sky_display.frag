#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/sky_display.glsl 

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;
uniform sampler2D u_sky_day;
uniform sampler2D u_sky_night;
uniform sampler2D u_moon_texture;

uniform sampler2D u_solid_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();

	if(texture(u_solid_depth, texcoord).r != 1.0) {
		fragColor = vec4(0.0);
		return;
	}

	vec2 jitteredCoord = gl_FragCoord.xy;
	vec3 viewDir = normalize(setupSceneSpacePos(jitteredCoord / frxu_size, 1.0));



	// fragColor.rgb = getSkyAndClouds(
	// 	viewDir,
	// 	u_transmittance,
	// 	u_sky_day,
	// 	u_sky_night,
	// 	u_moon_texture,
	// 	true // stars
	// );

	vec3 atmosphere = sampleAtmosphere(viewDir, u_sky_day, u_sky_night, u_transmittance, u_multiscattering);
	drawSunOnAtmosphere(atmosphere, viewDir, u_transmittance);
	drawStarsOnAtmosphere(atmosphere, viewDir, u_transmittance);

	fragColor = vec4(atmosphere, 1.0);
}