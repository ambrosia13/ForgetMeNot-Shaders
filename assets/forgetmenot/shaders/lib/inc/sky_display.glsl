#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

vec2 createCloudPlane(const in vec3 viewDir) {
	return 2.0 * viewDir.xz * rcp(0.1 * dotSelf(viewDir.xz) + viewDir.y);
}

struct CloudLayer {
	float altitude;
	float density;
	int selfShadowSteps;

	bool useNoiseTexture;

	int noiseOctaves;
	float noiseLacunarity;
	float noiseLowerBound;
	float noiseUpperBound;

	vec2 domainMult;
	float rangeMult;
};

CloudLayer createCumulusCloudLayer(const in vec2 plane) {
	CloudLayer cloudLayer;

	cloudLayer.altitude = 0.001;
	cloudLayer.density = 10.0;
	cloudLayer.selfShadowSteps = 5;

	cloudLayer.useNoiseTexture = false;

	cloudLayer.noiseOctaves = 6;
	cloudLayer.noiseLacunarity = 2.5;
	cloudLayer.noiseLowerBound = 0.35;
	cloudLayer.noiseUpperBound = 1.0;
	
	cloudLayer.domainMult = vec2(1.0);
	cloudLayer.rangeMult = smoothHash(plane * 0.3 + frx_renderSeconds * 0.01);

	return cloudLayer;
}

CloudLayer createCirrusCloudLayer(const in vec2 plane) {
	CloudLayer cloudLayer;

	cloudLayer.altitude = 0.015;
	cloudLayer.density = 5.0;
	cloudLayer.selfShadowSteps = 0;
	
	cloudLayer.useNoiseTexture = false;

	cloudLayer.noiseOctaves = 6;
	cloudLayer.noiseLacunarity = 2.0;
	cloudLayer.noiseLowerBound = 0.0;
	cloudLayer.noiseUpperBound = 1.5;

	cloudLayer.domainMult = vec2(6.0 + sin(plane.y) * 0.5, 1.0);
	cloudLayer.rangeMult = 0.3 * smoothHash(plane * 0.3 + frx_renderSeconds * 0.01);

	return cloudLayer;
}

float sampleCloudNoise(const in vec2 plane, const in CloudLayer cloudLayer) {
	if(cloudLayer.useNoiseTexture) {
		return -1.0;
	}
	
	return smoothstep(
		cloudLayer.noiseLowerBound,
		cloudLayer.noiseUpperBound,
		fbmHash(
			plane * cloudLayer.domainMult,
			cloudLayer.noiseOctaves,
			cloudLayer.noiseLacunarity,
			0.0001 / cloudLayer.altitude
		) * cloudLayer.rangeMult
	);
}
float sampleCloudNoise(const in vec2 plane, const in CloudLayer cloudLayer, const in sampler2D noiseTexture) {
	if(!cloudLayer.useNoiseTexture) {
		return -1.0;
	}

	return smoothstep(
		cloudLayer.noiseLowerBound,
		cloudLayer.noiseUpperBound,
		texture(noiseTexture, plane * cloudLayer.domainMult + 0.0001 / cloudLayer.altitude).r * cloudLayer.rangeMult
	);
}

vec2 getCloudsTransmittanceAndScattering(in vec2 plane, const in vec3 viewDir, const in CloudLayer cloudLayer) {
	if(rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM) > 0.0) {
		return vec2(1.0, 0.0);
	}

	float noise = sampleCloudNoise(plane, cloudLayer);
	
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
			plane += sunLightDirection * rcp(cloudLayer.selfShadowSteps) * interleavedGradient(i);
			lightOpticalDepth += sampleCloudNoise(plane, cloudLayer) * rcp(cloudLayer.selfShadowSteps);
		}

		scattering = exp2(-lightOpticalDepth * 6.0);
	}

	return vec2(
		mix(transmittance, 1.0, linearstep(0.05, 0.0, viewDir.y)),
		scattering
	);
}

vec3 getSkyColor(
	const in vec3 viewDir, 
	const in vec3 sunTransmittance,
	const in vec3 moonTransmittance, 
	const in float sunBrightness,

	const in sampler2D skyLutDay,
	const in sampler2D skyLutNight
) {
	if(isModdedDimension()) {
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
		
		vec3 sun = sunBrightness * step(0.9997, dot(viewDir, sunVector)) * intersectedPlanet * sunTransmittance;
		vec3 moon = sunBrightness * step(0.9998, dot(viewDir, moonVector)) * intersectedPlanet * moonTransmittance;

		vec3 dayColor = dayColorSample + sun;
		vec3 nightColor = nightColorSample + moon;

		return 40.0 * blueHourMultiplier * (dayColor + nightColor);
	} else if(frx_worldIsNether == 1) {
		return 0.5 * normalize(pow(frx_fogColor.rgb, vec3(2.2)));
	} else if(frx_worldIsEnd == 1) {
		return vec3(0.5);
	}

	return pow(frx_fogColor.rgb, vec3(2.2));
}

vec3 getClouds(
	const in vec3 viewDir,
	const in vec3 sunTransmittance,
	const in vec3 moonTransmittance,
	const in vec2 cloudsTransmittanceAndScattering,
	const in CloudLayer cloudLayer,

	const in sampler2D transmittanceLut,
	const in sampler2D skyLutDay,
	const in sampler2D skyLutNight,

	const in vec3 skyColor
) {
	vec3 sunVector = getSunVector();
	vec3 moonVector = getMoonVector();

	vec2 plane = createCloudPlane(viewDir);
	vec3 cloudPos = vec3(
		0.0,
		skyViewPos.y + cloudLayer.altitude * clamp01(dot(plane, sunVector.xz)),
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
	const in vec3 viewDir,
	const in sampler2D transmittanceLut,
	const in sampler2D skyLutDay,
	const in sampler2D skyLutNight
) {
	vec3 sunTransmittance = getValFromTLUT(transmittanceLut, skyViewPos, getSunVector());
	vec3 moonTransmittance = nightAdjust(getValFromTLUT(transmittanceLut, skyViewPos, getMoonVector()));

	vec3 color = getSkyColor(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		8.0,
		skyLutDay,
		skyLutNight
	);

	vec2 plane = createCloudPlane(viewDir);
	CloudLayer cirrusClouds = createCirrusCloudLayer(plane);
	CloudLayer cumulusClouds = createCumulusCloudLayer(plane);

	color = getClouds(
		viewDir,
		sunTransmittance,
		moonTransmittance,
		getCloudsTransmittanceAndScattering(plane, viewDir, cirrusClouds),
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
		getCloudsTransmittanceAndScattering(plane, viewDir, cumulusClouds),
		cumulusClouds,
		transmittanceLut,
		skyLutDay,
		skyLutNight,
		color
	);

	return color;
}