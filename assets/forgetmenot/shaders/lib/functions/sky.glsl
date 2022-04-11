vec3 calculateSkyColor(in vec3 viewSpacePos) {
    vec3 tdata = getTimeOfDayFactors();

    vec3 skyColor = vec3(0.0);

    if(frx_worldIsOverworld == 1) {
        vec3 overworldSkyColor = vec3(0.0);

        // a whole lot of magic numbers
        vec3 daytimeSky = vec3(0.864,1.018,1.200) * 0.9;
        daytimeSky = mix(daytimeSky, vec3(0.445,0.647,0.840), frx_smootherstep(-0.1, 0.3, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.305,0.528,0.805), frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(0.208,0.444,0.760), frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        daytimeSky = mix(daytimeSky, vec3(1.042,1.039,0.900) * 1.0, clamp01(pow(dot(viewSpacePos, getSunVector()), 5.0)));
        daytimeSky *= 1.1;


        vec3 nighttimeSky = vec3(0.506,0.577,0.620) * 3.5;
        nighttimeSky = mix(nighttimeSky, vec3(0.401,0.453,0.565) * 3.8, frx_smootherstep(-0.1, 0.2, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.344,0.376,0.500) * 2.5, frx_smootherstep(0.1, 0.6, viewSpacePos.y));
        nighttimeSky = mix(nighttimeSky, vec3(0.291,0.327,0.460) * 2.2, frx_smootherstep(0.4, 0.9, viewSpacePos.y));
        nighttimeSky *= 0.1;
        nighttimeSky.b *= 1.5;
        nighttimeSky = mix(nighttimeSky, vec3(0.475,0.505,0.685) * 0.5, clamp01(pow(dot(viewSpacePos, getMoonVector()), 11.0)));

        vec3 sunsetSky = vec3(0.605,0.382,0.361);
        sunsetSky = mix(sunsetSky, vec3(0.459,0.329,0.440), smoothstep(-0.3, 0.4, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.284,0.356,0.555), smoothstep(0.1, 0.6, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.225,0.302,0.460), smoothstep(0.4, 0.9, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.121,0.251,0.415), smoothstep(0.5, 1.5, viewSpacePos.y));
        sunsetSky = mix(sunsetSky, vec3(0.705,0.482,0.361), clamp01(pow(dot(viewSpacePos, getSunVector()), 3.0)));
        sunsetSky = mix(sunsetSky, vec3(0.475,0.505,0.685), clamp01(pow(dot(viewSpacePos, getMoonVector()), 3.0)));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(1.2, 0.5, 0.3), clamp01(dot(frx_cameraView, getSunVector()) * 0.2));
        sunsetSky = mix(sunsetSky, sunsetSky * vec3(0.5, 0.7, 1.0), clamp01(dot(frx_cameraView, getMoonVector()) * 0.2));
        
        overworldSkyColor = mix(overworldSkyColor, daytimeSky, tdata.x);
        overworldSkyColor = mix(overworldSkyColor, nighttimeSky, tdata.y);
        overworldSkyColor = mix(overworldSkyColor, sunsetSky, tdata.z);

        skyColor = overworldSkyColor;

        skyColor = mix(skyColor, skyColor * 0.5, frx_rainGradient);
        skyColor = mix(skyColor, skyColor * 0.75, frx_thunderGradient);

        // this saturates the sky but is it really needed?
        // float skyLum = frx_luminance(skyColor);
        // skyColor *= skyColor;
        // skyColor *= 1.0 + skyLum;
        skyColor *= vec3(1.1, 1.0, 0.9);
    } else if(frx_worldIsEnd == 1) {
        skyColor = vec3(0.5, 0.0, 0.5);
        skyColor = mix(skyColor, vec3(0.2, 0.0, 0.8), dot(viewSpacePos, vec3(0.0, 0.0, 0.0) * 0.5 + 0.5));
        skyColor += vec3(frx_noise2d(viewSpacePos.xz * 50.0)) / 50.0;
        skyColor = mix(skyColor, vec3(1.0), 0.3);
        skyColor *= 0.5;
    } else skyColor = frx_fogColor.rgb;
    return skyColor;// + frx_noise2d(viewSpacePos.xz) / 150.0;
}

vec3 calculateSun(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
    float sun = dot(viewSpacePos, getSunVector()) * 0.5 + 0.5;
    // float sun2 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.2, 0.3, 0.4))) * 0.5 + 0.5;
    // float sun3 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.5, 1.7, -0.4))) * 0.5 + 0.5;
    // float sun4 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.4, 0.8, 0.3))) * 0.5 + 0.5;
    // float sun5 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.7, 0.3, -0.7))) * 0.5 + 0.5;
    // float sun6 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.9, 0.1, 0.7))) * 0.5 + 0.5;
    // float sun7 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.1, 0.5, 0.9))) * 0.5 + 0.5;
    // float sun8 = dot(viewSpacePos, normalize(getSunVector() * vec3(0.3, 0.4, 0.1))) * 0.5 + 0.5;

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
    
    sun = step(0.9995, sun);
    // sun2 = step(0.9995, sun2);
    // sun3 = step(0.9995, sun3);
    // sun4 = step(0.9995, sun4);
    // sun5 = step(0.9995, sun5);
    // sun6 = step(0.9995, sun6);
    // sun7 = step(0.9995, sun7);
    // sun8 = step(0.9995, sun8);
    moon = step(0.9996, moon);
    vec3 sunCol = (sun) * SUN_COLOR;
    vec3 moonCol = moon * MOON_COLOR;

    float factor = mix(1.0, 0.5, frx_rainGradient);
    factor = mix(factor, 0.0, frx_thunderGradient);

    return (sunCol.rgb + moonCol.rgb) * frx_smootherstep(-0.1, 0.1, viewSpacePos.y) * factor * frx_worldIsOverworld;
} 

vec2 calculateBasicClouds(in vec3 viewSpacePos) {
    vec2 plane = viewSpacePos.xz / (viewSpacePos.y == 0.0 ? 0.1 : viewSpacePos.y);
    plane += frx_cameraPos.xz / 75.0; // makes it feel a bit more natural instead of being centered around the player
    plane += frx_renderSeconds / 35.0;
    
    float clouds;

    clouds = fbm2D(plane);
    float offset = 0.2;
    float cloudsUp = fbm2D(plane + vec2(0.0, offset));
    float cloudsRight = fbm2D(plane + vec2(offset, 0.0));
    float cloudsDown = fbm2D(plane - vec2(0.0, offset));
    float cloudsLeft = fbm2D(plane - vec2(offset, 0.0));
    vec3 cloudsNormal = vec3(0.0);
    cloudsNormal = mix(cloudsNormal, vec3(1.0, 0.0, 0.0), (clouds - cloudsRight));
    cloudsNormal = mix(cloudsNormal, vec3(0.0, 1.0, 0.0), (clouds - cloudsUp));
    cloudsNormal = mix(cloudsNormal, vec3(0.0, 0.0, 1.0), (clouds - cloudsLeft));

    if(frx_worldIsOverworld == 0) clouds = 0.0;

    return vec2(pow(clouds, 5.0 - 4.0 * frx_rainGradient) * (snoise(plane * 0.5) * 0.5 + 0.5), dot(cloudsNormal, frx_skyLightVector) + 1.5);
}

float getOverworldFogDensity(in vec3 timeFactors, in float blockDist) {
    float fogStartMin = 10.0;
    float fogFactor = 1.0 - exp(-blockDist / frx_viewDistance);

    fogFactor = mix(fogFactor, fogFactor * 1.5, timeFactors.z);
    fogFactor = mix(fogFactor, fogFactor * 1.2, timeFactors.y);
    fogFactor = mix(fogFactor, fogFactor * 0.8, timeFactors.x);

    return fogFactor;
}

float getNetherFogDensity(in float blockDist, in bool reverse) {
    float fogFactor = 1.0 - exp(-blockDist / frx_viewDistance);
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