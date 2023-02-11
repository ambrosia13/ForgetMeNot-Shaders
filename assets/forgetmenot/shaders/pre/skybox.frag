// --------------------------------------------------------------------------------------------------------
// Atmosphere taken from https://www.shadertoy.com/view/slSXRW, MIT license. Minimal code changes.
// --------------------------------------------------------------------------------------------------------

#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl 

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

vec3 global_sunTransmittance;
vec3 global_moonTransmittance;

vec3 getSkyColor(in vec3 viewDir, in vec3 sunTransmittance, in vec3 moonTransmittance, const in float sunBrightness) {
	if(frx_worldIsOverworld == 1) {
		vec3 sunVector = getSunVector();
		vec3 moonVector = getMoonVector();

		vec3 blueHourMultiplier = fNormalize(vec3(0.8, 1.1, 1.5)) * 1.5;
		blueHourMultiplier = mix(vec3(1.0), blueHourMultiplier, linearstep(0.05, -0.05, sunVector.y));
		
		float intersectedPlanet = step(rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM), 0.0);

		vec3 dayColor = (2.0 * getValFromSkyLUT(viewDir, sunVector, u_sky) + sunBrightness * step(0.9997, dot(viewDir, sunVector)) * intersectedPlanet * sunTransmittance) * 20.0;
		vec3 nightColor = (getValFromSkyLUT(viewDir, moonVector, u_sky_night) + 4.0 * sunBrightness * step(0.9997, dot(viewDir, moonVector)) * intersectedPlanet * moonTransmittance) * 20.0;

		return 2.0 * blueHourMultiplier * (dayColor + nightColor);
	} else if(frx_worldIsNether == 1) {

	} else if(frx_worldIsEnd == 1) {
		vec2 plane = viewDir.xz / (abs(viewDir.y) + length(viewDir.xz) * 0.0) * 4.0;

		float distortX = sin(plane.y * 1.0 + frx_renderSeconds * 0.5) * 0.2;
		float distortY = sin(plane.x * 1.0 + frx_renderSeconds * 0.5) * 0.2;
		vec2 distort = vec2(distortX * cos(frx_renderSeconds * 0.5), distortY * sin(frx_renderSeconds * 0.5));

		float noiseAccumulator = 0.0;
		noiseAccumulator += cellular(plane + distort * 1.0).x * 0.25;
		noiseAccumulator += cellular(plane + distort * 2.0).x * 0.25;
		noiseAccumulator += cellular(plane + distort * 4.0).x * 0.25;
		noiseAccumulator += cellular(plane + distort * 6.0).x * 0.25;

		return vec3(smoothstep(1.0, 0.0, noiseAccumulator));
	}

	return normalize(pow(frx_fogColor.rgb, vec3(2.2))) * 0.5;
}

vec3 getClouds(in vec3 viewDir, in vec3 sunTransmittance, in vec3 moonTransmittance, in vec3 skyColor) {
	if(frx_worldIsOverworld == 1) {
		vec2 cloudsSample = texture(u_clouds, viewDir).rg;

		vec2 plane = 2.0 * viewDir.xz * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y);
		vec3 cumulusPos = skyViewPos + vec3(0.0, 0.0005 * dot(plane, getSunVector().xz), 0.0);


		vec3 sunVector = getSunVector();
		vec3 moonVector = getMoonVector();

		vec3 sunColor = getValFromTLUT(u_transmittance, skyViewPos + vec3(0.0, 0.001, 0.0), sunVector);
		vec3 moonColor = moonFlux * getValFromTLUT(u_transmittance, skyViewPos + vec3(0.0, 0.001, 0.0), moonVector);

		vec3 scatteringColor = sunColor + moonColor;
		vec3 ambientColor = getSkyColor(vec3(0.0, 1.0, 0.0), sunColor, moonColor, 0.0) * 0.5;

		vec3 scattering = 8.0 * scatteringColor * mix(cloudsSample.g, 1.0, getMiePhase(dot(viewDir, sunVector), 0.7) + 0.5 * getMiePhase(dot(viewDir, moonVector), 0.7)) + ambientColor;
		float transmittance = cloudsSample.r;

		return mix(scattering, skyColor, transmittance);
	}

	return skyColor;
}


void main() {
	global_sunTransmittance = getValFromTLUT(u_transmittance, skyViewPos, getSunVector());
	global_moonTransmittance = moonFlux * getValFromTLUT(u_transmittance, skyViewPos, getMoonVector());

	vec3 viewDirs[6] = vec3[6] (
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0)
	);
	getCubemapViewDirs(texcoord, viewDirs);

	fragColor0 = vec4(getClouds(viewDirs[0], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[0], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
	fragColor1 = vec4(getClouds(viewDirs[1], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[1], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
	fragColor2 = vec4(getClouds(viewDirs[2], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[2], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
	fragColor3 = vec4(getClouds(viewDirs[3], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[3], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
	fragColor4 = vec4(getClouds(viewDirs[4], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[4], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
	fragColor5 = vec4(getClouds(viewDirs[5], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[5], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
}