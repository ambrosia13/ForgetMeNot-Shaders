#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_glint;

#ifdef VANILLA_LIGHTING
    //in vec3 directionalLight;
#endif

layout(location = 0) out vec4 fragColor;
// layout(location = 1) out vec4 fragNormal;
// layout(location = 2) out vec4 fragData;
// layout(location = 3) out vec4 fragLight;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 fragData;

void frx_pipelineFragment() {
    vec4 color = frx_fragColor;
    // float offset = 0.0001;
    // float height1 = frx_luminance(texture(frxs_baseColor, frx_texcoord + vec2(offset, 0.0)).rgb);
    // float height2 = frx_luminance(texture(frxs_baseColor, frx_texcoord - vec2(offset, 0.0)).rgb);
    // float height3 = frx_luminance(texture(frxs_baseColor, frx_texcoord + vec2(0.0, offset)).rgb);
    // float height4 = frx_luminance(texture(frxs_baseColor, frx_texcoord - vec2(0.0, offset)).rgb);
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

    #ifdef VANILLA_LIGHTING
        #ifdef APPLY_MC_LIGHTMAP
            if(!frx_isGui || frx_isHand && frx_fragReflectance < 1.0) {
                vec3 lightmap = vec3(1.0);
                lightmap.rgb *= mix(1.0, 1.5, getTimeOfDayFactors().x * frx_fragLight.y);

                frx_fragLight.y = mix(frx_fragLight.y, frx_fragLight.y * 0.8, frx_smoothedRainGradient);
                frx_fragLight.y = mix(frx_fragLight.y, frx_fragLight.y * 0.4, frx_thunderGradient);
                lightmap.rgb = texture(frxs_lightmap, frx_fragLight.xy).rgb;
                if(frx_worldIsOverworld == 0) lightmap = max(vec3(0.85), lightmap);
                vec3 ldata = frx_fragLight;
                vec3 tdata = getTimeOfDayFactors();

                #ifdef VANILLA_AO
                    // if(frx_matDisableAo == 0) lightmap *= frx_fragLight.z;
                    float invAO = 1.0 - frx_fragLight.z;
                    if(frx_matDisableAo == 0) lightmap = mix(lightmap, lightmap * color.rgb, invAO);
                #endif
                #ifdef DIRECTIONAL_SHADING
                    if(frx_matDisableDiffuse == 0)  {
                        vec3 directionalLight = vec3(1.0);

                        vec3 sunVector = getSunVector();
                        vec3 moonVector = getMoonVector();

                        vec3 sunsetDiffuseColor = vec3(0.8, 0.9, 1.1) * (dot(frx_fragNormal, moonVector) * 0.45 + 0.65) + vec3(1.1, 0.9, 0.8) * (dot(frx_fragNormal, sunVector) * 0.45 + 0.65);
                        vec3 dayDiffuseColor = vec3(1.4, 1.35, 0.9) * dot(frx_fragNormal, sunVector) * 0.3 + 1.2;
                        vec3 nightDiffuseColor = vec3(0.8, 1.0, 1.3) * dot(frx_fragNormal, moonVector) * 0.25 + 1.0;
                        
                        directionalLight = mix(directionalLight, sunsetDiffuseColor, getTimeOfDayFactors().z);
                        directionalLight = mix(directionalLight, dayDiffuseColor, getTimeOfDayFactors().x);
                        directionalLight = mix(directionalLight, nightDiffuseColor, getTimeOfDayFactors().y);

                        directionalLight = mix(directionalLight, vec3(dot(frx_fragNormal, vec3(0.2, 0.3, 0.4)) * 0.25 + 0.75), 1.0 - frx_vertexLight.y);

                        lightmap *= mix(vec3(frx_luminance(directionalLight)), directionalLight, 1.0);
                    } else {
                        float maxLightVal = mix(1.3, 1.0, getTimeOfDayFactors().z);
                        maxLightVal = mix(maxLightVal, 1.0, getTimeOfDayFactors().y);    

                        lightmap *= maxLightVal;
                    }
                #endif

                lightmap = max(lightmap, vec3(0.05));

                float heldLightFactor = frx_smootherstep(frx_heldLight.a * 15.0, frx_heldLight.a * 0.0, frx_distance);
                heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
                if(frx_isHand && !any(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
                heldLightFactor = clamp01(heldLightFactor);
                lightmap = mix(lightmap, (max(frx_heldLight.rgb * 1.5, lightmap) * (frx_fragLight.z * 0.75 + 0.25)), heldLightFactor);

                color.rgb *= lightmap;
            }
        #endif
        if(frx_isGui && !frx_isHand) color.rgb *= dot(frx_vertexNormal, vec3(0.3, 1.0, 0.6)) * 0.3 + 0.7; // directional shading in inventory
    #endif

    // this is used for pixel locking enchantment glint, for some reason the scale is different in gui compared to in world enchantment glint

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

    // fog that uses vanilla fog color done here, other fog done in post
    float fogFactor = frx_smootherstep(frx_fogStart, frx_fogEnd, frx_distance);
    if(frx_cameraInFluid == 1 && !frx_isGui) color.rgb = mix(color.rgb, frx_fogColor.rgb, fogFactor);

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    fragData = vec4(frx_fragLight.y, frx_fragReflectance, float(fmn_isWater), 1.0);

    gl_FragDepth = gl_FragCoord.z;
}