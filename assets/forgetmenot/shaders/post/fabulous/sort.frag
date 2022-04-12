#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_main_color;
uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_color;
uniform sampler2D u_entity_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_clouds_color;
uniform sampler2D u_clouds_depth;
uniform sampler2D u_particles_color;
uniform sampler2D u_particles_depth;
uniform sampler2D u_sky;
uniform sampler2D u_translucent_data;
uniform sampler2D u_translucent_normal;
uniform sampler2D u_solid_normal;
uniform sampler2D u_solid_data;
uniform sampler2D u_global_illumination;

// vanilla shaders transparency.fsh

#define NUM_LAYERS 6

vec4 color_layers[NUM_LAYERS];
float depth_layers[NUM_LAYERS];
int active_layers = 0;

void try_insert( vec4 color, float depth ) {
    if ( color.a == 0.0 ) {
        return;
    }

    color_layers[active_layers] = color;
    depth_layers[active_layers] = depth;

    int jj = active_layers++;
    int ii = jj - 1;
    while ( jj > 0 && depth_layers[jj] > depth_layers[ii] ) {
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
    return ( dst * ( 1.0 - src.a ) ) + src.rgb;
}

vec2 coordFrom3D(vec3 viewDir)
{
    return vec2(atan(viewDir.x, viewDir.y), acos(viewDir.z));   
}

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 globalIllumination;
layout(location = 2) out vec4 compositeNormal;
layout(location = 3) out vec4 compositeFresnel;

void main() {
    vec4  main_color = texture(u_main_color, texcoord);
    float main_depth = texture(u_main_depth, texcoord).r;
    vec4  translucent_color = texture(u_translucent_color, texcoord);
    translucent_color.a *= 0.75;
    float translucent_depth = texture(u_translucent_depth, texcoord).r;
    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;
    vec4  weather_color = texture(u_weather_color, texcoord);
    float weather_depth = texture(u_weather_depth, texcoord).r;
    // vec4  clouds_color = texture(u_clouds_color, texcoord);
    // float clouds_depth = texture(u_clouds_depth, texcoord).r;
    vec4  particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;

    vec4 translucentData = texture(u_translucent_data, texcoord);
    vec4 solidData = texture(u_solid_data, texcoord);

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 tdata = getTimeOfDayFactors();

    vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
    float waterFogDist = distance(maxViewSpacePos, minViewSpacePos);
    if(max_depth != 1.0 && abs(translucentData.g * 20.0 - 1.0) < 0.1) translucent_color = mix(translucent_color, vec4(0.0, 0.1, 0.2, 0.9), clamp01(waterFogDist / 10.0) * (1.0 - frx_playerEyeInFluid));

    #if SKY_RESOLUTION == RESOLUTION_QUARTER
        #define RESOLUTION_SCALE 0.25
    #elif SKY_RESOLUTION == RESOLUTION_HALF
        #define RESOLUTION_SCALE 0.5
    #elif SKY_RESOLUTION == RESOLUTION_FULL
        #define RESOLUTION_SCALE 1.0
    #endif

    #ifdef SKY_UPSAMPLE_FILTER
        vec3 sky = frx_sampleTent(u_sky, texcoord * RESOLUTION_SCALE, 1.0 / frxu_size).rgb + rand3D(texcoord) / 100.0;
    #else
        vec3 sky = texture(u_sky, texcoord * RESOLUTION_SCALE).rgb + rand3D(texcoord) / 100.0;
    #endif

    vec3 cloudsColor = vec3(1.0);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.2, 0.3), tdata.z);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);

    // reflections stuff
    vec3 viewDir = normalize(minViewSpacePos);

    vec3 translucentNormal = texture(u_translucent_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 translucentf0 = translucentData.ggg;

    vec3 solidNormal = texture(u_solid_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 solidf0 = solidData.ggg;
    // vec3 solidReflectedView = reflect(minViewSpacePos, solidNormal + rand3D(texcoord) / 40.0);
    // vec3 solidReflectance;

    // if(any(lessThan(abs(solidf0 - 1.0), vec3(0.01)))) { // metal
    //     vec3 metalColor = main_color.rgb;
    //     vec3 solidReflectedColor = mix(calculateSkyColor(normalize(solidReflectedView)), vec3(1.0), calculateBasicClouds(normalize(solidReflectedView)).x * cloudsColor);
    //     main_color.rgb *= max(vec3(0.5), solidReflectedColor);
    // } else {// if(frx_rainGradient != 0.0 && dot(solidNormal, vec3(0.0, 1.0, 0.0)) > 0.7) {
        // solidReflectance = getReflectance(solidf0, dot(viewDir, -solidNormal)) * frx_rainGradient;
        // vec3 solidReflectedColor = mix(calculateSkyColor(normalize(solidReflectedView)), vec3(1.0), calculateBasicClouds(normalize(solidReflectedView)).x * cloudsColor);
        // main_color = mix(main_color, vec4(solidReflectedColor, 1.0), clamp01(vec4(solidReflectance, frx_luminance(solidReflectance))) * solidData.a);
    // }

    vec2 cloudsDensity = calculateBasicClouds(viewDir);

    vec3 cloudsNormal = cross(vec3(cloudsDensity.x, 0.0, 1.0 - cloudsDensity.x), vec3(0.0, 1.0, 0.0));

    cloudsColor *= cloudsDensity.y;

    vec2 starCoord = coordFrom3D(viewDir.brg);

    main_color.rgb = mix(
        main_color.rgb, mix(
            sky.rgb, cloudsColor, clamp01(frx_smootherstep(0.0, 0.1, viewDir.y) * cloudsDensity.x)
        ) + 
        (frx_worldIsOverworld == 1 ? calculateSun(normalize(minViewSpacePos)) : vec3(0.0)) + 
        step(0.989, 1.0 - cellular(starCoord * 8.0).x) * (1.0 - tdata.x), floor(max_depth)
    );

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending part here
    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    try_insert(weather_color, weather_depth);
    //try_insert(clouds_color, clouds_depth);
    try_insert(particles_color, particles_depth);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float blockDist = length(minViewSpacePos);

    float fogStartMin = 10.0;
    if(frx_effectBlindness == 1) fogStartMin = 1.0;
    blockDist = max(0.0, blockDist - fogStartMin);
    float fogFactor = 1.0 - exp(-blockDist / frx_viewDistance);
    fogFactor = mix(fogFactor, fogFactor * 1.5, tdata.x);
    fogFactor = mix(fogFactor, fogFactor * 2.5, tdata.y);
    fogFactor = mix(fogFactor, fogFactor * 2.0, tdata.z);
    fogFactor = mix(fogFactor, fogFactor * 2.0, frx_worldIsNether);
    fogFactor = mix(fogFactor, fogFactor * 2.0, frx_worldIsEnd);

    if(frx_effectBlindness == 1) fogFactor = 1.0 - exp(-blockDist / 5.0);

    if(min_depth != 1.0) composite.rgb = mix(composite.rgb, mix(vec3(0.0), sky.rgb, clamp01(1.0 - frx_effectBlindness + (1.0 - frx_worldIsOverworld))), clamp01(fogFactor));

    #ifdef GLOBAL_ILLUMINATION
        vec4 lastFrameSample;
        vec3 tempViewSpacePos = setupViewSpacePos(texcoord, min_depth);
        vec3 posDiff = frx_lastCameraPos - frx_cameraPos;
        vec3 lastFrameViewSpacePos = tempViewSpacePos - posDiff;
        vec2 lastFrameCoords = lastFrameViewSpaceToScreenSpace(lastFrameViewSpacePos).xy;
        if(clamp01(lastFrameCoords) != lastFrameCoords) lastFrameCoords = texcoord;
        lastFrameSample = texture(u_global_illumination, lastFrameCoords.xy);

        #ifdef APPLY_MC_LIGHTMAP
            vec3 lighting = vec3(1.0);
        #else
            vec3 lighting = vec3(0.0);
        #endif
        float blurAmount = 0.5;
        
        if(min_depth < 1.0) {
            vec3 rayView = setupViewSpacePos(texcoord, min_depth);
            vec3 rayDirection = (solidNormal * GI_RANGE / STEPS) + (rand3D(texcoord + mod(frx_renderFrames, 100))) * GI_RANGE / (STEPS);
            //rayDirection = frx_skyLightVector / 10.0 + rand3D(texcoord + mod(frx_renderFrames, 100)) / (10.0 * STEPS);
            //rayDirection = reflect(solidNormal, normalize(rayView)) * (1.0 - clamp01(dot(solidNormal, normalize(rayView)))) / STEPS + (rand3D(texcoord + mod(frx_renderFrames, 100))) * (0.001 * STEPS);

            for(int i = 0; i < STEPS; i++) {
                rayView += rayDirection;
                blurAmount += 0.5;
                //rayView += (rand3D(texcoord + mod(frx_renderSeconds, 100.0))) * GI_RANGE / STEPS;
                vec3 rayScreen = viewSpaceToScreenSpace(rayView);

                if(clamp01(rayScreen.xy) != rayScreen.xy) break;

                float depthQuery = texture(u_particles_depth, rayScreen.xy).r;
                vec3 color = texture(u_main_color, rayScreen.xy).rgb;
                
                // color *= 1.0 - i / STEPS.0;
                if(rayScreen.z > depthQuery) {
                    #ifdef APPLY_MC_LIGHTMAP
                        lighting *= color * mix(1.0, 1.0, (1.0 - solidData.b) * frx_luminance(color));
                        //lighting *= 0.8;
                    #else
                        lighting += color * frx_smootherstep(0.9, 1.1, frx_luminance(color)) * 2.0 * mix(1.0, 1.0, (1.0 - solidData.b) * frx_luminance(color));
                    #endif
                    break;
                }
            }
        }
        lighting = mix(lighting, vec3(1.0), clamp01(fogFactor));
        // lighting = mix(lighting, vec3(1.0), clamp01(frx_luminance(composite)));

        globalIllumination = vec4(mix(lastFrameSample.rgb, lighting, 0.051 + 0.95 * floor(min_depth)), blurAmount);
    #else
        globalIllumination = vec4(0.0);
    #endif

    compositeNormal.rgb = solidNormal * 0.5 + 0.5;
    if(translucent_depth != max_depth) compositeNormal.rgb = translucentNormal * 0.5 + 0.5;

    if(translucent_depth != max_depth) {
        compositeFresnel.r = translucentf0.r;
        compositeFresnel.gb = translucentData.ba;
    } else {
        compositeFresnel.r = solidf0.r;
        compositeFresnel.gb = solidData.ba;
    }
    if(any(lessThan(abs(compositeFresnel.rgb - 0.04), vec3(0.001)))) compositeFresnel.r = 0.0;
    compositeFresnel *= 20.0;

    
    // if(all(lessThan(compositeFresnel.rgb - 0.04, vec3(0.001)))) compositeFresnel.rgb = vec3(0.0);
    #ifdef DANGER_SIGHT
        if(int(solidData.b * 16.0) < 3) composite *= vec3(1.2, 0.8, 0.8);
    #endif

    fragColor = vec4(composite.rgb, 1.0);
}
