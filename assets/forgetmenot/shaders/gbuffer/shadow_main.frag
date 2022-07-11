#include forgetmenot:shaders/lib/includes.glsl 
#define SHADOW_MAP_SIZE 2048
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;

in vec4 shadowViewPos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 pbrData;


void frx_pipelineFragment() {
    bool isInventory = frx_isGui && !frx_isHand;
    vec3 gamma = vec3(isInventory ? 1.0 : 2.2);

    #ifdef WHITE_WORLD
        frx_fragColor.rgb = vec3(1.0);
    #endif

    mat3 tbn = mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );

    #ifdef PBR_ENABLED
        frx_fragNormal = tbn * frx_fragNormal;
        if(frx_isHand) {
            frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
        }
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
    vec4 color = frx_fragColor;

    int cascade = selectShadowCascade(shadowViewPos);
    vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
    vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

    // shadowScreenPos.z -= 0.0001;

    // float biasHigh = 4.0;
    // float biasLow = 2.0;

    // if (d3.x < 1.0 && d3.y < 1.0 && d3.z < 1.0) {
    //     cascade = 3;
    //     biasHigh = 0.1;
    //     biasLow = 0.05;
    // } else if (d2.x < 1.0 && d2.y < 1.0 && d2.z < 1.0) {
    //     cascade = 2;
    //     biasHigh = 0.25;
    //     biasLow = 0.1;
    // } else if (d1.x < 1.0 && d1.y < 1.0 && d1.z < 1.0) {
    //     cascade = 1;
    //     // these can't go any higher
    //     biasHigh = 1.0;
    //     biasLow = 0.5;
    // }

    // shadowCoords.z -= mix(biasHigh, biasLow, max(dot(vertexNormal, frx_skyLightVector), 0.0)) / SHADOW_MAP_SIZE;

    float shadowMap;
    //shadowMap += texture(frxs_shadowMap, vec4((shadowScreenPos.xy), cascade, shadowScreenPos.z));
    for(int i = -3; i < 3; i++) {
        for(int j = -3; j < 3; j++) {
            shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + vec2(i, j) / SHADOW_MAP_SIZE, cascade, shadowScreenPos.z)) / 16.0;
        }
    }
    shadowMap = clamp01(shadowMap);

    shadowMap = mix(0.0, shadowMap, frx_fragLight.y);

    if(frx_isHand) shadowMap = 0.5;
    float shadowMapInverse = 1.0 - shadowMap;

    //shadowMap *= smoothstep(0.1, 0.2, frx_smoothedEyeBrightness.y * frx_fragLight.y);

    if(!isInventory) {
        vec3 tdata = getTimeOfDayFactors();
        shadowMap = mix(shadowMap, 0.0, tdata.z);
        shadowMapInverse = mix(shadowMapInverse, 1.0, tdata.z);
        float NdotL = dot(frx_fragNormal, frx_skyLightVector) * 0.25 + 0.75;
        NdotL = mix(NdotL, 1.0, frx_matDisableDiffuse);
        frx_fragLight.z = mix(frx_fragLight.z, 1.0, frx_matDisableAo);

        // not much reason to still use vanilla lightmap lut, but this way we can benefit from things like true darkness mod
        vec3 lightmap = vec3(0.0);//texture(frxs_lightmap, frx_fragLight.xy).rgb;

        vec3 blockLightColor = mix(normalize(vec3(3.6, 1.9, 0.8)) * 2.0, pow(vec3(1.0, 0.9, 0.8), vec3(2.2)) * 1.25, BLOCKLIGHT_NEUTRALITY);

        float blocklight = smoothstep(0.0, 1.0, frx_fragLight.x);
        blocklight = pow(blocklight, 1.0);

        vec3 undergroundLighting;
        undergroundLighting = max(vec3(0.005), undergroundLighting);
        //undergroundLighting += vec3(1.2, 0.9, 0.5) * blocklight;
        undergroundLighting += blockLightColor * blockLightColor * blocklight;

        lightmap = mix(undergroundLighting, lightmap, frx_fragLight.y);

        vec3 aboveGroundLighting;

        vec3 skyLightColor = getSkyColor(frx_skyLightVector);

        vec3 ambientLightColor = vec3(0.0);
        ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0));
        // for(int i = 0; i < 2; i++) {
        //     for(int j = 0; j < 2; j++) {
        //         float totalSamples = 4.0;
        //         vec3 skySample = getSkyColor(normalize(rand3D(vec2(i, j))));

        //         if(frx_luminance(pow(skySample, vec3(1.0 / 2.2))) > 1.0) {
        //             //totalSamples -= 1.0;
        //             //skySample = vec3(0.0);
        //         }
        //         ambientLightColor += skySample / totalSamples;
        //     }
        // }
        float skyIlluminance = frx_luminance(ambientLightColor * (4.0 / max(1.0, frx_luminance(frx_fragColor.rgb) + 0.5)));

        ambientLightColor = normalize(ambientLightColor) * 0.75 + 0.25;
        skyLightColor = normalize(skyLightColor) * 6.5;

        aboveGroundLighting += skyIlluminance * ambientLightColor * shadowMapInverse;
        aboveGroundLighting += min(vec3(3.0), skyIlluminance * skyLightColor * shadowMap * (NdotL * NdotL));

        aboveGroundLighting = mix(aboveGroundLighting, max(blockLightColor, aboveGroundLighting), pow(frx_fragLight.x, 2.0));

        lightmap = mix(lightmap, aboveGroundLighting, frx_fragLight.y);

        // handheld light
        float heldLightFactor = frx_smootherstep(frx_heldLight.a * 13.0, 0.0, frx_distance);
        heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
        if(frx_isHand && !all(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
        heldLightFactor = clamp01(heldLightFactor);
        lightmap = mix(lightmap, (max(pow(frx_heldLight.rgb, vec3(2.2)), lightmap)), heldLightFactor);

        lightmap = max(vec3(0.0001), lightmap);
        //lightmap = pow(lightmap, vec3(1.0 / (0.5 + frx_viewBrightness)));

        lightmap = mix(lightmap, lightmap * 0.75 + 0.25, frx_worldIsEnd);

        color.rgb *= pow(lightmap, vec3(1.0)) * pow(frx_fragLight.z, 1.5);


        // Material info stuff
        color.rgb = mix(color.rgb, frx_fragColor.rgb, frx_fragEmissive);
        color.rgb += color.rgb * mix(4.0, 1.0, float(frx_isHand)) * frx_fragEmissive;

        color.rgb = mix(color.rgb, vec3(frx_luminance(lightmap), 0.0, 0.0), 0.5 * frx_matHurt); 
        color.rgb = mix(color.rgb, vec3(2.0), 0.5 * frx_matFlash); 
    } else {
        vec3 direction = vec3(0.2, 0.8, 0.6);
        float lengthSquared = dot(direction, direction);
        direction /= lengthSquared * inversesqrt(lengthSquared);
        color.rgb *= dot(frx_vertexNormal, direction) * 0.35 + 0.65;
    }

    if(frx_matGlint == 1) {
        vec3 glint = texture(u_glint, frx_normalizeMappedUV(frx_texcoord * 0.2 + frx_renderSeconds / 500.0)).rgb;
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    if(color.a < 0.5 && frx_renderTargetSolid && !frx_isGui) discard;
    if(frx_fragReflectance == 0.04) frx_fragReflectance = 0.0;

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    pbrData = vec4(frx_fragReflectance, fmn_isWater, 1.0, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}