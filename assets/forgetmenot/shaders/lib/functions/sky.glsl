// -----------------------------------------------------------------------------------------------------------------------
vec3 calculateSkyColor(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
    vec3 tdata = getTimeOfDayFactors();

    vec3 skyColor = vec3(0.0);

    if(frx_worldIsOverworld == 1) {
        vec3 overworldSkyColor = vec3(0.0);

        // // a whole lot of magic numbers
        vec3 daytimeSky = vec3(0.864,1.118,1.300) * 1.2;
        daytimeSky = mix(daytimeSky, vec3(0.445,0.647,0.840) * 1.1, frx_smootherstep(-0.5, 0.3, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.305,0.528,0.805) * 0.9, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.208,0.444,0.760) * 0.8, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        //daytimeSky = mix(daytimeSky, mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5), (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 2.0)) * 1.0);
        daytimeSky += mix(daytimeSky, (SUN_COLOR) * 0.1, 0.5) * (pow((1.0 / max(0.05, distance(viewSpacePos, getSunVector()))) * 0.1, 1.5));
        // daytimeSky += SUN_COLOR * max(0.1, 1.0 / clamp01(dot(viewSpacePos, getSunVector()))) * 0.01;
        daytimeSky *= 1.1;
        daytimeSky.rg *= vec2(1.0, 1.0);
        daytimeSky = mix(vec3(frx_luminance(daytimeSky)), daytimeSky, 0.9);


        vec3 nighttimeSky = vec3(0.506,0.577,0.620) * 3.5;
        nighttimeSky = mix(nighttimeSky, vec3(0.401,0.453,0.565) * 3.8, frx_smootherstep(-0.1, 0.2, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.344,0.376,0.500) * 2.5, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.291,0.327,0.460) * 2.2, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        nighttimeSky *= 0.1;
        nighttimeSky.b *= 1.8;
        nighttimeSky = mix(nighttimeSky, nighttimeSky * 0.5 + vec3(0.475,0.505,0.685) * 0.8, clamp01(pow(dot(viewSpacePos, getMoonVector()), 11.0)));

        vec3 sunsetSky = vec3(0.605,0.382,0.361) * 1.0; // red 
        sunsetSky = mix(sunsetSky, vec3(0.605,0.482,0.461) * 0.9, smoothstep(-0.3, 0.0, viewSpacePos.y)); // green-ish
        sunsetSky = mix(sunsetSky, vec3(0.284,0.456,0.555) * 0.8, smoothstep(-0.1, 0.5, viewSpacePos.y)); // cyan-ish
        sunsetSky = mix(sunsetSky, vec3(0.245,0.342,0.560) * 0.7, smoothstep(0.0, 0.6, viewSpacePos.y)); // blue
        sunsetSky = mix(sunsetSky, vec3(0.225,0.302,0.510) * 0.6, smoothstep(0.3, 0.8, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.181,0.251,0.485) * 0.5, smoothstep(0.5, 1.5, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(0.7, 0.5, 0.4) * 0.6, clamp01(pow(dot(viewSpacePos, getSunVector()), 3.0)));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(1.5, 1.0, 0.4) * 0.6, clamp01(pow(dot(viewSpacePos, getSunVector()), 5.0) * 0.25));
        sunsetSky = mix(sunsetSky, sunsetSky * 0.5 + vec3(0.475,0.505,0.685), clamp01(pow(dot(viewSpacePos, getMoonVector()), 3.0)));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(1.2, 0.5, 0.3), clamp01(dot(frx_cameraView, getSunVector()) * 0.2));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(0.5, 0.7, 1.0), clamp01(dot(frx_cameraView, getMoonVector()) * 0.2));
        // sunsetSky = mix(sunsetSky, vec3(frx_luminance(sunsetSky)), -1.0);
        sunsetSky *= 1.0;
        
        overworldSkyColor = mix(overworldSkyColor, daytimeSky, tdata.x);
        overworldSkyColor = mix(overworldSkyColor, nighttimeSky, tdata.y);
        overworldSkyColor = mix(overworldSkyColor, sunsetSky, tdata.z);

        skyColor = overworldSkyColor;

        skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * 0.5, 0.5 * frx_smoothedRainGradient);
        skyColor = mix(skyColor, vec3(frx_luminance(skyColor)) * 0.75, 0.5 * frx_thunderGradient);
        // skyColor = mix(skyColor, vec3(frx_luminance(skyColor)), -0.5);

        // this saturates the sky but is it really needed?
        // float skyLum = frx_luminance(skyColor);
        // skyColor *= skyColor;
        // skyColor *= 1.0 + skyLum;
        skyColor *= vec3(1.1, 1.0, 0.9);
    } else if(frx_worldIsEnd == 1) {
        skyColor = vec3(0.4, 0.2, 0.4);
    } else skyColor = frx_fogColor.rgb;
    return skyColor;// + frx_noise2d(viewSpacePos.xz) / 150.0;
}
// -----------------------------------------------------------------------------------------------------------------------

int getRandomDaytimeEffects() {
    vec2 day = vec2(frx_worldDay);

    float rand1 = rand1D(day);

    if(step(0.9, rand1) > 0.5) return 0;      // normal sunny day
    else if(step(0.8, rand1) > 0.5) return 1; // slightly cloudy
    else if(step(0.7, rand1) > 0.5) return 2; // overcast
    else if(step(0.6, rand1) > 0.5) return 3; // overcast but dark
    else if(step(0.5, rand1) > 0.5) return 4; // foggy and clear
    else if(step(0.4, rand1) > 0.5) return 5; // more foggy and slightly cloudy
    else if(step(0.3, rand1) > 0.5) return 6; // rain is coming
    else if(step(0.2, rand1) > 0.5) return 7; // cold winter morning
    else if(step(0.1, rand1) > 0.5) return 8; // lots of clouds and fog
    else if(step(0.0, rand1) > 0.5) return 9; // dark
}

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
vec2 calculateBasicClouds(in vec3 viewSpacePos) {
    #ifdef CLOUDS
        vec2 plane = viewSpacePos.xz / (viewSpacePos.y == 0.0 ? 0.1 : viewSpacePos.y);
        plane += frx_cameraPos.xz / 75.0; // makes it feel a bit more natural instead of being centered around the player
        plane += frx_renderSeconds / 35.0;
        
        float clouds;

        clouds = fbmHash(plane, 6);

        if(frx_worldIsOverworld == 0) clouds = 0.0;

        float cloudsDensity = 5.0;

        float weatherAmount = 0.5;

        return vec2(pow(clouds, max(0.0, cloudsDensity - (cloudsDensity - 1.0) * frx_smoothedRainGradient)) * (snoise(plane * 0.5) * 0.5 + 0.5), 1.0 - 0.25 * frx_smoothedRainGradient - 0.25 * frx_thunderGradient);
    #else
        return vec2(0.0);
    #endif
}
float getCloudNoise(in vec2 plane, in int octaves) {
    #ifdef FANCY_CLOUDS
        return pow(fbmHash(plane * 0.5, octaves) * smoothstep(0.5, 0.7, fbmHash(plane + 10.0, 7)), 1.0 - 0.5 * frx_smoothedRainGradient - 0.25 * frx_thunderGradient);
    #else 
        return pow(fbmHash(plane * 0.5, octaves), 2.0 - 1.0 * frx_smoothedRainGradient - 0.5 * frx_thunderGradient);
    #endif
}
vec2 calculateBasicCloudsOctaves(in vec3 viewSpacePos, int octaves) {
    #ifdef CLOUDS
        if(frx_worldIsOverworld == 1) {
            vec2 plane = (viewSpacePos.xz * 2.0) / (viewSpacePos.y == 0.0 ? 0.1 : viewSpacePos.y);
            plane += frx_cameraPos.xz / 75.0; // makes it feel a bit more natural instead of being centered around the player
            plane += frx_renderSeconds / 35.0;
            
            float clouds;

            clouds = getCloudNoise(plane, octaves);

            #ifdef CLOUD_NORMALS
                float offset = 0.1;
                float height1 = getCloudNoise(plane + vec2(offset, 0.0), octaves / 4);
                float height2 = getCloudNoise(plane + vec2(0.0, offset), octaves / 4);
                float height3 = getCloudNoise(plane - vec2(offset, 0.0), octaves / 4);
                float height4 = getCloudNoise(plane - vec2(0.0, offset), octaves / 4);

                float deltaX = height3 - height1;
                float deltaY = height4 - height2;

                vec3 cloudNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
                cloudNormal = normalize(cloudNormal);
                float cloudLighting = (dot(cloudNormal, frx_skyLightVector) * 0.7 + 1.0);
            #else
                float cloudLighting = 1.0;
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
