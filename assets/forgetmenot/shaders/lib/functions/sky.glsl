// -----------------------------------------------------------------------------------------------------------------------
vec3 calculateSkyColor(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
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
        daytimeSky = mix(daytimeSky, daytimeSky * 0.5 + vec3(1.5, 1.2, 0.4) * 0.8, clamp01(pow(dot(viewSpacePos, getSunVector()), 5.0) * 0.55));
        //daytimeSky = mix(daytimeSky, mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5), (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 2.0)) * 1.0);
        //daytimeSky += mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
        // daytimeSky += SUN_COLOR * max(0.1, 1.0 / clamp01(dot(viewSpacePos, getSunVector()))) * 0.01;
        daytimeSky *= 1.1;
        daytimeSky.rg *= vec2(1.0, 1.0);
        daytimeSky = mix(vec3(frx_luminance(daytimeSky)), daytimeSky, 0.9);
        // contrast(daytimeSky, 1.5);


        vec3 nighttimeSky = vec3(0.506,0.577,0.620) * 3.5;
        nighttimeSky = mix(nighttimeSky, vec3(0.401,0.453,0.565) * 3.8, frx_smootherstep(-0.1, 0.2, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.344,0.376,0.500) * 2.5, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.291,0.327,0.460) * 2.2, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        nighttimeSky *= 0.1;
        nighttimeSky.b *= 1.8;
        nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.505,0.685) * 0.8, clamp01(pow(dot(viewSpacePos, getMoonVector()), 11.0)));
        //nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.505,0.885) * 2.0, clamp01(pow(dot(viewSpacePos, getMoonVector()), 15.0) * 0.55));
        nighttimeSky = mix(nighttimeSky, vec3(frx_luminance(nighttimeSky)) * 1.5, 0.25);

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

        skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * 0.5, 0.5 * frx_smoothedRainGradient);
        skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * (0.75 + 0.2 * (1.0 - tdata.x)), 0.5 * frx_thunderGradient);
        // skyColor = mix(skyColor, vec3(frx_luminance(skyColor)), -0.5);

        // this saturates the sky but is it really needed?
        // float skyLum = frx_luminance(skyColor);
        // skyColor *= skyColor;
        // skyColor *= 1.0 + skyLum;
        skyColor *= vec3(1.1, 1.0, 0.9);
    } else if(frx_worldIsEnd == 1) {
        skyColor = vec3(0.4, 0.2, 0.4);
    } else skyColor = frx_fogColor.rgb * 2.0;

    #ifdef DEPRESSING_MODE
        //skyColor = skyColor * 0.5 + 0.5;
    #endif

    return skyColor;// + frx_noise2d(viewSpacePos.xz) / 150.0;
}
// -----------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------
vec3 calculateSun(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
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

    float factor = mix(1.0, 0.5, frx_smoothedRainGradient);
    factor = mix(factor, 0.0, frx_thunderGradient);

    return (sunCol.rgb + moonCol.rgb) * frx_smootherstep(0.0, 0.2, viewSpacePos.y) * factor * frx_worldIsOverworld;
} 
// -----------------------------------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------------------------------
#ifndef STRATUS_CLOUDS_SHARPNESS
    #define STRATUS_CLOUDS_SHARPNESS 3
#endif

float getCloudNoise(in vec2 plane, in int octaves) {
    #ifdef RANDOM_CLOUD_DENSITY
        float cloudDensity = 0.5 + smoothHash(vec2(frx_worldTime * 24000.0 + (frx_worldDay - 1.0) * 24000.0) * 0.001) * 0.15;
        float cloudMixFactor = (smoothstep(0.0, 1.0, smoothHash(plane * 0.01 + getWorldTime() * 0.0001 + 1.0) * 0.5 + 0.5));
    #else
        float cloudDensity = 0.5;
        float cloudMixFactor = 1.0;
    #endif

    cloudMixFactor = pow(cloudMixFactor, 1.5);

    float lowerBound = mix(0.0, cloudDensity - 0.25 * frx_smoothedRainGradient - 0.25 * frx_thunderGradient, cloudMixFactor);
    float upperBound = mix(1.0, cloudDensity + 0.2, cloudMixFactor);

    #ifdef STRATUS_CLOUDS
        return smoothstep(lowerBound, upperBound, fbmHash(plane + 10.0, octaves));
    #else 
        return 0.0;
    #endif
}

vec2 calculateBasicCloudsOctaves(in vec3 viewSpacePos, int octaves, bool doLighting) {
    #ifdef CLOUDS
        if(frx_worldIsOverworld == 1) {
            vec2 plane = (viewSpacePos.xz * 2.0) / (viewSpacePos.y == 0.0 ? 0.1 : viewSpacePos.y + pow(length(viewSpacePos.xz), 2.0) * 0.18);
            plane += frx_cameraPos.xz / 75.0; // makes it feel a bit more natural instead of being centered around the player
            plane += frx_renderSeconds / 35.0;
            
            float clouds;

            clouds = getCloudNoise(plane, octaves);

            float cloudLighting = 1.0;

            #ifdef STRATUS_CLOUDS
                #if CLOUD_LIGHTING == LIGHTING_NORMALS
                    if(doLighting) {
                        float offset = 0.2;
                        float height1 = getCloudNoise(plane + vec2(offset, 0.0), 2);
                        float height2 = getCloudNoise(plane + vec2(0.0, offset), 2);
                        float height3 = getCloudNoise(plane - vec2(offset, 0.0), 2);
                        float height4 = getCloudNoise(plane - vec2(0.0, offset), 2);

                        float deltaX = height3 - height1;
                        float deltaY = height4 - height2;

                        vec3 cloudNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
                        cloudNormal = normalize(cloudNormal);
                        cloudLighting = (dot(cloudNormal, frx_skyLightVector) * 0.5 + 1.1);
                    }
                #elif CLOUD_LIGHTING == LIGHTING_RAYMARCHED
                    if(doLighting) { // cloud self shadow
                        cloudLighting = 1.6;
                        vec2 rayDir = frx_skyLightVector.xz / 15.0;
                        vec2 rayPos = plane + rayDir;
                        for(int i = 0; i < 10; i++) {
                            rayPos += rayDir;// * exp2(float(-i));
                            cloudLighting -= getCloudNoise(rayPos, 3) * 0.1;
                        }
                    }
                #endif
            #endif

            #ifdef CIRRUS_CLOUDS
                clouds += fbmHash(plane * vec2(15.0, 3.0) + vec2(smoothHash(plane.yy * 0.5) * 4.0, 0.0), CIRRUS_CLOUDS_SHARPNESS) * smoothstep(0.4 - 0.2 * frx_smoothedRainGradient - 0.1 * frx_thunderGradient, 0.9, fbmHash(plane * vec2(2.0, 1.0), 3)) * 1.0;
                #ifndef STRATUS_CLOUDS
                    clouds *= 2.0;
                #else 
                #endif
            #endif
            return vec2(clouds, (1.0 - 0.25 * frx_smoothedRainGradient - 0.25 * frx_thunderGradient) * cloudLighting);
        } else {
            return vec2(0.0);
        }
    #else
        return vec2(0.0);
    #endif
}
// -----------------------------------------------------------------------------------------------------------------------

vec3 sampleSky(in vec3 viewSpacePos) {
    float l = length(viewSpacePos);
    viewSpacePos = normalize(viewSpacePos);
    vec3 skyResult = vec3(0.0);
    vec3 tdata = getTimeOfDayFactors();

    skyResult = calculateSkyColor(viewSpacePos) + rand3D(viewSpacePos.xz * 2000.0) / 200.0;
    skyResult += frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
    skyResult += calculateSun(viewSpacePos);

    vec2 starCoord = viewSpacePos.xz / (viewSpacePos.y + length(viewSpacePos.xz));
    vec3 starColor = vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 10.0) * 0.5 + 0.5, smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5);
    skyResult += (step(0.98 + smoothHash(starCoord * 40.0) * 0.01, 1.0 - cellular2x2(starCoord * 18.0).x) * (1.0 - tdata.x)) * mix(starColor, vec3(1.0), 0.5);
    // skyResult += 50.0 * normalize(vec3(smoothHash(starCoord * 40.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 1.0) * 0.5 + 0.5,smoothHash(starCoord * 40.0 + 20.0) * 0.5 + 0.5)) * 
    //                 (smoothstep(0.95, 0.99, 1.0 - cellular2x2(starCoord * 1.0).x) * (1.0 - tdata.x));

    // clouds
    vec3 cloudsColor = vec3(0.0);
    cloudsColor = mix(calculateSkyColor(vec3(0.0, -1.0, 0.0)), calculateSkyColor(viewSpacePos) + tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((5.0 / max(0.01, distance(viewSpacePos, getSunVector()) + 0.03)) * 0.02, 1.5)), 0.5);
    cloudsColor *= 1.5;

    vec2 cloudsDensity = calculateBasicCloudsOctaves(viewSpacePos, STRATUS_CLOUDS_SHARPNESS, true) * vec2(1.0, 1.0) + rand2D(viewSpacePos.xz * 2000.0) / 200.0; // x = clouds, y = shading
    cloudsColor *= cloudsDensity.y * 0.7;
    cloudsDensity.x *= mix(1.0, 0.5, tdata.z);
    cloudsDensity.x *= mix(1.0, 0.75, tdata.y);

    skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * cloudsDensity.x);

    // vec3 rayPos = viewSpacePos * l;
    // vec3 rayDir = frx_skyLightVector;
    // vec3 rays;
    // for(int i = 0; i < 10; i++) {
    //     rayPos += rayDir / 100.0;
    //     rays += length(rayPos * 0.5) * (SUN_COLOR * 0.1) * (1.0 - getCloudNoise((rayPos.xz * 2.0) / (rayPos.y == 0.0 ? 0.1 : rayPos.y + pow(length(rayPos.xz), 2.0) * 0.15) + frx_cameraPos.xz / 75.0 + frx_renderSeconds / 35.0, 10)) / 25.0;
    // }
    // skyResult += rays * frx_luminance(rays) * 2.0;
    

    if(frx_worldIsEnd == 1) {
        skyResult -= mix(0.0, 0.5, (pow(clamp01(viewSpacePos.y), 0.7)));
        float dist = distance(viewSpacePos, normalize(vec3(0.0, 0.1, -0.4)));
        skyResult = mix(skyResult, vec3(0.9, 0.5, 1.0), 1.0 / max(0.0001, pow(dist, 0.6)) * 0.1);
    }

    return pow(skyResult, vec3(1.0));
}
vec3 sampleSkyReflection(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
    vec3 skyResult = vec3(0.0);
    vec3 tdata = getTimeOfDayFactors();

    if(frx_cameraInWater == 0) {
        skyResult = calculateSkyColor(viewSpacePos);
        skyResult += frx_worldIsOverworld * tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
        skyResult += calculateSun(viewSpacePos);

        vec2 starCoord = viewSpacePos.xz / (viewSpacePos.y + length(viewSpacePos.xz));
        skyResult += step(0.98, 1.0 - cellular2x2(starCoord * 18.0).x) * (1.0 - tdata.x);

        // clouds
        vec3 cloudsColor = vec3(0.0);
        cloudsColor = mix(calculateSkyColor(vec3(0.0, -1.0, 0.0)), calculateSkyColor(viewSpacePos) + tdata.x * mix(skyResult, (SUN_COLOR) * 0.1, 0.5) * (pow((5.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.02, 1.5)), 0.5);
        cloudsColor *= 1.5;

        #if CLOUD_LIGHTING == LIGHTING_NONE
            #define BRIGHTNESS_MODIFIER vec2(1.0,1.0)
        #elif CLOUD_LIGHTING == LIGHTING_NORMALS
            #define BRIGHTNESS_MODIFIER vec2(1.0, 1.5)
        #elif CLOUD_LIGHTING == LIGHTING_RAYMARCHED
            #define BRIGHTNESS_MODIFIER vec2(1.0,1.5)
        #endif

        vec2 cloudsDensity = calculateBasicCloudsOctaves(viewSpacePos, 3, false) * BRIGHTNESS_MODIFIER; // x = clouds, y = shading
        cloudsColor *= cloudsDensity.y * 0.7;
        cloudsDensity.x *= mix(1.0, 0.5, tdata.z);
        cloudsDensity.x *= mix(1.0, 0.75, tdata.y);

        skyResult = mix(skyResult, mix(skyResult, cloudsColor, 0.75), frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * cloudsDensity.x);
    } else {
        skyResult = vec3(0.1, 0.5, 0.7);
    }
    
    if(frx_worldIsEnd == 1) {
        skyResult -= mix(0.0, 0.5, (pow(clamp01(viewSpacePos.y), 0.7)));
        float dist = distance(viewSpacePos, normalize(vec3(0.0, 0.1, -0.4)));
        skyResult = mix(skyResult, vec3(0.9, 0.5, 1.0), 1.0 / max(0.0001, pow(dist, 0.6)) * 0.1);
    }

    return skyResult;
}
vec3 sampleFogColor(in vec3 viewSpacePos) {
    vec3 color = mix(calculateSkyColor(normalize(viewSpacePos)), vec3(0.0), frx_effectBlindness);
    color = mix(color, vec3(0.1, 0.5, 0.7) * mix(0.5, 1.0, getTimeOfDayFactors().x) * max(0.75, min(1.5, inversesqrt(1.0 - frx_smoothedEyeBrightness.y))), frx_cameraInWater);
    color = mix(color, vec3(1.9, 0.5, 0.1) * max(0.75, sqrt(frx_smoothedEyeBrightness.y)), frx_cameraInLava);
    return color;
}

// -----------------------------------------------------------------------------------------------------------------------
float getOverworldFogDensity(in vec3 timeFactors, in float blockDist) {
    float fogStartMin = 10.0;
    float fogFactor = 1.0 - exp2(-blockDist / frx_viewDistance);

    fogFactor = mix(fogFactor, fogFactor * 1.5, timeFactors.z);
    fogFactor = mix(fogFactor, fogFactor * 1.2, timeFactors.y);
    fogFactor = mix(fogFactor, fogFactor * 0.8, timeFactors.x);

    return fogFactor;
}
float getNetherFogDensity(in float blockDist, in bool reverse) {
    float fogFactor = 1.0 - exp2(-blockDist / frx_viewDistance);
    if(reverse) fogFactor = 1.0 - fogFactor;
    fogFactor *= 3.0;
    
    return fogFactor;
}
float getFogDensity(in vec3 timeFactors, in float blockDist) {
    float fogFactor = frx_smootherstep(frx_fogStart, frx_fogEnd, blockDist); // vanilla fog unless specified otherwise

    float overworldOutOfWater = clamp(float(frx_worldIsOverworld) + float(frx_playerEyeInFluid), 0.0, 1.0);
    fogFactor = mix(fogFactor, getOverworldFogDensity(timeFactors, blockDist), overworldOutOfWater);

    float netherOrEnd = clamp(float(frx_worldIsNether + frx_worldIsEnd), 0.0, 1.0);
    fogFactor = mix(fogFactor, getNetherFogDensity(blockDist, false), netherOrEnd);

    // float fluidFog = frx_smootherstep(frx_fogStart, frx_fogEnd, blockDist);
    // fogFactor = mix(fogFactor, fogFactor, float(frx_playerEyeInFluid));
    
    return fogFactor;
}
// -----------------------------------------------------------------------------------------------------------------------
