float endStoneNoise(in vec2 uv) {
    if(frx_luminance(frx_fragColor.rgb) < 0.5) return 2.0 * max(fbmHash(uv * 0.75, 4, 0.0) * 4.0, fbmHash(uv * 0.5 + 10.0, 4, 0.0) * 4.0);
    return (cellular2x2(uv).x) * 4.0;
}

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz) * 2.0;
        uv = floor(uv * 16.0) / 16.0;
        float offset = 1e-2;

        float centerNoise = endStoneNoise(uv);

        float height1 = endStoneNoise(uv + vec2(offset, 0.0));
        // float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
        float height3 = endStoneNoise(uv + vec2(0.0, offset));
        // float height4 = waterHeightNoise(uv - vec2(0.0, offset));

        float deltaX = (centerNoise - height1) * 0.5;
        float deltaY = (centerNoise - height3) * 0.5;

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
        frx_fragNormal = normalize(frx_fragNormal);

    #endif
}
