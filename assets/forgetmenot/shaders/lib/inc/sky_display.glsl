#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/palette.glsl

const float CUMULUS_CLOUD_ALTITUDE = 800.0 * 1e-6;
const float CIRRUS_CLOUD_ALTITUDE = 8000.0 * 1e-6;

const float CUMULUS_CLOUD_DENSITY = 15.0;
const float CIRRUS_CLOUD_DENSITY = 2.0;

const int CUMULUS_CLOUD_OCTAVES = 8;
const int CUMULUS_CLOUD_SELF_SHADOW_STEPS = 5;
const int CUMULUS_CLOUD_SELF_SHADOW_OCTAVES = 6;

const int CIRRUS_CLOUD_OCTAVES = 8;

vec3 raymarchAtmosphere(
    in vec3 viewDir, 
    in vec3 skyViewPos,
    in sampler2D transmittanceLut, 
    in sampler2D multiscatteringLut
) {
    float atmoDist = rayIntersectSphere(skyViewPos, viewDir, atmosphereRadiusMM);
    float groundDist = rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM);

    float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

    return raymarchScattering(skyViewPos, viewDir, getSunVector(), tMax, float(numScatteringSteps), transmittanceLut, multiscatteringLut, SUN_COLOR) +
        nightAdjust(raymarchScattering(skyViewPos, viewDir, getMoonVector(), tMax, float(numScatteringSteps), transmittanceLut, multiscatteringLut, MOON_COLOR));
}

vec3 sampleAtmosphere(
    in vec3 viewDir,
    in sampler2D skyLutDay, 
    in sampler2D skyLutNight  
) {
    return 2.0 * getValFromSkyLUT(viewDir, getSunVector(), skyLutDay) +
        getValFromSkyLUT(viewDir, getMoonVector(), skyLutNight);
}

vec3 getAtmosphereColor(
    in vec3 viewDir, 
    in sampler2D skyLutDay, 
    in sampler2D skyLutNight, 
    in sampler2D transmittanceLut, 
    in sampler2D multiscatteringLut
) {
    if (frx_worldIsOverworld == 0) {
        return frx_fogColor.rgb;
    }

    vec3 skyViewPos = getSkyViewPos();
    vec3 skyColor;

    if (length(skyViewPos) < atmosphereRadiusMM) {
        skyColor = sampleAtmosphere(viewDir, skyLutDay, skyLutNight);
    } else {
        skyColor = raymarchAtmosphere(viewDir, skyViewPos, transmittanceLut, multiscatteringLut);
    }

    return skyColor * 7.5;
}

vec2 getCumulusCloudsTransmittanceScattering(in vec3 viewDir, in float groundDist) {
    if (groundDist > 0.0) return vec2(1.0, 0.0);
    
    const float lacunarity = 2.0;
    const float windSpeed = 0.005;
    const float noiseFalloff = 0.6;

    vec2 shift = 0.000001 * (frx_cameraPos.xz + frx_renderSeconds) / CUMULUS_CLOUD_ALTITUDE;
    vec2 plane = 0.5 * viewDir.xz * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y) + shift;

    vec2 curl = 0.05 * fbmDXY(plane * 2.0, 4, 2.5, windSpeed);
    float noise = fbmCellular(plane + curl, CUMULUS_CLOUD_OCTAVES, lacunarity, windSpeed);
    noise = smoothstep(noiseFalloff, 1.0, noise);

    float transmittance = exp(-noise * CUMULUS_CLOUD_DENSITY);
    
    vec2 tmp = viewDir.xz / viewDir.y;
    float skyLightZenithAngle = 1.0 / abs(frx_skyLightVector.y);
    vec2 lightDirection = mix(
        normalize(getSunVector().xz * skyLightZenithAngle - tmp),
        normalize(getMoonVector().xz * skyLightZenithAngle - tmp),
        linearstepFrom0(0.2, getMoonVector().y)
    );

    float lightOpticalDepth = 0.0;

    for(int i = 0; i < CUMULUS_CLOUD_SELF_SHADOW_STEPS; i++) {
        plane += lightDirection / float(CUMULUS_CLOUD_SELF_SHADOW_STEPS) * interleavedGradient(i) * 0.25;

        vec2 curl = 0.05 * fbmDXY(plane * 2.0, 4, 2.5, windSpeed);
        float noiseSample = fbmCellular(plane + curl, CUMULUS_CLOUD_SELF_SHADOW_OCTAVES, lacunarity, windSpeed);
        noiseSample = smoothstep(noiseFalloff, 1.0, noiseSample);

        lightOpticalDepth += noiseSample / float(CUMULUS_CLOUD_SELF_SHADOW_STEPS);
    }

    float scattering = exp2(-lightOpticalDepth * CUMULUS_CLOUD_DENSITY * 0.3);

    return vec2(transmittance, scattering);
}

vec2 getCirrusCloudsTransmittanceScattering(in vec3 viewDir, in float groundDist) {
    if (groundDist > 0.0) return vec2(1.0, 0.0);

    const float lacunarity = 2.0;
    const float windSpeed = 0.005;
    const float noiseFalloff = 0.6;

    vec2 shift = 0.00000025 * (frx_cameraPos.xz + frx_renderSeconds) / CIRRUS_CLOUD_ALTITUDE;
    vec2 plane = rotate2D(viewDir.xz, 0.5) * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y) + shift;
    vec2 curl = 0.5 * fbmDXY(plane * 0.15, 4, 2.5, windSpeed);

    plane *= vec2(0.75, 2.0);

    float noise = fbmHash(plane + curl, CIRRUS_CLOUD_OCTAVES, lacunarity, windSpeed);
    noise = smoothstep(noiseFalloff, 1.5, noise);

    float transmittance = exp(-noise * CIRRUS_CLOUD_DENSITY);

    return vec2(transmittance, 1.0);
}

void drawCloudsOnAtmosphere(
    inout vec3 atmosphere,
    in vec3 viewDir,
    in vec2 cumulusCloudTransmittanceScattering,
    in vec2 cirrusCloudTransmittanceScattering,

    in sampler2D transmittanceLut,
    in sampler2D skyLutDay,
    in sampler2D skyLutNight
) {
    if (frx_worldHasSkylight == 0 || fmn_isModdedDimension) {
        return;
    }

    vec3 skyViewPos = getSkyViewPos();

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    vec3 cumulusCloudPos = vec3(0.0, skyViewPos.y + CUMULUS_CLOUD_ALTITUDE, 0.0);
    vec3 cirrusCloudPos = vec3(0.0, skyViewPos.y + CIRRUS_CLOUD_ALTITUDE, 0.0);

    vec3 cumulusSunTransmittance = getValFromTLUT(transmittanceLut, cumulusCloudPos, sunVector);
    vec3 cumulusMoonTransmittance = getValFromTLUT(transmittanceLut, cumulusCloudPos, moonVector);
    vec3 cirrusSunTransmittance = getValFromTLUT(transmittanceLut, cirrusCloudPos, sunVector);
    vec3 cirrusMoonTransmittance = getValFromTLUT(transmittanceLut, cirrusCloudPos, moonVector);

    vec3 cumulusScatteringColor = cumulusSunTransmittance + nightAdjust(cumulusMoonTransmittance);
    vec3 cirrusScatteringColor = cirrusSunTransmittance + nightAdjust(cirrusMoonTransmittance);
    vec3 ambientCloudColor = 2.0 * sampleAtmosphere(vec3(0.0, 1.0, 0.0), skyLutDay, skyLutNight);

    vec3 cumulusCloudScattering = cumulusCloudTransmittanceScattering.y * cumulusScatteringColor
        * (4.0 + 10.0 * (getMiePhase(dot(viewDir, sunVector), 0.7) + getMiePhase(dot(viewDir, moonVector), 0.7)))
        + ambientCloudColor;
    
    vec3 cirrusCloudScattering = cirrusCloudTransmittanceScattering.y * cirrusScatteringColor
        * (4.0 + 10.0 * (getMiePhase(dot(viewDir, sunVector), 0.7) + getMiePhase(dot(viewDir, moonVector), 0.7)))
        + ambientCloudColor;
    
    vec3 cloudyAtmosphere = mix(cirrusCloudScattering, atmosphere, cirrusCloudTransmittanceScattering.x);
    cloudyAtmosphere = mix(cumulusCloudScattering, cloudyAtmosphere, cumulusCloudTransmittanceScattering.x);

    atmosphere = mix(atmosphere, cloudyAtmosphere, smoothstep(0.0, 0.1, viewDir.y));
}

void drawSunOnAtmosphere(inout vec3 atmosphere, in vec3 viewDir, in sampler2D transmittanceLut) {
    vec3 skyViewPos = getSkyViewPos();

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    vec3 transmittance = getValFromTLUT(transmittanceLut, skyViewPos, viewDir);

    float distToPlanet = rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM);
    float visibility = step(distToPlanet, 0.0);

    vec3 sunDisk = smoothstep(0.99975, 0.99977, dot(viewDir, sunVector)) * SUN_COLOR;
    vec3 moonDisk = smoothstep(0.99985, 0.99987, dot(viewDir, moonVector)) * nightAdjust(MOON_COLOR);

    atmosphere += (sunDisk + moonDisk) * visibility * transmittance * sunDiskBrightness;
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
