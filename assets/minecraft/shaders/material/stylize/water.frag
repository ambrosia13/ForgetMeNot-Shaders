#include forgetmenot:shaders/lib/materials.glsl
#include lumi:shaders/api/pbr_ext.glsl

int fmn_isWater = 0;


// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
vec2 parallaxMapping(in vec2 texcoord, in float height) {
    vec3 viewDir = normalize(frx_vertex.xyz) * mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
    vec2 p = viewDir.xy / viewDir.z * (height * 1.0);
    return texcoord - p;
}

void frx_materialFragment() {
    vec2 uv0 = frx_var0.xy;
    vec2 uv = uv0 * 0.8;
    // vec2(
    //     uv0.x + (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0),
    //     uv0.y - (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0)
    // ) * 0.3;
    
    float centerNoise = waterHeightNoise(uv);
    uv = parallaxMapping(uv, centerNoise * 2.0);

    centerNoise = waterHeightNoise(uv);

    #ifdef PBR_ENABLED
        #ifndef SIMPLE_WATER
            float offset = 0.2;

            float height1 = waterHeightNoise(uv + vec2(offset, 0.0));
            // float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
            float height3 = waterHeightNoise(uv + vec2(0.0, offset));
            // float height4 = waterHeightNoise(uv - vec2(0.0, offset));

            float deltaX = (centerNoise - height1) * 2.0;
            float deltaY = (centerNoise - height3) * 2.0;

            frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
            //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
            frx_fragNormal = normalize(frx_fragNormal);
        #else
            float height = waterHeightNoise(uv);
            frx_fragNormal = normalize(cross(dFdx(frx_vertex.xyz - vec3(0.0, height, 0.0)), dFdy(frx_vertex.xyz - vec3(0.0, height, 0.0))))
                            *mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
        #endif

        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.0;
    #endif

    fmn_isWater = 1;

    #if LUMI_PBR_API >= 8
        pbr_f0 = 0.05;
        pbr_roughness = 0.05;
        pbr_isWater = true;
    #endif

    //frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    //frx_fragColor = frx_vertexColor * vec4(0.2, 0.9, 1.0, 1.0);
    frx_fragColor.a *= 0.5;
}