#include forgetmenot:shaders/lib/includes.glsl 
#define SHADOW_MAP_SIZE 1024
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl
#include forgetmenot:shadows

uniform sampler2D u_glint;

#ifdef VANILLA_LIGHTING
    //in vec3 directionalLight;
#endif

in vec4 shadowViewSpacePos;

layout(location = 0) out vec4 fragColor;
// layout(location = 1) out vec4 fragNormal;
// layout(location = 2) out vec4 fragData;
// layout(location = 3) out vec4 fragLight;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 fragData;

void frx_pipelineFragment() {
    vec4 color = pow(frx_fragColor, vec4(vec3(1.0), 1.0));
    // vec2 uv = frx_faceUv(frx_vertex.xyz, frx_vertexNormal.xyz);
    // float offset = 0.1;
    // float height1 = fbmHash(uv + vec2(offset, 0.0), 6);
    // float height2 = fbmHash(uv - vec2(offset, 0.0), 6);
    // float height3 = fbmHash(uv + vec2(0.0, offset), 6);
    // float height4 = fbmHash(uv - vec2(0.0, offset), 6);
    // float deltaX = (height2 - height1) * 2.0;
    // float deltaY = (height4 - height3) * 2.0;

    // frx_fragNormal = normalize(vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY)));
    //if(any(greaterThan(abs(texture(frxs_baseColor, frx_texcoord + 0.00004) - frx_sampleColor), vec4(0.001))) && !frx_isGui) color *= 0.5;
    vec4 unshadedColor = color;

    mat3 tbn = mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);

    #ifdef PBR_ENABLED
        frx_fragNormal = tbn * frx_fragNormal;
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    float pixelScale = frx_isGui ? 16.0 : 32.0; 
    #ifdef PIXEL_LOCKED_GLINT
        vec3 glint = texture(u_glint, (floor(frx_normalizeMappedUV(frx_texcoord) * pixelScale) / pixelScale) + frx_renderSeconds / 15.0).rgb;
    #else
        vec3 glint = texture(u_glint, (frx_normalizeMappedUV(frx_texcoord)) + frx_renderSeconds / 15.0).rgb;
    #endif

    //if(frx_matCutout == 1) frx_fragNormal = vec3(0.0, 1.0, 0.0);

    #ifdef VANILLA_LIGHTING
        #ifdef APPLY_MC_LIGHTMAP
            int cascade = selectShadowCascade(shadowViewSpacePos);
            vec4 shadowSpacePos = frx_shadowProjectionMatrix(cascade) * shadowViewSpacePos;
            vec3 shadowScreenPos = (shadowSpacePos.xyz) * 0.5 + 0.5;

            #ifdef CASCADE_ADJUST
                // blur less depending on cascade, since far away shadows are already low res and hardware filtered
                int blurAmount = max(0, cascade - 1);
            #else
                int blurAmount = SHADOW_FILTER_TAPS;
            #endif

            #ifdef SHADOW_FILTER
                vec2 uv = shadowScreenPos.xy * 1024.0;
                vec2 baseUv = floor(uv + 0.5) - vec2(0.5);
                vec2 st = uv + 0.5 - baseUv;
                baseUv /= 1024.0;
                
                // shadow bias things from canvas dev
                //vec2 depthBias = computeReceiverPlaneDepthBias(dFdx(shadowScreenPos), dFdy(shadowScreenPos));
                vec2 depthBias = vec2(0.05);
            	float fractionalSamplingError = 2.0 * dot(vec2(1.0, 1.0) / 1024.0, abs(depthBias));// + 0.1 * max(0, 2 - cascade);
	            shadowScreenPos.z -= min(fractionalSamplingError, 0.01);

                float shadowMap = 0.0;
                if(blurAmount != 0) {
                    for(int i = -blurAmount; i < blurAmount; i++) {
                        for(int j = -blurAmount; j < blurAmount; j++) {
                            shadowMap += pcfSample(baseUv, st.x + float(i), st.y + float(j), vec2(1.0 / 1024.0), cascade, shadowScreenPos.z, depthBias) / (blurAmount * blurAmount * 4.0);
                        }
                    }
                } else {
                    shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
                }
            #else
                float shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
            #endif

            if(frx_matDisableDiffuse == 0) shadowMap *= step(0.0, dot(frx_fragNormal, frx_skyLightVector));

            if(frx_isHand) shadowMap = 0.0;
            //color.rgb = shadowSpacePos.xyz;
            if(!frx_isGui || frx_isHand && frx_fragReflectance < 1.0) {
                vec3 lightmap = vec3(1.0);
                vec3 tdata = getTimeOfDayFactors();

                vec3 ambientLightColorDay = vec3(1.0, 1.0, 1.1) * 1.25;
                vec3 directLightColorDay = vec3(1.1, 1.0, 0.9) * 1.5;

                vec3 ambientLightColorSunset = vec3(0.9, 0.8, 1.0);
                vec3 directLightColorSunset[2];//vec3(1.1, 1.0, 0.9), vec3(0.9, 1.0, 1.0);
                directLightColorSunset[0] = vec3(1.1, 1.0, 0.9);
                directLightColorSunset[1] = vec3(0.9, 1.0, 1.0);

                // #ifndef DEPRESSING_MODE
                    vec3 ambientLightColorNight = vec3(0.7, 0.8, 1.0) * 1.0;
                    vec3 directLightColorNight = vec3(0.9, 1.0, 1.1) * 1.5;
                // #else
                //     vec3 ambientLightColorNight = vec3(0.9, 0.9, 1.0) * 1.3;
                //     vec3 directLightColorNight = vec3(1.1, 1.0, 1.0) * 1.5;
                // #endif

                frx_fragLight.y *= mix(1.0, 0.7, (frx_smoothedRainGradient + frx_thunderGradient) / 2.0);

                lightmap = texture(frxs_lightmap, frx_fragLight.xy).rgb;

                #ifdef DEPRESSING_MODE
                    lightmap = lightmap * 0.75 + 0.25;
                #endif

                // support moody brightness etc
                //frx_fragLight *= mix(1.0, 0.5, (1.0 - frx_viewBrightness) * 0.5);
                lightmap *= mix(1.0, 1.5, (1.0 - frx_fragLight.y) * frx_fragLight.x);
                //lightmap *= mix(1.0, 1.5, (1.0 - frx_fragLight.y));
                if(frx_matDisableAo == 0) lightmap *= mix(frx_fragLight.z, frx_fragLight.z * 0.5 + 0.5, frx_fragLight.y);

                lightmap *= mix(vec3(1.0), ambientLightColorDay, tdata.x * frx_fragLight.y);
                if(frx_matDisableDiffuse == 0) lightmap += (1.0) * tdata.x * frx_fragLight.y * mix(0.2, 0.3, shadowMap) * dot(frx_fragNormal, getSunVector()) * directLightColorDay;
                //if(frx_matDisableDiffuse == 0) lightmap += (shadowMap) * tdata.x * frx_fragLight.y * 0.3 * dot(frx_fragNormal, getSunVector()) * directLightColorDay;
                lightmap *= mix(vec3(1.0), shadowMap * (SUN_COLOR * 0.1) * 0.5 + 0.5, tdata.x * frx_fragLight.y);

                lightmap *= mix(vec3(1.0), ambientLightColorSunset, tdata.z * frx_fragLight.y);
                if(frx_matDisableDiffuse == 0) lightmap += tdata.z * frx_fragLight.y * 0.2 * dot(frx_fragNormal, getSunVector()) * directLightColorSunset[0];
                if(frx_matDisableDiffuse == 0) lightmap += tdata.z * frx_fragLight.y * 0.2 * dot(frx_fragNormal, getMoonVector()) * directLightColorSunset[1];

                lightmap *= mix(vec3(1.0), ambientLightColorNight, tdata.y * frx_fragLight.y);
                if(frx_matDisableDiffuse == 0) lightmap += 1.0 * tdata.y * frx_fragLight.y * 0.1 * dot(frx_fragNormal, getMoonVector()) * directLightColorNight;
                lightmap *= mix(vec3(1.0), (shadowMap * 0.5 + 0.5) * (MOON_COLOR * 0.1) * 0.5 + 0.5, tdata.y * frx_fragLight.y);
                //lightmap *= mix(1.0, 2.0, 1.0 - frx_fragLight.y);

                if(frx_matDisableDiffuse == 0) lightmap += (1.0 - frx_fragLight.y) * 0.1 * dot(frx_fragNormal, vec3(0.2, 0.3, 0.4));

                // if(!frx_isGui || frx_isHand) {
                //     lightmap +
                // }

                float heldLightFactor = frx_smootherstep(frx_heldLight.a * 9.0, frx_heldLight.a * 0.0, frx_distance);
                heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
                if(frx_isHand && !any(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
                heldLightFactor = clamp01(heldLightFactor);
                lightmap = mix(lightmap, (max(frx_heldLight.rgb * 1.5, lightmap) * (frx_fragLight.z * 0.75 + 0.25)), heldLightFactor);

                #ifdef DEPRESSING_MODE
                    lightmap = mix(lightmap, vec3(frx_luminance(lightmap)) * 1.4, 0.5);
                #endif

                color.rgb *= max(vec3(0.05), lightmap);
            }
        #endif
        if(frx_isGui && !frx_isHand) color.rgb *= dot(frx_vertexNormal, vec3(0.3, 1.0, 0.6)) * 0.3 + 0.7; // directional shading in inventory
    #else
        // if(!frx_isGui || frx_isHand) {
        //     vec3 lightmap = texture(frxs_lightmap, frx_fragLight.xy).rgb;
        //     lightmap *= frx_fragLight.z * 0.5 + 0.5;

        //     vec3 tdata = getTimeOfDayFactors();

        //     if(!frx_isHand) {
        //         lightmap *= mix(vec3(1.0) * dot(frx_fragNormal, vec3(0.2, 0.3, 0.4)) * 0.25 + 0.75, normalize(calculateSkyColor(frx_fragNormal)) * 0.5 + 0.5, frx_fragLight.y);
        //         lightmap += frx_fragLight.y * 0.2 * dot(frx_fragNormal, getSunVector()) * (calculateSkyColor(getSunVector())) * (tdata.x + tdata.z);
        //         lightmap += frx_fragLight.y * 0.2 * dot(frx_fragNormal, getMoonVector()) * (calculateSkyColor(getMoonVector())) * (tdata.y + tdata.z);
        //     }

        //     lightmap *= mix(1.0, 1.5, frx_fragLight.y * tdata.x);
        //     lightmap *= mix(1.0, 1.5, frx_fragLight.x * clamp01(1.0 - tdata.x + (1.0 - frx_fragLight.y)));

        //     float heldLightFactor = frx_smootherstep(frx_heldLight.a * 9.0, frx_heldLight.a * 0.0, frx_distance);
        //     heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
        //     if(frx_isHand && !any(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
        //     heldLightFactor = clamp01(heldLightFactor);
        //     lightmap = mix(lightmap, (max(frx_heldLight.rgb * 1.5, lightmap) * (frx_fragLight.z * 0.75 + 0.25)), heldLightFactor);

        //     color.rgb *= lightmap;
        // } else {
        //     color.rgb *= dot(frx_vertexNormal, vec3(0.3, 1.0, 0.6)) * 0.3 + 0.7;
        // }
    #endif

    // shadows when no lightmap
    #ifndef APPLY_MC_LIGHTMAP
        vec3 tdata = getTimeOfDayFactors();
        int cascade = selectShadowCascade(shadowViewSpacePos);
        vec4 shadowSpacePos = frx_shadowProjectionMatrix(cascade) * shadowViewSpacePos;
        vec3 shadowScreenPos = (shadowSpacePos.xyz) * 0.5 + 0.5;

        int blurAmount = 2;

        #ifndef SHADOW_FILTER
            vec2 uv = shadowScreenPos.xy * 1024.0;
            vec2 baseUv = floor(uv + 0.5) - vec2(0.5);
            vec2 st = uv + 0.5 - baseUv;
            baseUv /= 1024.0;
            vec2 depthBias = vec2(0.05);//computeReceiverPlaneDepthBias(dFdx(shadowScreenPos), dFdy(shadowScreenPos));
            float fractionalSamplingError = 2.0 * dot(vec2(1.0, 1.0) / 1024.0, abs(depthBias));
            shadowScreenPos.z -= min(fractionalSamplingError, 0.01);
            float shadowMap = 0.0;
            for(int i = -blurAmount; i < blurAmount; i++) {
                for(int j = -blurAmount; j < blurAmount; j++) {
                    shadowMap += pcfSample(baseUv, st.x + float(i), st.y + float(j), vec2(1.0 / 1024.0), cascade, shadowScreenPos.z, depthBias) / (blurAmount * blurAmount * 4.0);
                    //shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + (vec2(i, j) / 1024.0) * shadowVariance, cascade, shadowScreenPos.z)) / (blurAmount * blurAmount * 4.0);
                }
            }
            // shadowMap = shadowFilter(frxs_shadowMap, shadowScreenPos, cascade, 4.0);
            //float shadowMap = sampleShadowPCF(shadowScreenPos.xyz, cascade);
        #else
            float shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
        #endif
        color.rgb += color.rgb * shadowMap * tdata.x * sampleSkyReflection(frx_skyLightVector) * 0.1;
        color.rgb += color.rgb * shadowMap * tdata.y * sampleSkyReflection(frx_skyLightVector) * 0.1;
    #endif


    if(frx_matGlint == 1) {
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    // frx_fragEmissive += float(frx_matHurt) * 0.5;
    color.rgb = mix(color.rgb, vec3(2.5, 0.2, 0.2), 0.25 * float(frx_matHurt)); // g;ow for hurt entities
    color.rgb = mix(color.rgb, color.rgb * 5.0, float(frx_matFlash));
    color.rgb = mix(color.rgb, unshadedColor.rgb, frx_fragEmissive * float(!frx_renderTargetParticles));
    //if(frx_fragEmissive > 0.0) color.a = 0.5;

    if(color.a <= 0.01) discard;

    if(!frx_isGui || frx_isHand && !frx_renderTargetParticles) color.rgb += color.rgb * frx_fragEmissive * mix(EMISSIVE_BOOST.0, 1.0, frx_smoothedRainGradient * 0.5 + frx_thunderGradient * 0.5);

    // // fog that uses vanilla fog color done here, other fog done in post
    // float fogFactor = frx_smootherstep(frx_fogStart, frx_fogEnd, frx_distance);
    // if(frx_cameraInFluid == 1 && !frx_isGui) color.rgb = mix(color.rgb, frx_fogColor.rgb, fogFactor);

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    fragData = vec4(frx_fragRoughness, frx_fragReflectance, float(fmn_isWater), 1.0);

    gl_FragDepth = gl_FragCoord.z;
}