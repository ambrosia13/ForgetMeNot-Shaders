#include forgetmenot:shaders/lib/includes.glsl 
#define SHADOW_MAP_SIZE 2048
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;
uniform sampler2DArray u_shadow_color;

in vec4 shadowViewPos;
in vec4 originalPos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 pbrData;
layout(location = 3) out vec4 vertexNormal;


// procedural rain noise
float rainHeightNoise(in vec2 uv) {
    float time = frx_renderSeconds * 8.0;
    uv += floor(time) * 0.2 * rand2D(vec2(floor(time)));
    time = mix(fract(time), 0.0, smoothstep(0.8, 0.9, fract(time))) * 0.2;

    //uv += frx_renderSeconds;

    float noise = 1.0 - cellular2x2(uv * 6.0).x;
    float n = noise;

    noise = smoothstep(0.8 - time, 0.84, noise);
    noise += smoothstep(0.6 - time, 0.8 - time, n) * 0.1; 

    return noise * 0.01;
}
vec2 parallaxMapping(in vec2 texcoord, in float height) {
    vec3 viewDir = normalize(frx_vertex.xyz) * mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
    vec2 p = viewDir.xy / viewDir.z * (height * 1.0);
    return texcoord - p;
}

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
        vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);
        uv = parallaxMapping(uv, rainHeightNoise(uv) * 4.0);
        // float centerNoise = rainHeightNoise(uv);

        // float offset = 1e-2;

        // float height1 = rainHeightNoise(uv + vec2(offset, 0.0));
        // float height2 = rainHeightNoise(uv - vec2(offset, 0.0));
        // float height3 = rainHeightNoise(uv + vec2(0.0, offset));
        // float height4 = rainHeightNoise(uv - vec2(0.0, offset));

        // float deltaX = height2 - height1 * 25.0;
        // float deltaY = height4 - height3 * 25.0;

        // vec3 newNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));

        // frx_fragNormal = normalize(newNormal);
        if(frx_smoothedRainGradient > 0.0) {
            vec3 noise = (vec3(rainHeightNoise(uv), rainHeightNoise(uv + 100.0), rainHeightNoise(uv - 100.0)));
            frx_fragNormal += mix(vec3(0.0), noise * (2.0 * length(noise)) - length(noise), frx_smoothedRainGradient * step(0.9, frx_vertexNormal.y));
            frx_fragNormal = normalize(frx_fragNormal);
        }

        frx_fragNormal = tbn * frx_fragNormal;
        if(frx_isHand) {
            frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
        }
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    // Fake roughness lol
    if(frx_fragRoughness == 1.0) frx_fragRoughness = 0.0;
    frx_fragNormal += normalize(rand3D(10.0 * gl_FragCoord.xy + 2.0 * mod(frx_renderSeconds, 1000.0))) * (frx_fragRoughness / 10.0);
    frx_fragNormal = normalize(frx_fragNormal);

    if(frx_fragReflectance == 0.04) {
        frx_fragReflectance = 0.0;
        if(frx_vertexNormal.y > 0.9) frx_fragReflectance = mix(0.0, 0.04, frx_smoothedRainGradient * smoothstep(0.5, 0.7, frx_fragLight.y));
    }

    frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
    vec4 color = frx_fragColor;

    int cascade = selectShadowCascade(shadowViewPos);
    vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
    vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

    float shadowMap;
    vec3 shadowBlurColor;
    //shadowMap += texture(frxs_shadowMap, vec4((shadowScreenPos.xy), cascade, shadowScreenPos.z));
    //if(frx_matCutout == 1) fmn_sssAmount = 1.0;

    // for(int i = -3; i < 3; i++) {
    //     for(int j = -3; j < 3; j++) {
    //         shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + vec2(i, j) / SHADOW_MAP_SIZE, cascade, shadowScreenPos.z)) / 16.0;
    //     }
    // }

    //shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + rand2D(100.0 * (gl_FragCoord.xy + frx_renderSeconds)) / 800.0, cascade, shadowScreenPos.z - 0.0001 * (3 - cascade)));
    
    for(int i = 0; i < 36; i++) {
        shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + vogel_disk_36_progressive[i] / 1600.0, cascade, shadowScreenPos.z)) / 20.0;
    }
    shadowMap = smoothstep(0.0, 0.9, shadowMap);
    shadowMap = clamp01(shadowMap);
    shadowMap *= mix(smoothstep(-0.0, 0.1, dot(frx_vertexNormal, frx_skyLightVector)), 1.0, fmn_sssAmount); // skip NdotL shading to approximate SSS

    // if(cascade == 3) {
    //     for(int i = 0; i < 100; i++) {
    //         vec3 flux = texture(u_shadow_color, vec3(shadowScreenPos.xy + vogel_disk_100_progressive[i] / 5.0, 0)).rgb;
    //         //flux *= max(0.0, dot(-frx_fragNormal, frx_skyLightVector));
    //         //flux /= pow(abs(shadowScreenPos.z - texture(frxs_shadowMapTexture, vec3(shadowScreenPos.xy, cascade))).r, 4.0);

    //         shadowBlurColor += flux / 100.0;    
    //     }
    // }


    // shadowBlurColor += 1.0 * shadowBlurColor * frx_luminance(shadowBlurColor);
    // shadowBlurColor = pow(shadowBlurColor, vec3(2.2));
    // vec3 flux;
    // vec4 shadowViewRSM = shadowViewPos;

    // vec3 direction = reflect(frx_fragNormal, -frx_skyLightVector);
    // // for(int i = -4; i < 4; i++) {
    // //     for(int j = -4; j < 4; j++) {
    // //         //vec2 offset = vec2(i, j)
    // //         shadowViewRSM.xyz += direction / 64.0;

    // //         int cascadeRSM = selectShadowCascade(shadowViewRSM);
    // //         vec4 shadowClipPosRSM = frx_shadowProjectionMatrix(cascadeRSM) * shadowViewRSM;
    // //         vec3 shadowScreenPosRSM = (shadowClipPosRSM.xyz / shadowClipPosRSM.w) * 0.5 + 0.5;
    // //         flux += distance(shadowViewRSM.xyz, shadowViewPos.xyz) * pow(texture(u_shadow_color, vec3(shadowScreenPosRSM.xy + 15.0 * vec2(i, j) / SHADOW_MAP_SIZE, 0)).rgb * 1.5, vec3(2.2)) / 64.0;
    // //     }
    // // }
    // shadowBlurColor = flux * max(0.0, dot(frx_fragNormal, frx_skyLightVector) * 0.5 + 0.5);
    // shadowBlurColor *= 1.0 - shadowMap;

    shadowMap = mix(0.0, shadowMap, frx_fragLight.y);

    if(frx_isHand) shadowMap = 0.5;
    float shadowMapInverse;

    if(!isInventory) {
        vec3 lightmap = vec3(1.0);

        #ifndef VANILLA_AO
            frx_fragLight.z = 1.0;
        #endif

        if(frx_worldIsEnd + frx_worldIsNether + frx_worldIsOverworld >= 1) {
            frx_fragLight.xy *= mix((1.0), (frx_darknessEffectFactor * 0.95 + 0.05), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
            frx_fragLight.z = mix(frx_fragLight.z, 1.0, shadowMap);

            vec3 tdata = getTimeOfDayFactors();
            frx_fragLight.y = mix(frx_fragLight.y, 1.0, frx_worldIsEnd);

            shadowMap = mix(shadowMap, 0.0, tdata.z);
            shadowMapInverse = 1.0 - shadowMap;

            float NdotL = dot(frx_fragNormal, frx_skyLightVector) * 0.2 + 0.8;
            NdotL = mix(NdotL, 1.0, frx_matDisableDiffuse);

            frx_fragLight.z = mix(frx_fragLight.z, 1.0, frx_matDisableAo);
            frx_fragLight.x = pow(frx_fragLight.x, 1.0);


            vec3 blockLightColor = vec3(1.0, 0.49, 0.16) * 2.0;

            float blockLightFalloff = 8.0;
            float blocklight = smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.x) * 16.0;
            //blocklight = 1.0 / max(0.001, blocklight * blocklight);
            //blocklight = exp(-(1.0 - blocklight) * blockLightFalloff);
            //blocklight = max(0.0, blocklight - exp(-blockLightFalloff));


            lightmap = vec3(0.0);

            vec3 undergroundLighting;
            undergroundLighting = max(vec3(0.0025), undergroundLighting);
            // undergroundLighting += vec3(1.2, 0.9, 0.5) * blocklight;
            undergroundLighting = mix(undergroundLighting, max(blockLightColor, undergroundLighting), smoothstep(0.0, 16.0, blocklight));

            // float blockLightIntensity = 10.0 / pow((1.0 - (frx_fragLight.x)) * 16.0, 2.0);
            // undergroundLighting += blockLightColor * blockLightIntensity * 1.0;

            lightmap = mix(undergroundLighting, lightmap, frx_fragLight.y);

            vec3 aboveGroundLighting;

            vec3 skyLightColor = getSkyColor(frx_skyLightVector);

            vec3 ambientLightColor = getFogScattering(vec3(0.0, 1.0, 0.0), 100000.0);
            
            if(frx_worldIsEnd == 1) {
                float NdotPlanet = dot(frx_fragNormal, normalize(vec3(0.8, 0.3, -0.5)));
                ambientLightColor = mix(ambientLightColor, vec3(0.0, 0.3, 0.15), smoothstep(0.5, 1.0, NdotPlanet));
                ambientLightColor = mix(ambientLightColor, vec3(0.5, 0.05, 0.35), smoothstep(0.5, 1.0, 1.0 - NdotPlanet));
            }

            float skyIlluminance = frx_luminance(ambientLightColor) * mix(1.0, 1.5, clamp01(frx_skyLightVector.y));
            #ifdef AMBIENT_LIGHT_BOOST
                skyIlluminance *= 1.33;
            #endif
            //skyIlluminance = max(skyIlluminance, 0.005);
            //skyIlluminance *= mix(1.0, 1.0, sqrt(clamp01(getMoonVector().y)));

            #ifdef AMBIENT_LIGHT_BOOST
                ambientLightColor = normalize(ambientLightColor) * 0.75 + 0.25;
            #else
                ambientLightColor = normalize(ambientLightColor);
            #endif

            //ambientLightColor = mix(ambientLightColor, max(ambientLightColor, shadowBlurColor * 4.0), smoothstep(1.0, -0.5, clamp01(dot(frx_fragNormal, frx_skyLightVector))));

            skyLightColor = normalize(skyLightColor) * 6.5;

            #ifdef AMBIENT_LIGHT_BOOST
                aboveGroundLighting += max(0.075, skyIlluminance) * ambientLightColor * shadowMapInverse;
            #else
                aboveGroundLighting += skyIlluminance * ambientLightColor * shadowMapInverse;
            #endif
            aboveGroundLighting += min(vec3(3.0), skyIlluminance * skyLightColor * shadowMap * (NdotL));

            aboveGroundLighting = mix(aboveGroundLighting, max(blockLightColor, aboveGroundLighting), smoothstep(0.0, 16.0, blocklight));

            //if(cascade == 3) aboveGroundLighting += frx_skyLightVector.y * (2.0 + NdotL) * shadowBlurColor * shadowMapInverse;

            lightmap = mix(lightmap, aboveGroundLighting, frx_fragLight.y);


            if(frx_worldIsNether == 1) {
                lightmap = vec3(0.0);
                lightmap += vec3(0.1, 0.05, 0.0);

                lightmap += vec3(1.0, 0.25, 0.0) * (smoothstep(-0.5, 0.5, -frx_fragNormal.y) + 2.0 * pow(frx_fragLight.x, 2.0) + 0.3);
            }

            // handheld light
            float heldLightFactor = frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, frx_vertex.xyz + frx_cameraPos));
            heldLightFactor *= mix(clamp01(dot(-frx_fragNormal, normalize((frx_vertex.xyz + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), frx_vertex.xyz + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
            if(frx_isHand && !all(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
            heldLightFactor = clamp01(heldLightFactor);
            lightmap = mix(lightmap, (max(pow(frx_heldLight.rgb * 1.2, vec3(2.2)), lightmap)), heldLightFactor);

            //lightmap = pow(lightmap, vec3(1.0 / (0.5 + frx_viewBrightness)));

            lightmap = mix(lightmap, lightmap * 0.75 + 0.25, frx_worldIsEnd);

            if(frx_effectNightVision == 1) lightmap = mix(lightmap, lightmap * 0.5 + 0.5, frx_effectModifier);

            lightmap = max(vec3(0.0005), lightmap);

            color.rgb *= pow(lightmap, vec3(1.0)) * pow(frx_fragLight.z, 1.5);
        } else {
            lightmap = pow(texture(frxs_lightmap, frx_fragLight.xy).rgb, vec3(2.2)) * pow(frx_fragLight.z, 1.5);

            //color.rgb *= lightmap;
        }

        // Material info stuff
        color.rgb = mix(color.rgb, frx_fragColor.rgb, frx_fragEmissive * mix((1.0), (frx_darknessEffectFactor), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0))));
        
        float emissionFactor = frx_luminance(color.rgb + 4.0 * color.rgb * pow(1.0 + frx_fragEmissive, 2.0));
        color.rgb += color.rgb * 10.0 * frx_fragEmissive;
        //color.rgb = mix(vec3(frx_luminance(color.rgb)), color.rgb, 1.0 + 0.5 * frx_fragEmissive);

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

    if(color.a < 0.05 && frx_renderTargetSolid && !frx_isGui) discard;

    //color.rgb = shadowBlurColor;

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    vertexNormal = vec4(frx_vertexNormal * 0.5 + 0.5, 1.0);
    pbrData = vec4(frx_fragReflectance, fmn_isWater, 1.0, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}