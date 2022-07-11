void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz) * 2.0;
        uv = floor(uv * 16.0) / 16.0;
        float offset = 1e-2;

        float centerNoise = cellular2x2(uv).x;

        float height1 = cellular2x2(uv + vec2(offset, 0.0)).x;
        // float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
        float height3 = cellular2x2(uv + vec2(0.0, offset)).x;
        // float height4 = waterHeightNoise(uv - vec2(0.0, offset));

        float deltaX = (centerNoise - height1) * 0.5;
        float deltaY = (centerNoise - height3) * 0.5;

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
        frx_fragNormal = normalize(frx_fragNormal);

    #endif
}
