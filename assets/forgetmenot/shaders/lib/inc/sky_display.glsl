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

	float curlNoiseAmount;
	float curlNoiseFrequency;

	bool render;
};

CloudLayer createCumulusCloudLayer(in vec3 viewDir) {
	CloudLayer cloudLayer;

	#ifndef CUMULUS_CLOUDS
		cloudLayer.render = false;
		return cloudLayer;
	#endif

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
	cloudLayer.rangeMult = mix(smoothHash(cloudLayer.plane * 0.3 + frx_renderSeconds * 0.01), 1.0, smoothstep(0.2, 0.4, fmn_atmosphereParams.cloudCoverage));

	cloudLayer.domainShift = vec2(0.0);
	cloudLayer.rangeShift = fmn_atmosphereParams.cloudCoverage;

	cloudLayer.curlNoiseAmount = 0.0001;
	cloudLayer.curlNoiseFrequency = 3.5;

	cloudLayer.render = true;

	return cloudLayer;
}

CloudLayer createCirrusCloudLayer(in vec3 viewDir) {
	CloudLayer cloudLayer;

	#ifndef CIRRUS_CLOUDS
		cloudLayer.render = false;
		return cloudLayer;
	#endif

	cloudLayer.altitude = 0.01;
	cloudLayer.plane = createCloudPlane(viewDir) + 0.00001 * frx_cameraPos.xz / cloudLayer.altitude;

	cloudLayer.density = 2.0;
	cloudLayer.selfShadowSteps = 0;
	
	cloudLayer.useNoiseTexture = false;

	cloudLayer.noiseOctaves = 6;
	cloudLayer.noiseLacunarity = 2.0;
	cloudLayer.noiseLowerBound = 0.3;
	cloudLayer.noiseUpperBound = 1.5;

	cloudLayer.domainMult = vec2(6.0, 1.0);
	cloudLayer.rangeMult = smoothHash(cloudLayer.plane + frx_renderSeconds * 0.01);

	cloudLayer.domainShift = vec2(0.0);//vec2(sin(cloudLayer.plane.y) * 0.25 + sin(cloudLayer.plane.y * 2.0 + 100.0) * 0.125, 1.0);
	cloudLayer.rangeShift = -0.1;

	cloudLayer.curlNoiseAmount = 0.00035;
	cloudLayer.curlNoiseFrequency = 0.75;

	cloudLayer.render = true;

	return cloudLayer;
}

float sampleCloudNoise(in CloudLayer cloudLayer, in int noiseOctaves) {
	if(!cloudLayer.render) {
		return 0.0;
	}

	if(cloudLayer.useNoiseTexture) {
		return -1.0;
	}
	
	return smoothstep(
		cloudLayer.noiseLowerBound,
		cloudLayer.noiseUpperBound,
		(
			fbmHash(
				(cloudLayer.plane + cloudLayer.domainShift + curlNoise(cloudLayer.plane * cloudLayer.curlNoiseFrequency) * cloudLayer.curlNoiseAmount) * cloudLayer.domainMult,
				noiseOctaves,
				cloudLayer.noiseLacunarity,
				0.05
			) + cloudLayer.rangeShift
		) * cloudLayer.rangeMult
	);
}
float sampleCloudNoise(in CloudLayer cloudLayer) {
	return sampleCloudNoise(cloudLayer, cloudLayer.noiseOctaves);
}
float sampleCloudNoise(in CloudLayer cloudLayer, in sampler2D noiseTexture) {
	if(!cloudLayer.render) {
		return 0.0;
	}

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
	if(viewDir.y < -0.05) {
		return vec2(1.0, 0.0);
	}

	float noise = sampleCloudNoise(cloudLayer);
	
	float transmittance = exp2(-noise * cloudLayer.density);
	float scattering = 0.75;

	if(cloudLayer.selfShadowSteps > 0) {
		cloudLayer.noiseOctaves = max(2, cloudLayer.noiseOctaves / 2);

		vec2 temp = viewDir.xz * rcp(viewDir.y);
		float skyLightZenithAngle = rcp(abs(frx_skyLightVector.y));
		vec2 sunLightDirection = mix(
			normalize(getSunVector().xz * skyLightZenithAngle - temp),
			normalize(getMoonVector().xz * skyLightZenithAngle - temp),
			linearstepFrom0(0.2, getMoonVector().y)
		);

		float lightOpticalDepth = 0.0;

		for(int i = 0; i < cloudLayer.selfShadowSteps; i++) {
			cloudLayer.plane += sunLightDirection * rcp(cloudLayer.selfShadowSteps) * interleavedGradient(i) * 0.5;
			lightOpticalDepth += sampleCloudNoise(cloudLayer) * rcp(cloudLayer.selfShadowSteps);
		}

		lightOpticalDepth *= 1.0 + noise - fbmHash(cloudLayer.plane, 3);
		lightOpticalDepth = max(0.0, lightOpticalDepth);

		scattering = exp2(-lightOpticalDepth * cloudLayer.density * 0.3);
	}

	return vec2(
		mix(transmittance, 1.0, linearstep(0.01, -0.01, viewDir.y)),
		scattering
	);
}

vec3 getSkyColor(
	in vec3 viewDir, 
	in vec3 sunTransmittance,
	in vec3 moonTransmittance, 
	in float sunBrightness,
	in bool renderStars,

	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	if(fmn_isModdedDimension) {
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

		vec3 dayColorSample = 2.0 * getValFromSkyLUT(viewDir, sunVector, skyLutDay);
		vec3 nightColorSample = getValFromSkyLUT(viewDir, moonVector, skyLutNight);
		
		vec3 sun = sunBrightness * step(0.9997, dot(viewDir, sunVector)) * sunTransmittance;
		vec3 moon = sunBrightness * step(0.9998, dot(viewDir, moonVector)) * moonTransmittance;

		vec3 dayColor = dayColorSample + sun;
		vec3 nightColor = nightColorSample + moon;

		if(renderStars) {
			vec3 starViewDir = viewDir;
			starViewDir.xy = rotate2D(starViewDir.xy, -frx_skyAngleRadians);
			starViewDir.y = abs(starViewDir.y);

			vec2 starPlane = starViewDir.xz / (starViewDir.y + length(starViewDir.xz));
			starPlane *= 500.0;

			const float starThreshold = 0.995;

			vec3 stars = vec3(step(starThreshold, hash12(floor(starPlane))) * moonTransmittance); // Star shape
			stars *= (hash32(floor(starPlane)) * 0.7 + 0.3); // Star color
			stars *= 1.0 + 5.0 * step(starThreshold * 0.5 + 0.5, hash12(floor(starPlane))); // Star brightness

			vec3 tdata = getTimeOfDayFactors();
			float starMultiplier = tdata.z * 0.5 + tdata.y;

			nightColor += stars * starMultiplier;
		}

		vec3 result = 40.0 * blueHourMultiplier * (dayColor + nightColor);

		return result * (1.0 + 9.0 * frx_skyFlashStrength);
	} else if(frx_worldIsNether == 1) {
		return normalize(pow(frx_fogColor.rgb, vec3(2.2))) * 0.4 + 0.075;
	} else if(frx_worldIsEnd == 1) {
		vec3 skyColor = vec3(0.0);

		float mistAmount = 0.1 * fbmHash3D(viewDir * 3.0, 4);
		vec3 mist = END_MIST_COLOR * mistAmount;

		vec3 starPos = normalize(vec3(-0.7, 0.1, 0.7));
		float VdotStar = clamp01(dot(viewDir, starPos));

		vec3 star = END_MIST_COLOR * vec3(min(20.0, 0.04 / (distance(starPos, viewDir))));

		// Not the main star
		vec3 otherStars = 0.25 * vec3(
			smoothHash(viewDir * 40.0), 
			smoothHash(viewDir * 40.0 + 100.0), 
			smoothHash(viewDir * 40.0 + 200.0)
		) * linearstep(4.0, 100.0, 1.0 / max(0.0001, cellular2x2x2(viewDir * 10.0).x - 0.03));

		skyColor += mist + star + otherStars;

		return skyColor;
	}

	return pow(frx_fogColor.rgb, vec3(2.2));
}

vec3 getSkyColor(
	in vec3 viewDir, 
	in vec3 sunTransmittance,
	in vec3 moonTransmittance, 
	in float sunBrightness,

	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	return getSkyColor(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		sunBrightness,
		false,

		skyLutDay,
		skyLutNight
	);
}

vec3 getSkyColor(
	in vec3 viewDir, 
	in float sunBrightness,

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	vec3 temp = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);

	return getSkyColor(
		viewDir,
		temp,
		nightAdjust(temp),
		sunBrightness,
		false,

		skyLutDay,
		skyLutNight
	);
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
	if(frx_worldHasSkylight == 0 || fmn_isModdedDimension) {
		return skyColor;
	}

	vec3 sunVector = getSunVector();
	vec3 moonVector = getMoonVector();

	vec3 cloudPos = vec3(
		0.0,
		skyViewPos.y + cloudLayer.altitude,// * clamp01(dot(cloudLayer.plane, sunVector.xz)),
		0.0
	);

	vec3 sunColor = getValFromTLUT(transmittanceLut, cloudPos, sunVector);
	vec3 moonColor = nightAdjust(getValFromTLUT(transmittanceLut, cloudPos, moonVector));

	vec3 scatteringColor = sunColor + moonColor;
	vec3 ambientColor = getSkyColor(
		vec3(0.0, 1.0, 0.0), 
		sunTransmittance, 
		moonTransmittance, 
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
	in sampler2D skyLutNight,

	in float sunAmount,
	in bool renderStars
) {
	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);
	vec3 moonTransmittance = nightAdjust(sunTransmittance);

	vec3 color = getSkyColor(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		sunAmount,
		renderStars,
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

	return color * 0.5;
}

vec3 getSkyAndClouds(
	in vec3 viewDir,
	in vec2 cloudsTransmittanceAndScattering,

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight,

	in float sunAmount,
	in bool renderStars
) {
	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);
	vec3 moonTransmittance = nightAdjust(sunTransmittance);

	vec3 color = getSkyColor(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		sunAmount,
		renderStars,
		skyLutDay,
		skyLutNight
	);

	if(frx_worldHasSkylight == 1) {
		CloudLayer cirrusClouds = createCirrusCloudLayer(viewDir);
		CloudLayer cumulusClouds = createCumulusCloudLayer(viewDir);

		// color = getClouds(
		// 	viewDir,
		// 	sunTransmittance,
		// 	moonTransmittance,
		// 	cloudsTransmittanceAndScattering,
		// 	cirrusClouds,
		// 	transmittanceLut,
		// 	skyLutDay,
		// 	skyLutNight,
		// 	color
		// );
		color = getClouds(
			viewDir,
			sunTransmittance,
			moonTransmittance,
			cloudsTransmittanceAndScattering,
			cumulusClouds,
			transmittanceLut,
			skyLutDay,
			skyLutNight,
			color
		);
	}

	return color * 0.5;
}

vec3 getSkyAndClouds(
	in vec3 viewDir, 

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight,

	in bool renderStars
) {
	return getSkyAndClouds(viewDir, transmittanceLut, skyLutDay, skyLutNight, SUN_BRIGHTNESS, renderStars);
}

vec3 getSkyAndClouds(
	in vec3 viewDir, 

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight,

	in float sunBrightness
) {
	return getSkyAndClouds(viewDir, transmittanceLut, skyLutDay, skyLutNight, sunBrightness, false);
}

vec3 getSkyAndClouds(
	in vec3 viewDir, 

	in sampler2D transmittanceLut,
	in sampler2D skyLutDay,
	in sampler2D skyLutNight
) {
	return getSkyAndClouds(viewDir, transmittanceLut, skyLutDay, skyLutNight, SUN_BRIGHTNESS, false);
}