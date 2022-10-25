// -----------------------------------------------------------------------------------------------------------------------
vec3 calculateSkyColor(in vec3 viewSpacePos) {
    viewSpacePos = fNormalize(viewSpacePos);
    vec3 tdata = getTimeOfDayFactors();

    vec3 skyColor = vec3(0.0);

    if(frx_worldIsOverworld == 1) {
        vec3 overworldSkyColor = vec3(0.0);

        // // a whole lot of magic numbers
        vec3 daytimeSky = vec3(0.864,1.018,1.300) * 1.2;
        daytimeSky = mix(daytimeSky, vec3(1.2), clamp01(1.0 - frx_smoothedRainGradient - frx_thunderGradient) * frx_smootherstep(-0.9, -1.0, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.445,0.647,0.840) * 1.1, frx_smootherstep(-0.5, 0.3, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.305,0.528,0.805) * 0.9, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.208,0.444,0.760) * 0.8, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        #ifdef DEPRESSING_MODE
            daytimeSky = mix(daytimeSky, daytimeSky * 0.5 + vec3(2.5, 2.2, 0.4) * 0.8, clamp01(pow(dot(viewSpacePos, getSunVector()), 3.0) * 0.1));
            daytimeSky = daytimeSky * vec3(0.5, 0.6, 0.5) + 1.5 * vec3(0.5, 0.4, 0.5);
        #else
            daytimeSky = mix(daytimeSky, daytimeSky * 0.5 + vec3(1.5, 1.3, 1.1) * 0.5, clamp01(pow(dot(viewSpacePos, getSunVector()), 5.0) * 0.55));
        #endif
        //daytimeSky = mix(daytimeSky, mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5), (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 2.0)) * 1.0);
        //daytimeSky += mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
        // daytimeSky += SUN_COLOR * max(0.1, 1.0 / clamp01(dot(viewSpacePos, getSunVector()))) * 0.01;
        daytimeSky *= 1.1;
        daytimeSky.rg *= vec2(1.0, 1.);
        daytimeSky = mix(vec3(frx_luminance(daytimeSky)), daytimeSky, 0.9);
        daytimeSky *= mix(0.9, 1.1, clamp01(dot(viewSpacePos, getSunVector())));
        // contrast(daytimeSky, 1.5);


        vec3 nighttimeSky = vec3(0.506,0.577,0.620) * 3.5;
        nighttimeSky = mix(nighttimeSky, vec3(0.401,0.453,0.565) * 3.8, frx_smootherstep(-0.1, 0.2, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.344,0.376,0.500) * 2.5, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.291,0.327,0.460) * 2.2, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        nighttimeSky *= 0.1;
        nighttimeSky.rgb *= vec3(1.3, 1.3, 1.9);
        #ifdef DEPRESSING_MODE
            //nighttimeSky = nighttimeSky * 0.75 + 0.25;
            nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.605,0.685) * 0.8, clamp01(pow(dot(viewSpacePos, getMoonVector()), 3.0)));
        #else
            nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.505,0.685) * 0.8, clamp01(pow(dot(viewSpacePos, getMoonVector()), 11.0)));
        #endif
        //nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.505,0.885) * 2.0, clamp01(pow(dot(viewSpacePos, getMoonVector()), 15.0) * 0.55));
        //nighttimeSky = mix(nighttimeSky, vec3(frx_luminance(nighttimeSky)) * 1.5, 0.25);

        vec3 sunsetSky = vec3(0.605,0.382,0.361) * 1.0; // red 
        sunsetSky = mix(sunsetSky, vec3(0.605,0.482,0.461) * 0.9, smoothstep(-0.3, 0.0, viewSpacePos.y)); // green-ish
        sunsetSky = mix(sunsetSky, vec3(0.284,0.456,0.555) * 0.8, smoothstep(-0.1, 0.5, viewSpacePos.y)); // cyan-ish
        sunsetSky = mix(sunsetSky, vec3(0.245,0.342,0.560) * 0.7, smoothstep(0.0, 0.6, viewSpacePos.y)); // blue
        sunsetSky = mix(sunsetSky, vec3(0.225,0.302,0.510) * 0.6, smoothstep(0.3, 0.8, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.181,0.251,0.485) * 0.5, smoothstep(0.5, 1.5, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(0.7, 0.5, 0.4) * 0.6, clamp01(pow(dot(viewSpacePos, getSunVector()), 3.0)));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(1.5, 1.2, 0.4) * 0.6, clamp01(pow(dot(viewSpacePos, getSunVector()), 5.0) * 0.55));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(0.475,0.505,0.685), clamp01(pow(dot(viewSpacePos, getMoonVector()), 5.0)));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(1.2, 0.5, 0.3), clamp01(dot(frx_cameraView, getSunVector()) * 0.2));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(0.5, 0.7, 1.0), clamp01(dot(frx_cameraView, getMoonVector()) * 0.2));
        // sunsetSky = mix(sunsetSky, vec3(frx_luminance(sunsetSky)), -1.0);
        sunsetSky *= 1.0;
        
        overworldSkyColor = mix(overworldSkyColor, daytimeSky, tdata.x);
        overworldSkyColor = mix(overworldSkyColor, nighttimeSky, tdata.y);
        overworldSkyColor = mix(overworldSkyColor, sunsetSky, tdata.z);

        skyColor = overworldSkyColor;

        #ifndef DEPRESSING_MODE
            skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * 0.5, 0.5 * frx_smoothedRainGradient);
            skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * (0.75 + 0.2 * (1.0 - tdata.x)), 0.15 * frx_thunderGradient);
        #else
            skyColor *= mix(1.0, 0.75, tdata.x);
        #endif
        // skyColor = mix(skyColor, vec3(frx_luminance(skyColor)), -0.5);

        // this saturates the sky but is it really needed?
        // float skyLum = frx_luminance(skyColor);
        // skyColor *= skyColor;
        // skyColor *= 1.0 + skyLum;
        #ifdef DEPRESSING_MODE
            skyColor *= vec3(1.1, 1.05, 0.9) * 0.75;
        #endif
    } else if(frx_worldIsEnd == 1) {
        skyColor = vec3(0.4, 0.2, 0.4);
    } else skyColor = frx_fogColor.rgb * 2.0;

    #ifdef DEPRESSING_MODE
        skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * 1.3 * vec3(1.2, 1.2, 1.0), 0.5);
        skyColor *= 0.75;
    #endif

    return skyColor;// + frx_noise2d(viewSpacePos.xz) / 150.0;
}
// -----------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------
vec3 calculateSun(in vec3 viewSpacePos) {
    viewSpacePos = fNormalize(viewSpacePos);
    float sun = dot(viewSpacePos, getSunVector()) * 0.5 + 0.5;

    // bool fullMoon = mod(frx_worldDay, 8.0) == 0.0;
    // bool phase1 = mod(frx_worldDay, 8.0) == 1.0;
    // bool phase2 = mod(frx_worldDay, 8.0) == 2.0;
    // bool phase3 = mod(frx_worldDay, 8.0) == 3.0;
    // bool phase4 = mod(frx_worldDay, 8.0) == 4.0;
    // bool phase5 = mod(frx_worldDay, 8.0) == 5.0;
    // bool phase6 = mod(frx_worldDay, 8.0) == 6.0;
    // bool phase7 = mod(frx_worldDay, 8.0) == 7.0;

    float moon = dot(viewSpacePos, getMoonVector()) * 0.5 + 0.5;
    // if(phase1 || phase7) moon -= step(0.9994, dot(viewSpacePos, vec3(frx_skyLightVector.xy, frx_skyLightVector.z - 0.0008)) * 0.5 + 0.5);
    // if(phase2 || phase6) moon -= step(0.9993, dot(viewSpacePos, vec3(frx_skyLightVector.xy, frx_skyLightVector.z - 0.02)) * 0.5 + 0.5);
    // if(phase3 || phase5) moon -= step(0.9995, dot(viewSpacePos, vec3(frx_skyLightVector.xy, frx_skyLightVector.z - 0.01)) * 0.5 + 0.5);
    // if(phase4) moon = 0.0;
    
    sun = step(0.9997, sun);
    moon = step(0.9998, moon);
    vec3 sunCol = sun * SUN_COLOR;
    vec3 moonCol = moon * MOON_COLOR;

    float factor = mix(1.0, 0.0, frx_smoothedRainGradient);
    factor = mix(factor, 0.0, frx_thunderGradient);

    return (sunCol.rgb + moonCol.rgb) * frx_smootherstep(-0.0, 0.2, viewSpacePos.y) * factor * frx_worldIsOverworld;
} 
// -----------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------
#ifndef STRATUS_CLOUDS_SHARPNESS
    #define STRATUS_CLOUDS_SHARPNESS 3
#endif

// Thanks SixthSurge#3922 for helping me with curl noise which makes cirrus clouds much nicer
vec2 curlNoise(in vec2 plane) {
    float offset = 1e-3;
    float dx = smoothHash(plane + vec2(offset, 0.0));
    dx -= smoothHash(plane - vec2(offset, 0.0));
    dx /= 2.0 * offset;

    float dy = smoothHash(plane + vec2(0.0, offset));
    dy -= smoothHash(plane - vec2(0.0, offset));
    dy /= 2.0 * offset;

    return vec2(-dy, dx);
}

float worldOffset(in float offset) {
    // return smoothstep(
    //     -0.2 - 0.8 * (smoothHash(vec2(getWorldTime() * 0.001 + 4500.0)) * 0.5 + 0.5), 0.2 + 0.8 * (smoothHash(vec2(getWorldTime() * 0.001 + 1000.0)) * 0.5 + 0.5), 
    //     smoothHash(vec2(getWorldTime() * 0.001 + offset))
    // );
    return 1.0;
}
float cloudMovement(in float time) {
    time = mod(time, 1000.0);
    return time;
}

const float cloudSpeed = 0.05;
vec2 stratusClouds(in vec2 plane) {
    plane += cloudMovement(frx_renderSeconds) * cloudSpeed;
    return vec2(smoothstep(0.0, 1.0, fbmHash(plane * vec2(1.0, 1.0), 5)) * fbmHash(plane * vec2(1.0, 1.0), 2) * worldOffset(0.0), 1.0);
}
vec2 cumulusClouds(in vec2 plane, in int octaves) {
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.01);
    float cloudsThickness = 0.1;

    float cloudsDensity = 0.6 / (0.5 * cloudsThickness / length(plane) + (1.0 - 0.5 * cloudsThickness));

    return vec2(smoothstep(cloudsDensity, 0.85, fbmHash(plane, octaves, 0.01) * ((octaves + 1.0) / octaves)) * worldOffset(10.0), 1.0);
}
vec2 stratoCumulusClouds(in vec2 plane, in int octaves) {
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.04);
    plane *= 1.3;
    float cloudsThickness = 0.01;

    float cloudsDensity = 0.5 / (0.5 * cloudsThickness / length(plane) + (1.0 - 0.5 * cloudsThickness));

    return vec2(smoothstep(cloudsDensity, 0.85, fbmHash(plane * vec2(0.6, 0.3), octaves, 0.01) * ((octaves + 1.0) / octaves)) * worldOffset(50.0), 1.0);
}
vec2 nimboStratusClouds(in vec2 plane, in int octaves) {
    plane *= 0.7;
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.03);
    float cloudsThickness = 0.1;

    float cloudsDensity = 0.0 / (0.5 * cloudsThickness / length(plane) + (1.0 - 0.5 * cloudsThickness));

    return vec2(0.75 * smoothstep(0.3, 0.6, fbmHash(plane, octaves, 0.01) * ((octaves + 1.0) / octaves)) * worldOffset(100.0), 1.0);
}
vec2 altoStratusClouds(in vec2 plane, in int octaves) {
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.04);
    return vec2(smoothstep(0.3, 1.0, fbmHash(plane * vec2(2.0, 0.75), octaves)) * fbmHash(plane * vec2(1.0, 1.0), octaves) * worldOffset(150.0), 1.0);
}
vec2 altoCumulusClouds(in vec2 plane, in int octaves) {
    plane *= 1.7;
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.05);
    float cloudsThickness = 0.1;

    float cloudsDensity = 0.0 / (0.5 * cloudsThickness / length(plane) + (1.0 - 0.5 * cloudsThickness));

    return vec2((smoothstep(0.0, 0.8, fbmHash(plane * 2.0 + 10.0, octaves, 0.01))) * worldOffset(200.0), 1.0);
}
vec2 cirroStratusClouds(in vec2 plane, in int octaves) {
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.06);
    return vec2(0.65 * smoothstep(0.1, 0.4, fbmHash(plane * vec2(3.0, 1.5) + 10.0, octaves) * fbmHash(plane * vec2(2.0, 1.0), octaves)) * worldOffset(250.0), 1.0);
}
vec2 cirroCumulusClouds(in vec2 plane, in int octaves) {
    plane *= 3.5;
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.07);
    float cloudsThickness = 0.1;

    float cloudsDensity = 0.0 / (0.5 * cloudsThickness / length(plane) + (1.0 - 0.5 * cloudsThickness));

    return vec2(smoothstep(0.0, 1.0, sqrt(fbmHash(plane, octaves, 0.01))) * (smoothHash(plane * 0.4 + 10.0) * 0.3 + 0.7) * worldOffset(300.0), 1.0);
}
vec2 cirrusClouds(in vec2 plane, in int octaves) {
    plane += cloudMovement(frx_renderSeconds) * (cloudSpeed - 0.08);
    return vec2(fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.2, 0.9, fbmHash(plane, octaves)), 1.0);
}


float cloudSort(in float a, in float b) {
    return mix(a, b, b);
}
float cloudSort(in float a, in vec2 b) {
    return mix(a, b.y, b.x);
}
vec2 calculateBasicCloudsOctaves(in vec3 viewSpacePos, int octaves, bool doLighting) {
    #ifndef CLOUDS
        return vec2(0.0);
    #endif
    vec2 plane = (viewSpacePos.xz * 2.0) / (viewSpacePos.y + 0.15 * length(viewSpacePos.xz));
    plane += frx_cameraPos.xz / 75.0;

    plane += curlNoise(plane * 2.0) * 0.05;

    #ifdef CLOUDS_CONSTANT_WEIGHT
        float weightStratus       = 1.0;
        float weightCumulus       = 1.0;
        float weightStratoCumulus = 1.0;
        float weightNimboStratus  = 1.0;
        float weightAltoStratus   = 1.0;
        float weightAltoCumulus   = 1.0;
        float weightCirroStratus  = 1.0;
        float weightCirroCumulus  = 1.0;
        float weightCirrus        = 1.0;
    #else
        float weightStratus       = smoothstep(0.2, 0.9, frx_noise2d(vec2(frx_worldDay - 110.0)));
        float weightCumulus       = smoothstep(0.2, 0.4, frx_noise2d(vec2(frx_worldDay + 110.0)));
        float weightStratoCumulus = smoothstep(0.2, 0.4, frx_noise2d(vec2(frx_worldDay + 210.0)));
        float weightNimboStratus  = clamp01(frx_rainGradient + smoothstep(0.99, 1.0, frx_noise2d(vec2(frx_worldDay + 310.0))));
        float weightAltoStratus   = smoothstep(0.7, 0.9, frx_noise2d(vec2(frx_worldDay + 410.0)));
        float weightAltoCumulus   = smoothstep(0.7, 0.8, frx_noise2d(vec2(frx_worldDay + 510.0)));
        float weightCirroStratus  = smoothstep(0.7, 0.8, frx_noise2d(vec2(frx_worldDay + 610.0)));
        float weightCirroCumulus  = smoothstep(0.7, 0.8, frx_noise2d(vec2(frx_worldDay + 710.0)));
        float weightCirrus        = smoothstep(0.0, 0.1, frx_noise2d(vec2(frx_worldDay + 810.0)));
    #endif

    #ifndef STRATUS_CLOUDS
        weightStratus = 0.0;
    #endif
    #ifndef CUMULUS_CLOUDS
        weightCumulus = 0.0;
    #endif
    #ifndef STRATOCUMULUS_CLOUDS
        weightStratoCumulus = 0.0;
    #endif
    #ifndef NIMBOSTRATUS_CLOUDS
        weightNimboStratus = 0.0;
    #endif
    #ifndef ALTOSTRATUS_CLOUDS
        weightAltoStratus = 0.0;
    #endif
    #ifndef ALTOCUMULUS_CLOUDS
        weightAltoCumulus = 0.0;
    #endif
    #ifndef CIRROSTRATUS_CLOUDS
        weightCirroStratus = 0.0;
    #endif
    #ifndef CIRROCUMULUS_CLOUDS
        weightCirroCumulus = 0.0;
    #endif
    #ifndef CIRRUS_CLOUDS
        weightCirrus = 0.0;
    #endif
    
    vec2 stratusNoise;
    vec2 cumulusNoise;
    vec2 stratoCumulusNoise;
    vec2 nimboStratusNoise;
    vec2 altoStratusNoise;
    vec2 altoCumulusNoise;
    vec2 cirroStratusNoise;
    vec2 cirroCumulusNoise;
    vec2 cirrusNoise;

    if(weightStratus > 0.0)       stratusNoise       = stratusClouds(plane);
    if(weightCumulus > 0.0)       cumulusNoise       = cumulusClouds(plane, octaves);
    if(weightStratoCumulus > 0.0) stratoCumulusNoise = stratoCumulusClouds(plane, octaves);
    if(weightNimboStratus > 0.0)  nimboStratusNoise  = nimboStratusClouds(plane, octaves);
    if(weightAltoStratus > 0.0)   altoStratusNoise   = altoStratusClouds(plane, octaves);
    if(weightAltoCumulus > 0.0)   altoCumulusNoise   = altoCumulusClouds(plane, octaves);
    if(weightCirroStratus > 0.0)  cirroStratusNoise  = cirroStratusClouds(plane, octaves);
    if(weightCirroCumulus > 0.0)  cirroCumulusNoise  = cirroCumulusClouds(plane, octaves);
    if(weightCirrus > 0.0)        cirrusNoise        = cirrusClouds(plane, octaves);

    vec2 rayDirection = frx_skyLightVector.xz;

    if(doLighting) { // cloud self shadow
        vec2 rayDir = frx_skyLightVector.xz;

        if(weightCumulus > 0.0) {
            float cumulusThickness = 30.0;
            vec2 cumulusPlane = plane + rayDir / cumulusThickness;
            for(int i = 0; i < 15; i++) {
                cumulusPlane += rayDir / cumulusThickness;// * exp2(float(-i));
                cumulusNoise.y -= cumulusClouds(cumulusPlane, 2).x / 25.0;
            }
        }

        if(weightStratoCumulus > 0.0) {
            float stratoCumulusThickness = 30.0;
            vec2 stratoCumulusPlane = plane + rayDir / stratoCumulusThickness;
            for(int i = 0; i < 15; i++) {
                stratoCumulusPlane += rayDir / stratoCumulusThickness;// * exp2(float(-i));
                stratoCumulusNoise.y -= stratoCumulusClouds(stratoCumulusPlane, 2).x / stratoCumulusThickness;
            }
        }

        if(weightNimboStratus > 0.0) {
            float nimboStratusThickness = 10.0;
            vec2 nimboStratusPlane = plane + rayDir / nimboStratusThickness;
            for(int i = 0; i < 7; i++) {
                nimboStratusPlane += rayDir / nimboStratusThickness;// * exp2(float(-i));
                // nimboStratusNoise.y += 0.6;
                nimboStratusNoise.y -= nimboStratusNoise.x * nimboStratusClouds(nimboStratusPlane, 2).x / nimboStratusThickness;
            }
        }

        if(weightAltoCumulus > 0.0) {
            float altoCumulusThickness = 80.0;
            vec2 altoCumulusPlane = plane + rayDir / altoCumulusThickness;
            for(int i = 0; i < 7; i++) {
                altoCumulusPlane += rayDir / altoCumulusThickness;// * exp2(float(-i));
                altoCumulusNoise.y -= altoCumulusNoise.x * altoCumulusClouds(altoCumulusPlane, 2).x / 12.0;
            }
        }

        if(weightCirroCumulus > 0.0) {
            float cirroCumulusThickness = 40.0;
            vec2 cirroCumulusPlane = plane + rayDir / cirroCumulusThickness;
            for(int i = 0; i < 7; i++) {
                cirroCumulusPlane += rayDir / cirroCumulusThickness;// * exp2(float(-i));
                cirroCumulusNoise.y += 0.15 * cirroCumulusNoise.x;
                cirroCumulusNoise.y -= cirroCumulusNoise.x * cirroCumulusClouds(cirroCumulusPlane, 2).x / 4.0;
            }
        }
    }

    stratusNoise       *= vec2(weightStratus      , 1.0);
    cumulusNoise       *= vec2(weightCumulus      , 1.0);
    stratoCumulusNoise *= vec2(weightStratoCumulus, 1.0);
    nimboStratusNoise  *= vec2(weightNimboStratus , 1.0);
    altoStratusNoise   *= vec2(weightAltoStratus  , 1.0);
    altoCumulusNoise   *= vec2(weightAltoCumulus  , 1.0);
    cirroStratusNoise  *= vec2(weightCirroStratus , 1.0);
    cirroCumulusNoise  *= vec2(weightCirroCumulus , 1.0);
    cirrusNoise        *= vec2(weightCirrus       , 1.0);

    float finalCloudShape, finalCloudShading = 1.6;

    finalCloudShape = cloudSort(finalCloudShape, cirrusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, cirroCumulusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, cirroStratusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, altoCumulusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, altoStratusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, nimboStratusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, stratoCumulusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, cumulusNoise.x);
    finalCloudShape = cloudSort(finalCloudShape, stratusNoise.x);

    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * cirrusNoise.y)        + cirrusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * cirroCumulusNoise.y)  + cirroCumulusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * cirroStratusNoise.y)  + cirroStratusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * altoCumulusNoise.y)   + altoCumulusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * altoStratusNoise.y)   + altoStratusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * nimboStratusNoise.y)  + nimboStratusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * stratoCumulusNoise.y) + stratoCumulusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * cumulusNoise.y)       + cumulusNoise);
    finalCloudShading = cloudSort(finalCloudShading, vec2(0.0, 0.5 * stratusNoise.y)       + stratusNoise);

    return vec2(finalCloudShape, finalCloudShading);
}
// -----------------------------------------------------------------------------------------------------------------------
#ifndef CLOUD_NOISE_OCTAVES
    #define CLOUD_NOISE_OCTAVES 1
#endif
vec3 sampleSky(in vec3 viewSpacePos) {
    float l = length(viewSpacePos);
    viewSpacePos = fNormalize(viewSpacePos);
    vec3 skyResult = vec3(0.0);
    vec3 tdata = getTimeOfDayFactors();

    skyResult = calculateSkyColor(viewSpacePos) + rand3D(viewSpacePos.xz * 2000.0) / 200.0;
    // #ifndef DEPRESSING_MODE
    //     skyResult += frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
    // #else
    //     skyResult += 0.5 * frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.01, distance(viewSpacePos, getSunVector()))) * 0.1, 0.9));
    // #endif
    // skyResult += frx_worldIsOverworld * tdata.y * mix(skyResult, (MOON_COLOR * 0.5 + 0.5) * 0.1, 0.5) * (pow((1.0 / max(0.01, distance(viewSpacePos, getMoonVector()) + 0.04)) * 0.1, 1.5));
    skyResult += calculateSun(viewSpacePos);

    vec2 starCoord = viewSpacePos.xz / (viewSpacePos.y + length(viewSpacePos.xz));
    vec3 starColor = vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 10.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5);
    skyResult += (step(0.98 + smoothHash(starCoord * 40.0) * 0.01, 1.0 - cellular2x2(starCoord * 18.0).x) * (1.0 - tdata.x)) * mix(starColor, vec3(1.0), 0.5);
    // skyResult += 50.0 * fNormalize(vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 1.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5)) * 
    //                 (smoothstep(0.95, 0.99, 1.0 - cellular2x2(starCoord * 1.0).x) * (1.0 - tdata.x));

    // clouds
    vec3 cloudsColor = vec3(0.0);
    cloudsColor = mix(mix(2.0, 2.0, tdata.y) * calculateSkyColor(vec3(0.0, -1.0, 0.0)), calculateSkyColor(viewSpacePos), 0.5);
    //cloudsColor = pow(calcAtmosphericScatterTop(viewSpacePos) * mix(vec3(1.0), SUN_COLOR, tdata.x), vec3(1.0 / 2.2));
    #ifndef DEPRESSING_MODE
        cloudsColor *= 1.5;
    #endif

    vec2 cloudsDensity = calculateBasicCloudsOctaves(viewSpacePos, CLOUD_NOISE_OCTAVES, true) * vec2(1.0, 1.0) + rand2D(viewSpacePos.xz * 2000.0) / 200.0; // x = clouds, y = shading
    
    #ifdef DEPRESSING_MODE
        cloudsDensity.y = cloudsDensity.y * 0.75 + 0.25;
    #endif
    
    cloudsColor *= cloudsDensity.y * 0.7;
    // cloudsDensity.x *= mix(1.0, 0.5, tdata.z);
    // cloudsDensity.x *= mix(1.0, 0.75, tdata.y);

    #ifdef DEPRESSING_MODE
        skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * (cloudsDensity.x * 2.0));
    #else
        skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * cloudsDensity.x);
    #endif    

    if(frx_worldIsEnd == 1) {
        skyResult -= mix(0.0, 0.5, (pow(clamp01(viewSpacePos.y), 0.7)));
        float dist = distance(viewSpacePos, fNormalize(vec3(0.0, 0.1, -0.4)));
        skyResult = mix(skyResult, vec3(0.9, 0.5, 1.0), 1.0 / max(0.0001, pow(dist, 0.6)) * 0.1);
    }

    return pow(skyResult, vec3(1.0));
}
vec3 sampleSkyReflection(in vec3 viewSpacePos) {
    viewSpacePos = fNormalize(viewSpacePos);
    vec3 skyResult = vec3(0.0);
    vec3 tdata = getTimeOfDayFactors();

    if(frx_cameraInWater == 0) {
        skyResult = calculateSkyColor(viewSpacePos) + rand3D(viewSpacePos.xz * 2000.0) / 200.0;
        #ifndef DEPRESSING_MODE
            skyResult += frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
        #else
            skyResult += frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.01, distance(viewSpacePos, getSunVector()))) * 0.1, 0.9));
        #endif
        skyResult += frx_worldIsOverworld * tdata.y * mix(skyResult, (MOON_COLOR * 0.5 + 0.5) * 0.1, 0.5) * (pow((1.0 / max(0.01, distance(viewSpacePos, getMoonVector()) + 0.04)) * 0.1, 1.5));
        skyResult += calculateSun(viewSpacePos);

        vec2 starCoord = viewSpacePos.xz / (viewSpacePos.y + length(viewSpacePos.xz));
        vec3 starColor = vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 10.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5);
        skyResult += (step(0.98 + smoothHash(starCoord * 40.0) * 0.01, 1.0 - cellular2x2(starCoord * 18.0).x) * (1.0 - tdata.x)) * mix(starColor, vec3(1.0), 0.5);
        // skyResult += 50.0 * fNormalize(vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 1.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5)) * 
        //                 (smoothstep(0.95, 0.99, 1.0 - cellular2x2(starCoord * 1.0).x) * (1.0 - tdata.x));


        // clouds
        vec3 cloudsColor = vec3(0.0);
        cloudsColor = mix(mix(2.0, 4.0, tdata.y) * calculateSkyColor(vec3(0.0, -1.0, 0.0)), calculateSkyColor(viewSpacePos) + tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((5.0 / max(0.01, distance(viewSpacePos, getSunVector()) + 0.03)) * 0.02, 1.5)), 0.5);
        cloudsColor *= 1.5;

        #if CLOUD_LIGHTING == LIGHTING_NONE
            #define BRIGHTNESS_MODIFIER vec2(1.0,1.0)
        #elif CLOUD_LIGHTING == LIGHTING_NORMALS
            #define BRIGHTNESS_MODIFIER vec2(1.0, 1.5)
        #elif CLOUD_LIGHTING == LIGHTING_RAYMARCHED
            #define BRIGHTNESS_MODIFIER vec2(1.0,1.5)
        #endif

        vec2 cloudsDensity = calculateBasicCloudsOctaves(viewSpacePos, 3, false) * BRIGHTNESS_MODIFIER; // x = clouds, y = shading

        #ifdef DEPRESSING_MODE
            cloudsDensity.y = cloudsDensity.y * 0.75 + 0.25;
        #endif

        cloudsColor *= cloudsDensity.y * 0.7;
        cloudsDensity.x *= mix(1.0, 0.5, tdata.z);
        cloudsDensity.x *= mix(1.0, 0.75, tdata.y);

        #ifdef DEPRESSING_MODE
            skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * (cloudsDensity.x * 2.0));
        #else
            skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * cloudsDensity.x);
        #endif

    } else {
        skyResult = vec3(0.1, 0.5, 0.7);
    }
    
    if(frx_worldIsEnd == 1) {
        skyResult -= mix(0.0, 0.5, (pow(clamp01(viewSpacePos.y), 0.7)));
        float dist = distance(viewSpacePos, fNormalize(vec3(0.0, 0.1, -0.4)));
        skyResult = mix(skyResult, vec3(0.9, 0.5, 1.0), 1.0 / max(0.0001, pow(dist, 0.6)) * 0.1);
    }

    return skyResult;
}
vec3 sampleFogColor(in vec3 viewSpacePos) {
    vec3 color = mix(calculateSkyColor(fNormalize(viewSpacePos)), vec3(0.0), frx_effectBlindness);
    color = mix(color, vec3(0.1, 0.5, 0.7) * mix(0.5, 1.0, clamp01(frx_smoothedEyeBrightness.y * getTimeOfDayFactors().x)) * max(0.75, min(1.5, inversesqrt(1.0 - frx_smoothedEyeBrightness.y))), frx_cameraInWater);
    color = mix(color, vec3(1.9, 0.5, 0.1) * max(0.75, sqrt(frx_smoothedEyeBrightness.y)), frx_cameraInLava);
    color = mix(color, vec3(0.2), clamp01((1.0 - frx_smoothedEyeBrightness.y) * frx_smootherstep(40.0, 30.0, frx_cameraPos.y) - 0.5 * frx_cameraInWater));
    return color;
}
// Some inspiration for a simple but nice fog model from Inigo Quilez
// https://iquilezles.org/articles/fog/
vec3 simpleFog(in vec3 color, in vec3 viewSpacePos) {
    vec3 tdata = getTimeOfDayFactors();
    vec3 viewDir = fNormalize(viewSpacePos);

    float blockDist = length(viewSpacePos);
    if(frx_cameraInFluid == 0) blockDist = max(0.0, blockDist - 7.0);
    blockDist /= 256.0;

    float fogDensity = 1.0;
    fogDensity = mix(fogDensity, 0.1, tdata.x);
    fogDensity = mix(fogDensity, 2.5, tdata.y);
    fogDensity = mix(fogDensity, 2.0, tdata.z);
    fogDensity = mix(fogDensity, 4.0, frx_worldIsNether + frx_worldIsEnd);
    fogDensity = mix(fogDensity, 5.5, frx_smoothedRainGradient);
    fogDensity = mix(fogDensity, 5.5, frx_thunderGradient);
    fogDensity = mix(fogDensity, 36.0, clamp01(frx_cameraInWater - frx_effectWaterBreathing - frx_effectConduitPower));
    fogDensity = mix(fogDensity, 66.0, clamp01(frx_cameraInLava - frx_effectFireResistance));

    vec3 worldPos = viewSpacePos + frx_cameraPos;
    fogDensity += 1.0 * smoothstep(90.0, 40.0, worldPos.y) * mix(1.0, 0.5, tdata.x) * frx_smoothedEyeBrightness.y;

    #ifdef DEPRESSING_MODE
        fogDensity *= 0.1;
    #endif

    float fogAmount = 1.0 - exp(-blockDist * fogDensity);


    vec3 horizonColor = sampleFogColor(vec3(viewDir.x, 0.0, viewDir.z));
    vec3 skyColor = sampleFogColor(viewDir);
    vec3 fogColor = mix(horizonColor, skyColor, 0.5);

    float saturationAmount = 1.0;
    saturationAmount = mix(saturationAmount, 2.5, tdata.x * frx_worldIsOverworld);
    saturationAmount = mix(saturationAmount, 1.5, tdata.y * frx_worldIsOverworld);
    saturationAmount = mix(saturationAmount, 1.0, tdata.z * frx_worldIsOverworld);

    saturationAmount = mix(saturationAmount, 1.0, frx_rainGradient);

    #ifdef DEPRESSING_MODE
        saturationAmount = mix(saturationAmount, 1.0, 0.25);
    #endif

    // saturate fog color to avoid "washed out" look
    fogColor = mix(vec3(frx_luminance(fogColor)), fogColor * vec3(1.05, 1.05, 1.0), saturationAmount);

    float vanillaFogAmount = 0.0;
    if(frx_worldIsOverworld == 1) vanillaFogAmount = smoothstep(frx_fogStart, frx_fogEnd, blockDist * 256.0);
    else vanillaFogAmount = smoothstep(frx_viewDistance - 32.0, frx_viewDistance - 16.0, blockDist * 256.0);
    

    return mix(color * (1.0 - fogAmount) + fogColor * fogAmount, skyColor, vanillaFogAmount);
}

// -----------------------------------------------------------------------------------------------------------------------
