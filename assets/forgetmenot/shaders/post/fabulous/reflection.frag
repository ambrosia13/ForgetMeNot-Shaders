#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_normal;
uniform sampler2D u_data;
uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform sampler2D u_particles_depth;
uniform sampler2D u_previous_frame;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    float depth = texture(u_depth, texcoord).r;
    float particlesDepth = texture(u_particles_depth, texcoord).r;
    vec3 sample = texture(u_data, texcoord).rgb;
    vec3 sceneColor = texture(u_color, texcoord).rgb;

    vec3 reflectColor = vec3(0.0);
    vec3 reflectance = vec3(0.0);
    vec3 sunReflection = vec3(0.0);

    vec3 tdata = getTimeOfDayFactors();
    vec3 cloudsColor = vec3(1.0);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.2, 0.3), tdata.z);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);

    vec2 light = sample.gb;
    vec3 f0 = sample.rrr;
    if(dot(normal, vec3(0.0, 1.0, 0.0)) > 0.7) f0 += (0.4 * frx_rainGradient + 0.35 * frx_thunderGradient) * step(10.0, light.y);
    if(f0.r / 20.0 > 0.99) normal.rgb += rand3D(texcoord) / 100.0;

    #ifndef RAYTRACE_SSR
        #define SSR_STEPS 40
        if(depth != 1.0 && f0.r > 0.0) {
            vec3 clipSpacePos = vec3(texcoord, depth) * 2.0 - 1.0;
            vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
            vec3 reflectionView = reflect(normalize(viewSpacePos), normal);
            vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(viewSpacePos + reflectionView) * 2.0 - 1.0 - clipSpacePos);

            float stepLength = 1.0 / SSR_STEPS;

            // sky reflection
            vec3 cloudsColor = vec3(1.2);
            cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.z);
            cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);
            cloudsColor *= 1.5;

            vec2 cloudsDensity = calculateBasicCloudsOctaves(reflectionView, 10); // x = clouds, y = shading
            cloudsColor *= cloudsDensity.y * 0.7;
            cloudsDensity.x *= mix(1.0, 0.5, tdata.z);
            cloudsDensity.x *= mix(1.0, 0.75, tdata.y);

            reflectColor = mix(calculateSkyColor(reflectionView), vec3(0.2), 1.0 - step(0.9, light.y));
            reflectColor += calculateSun(reflectionView);
            reflectColor = mix(reflectColor, mix(reflectColor, cloudsColor, 0.75), clamp01(cloudsDensity.x));
            reflectColor = mix(vec3(0.2), reflectColor, frx_smoothedEyeBrightness.y);

            for(int i = 0; i < SSR_STEPS; i++) {
                vec3 currentScreenPos = (clipSpacePos + rayScreenDir * float(i) * stepLength) * 0.5 + 0.5;

                if(clamp01(currentScreenPos.xy) != currentScreenPos.xy) {
                    break;
                } else if(currentScreenPos.z > texelFetch(u_depth, ivec2(frxu_size * currentScreenPos.xy), 0).r) {
                    reflectColor = texture(u_previous_frame, currentScreenPos.xy).rgb;
                    break;
                } else {
                }
            }
            reflectance = getReflectance(f0 / 20.0, clamp01(dot(normal, -normalize(viewSpacePos))));
            // if(f0.r / 20.0 > 0.99) reflectance *= 0.5 * sceneColor * sceneColor;
            // reflectance = vec3(1.0);
        }
    #else
        if(depth != 1.0 && f0.r > 0.0) {
            vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
            vec3 cleanViewSpacePos = setupCleanViewSpacePos(texcoord, depth);

            vec3 viewDir = normalize(viewSpacePos);
            vec3 cleanViewDir = normalize(cleanViewSpacePos);

            vec3 reflectedViewDir = reflect(viewDir, normal);
            vec3 cleanReflectedViewDir = reflect(cleanViewDir, normal);

            vec3 reflectedScreenDir = viewSpaceToScreenSpace(reflectedViewDir);
            vec3 cleanReflectedScreenDir = cleanViewSpaceToScreenSpace(cleanReflectedViewDir);

            // bool isMetal = false;
            // if(f0.r == 20.0) {
            //     isMetal = true;
            // }

            if(clamp01(cleanReflectedScreenDir.xy) != cleanReflectedScreenDir.xy) {
                cleanReflectedScreenDir.xy = clamp01(cleanReflectedScreenDir.xy);
                reflectColor = mix(calculateSkyColor(reflectedViewDir), vec3(0.2), 1.0 - step(0.9, light.y));
                reflectColor += calculateSun(reflectedViewDir);
                reflectColor = mix(vec3(0.2), reflectColor, frx_smoothedEyeBrightness.y);
            } else {
                reflectColor = texture(u_previous_frame, cleanReflectedScreenDir.xy).rgb;
            }

            sunReflection = calculateSun(reflectedViewDir) * (1.0 / 20.0);

            float NdotV = max(0.0, dot(-normal, viewDir));
            reflectance = getReflectance(f0 / 20.0, clamp01(NdotV));
        }
    #endif

    if(frx_luminance(reflectColor) > 7.0) reflectance = vec3(0.5); // test for sun

    sceneColor = mix(sceneColor, reflectColor, clamp01(reflectance));

    fragColor = max(vec4(1.0 / 65536.0), vec4(sceneColor + sunReflection * 0.0, 1.0));
}