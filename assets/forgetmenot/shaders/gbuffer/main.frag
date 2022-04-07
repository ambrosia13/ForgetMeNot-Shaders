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
    //if(any(greaterThan(abs(texture(frxs_baseColor, frx_texcoord + 0.00004) - frx_sampleColor), vec4(0.001))) && !frx_isGui) color *= 0.5;
    vec4 unshadedColor = color;

    mat3 tbn = mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);

    #ifdef PBR_ENABLED
        frx_fragNormal = tbn * frx_fragNormal;
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    vec3 directionalLight = vec3(1.0);

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    vec3 sunsetDiffuseColor = vec3(0.8, 0.9, 1.1) * (dot(frx_fragNormal, moonVector) * 0.5 + 0.5) + vec3(1.1, 0.9, 0.8) * (dot(frx_fragNormal, sunVector) * 0.5 + 0.5);
    vec3 dayDiffuseColor = vec3(1.3, 1.15, 0.9) * dot(frx_fragNormal, sunVector) * 0.5 + 1.0;
    vec3 nightDiffuseColor = vec3(0.8, 1.0, 1.1) * dot(frx_fragNormal, moonVector) * 0.35 + 0.65;
        
    directionalLight = mix(directionalLight, sunsetDiffuseColor, getTimeOfDayFactors().z);
    directionalLight = mix(directionalLight, dayDiffuseColor, getTimeOfDayFactors().x);
    directionalLight = mix(directionalLight, nightDiffuseColor, getTimeOfDayFactors().y);

    directionalLight = mix(directionalLight, vec3(dot(frx_fragNormal, vec3(0.2, 0.3, 0.4)) * 0.25 + 0.75), 1.0 - frx_vertexLight.y);

    #ifdef VANILLA_LIGHTING
        #ifdef CUSTOM_LIGHTING
            // nothing to see here
            vec3 lightmap = vec3(0.0);
            lightmap.rgb = texture(frxs_lightmap, frx_fragLight.xy).rgb;

            vec3 L = frx_skyLightVector;
            vec3 V = normalize(frx_vertex.xyz);
            vec3 N = frx_fragNormal;
            vec3 H = (L + V) / length(L + V);
        #else
            vec3 lightmap = vec3(1.0);
            lightmap.rgb = texture(frxs_lightmap, frx_fragLight.xy).rgb;
            vec3 ldata = frx_fragLight;
            vec3 tdata = getTimeOfDayFactors();

            #ifdef VANILLA_AO
                if(frx_matDisableAo == 0) lightmap *= 1.0 - ((1.0 - frx_fragLight.z) * clamp01(frx_luminance(directionalLight)));
            #endif
            #ifdef DIRECTIONAL_SHADING
                if(frx_matDisableDiffuse == 0) lightmap *= directionalLight;
            #endif

            lightmap = max(lightmap, vec3(0.05));

            float heldLightFactor = frx_smootherstep(frx_heldLight.a * 10.0, frx_heldLight.a * 0.0, frx_distance);
            heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
            if(frx_isHand && !any(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
            heldLightFactor = clamp01(heldLightFactor);
            lightmap = mix(lightmap, (max(frx_heldLight.rgb * 1.1, lightmap) * (frx_fragLight.z * 0.75 + 0.25)), heldLightFactor);

            #ifdef APPLY_MC_LIGHTMAP
                if(!frx_isGui || frx_isHand) color.rgb *= lightmap;
            #endif
            if(frx_isGui && !frx_isHand) color.rgb *= dot(frx_vertexNormal, vec3(0.3, 1.0, 0.6)) * 0.3 + 0.7; // directional shading in inventory
        #endif
    #endif

    // this is used for pixel locking enchantment glint, for some reason the scale is different in gui compared to in world enchantment glint
    float pixelScale = frx_isGui ? 16.0 : 32.0; 

    if(frx_matGlint == 1) {
        #ifdef PIXEL_LOCKED_GLINT
            vec3 glint = texture(u_glint, (floor(frx_normalizeMappedUV(frx_texcoord) * pixelScale) / pixelScale) + frx_renderSeconds / 15.0).rgb;
        #else
            vec3 glint = texture(u_glint, (frx_normalizeMappedUV(frx_texcoord)) + frx_renderSeconds / 15.0).rgb;
        #endif
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    frx_fragEmissive += float(frx_matHurt) * 0.5;
    unshadedColor.rgb = mix(unshadedColor.rgb, unshadedColor.rgb * vec3(2.0, 0.2, 0.2), float(frx_matHurt)); // g;ow for hurt entities
    color.rgb = mix(color.rgb, color.rgb * 5.0, float(frx_matFlash));
    color.rgb = mix(color.rgb, unshadedColor.rgb, frx_fragEmissive);
    //if(frx_fragEmissive > 0.0) color.a = 0.5;

    if(color.a <= 0.01) discard;

    if(!frx_isGui || frx_isHand) color.rgb += color.rgb * frx_fragEmissive * EMISSIVE_BOOST.0;

    // fog that uses vanilla fog color done here, other fog done in post
    float fogFactor = frx_smootherstep(frx_fogStart, frx_fogEnd, frx_distance);
    if(frx_cameraInFluid == 1 && !frx_isGui) color.rgb = mix(color.rgb, frx_fogColor.rgb, fogFactor);

    fragColor = color;
    //fragNormal = vec4((frx_vertexNormal * 0.5 + 0.5), 1.0);
    //fragData = vec4(frx_fragEmissive, 0.0, frx_distance, 1.0); // data for other post shaders to access
    //fragLight = vec4(frx_fragLight.xy, frx_fragLight.z, directionalLight * 0.5 + 0.5);
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    fragData = vec4(frx_fragEmissive, frx_fragReflectance, frx_fragLight.xy);

    gl_FragDepth = gl_FragCoord.z;
}