#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

vec2 createCloudPlane(in vec3 viewDir) {
	return 2.0 * (viewDir.xz) * rcp(0.1 * dotSelf(viewDir.xz) + viewDir.y);
}

struct CloudLayer {
	float altitude;
	vec2 plane;

	float density;
	int selfShadowSteps;

	bool useNoiseTexture;

	int noiseOctaves;
	float noiseLacunarity;
	float noiseLowerBound;
	float noiseUpperBound;

	vec2 domainMult;
	float rangeMult;

	vec2 domainShift;
	float rangeShift;
};

CloudLayer createCumulusCloudLayer(in vec3 viewDir) {
	CloudLayer cloudLayer;

	cloudLayer.altitude = 0.001;
	cloudLayer.plane = createCloudPlane(viewDir) + 0.00001 * frx_cameraPos.xz / cloudLayer.altitude + 0.00001 * fmn_time / cloudLayer.altitude;

	cloudLayer.density = 15.0;
	cloudLayer.selfShadowSteps = 5;

	cloudLayer.useNoiseTexture = false;

	cloudLayer.noiseOctaves = 6;
	cloudLayer.noiseLacunarity = 2.5;
	cloudLayer.noiseLowerBound = 0.35 - 0.2 * fmn_rainFactor;
	cloudLayer.noiseUpperBound = 1.0;
	
	cloudLayer.domainMult = vec2(1.0);
	cloudLayer.rangeMult = mix(smoothHash(cloudLayer.plane * 0.3 + frx_renderSeconds * 0.01), 1.0, 0.5 * fmn_rainFactor);

	cloudLayer.domainShift = vec2(0.0);
	cloudLayer.rangeShift = 0.0;

	return cloudLayer;
}

CloudLayer createCirrusCloudLayer(in vec3 viewDir) {
	CloudLayer cloudLayer;

	cloudLayer.altitude = 0.015;
	cloudLayer.plane = createCloudPlane(viewDir) + 0.00001 * frx_cameraPos.xz / cloudLayer.altitude;

	cloudLayer.density = 5.0;
	cloudLayer.selfShadowSteps = 0;
	
	cloudLayer.useNoiseTexture = false;

	cloudLayer.noiseOctaves = 6;
	cloudLayer.noiseLacunarity = 2.0;
	cloudLayer.noiseLowerBound = 0.0;
	cloudLayer.noiseUpperBound = 1.5;

	cloudLayer.domainMult = vec2(6.0, 1.0);
	cloudLayer.rangeMult = 0.3 * smoothHash(cloudLayer.plane * 0.3 + frx_renderSeconds * 0.01);

	cloudLayer.domainShift = vec2(sin(cloudLayer.plane.y) * 0.25 + sin(cloudLayer.plane.y * 2.0 + 100.0) * 0.125, 1.0);
	cloudLayer.rangeShift = 0.0;

	return cloudLayer;
}

float sampleCloudNoise(in CloudLayer cloudLayer) {
	if(cloudLayer.useNoiseTexture) {
		return -1.0;
	}
	
	return smoothstep(
		cloudLayer.noiseLowerBound,
		cloudLayer.noiseUpperBound,
		(
			fbmHash(
				(cloudLayer.plane + cloudLayer.domainShift) * cloudLayer.domainMult,
				cloudLayer.noiseOctaves,
				cloudLayer.noiseLacunarity,
				(0.0001 + 0.000075 * fmn_rainFactor) / cloudLayer.altitude
			) + cloudLayer.rangeShift
		) * cloudLayer.rangeMult
	);
}
float sampleCloudNoise(in CloudLayer cloudLayer, in sampler2D noiseTexture) {
	if(!cloudLayer.useNoiseTexture) {
		return -1.0;
	}

	return smoothstep(
		cloudLayer.noiseLowerBound,
		cloudLayer.noiseUpperBound,
		texture(noiseTexture, cloudLayer.plane * cloudLayer.domainMult + 0.0001 / cloudLayer.altitude).r * cloudLayer.rangeMult
	);
}

vec2 getCloudsTransmittanceAndScattering(in vec3 viewDir, in CloudLayer cloudLayer) {
	if(rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM) > 0.0) {
		return vec2(1.0, 0.0);
	}

	float noise = sampleCloudNoise(cloudLayer);
	
	float transmittance = exp2(-noise * cloudLayer.density);
	float scattering = 0.75;

	if(cloudLayer.selfShadowSteps > 0) {
		vec2 temp = viewDir.xz * rcp(viewDir.y);
		float skyLightZenithAngle = rcp(abs(frx_skyLightVector.y));
		vec2 sunLightDirection = mix(
			normalize(getSunVector().xz * skyLightZenithAngle - temp),
			normalize(getMoonVector().xz * skyLightZenithAngle - temp),
			linearstepFrom0(0.2, getMoonVector().y)
		);

		float lightOpticalDepth = 0.0;

		for(int i = 0; i < cloudLayer.selfShadowSteps; i++) {
			cloudLayer.plane += sunLightDirection * rcp(cloudLayer.selfShadowSteps) * interleavedGradient(i);
			lightOpticalDepth += sampleCloudNoise(cloudLayer) * rcp(cloudLayer.selfShadowSteps);
		}

		scattering = exp2(-lightOpticalDepth * cloudLayer.density * 0.4);
	}

	return vec2(
		mix(transmittance, 1.0, linearstep(0.05, 0.0, viewDir.y)),
		scattering
	);
}

vec3 getSkyColor(
	in vec3 viewDir, 
	in vec3 sunTransmittance,
	in vec3 moonTransmittance, 
	in float sunBrightness,

	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	if(isModdedDimension) {
		return pow(frx_fogColor.rgb, vec3(2.2));
	}

	if(frx_worldIsOverworld == 1) {
		vec3 sunVector = getSunVector();
		vec3 moonVector = getMoonVector();

		const vec3 blueHourColor = vec3(0.593, 0.815, 1.111);
		vec3 blueHourMultiplier = mix(
			vec3(1.0), 
			blueHourColor, 
			linearstep(0.05, -0.05, sunVector.y)
		);

		float intersectedPlanet = step(
			rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM),
			0.0
		);

		vec3 dayColorSample = 2.0 * getValFromSkyLUT(viewDir, sunVector, skyLutDay);
		vec3 nightColorSample = getValFromSkyLUT(viewDir, moonVector, skyLutNight);
		
		vec3 sun = sunBrightness * step(0.999, dot(viewDir, sunVector)) * intersectedPlanet * sunTransmittance;
		vec3 moon = sunBrightness * step(0.9998, dot(viewDir, moonVector)) * intersectedPlanet * moonTransmittance;

		vec3 dayColor = dayColorSample + sun;
		vec3 nightColor = nightColorSample + moon;

		vec3 result = 40.0 * blueHourMultiplier * (dayColor + nightColor);

		return result * (1.0 + 9.0 * frx_skyFlashStrength);
	} else if(frx_worldIsNether == 1) {
		return normalize(pow(frx_fogColor.rgb, vec3(2.2))) * 0.4 + 0.075;
	} else if(frx_worldIsEnd == 1) {
		vec3 skyColor = vec3(0.0);
		vec3 mist = endMistColor * 0.1 * fbmHash3D(viewDir * 3.0, 4);

		vec3 starPos = normalize(vec3(-0.7, 0.1, 0.7));
		float VdotStar = clamp01(dot(viewDir, starPos));

		vec3 star = endMistColor * vec3(min(20.0, 0.02 / (distance(starPos, viewDir))));

		// Not the main star
		vec3 otherStars = 0.25 * vec3(
			smoothHash(viewDir * 40.0), 
			smoothHash(viewDir * 40.0 + 100.0), 
			smoothHash(viewDir * 40.0 + 200.0)
		) * linearstep(4.0, 100.0, 1.0 / max(0.0001, cellular2x2x2(viewDir * 10.0).x - 0.03));

		mist += star + otherStars;

		skyColor += mist;

		return skyColor;
	}

	return pow(frx_fogColor.rgb, vec3(2.2));
}

vec3 getClouds(
	in vec3 viewDir,
	in vec3 sunTransmittance,
	in vec3 moonTransmittance,
	in vec2 cloudsTransmittanceAndScattering,
	in CloudLayer cloudLayer,

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight,

	in vec3 skyColor
) {
	if(frx_worldHasSkylight == 0 || isModdedDimension) {
		return skyColor;
	}

	vec3 sunVector = getSunVector();
	vec3 moonVector = getMoonVector();

	vec3 cloudPos = vec3(
		0.0,
		skyViewPos.y + cloudLayer.altitude * clamp01(dot(cloudLayer.plane, sunVector.xz)),
		0.0
	);

	vec3 sunColor = getValFromTLUT(transmittanceLut, cloudPos, sunVector);
	vec3 moonColor = nightAdjust(getValFromTLUT(transmittanceLut, cloudPos, moonVector));

	vec3 scatteringColor = sunColor + moonColor;
	vec3 ambientColor = getSkyColor(
		vec3(0.0, 1.0, 0.0), 
		sunColor, 
		moonColor, 
		0.0,
		skyLutDay,
		skyLutNight
	);

	vec3 scattering = cloudsTransmittanceAndScattering.y * scatteringColor * (
		4.0 + 10.0 * (getMiePhase(dot(viewDir, sunVector), 0.7) + 0.5 * getMiePhase(dot(viewDir, moonVector), 0.7))
	) + ambientColor;

	float transmittance = cloudsTransmittanceAndScattering.x;

	return mix(scattering, skyColor, transmittance);
}

vec3 getSkyAndClouds(
	in vec3 viewDir,

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, getSunVector());
	vec3 moonTransmittance = nightAdjust(getValFromTLUT(transmittanceLut, skyViewPos, getMoonVector()));

	vec3 color = getSkyColor(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		SUN_BRIGHTNESS,
		skyLutDay,
		skyLutNight
	);

	if(frx_worldHasSkylight == 1) {
		CloudLayer cirrusClouds = createCirrusCloudLayer(viewDir);
		CloudLayer cumulusClouds = createCumulusCloudLayer(viewDir);

		color = getClouds(
			viewDir,
			sunTransmittance,
			moonTransmittance,
			getCloudsTransmittanceAndScattering(viewDir, cirrusClouds),
			cirrusClouds,
			transmittanceLut,
			skyLutDay,
			skyLutNight,
			color
		);
		color = getClouds(
			viewDir,
			sunTransmittance,
			moonTransmittance,
			getCloudsTransmittanceAndScattering(viewDir, cumulusClouds),
			cumulusClouds,
			transmittanceLut,
			skyLutDay,
			skyLutNight,
			color
		);
	}

	return color;
}