#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

vec3 sampleAtmosphere(in vec3 viewDir, in sampler2D skyLutDay, in sampler2D skyLutNight, in sampler2D transmittanceLut, in sampler2D multiscatteringLut) {
	vec3 skyViewPos = getSkyViewPos();
	vec3 skyColor;

	if (length(skyViewPos) < atmosphereRadiusMM) {
		skyColor = 
			2.0 * getValFromSkyLUT(viewDir, getSunVector(), skyLutDay) + 
			getValFromSkyLUT(viewDir, getMoonVector(), skyLutNight);
	} else {
		float atmoDist = rayIntersectSphere(skyViewPos, viewDir, atmosphereRadiusMM);
		float groundDist = rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM);

		float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

		skyColor =
			raymarchScattering(skyViewPos, viewDir, getSunVector(), tMax, float(numScatteringSteps), transmittanceLut, multiscatteringLut) + 
			nightAdjust(raymarchScattering(skyViewPos, viewDir, getMoonVector(), tMax, float(numScatteringSteps), transmittanceLut, multiscatteringLut));
	}

	return skyColor * 7.5;
}

void drawSunOnAtmosphere(inout vec3 atmosphere, in vec3 viewDir, in sampler2D transmittanceLut) {
	vec3 skyViewPos = getSkyViewPos();

	vec3 sunVector = getSunVector();
	vec3 moonVector = getMoonVector();

	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);
	vec3 moonTransmittance = nightAdjust(getValFromTLUT(transmittanceLut, skyViewPos, viewDir));

	float distToPlanet = rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM);

	float sunBrightness = 100.0 * step(distToPlanet, 0.0);

	vec3 sunDisk = smoothstep(0.99975, 0.99977, dot(viewDir, sunVector)) * sunTransmittance * sunBrightness;
	vec3 moonDisk = smoothstep(0.99985, 0.99987, dot(viewDir, moonVector)) * moonTransmittance * sunBrightness;

	atmosphere += sunDisk + moonDisk;
}

void drawStarsOnAtmosphere(inout vec3 atmosphere, in vec3 viewDir, in sampler2D transmittanceLut) {
	vec3 skyViewPos = getSkyViewPos();

	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);
	vec3 moonTransmittance = nightAdjust(getValFromTLUT(transmittanceLut, skyViewPos, viewDir));

	vec3 starViewDir = viewDir;
	starViewDir.xy = rotate2D(starViewDir.xy, -frx_skyAngleRadians);
	starViewDir.y = abs(starViewDir.y);

	vec2 starPlane = starViewDir.xz / (starViewDir.y + length(starViewDir.xz));
	starPlane *= 750.0;

	const float starThreshold = 0.995;

	vec3 stars = vec3(step(starThreshold, hash12(floor(starPlane))) * moonTransmittance); // Star shape
	stars *= (hash32(floor(starPlane)) * 0.7 + 0.3); // Star color
	stars *= 1.0 + 5.0 * step(starThreshold * 0.5 + 0.5, hash12(floor(starPlane))); // Star brightness

	vec3 tdata = getTimeOfDayFactors();
	float starMultiplier = tdata.z * 0.5 + tdata.y;

	atmosphere += stars;
}
