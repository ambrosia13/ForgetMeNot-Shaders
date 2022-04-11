float waterHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = frx_renderSeconds / 50.0;

    vec2 coord = uv * 0.3;
    
    #ifndef SIMPLE_WATER
        waterHeight += fbm2D(coord * vec2(2.5, 1.0) - 10.0 + vec2(1.2, 0.7) * time);
        waterHeight += fbm2D(coord * vec2(3.1, 1.2) - 100.0 - vec2(0.8, 1.2) * time);
        waterHeight *= 1.0;
    #else
        waterHeight += snoise(coord * vec2(2.5, 1.0) + vec2(10.7, 1.2) * time) + 1.0;
        waterHeight += snoise(coord * vec2(3.1, 1.2) + 10.0 + vec2(3.8, 10.2) * time) + 1.0;
        waterHeight *= 1.0;
    #endif

    // waterHeight += fbm2D(coord * vec2(3.5, 1.3) + 100.0 + vec2(1.5, 0.4) * time);
    // waterHeight += fbm2D(coord * vec2(4.4, 1.1) + 10.0 - vec2(1.2, 0.3) * time);


    //if(frx_playerEyeInWater == 0 && frx_playerWet == 1) waterHeight += 2.0 * sin(frx_distance * 3.0 - frx_renderSeconds * 10.0) * frx_smootherstep(10.0, 0.0, frx_distance);

    return pow(waterHeight, 4.0) * 0.15;
}

float iceHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = 1.0;

    vec2 coord = uv * 0.3;

    waterHeight += snoise(uv) * 0.5 + 0.5;

    waterHeight *= 2.0;

    return pow(waterHeight, 4.0) * 0.15;
}
