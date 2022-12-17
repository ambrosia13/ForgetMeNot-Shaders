#include forgetmenot:shaders/lib/includes.glsl 
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_main_color;
uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_color;
uniform sampler2D u_entity_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_particles_color;
uniform sampler2D u_particles_depth;

uniform samplerCube u_skybox;

uniform sampler2D u_normal;
uniform sampler2D u_flat_normal;
uniform sampler2D u_pbr_data;
uniform sampler2D u_light_data;

uniform sampler2D u_previous_frame;
uniform sampler2D u_composited_mips;
uniform sampler2D u_reflection_coord;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// vanilla fabulous blending

#define NUM_LAYERS 6

vec4 color_layers[NUM_LAYERS];
float depth_layers[NUM_LAYERS];
int active_layers = 0;

void try_insert(vec4 color, float depth) {
    if(color.a == 0.0) {
        return;
    }

    color_layers[active_layers] = color;
    depth_layers[active_layers] = depth;

    int jj = active_layers++;
    int ii = jj - 1;
    while(jj > 0 && depth_layers[jj] > depth_layers[ii]) {
        float depthTemp = depth_layers[ii];
        depth_layers[ii] = depth_layers[jj];
        depth_layers[jj] = depthTemp;

        vec4 colorTemp = color_layers[ii];
        color_layers[ii] = color_layers[jj];
        color_layers[jj] = colorTemp;

        jj = ii--;
    }
}

vec3 blend( vec3 dst, vec4 src ) {
    return mix(dst, src.rgb, src.a);
}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

    float particles_depth = texture(u_particles_depth, texcoord).r;

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;

    vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
    vec3 f0 = pbrData.rrr;
    float roughness = pbrData.b;


    vec3 coords = vec3(texcoord, 0.0);
    #ifndef REFRACTION
        {
            vec3 flatNormal = texture(u_flat_normal, texcoord).rgb * 2.0 - 1.0;
            //flatNormal *= 0.8;
            vec3 sceneSpacePos = setupSceneSpacePos(texcoord, particles_depth);
            vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, translucent_depth);

            vec3 viewDir = normalize(setupSceneSpacePos(texcoord, 1.0));
            viewDir = refract(viewDir, normal - flatNormal, 1.0 / 1.33);

            coords.xy = mix(texcoord, sceneSpaceToScreenSpace(sceneSpacePos + mix(4.0, 2.0, pbrData.g) * viewDir).xy, sign(particles_depth - translucent_depth));
        }
    #endif

    translucent_depth = texture(u_translucent_depth, coords.xy).r;
    particles_depth = texture(u_particles_depth, coords.xy).r;

    vec4  particles_color = texture(u_particles_color, coords.xy);

    vec4  main_color = texture(u_main_color, coords.xy);
    float main_depth = texture(u_main_depth, coords.xy).r;

    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4  weather_color = texture(u_weather_color, texcoord);
    weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
    float weather_depth = texture(u_weather_depth, texcoord).r;

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 maxSceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
    vec3 minSceneSpacePos = setupSceneSpacePos(texcoord, min_depth);

    // Unused vars - uncomment when needed.
    // vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    // vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);

    vec3 viewDir = fNormalize(setupSceneSpacePos(texcoord, 1.0));

    vec2 clipPos = texcoord * 2.0 - 1.0;
    clipPos += TAA_OFFSETS[frx_renderFrames % 8u] / (frxu_size);
    vec2 newTexcoordJittered = clipPos * 0.5 + 0.5;
    vec3 jitteredViewPos = setupSceneSpacePos(newTexcoordJittered, 1.0);
    vec3 jitteredViewDir = fNormalize(jitteredViewPos);

    if(min_depth < 1.0) {
        vec3 transNormal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
        jitteredViewDir = refract(jitteredViewDir, transNormal, pbrData.g > 0.5 && frx_cameraInWater == 1 ? (1.33) : (1.0 / 1.33));
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec3 skyColor = textureLod(u_skybox, jitteredViewDir, 0).rgb;
    main_color.rgb = mix(main_color.rgb, skyColor, floor(max_depth));

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending same as mojang (mostly)
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    //try_insert(weather_color, weather_depth);
    try_insert(particles_color, particles_depth);
    //if(clouds_depth < max_depth) color_layers[0].rgb = mix(color_layers[0].rgb, clouds_color.rgb, clouds_color.a);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // other stuff
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // vec2 jitterCoord = texcoord + TAA_OFFSETS[frx_renderFrames % 8u] / frxu_size;

    // vec3 jitterPos = setupSceneSpacePos(jitterCoord, min_depth);
    vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
    vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(minSceneSpacePos + positionDifference);

    #if defined(BLOOMY_FOG) || defined(BLOOMY_WATER_FOG)
        const int BLOOMY_FOG_LOD = 3;
        vec3 bloomyFogColor = textureLod(u_composited_mips, lastScreenPos.xy, BLOOMY_FOG_LOD).rgb / mix(4.0, 3.0, clamp01(clamp01(0.5 - frx_smoothedEyeBrightness.y)));
    #endif

    if(pbrData.g > 0.5) {
        float sunDotU = getSunVector().y;

        float waterFogDistance = distance(minSceneSpacePos, maxSceneSpacePos); // warning: destroys underwater translucent visibility

        //vec3 waterFogColor = vec3(0.0, 0.16, 0.09)  * max(0.25, sunDotU);
        vec3 waterFogColor = translucent_color.rgb * translucent_color.a;
        waterFogColor *= (clamp01(sunDotU) * 0.9  + 0.1) * (frx_smoothedEyeBrightness.y * 0.95 + 0.05);
        
        if(max_depth == 1.0) waterFogDistance *= 0.0;
        float fogDensity = 1.0 - exp2(-waterFogDistance * 0.5);
        float foggerDensity = 1.0 - exp2(-waterFogDistance * 1.5);

        #ifdef BLOOMY_WATER_FOG
            composite = mix(composite, bloomyFogColor, foggerDensity);
        #endif

        composite = mix(composite, waterFogColor, fogDensity);
        //composite = mix(composite * mix(vec3(1.0), vec3(0.36, 1.0, 0.81), foggerDensity), waterFogColor, fogDensity);
    }

    float skyLight = texture(u_light_data, texcoord).y;
    float rainReflectionFactor = getRainReflectionFactor(normal, skyLight);

    vec3 reflectance, reflectColor;
    if(min_depth < 1.0) {
        if(f0.r > 0.0 || rainReflectionFactor > 0.0) {
            vec3 cosineDistribution = goldNoise3d();
            vec3 worldMicrofacetNormal = fNormalize(normal + fNormalize(cosineDistribution) * roughness * roughness * (interleaved_gradient()));

            vec3 rayDir = normalize(reflect(viewDir, normal));

            float reflectSkyFactor = clamp01(clamp01(frx_worldIsEnd + frx_smoothedEyeBrightness.y) - frx_cameraInWater);
            if(reflectSkyFactor > 0.01) {
                reflectColor = textureLod(u_skybox, rayDir, 10.0 * sqrt(roughness)).rgb;
            }
            reflectColor = mix((getFogScattering(viewDir, 750000.0 - 500000.0 * frx_skyLightVector.y)) * 0.25, reflectColor, reflectSkyFactor);

            reflectColor = mix(reflectColor, UNDERWATER_FOG_COLOR * max(0.1, frx_skyLightVector.y) * max(0.1, frx_smoothedEyeBrightness.y), frx_cameraInWater);
            
            reflectance = getReflectance(f0, clamp01(dot(normal, -viewDir)), roughness * roughness);
            if(f0.r < 0.01) reflectance *= rainReflectionFactor;

            #if REFLECTIONS == REFLECTIONS_FANCY
                vec2 reflectionCoord = texelFetch(u_reflection_coord, ivec2(gl_FragCoord.xy * SSR_RENDER_SCALE), 0).rg;

                if(dot(reflectionCoord, reflectionCoord) > 0.00001) reflectColor = texelFetch(u_previous_frame, ivec2(reflectionCoord * frxu_size), 0).rgb;
            #elif REFLECTIONS == REFLECTIONS_FAST
                vec3 reflectionCoord = (reflect(setupCleanSceneSpacePos(texcoord, translucent_depth), worldMicrofacetNormal));

                // Have to reproject...
                //vec3 rView = setupSceneSpacePos(reflectionCoord.xy, reflectionCoord.z);
                reflectionCoord = cleanLastFrameSceneSpaceToScreenSpace(reflectionCoord + frx_cameraPos - frx_lastCameraPos);

                if(clamp01(reflectionCoord) == reflectionCoord) reflectColor = texelFetch(u_previous_frame, ivec2(reflectionCoord.xy * frxu_size), 0).rgb;
            #endif
            if(f0.r > 0.999) reflectColor *= (composite);
        }

        if((acos(dot(normal, -viewDir)) * (180 / PI) > 48.60172336679899) && frx_cameraInWater == 1 && pbrData.g > 0.5) {
            reflectance = vec3(1.0);

            //reflectColor = vec3(0.0, 0.5, 0.4) * max(0.1, frx_skyLightVector.y);
            composite = vec3(1.0, 0.0, 0.0);
        }

        composite = mix(composite, reflectColor, reflectance);
        //composite = normal;
    }

    float blockDist = min(frx_viewDistance, length(minSceneSpacePos));
    float sunDotU = getSunVector().y;

    float bloomyFogTransmittance = 1.0;
    #ifdef ATMOSPHERIC_FOG
        float fogTransmittance = 1.0;
        if(frx_worldIsOverworld == 1) {
            float fogDist = blockDist;
            if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
            fogDist /= 256.0;

            float fogAmount = 0.1;

            fogAmount += getSeasonFogFactor();
            fogAmount += 1.0 * fmn_rainFactor * frx_smoothedEyeBrightness.y;

            fogAmount = mix(fogAmount, 3.5, clamp01(0.5 - frx_smoothedEyeBrightness.y));
            fogAmount = mix(fogAmount, 6.5, smoothstep(0.0, -10.0, frx_cameraPos.y));

            fogTransmittance = exp(-fogDist * (3.0 - 2.0 * frx_skyLightVector.y) * (fogAmount + 0.3 * (1.0 - frx_smoothedEyeBrightness.y - frx_worldIsEnd) + 30.0 * frx_cameraInFluid));
            //fogTransmittance = mix(0.0, fogTransmittance, step(0.5, texcoord.x));

            bloomyFogTransmittance = fogTransmittance;
            fogTransmittance = mix(fogTransmittance, 0.5 + 0.5 * fogTransmittance, floor(min_depth));
            if(frx_cameraInFluid == 1 && min_depth == 1.0) fogTransmittance = 0.0;

            vec3 fogScattering = getSkyColor(viewDir, 0.0);

            fogScattering = mix(fogScattering, mix(vec3(0.1, 0.2, 0.4) * 0.25, vec3(0.1, 0.05, 0.025) * 0.5, smoothstep(0.0, -10.0, frx_cameraPos.y)), 1.0 - frx_smoothedEyeBrightness.y);
            fogScattering = mix(fogScattering, UNDERWATER_FOG_COLOR * max(0.1, getSunVector().y) * max(0.1, frx_smoothedEyeBrightness.y), frx_cameraInWater);
            
            fogScattering *= (1.0 - fogTransmittance);

            composite = composite * fogTransmittance + fogScattering;
        } else if(frx_worldIsNether == 1) {
            float fogDist = blockDist;
            if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
            fogDist /= 64.0;

            fogTransmittance = exp(-fogDist);
            bloomyFogTransmittance = fogTransmittance;
            vec3 fogScattering = pow(frx_fogColor.rgb * 2.0, vec3(2.2)) * (1.0 - fogTransmittance);

            composite = composite * fogTransmittance + fogScattering;
        }
    #endif

    #ifdef BLOOMY_FOG
        bloomyFogTransmittance = mix(bloomyFogTransmittance, 0.0, clamp01(floor(min_depth)));

        if(frx_worldIsOverworld == 1) {
            //bloomyFogTransmittance = mix(bloomyFogTransmittance, 1.0, 0.5 + 0.5 * (1.0 - fmn_rainFactor) * frx_smoothedEyeBrightness.y * smoothstep(0.0, 0.3, viewDir.y));
            bloomyFogTransmittance = mix(bloomyFogTransmittance, 1.0, clamp01(floor(min_depth) * exp(-viewDir.y * 15.0) - 0.2 * sqrt(getMoonVector().y) + 0.9 * sqrt(getSunVector().y)));
        } else if(frx_worldIsEnd == 1) {
            bloomyFogTransmittance = 1.0;
        }

        //bloomyFogTransmittance = smoothstep(0.0, 1.0, bloomyFogTransmittance);

        composite = mix(bloomyFogColor, composite, clamp01(bloomyFogTransmittance * 0.7 + 0.3 + 0.1 * floor(min_depth)));
        skyColor = mix(bloomyFogColor, skyColor, clamp01(bloomyFogTransmittance * 0.7 + 0.3 + 0.1 * floor(min_depth)));
    #endif

    #ifdef BORDER_FOG
        if(min_depth < 1.0 && frx_cameraInFluid == 0) composite = mix(composite, skyColor, smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, blockDist));
    #endif

    #ifdef frx_darknessEffectFactor
        float sinTime = sin(fmn_time);
        float timeFactor = sinTime * sinTime * sinTime * sinTime * sinTime * sinTime;
        float darknessFactor = max(0.0, (frx_darknessEffectFactor) * 0.75 + 0.25);
        composite = mix(composite, vec3(0.0), (smoothstep(0.0, 20.0 * darknessFactor, blockDist)) * frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
    #endif

    if(weather_depth < min_depth) {
        composite = mix(composite, weather_color.rgb, weather_color.a * 0.5);
    }

    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, 1.0));
}
