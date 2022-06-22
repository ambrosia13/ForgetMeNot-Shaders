// Some inspiration for a simple but nice fog model from Inigo Quilez
// https://iquilezles.org/articles/fog/
vec3 simpleFog(in vec3 color, in vec3 viewSpacePos) {
    vec3 tdata = getTimeOfDayFactors();
    vec3 viewDir = normalize(viewSpacePos);

    float blockDist = length(viewSpacePos);
    if(frx_cameraInFluid == 0) blockDist = max(0.0, blockDist - 7.0);
    blockDist /= 192.0;

    float fogDensity = 0.4;
    // fogDensity = mix(fogDensity, 0.4, tdata.x);
    // fogDensity = mix(fogDensity, 2.5, tdata.y);
    // fogDensity = mix(fogDensity, 2.0, tdata.z);
    // fogDensity = mix(fogDensity, 4.0, frx_worldIsNether + frx_worldIsEnd);
    // fogDensity = mix(fogDensity, 5.5, frx_smoothedRainGradient);
    // fogDensity = mix(fogDensity, 5.5, frx_thunderGradient);
    fogDensity = mix(fogDensity, 36.0, clamp01(frx_cameraInWater - frx_effectWaterBreathing - frx_effectConduitPower));
    fogDensity = mix(fogDensity, 66.0, clamp01(frx_cameraInLava - frx_effectFireResistance));

    vec3 worldPos = viewSpacePos + frx_cameraPos;
    fogDensity += 1.0 * smoothstep(90.0, 40.0, worldPos.y) * mix(1.0, 0.5, tdata.x) * frx_smoothedEyeBrightness.y;

    #ifdef DEPRESSING_MODE
        fogDensity *= 0.1;
    #endif

    float fogAmount = 1.0 - exp(-blockDist * fogDensity);

    float sunFactor = dot(getSunVector(), vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    float sunFactorInverse = 1.0 - sunFactor;
    sunFactorInverse = sunFactorInverse * 0.25 + 0.75;
    sunFactor = sunFactor * 0.25 + 0.75;

    vec3 fogColor = atmosphericScatteringTop(viewDir, getSunVector(), 1.0 - tdata.y, 2.0, length(viewSpacePos / 256.0) * sunFactorInverse) +
                    atmosphericScatteringTop(viewDir, getMoonVector(), tdata.y, 2.0, length(viewSpacePos / 256.0) * sunFactorInverse) * vec3(0.1, 0.13, 0.2);
    if(frx_cameraInWater == 1) {
        //fogColor *= mix(vec3(1.0), vec3(10.0, 7.692308))

        fogColor *= sunFactor;
        fogColor = fogColor * 0.5 + normalize(fogColor) * 0.5;
    }

    return color * (1.0 - fogAmount) + fogColor * fogAmount;
}
