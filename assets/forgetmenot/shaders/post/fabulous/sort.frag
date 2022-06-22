#include forgetmenot:shaders/lib/includes.glsl 
#include forgetmenot:shadows

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
uniform sampler2DArrayShadow u_shadow_map;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 globalIllumination;

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

//uniform int frxu_cascade;

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;
    vec4 translucentData = texture(u_translucent_data, texcoord);
    vec3 translucentNormal = texture(u_translucent_normal, texcoord).rgb * 2.0 - 1.0;

    vec3 transViewSpacePos = setupViewSpacePos(texcoord, translucent_depth);


    vec4  main_color = texture(u_main_color, texcoord);
    float main_depth = texture(u_main_depth, texcoord).r;
    vec4 solidData = texture(u_solid_data, texcoord);
    vec3 solidNormal = texture(u_solid_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 solidf0 = solidData.ggg;
    


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
    vec3 viewDir = normalize(maxViewSpacePos);

    vec3 tdata = getTimeOfDayFactors();

    vec3 atmosphere;
    if(max_depth == 1.0) {
        //viewDir += rand3D(texcoord * 20000.0) * 0.001;

        atmosphere.rgb = atmosphericScattering(viewDir, getSunVector(), 1.0 - getTimeOfDayFactors().y, 2.0);
        atmosphere.rgb += atmosphericScattering(viewDir, getMoonVector(), getTimeOfDayFactors().y, 2.0) * vec3(0.1, 0.13, 0.2); // Moonlight scattering

        atmosphere.rgb += rand3D(texcoord * 20000.0) / 200.0;

        main_color.rgb = atmosphere.rgb;

        float starFactor = dot(getSunVector(), vec3(0.0, 1.0, 0.0));
        starFactor = smoothstep(0.2, 0.1, starFactor);
        if(starFactor > 0.0) {
            const float starBrightness = 3.5;

            maxViewSpacePos.y = abs(maxViewSpacePos.y);

            vec2 starPlane = maxViewSpacePos.xz / (maxViewSpacePos.y + length(maxViewSpacePos.xz));
            starPlane *= 10.0;
            vec3 starColor = normalize(vec3(smoothHash(starPlane + 10.0), smoothHash(starPlane - 10.0), smoothHash(starPlane + 20.0)) * 0.5 + 0.6);
            starColor = starColor * 0.5 + 0.5;
            vec3 stars = starColor * starBrightness;

            main_color.rgb = mix(main_color.rgb, stars, smoothstep(0.001, 0.0005, hash12(floor(starPlane * 30.0))) * starFactor);
        }

        // float sunFactor;
        // float moonFactor;
        // vec3 sun = sunDisk(viewDir, sunFactor);
        // vec3 moon = sunDisk(viewDir, moonFactor);

        // main_color.rgb = mix(main_color.rgb, sun, sunFactor);
        // main_color.rgb = mix(main_color.rgb, moon, moonFactor);
    } else if(translucentData.b > 0.5) {
        translucent_color.rgb *= vec3(1.0, 1.3, 0.7);
        float sunDotU = dot(getSunVector(), vec3(0.0, 1.0, 0.0));
        float opticalDepth = particleThicknessConst(1.0);

        float waterFogDistance = distance(minViewSpacePos, maxViewSpacePos);

        vec3 waterFogColor = vec3(0.0, 0.4, 0.3)  * max(0.5, sunDotU);
        //vec3 waterFogColor = translucent_color.rgb / vec3(frx_luminance(translucent_color.rgb));
        waterFogColor *= clamp01(sunDotU) * 0.5 + 0.5;
        
        float fogDensity = tanh(waterFogDistance / 5.0);

        translucent_color.rgb = mix(translucent_color.rgb, waterFogColor, fogDensity);
        translucent_color.a = mix(translucent_color.a, 0.9, fogDensity);
    }
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending part here
    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    try_insert(weather_color, weather_depth);
    // try_insert(clouds_color, clouds_depth);
    try_insert(particles_color, particles_depth);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    if(min_depth < 1.0) {
        composite = simpleFog(composite, minViewSpacePos);
    }

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));
    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, 1.0));
}
