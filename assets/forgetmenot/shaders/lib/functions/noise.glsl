float waterHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = frx_renderSeconds / 7.0;

    vec2 coord = uv * 0.3;
    
    #ifndef SIMPLE_WATER
        waterHeight += fbmHash(rotate2D(coord, -PI / 12.0) * vec2(2.5, 1.0) - 10.0 + vec2(1.2, 0.7) * time, 7);
        waterHeight += fbmHash(rotate2D(coord, PI / 12.0) * vec2(3.1, 1.2) + 10.0 - vec2(0.8, 1.2) * time, 3);
        // waterHeight += snoise(coord * vec2(100.0, 10.0)) * 0.05;
        waterHeight *= 1.0;
    #else
        // waterHeight += snoise(coord * vec2(2.5, 1.0) + vec2(10.7, 1.2) * time) + 1.0;
        // waterHeight += snoise(coord * vec2(3.1, 1.2) + 10.0 + vec2(3.8, 10.2) * time) + 1.0;
        // waterHeight *= 0.5;
        float noiseA = snoise(rotate2D(coord, -PI / 12.0) * vec2(4.5, 1.0) + vec2(1.7, 1.2) * time / 2.0) * 0.5 + 0.5;
        float noiseB = snoise(rotate2D(coord, PI / 12.0) * vec2(6.1, 1.2) - vec2(3.8, 10.2) * time / 2.0) * 0.5 + 0.5;
        waterHeight = mix(noiseA, noiseB, 0.5);
    #endif

    // waterHeight += fbm2D(coord * vec2(3.5, 1.3) + 100.0 + vec2(1.5, 0.4) * time);
    // waterHeight += fbm2D(coord * vec2(4.4, 1.1) + 10.0 - vec2(1.2, 0.3) * time);

    return pow(waterHeight, 2.0) * 0.15;
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
