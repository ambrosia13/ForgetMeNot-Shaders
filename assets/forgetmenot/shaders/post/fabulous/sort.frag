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

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 globalIllumination;
layout(location = 2) out vec4 compositeNormal;
layout(location = 3) out vec4 compositeFresnel;

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
    return ( dst * ( 1.0 - src.a ) ) + src.rgb;
}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    vec4  main_color = texture(u_main_color, texcoord);
    float main_depth = texture(u_main_depth, texcoord).r;
    vec4 solidData = texture(u_solid_data, texcoord);
    vec3 solidNormal = texture(u_solid_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 solidf0 = solidData.ggg;
    
    vec4  translucent_color = texture(u_translucent_color, texcoord);
    translucent_color.a *= 0.75;
    float translucent_depth = texture(u_translucent_depth, texcoord).r;
    vec4 translucentData = texture(u_translucent_data, texcoord);
    vec3 translucentNormal = texture(u_translucent_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 translucentf0 = translucentData.ggg;

    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4  weather_color = texture(u_weather_color, texcoord);
    float weather_depth = texture(u_weather_depth, texcoord).r;

    // vec4  clouds_color = texture(u_clouds_color, texcoord);
    // float clouds_depth = texture(u_clouds_depth, texcoord).r;

    vec4  particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;


    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // common things
    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
    vec3 viewDir = normalize(minViewSpacePos);

    vec3 tdata = getTimeOfDayFactors();
    // ---

    float waterFogDist = distance(maxViewSpacePos, minViewSpacePos);
    if(max_depth != 1.0 && translucentData.b > 0.5) translucent_color = mix(translucent_color, vec4(0.0, 0.1, 0.2, 0.9), clamp01(waterFogDist / 10.0) * (1.0 - frx_playerEyeInFluid));

    // sky stuff
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

    if(floor(max_depth) > 0.5) {
        vec3 cloudsColor = vec3(1.0);
        cloudsColor = mix(cloudsColor, vec3(0.3, 0.2, 0.3), tdata.z);
        cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);
        cloudsColor *= 1.5;

        vec2 cloudsDensity = calculateBasicClouds(viewDir); // x = clouds, y = shading
        cloudsColor *= cloudsDensity.y;

        vec2 starCoord = coordFrom3D(viewDir.brg);

        vec3 finalSky = mix(sky.rgb, cloudsColor, clamp01(frx_smootherstep(0.0, 0.1, viewDir.y) * cloudsDensity.x));
        finalSky += calculateSun(viewDir);
        finalSky += step(0.989, 1.0 - cellular2x2(starCoord * 8.0).x) * (1.0 - tdata.x);

        main_color.rgb = finalSky;
    }

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

    float fogStartMin = mix(10.0, 1.0, float(frx_effectBlindness));
    blockDist = max(0.0, blockDist - fogStartMin);

    float fogFactor = 1.0 - exp(-blockDist / frx_viewDistance);
    fogFactor = mix(fogFactor, fogFactor * 1.5, tdata.x);
    fogFactor = mix(fogFactor, fogFactor * 2.5, tdata.y);
    fogFactor = mix(fogFactor, fogFactor * 2.0, tdata.z);
    fogFactor = mix(fogFactor, fogFactor * 2.0, frx_worldIsNether);
    fogFactor = mix(fogFactor, fogFactor * 2.0, frx_worldIsEnd);

    fogFactor = mix(fogFactor, 1.0 - exp(-blockDist / 5.0), float(frx_effectBlindness));

    vec3 fogColor = mix(sky.rgb, vec3(0.0), frx_effectBlindness);
    fogColor = mix(frx_fogColor.rgb, fogColor, frx_worldIsOverworld);
    vec3 tempColor = mix(composite.rgb, fogColor, clamp01(fogFactor));
    composite.rgb = mix(tempColor, composite, floor(min_depth));

    #ifdef GLOBAL_ILLUMINATION
        vec4 lastFrameSample;
        vec3 tempViewSpacePos = minViewSpacePos;
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
            vec3 rayView = minViewSpacePos;
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

    // this data goes to different shader
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
    if(translucentData.b > 0.5) compositeFresnel.r = 0.05;
    compositeFresnel *= 20.0;

    
    // if(all(lessThan(compositeFresnel.rgb - 0.04, vec3(0.001)))) compositeFresnel.rgb = vec3(0.0);
    #ifdef DANGER_SIGHT
        if(int(solidData.b * 16.0) < 3) composite *= vec3(1.2, 0.8, 0.8);
    #endif

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));

    fragColor = vec4(composite.rgb, 1.0);
}
