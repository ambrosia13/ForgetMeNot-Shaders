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

    vec2 light = sample.rr;
    vec3 f0 = sample.rrr;
    float roughness = sample.b;
    if(dot(normal, vec3(0.0, 1.0, 0.0)) > 0.7) f0 += (0.4 * frx_rainGradient + 0.35 * frx_thunderGradient) * step(5.0, light.y);
    normal.rgb += rand3D(texcoord * 2000.0 + mod(frx_renderSeconds, 100.0)) * 0.1 * roughness;

    #ifndef ILLEGAL_SSR
        #define u_previous_frame u_color
    #endif

    bool isMetal = f0.r / 20.0 > 0.95;

    if(isMetal) f0 = (sceneColor) * 20.0;

    #ifdef RAYTRACE_SSR
        // #define SSR_STEPS 400
        if(depth != 1.0 && f0.r > 0.0) {
            int numRefinements = 0;
            int maxRefinements = 10;
            vec3 screenPos = vec3(texcoord, depth);
            vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
            vec3 reflectionView = reflect(normalize(viewSpacePos), normal);
            vec3 rayScreenDir = normalize(viewSpaceToScreenSpace(viewSpacePos + reflectionView) - screenPos);

            float stepLength = 0.5 / SSR_STEPS;

            // sky reflection
            #ifdef SIMPLE_SKY_REFLECTION
                reflectColor = mix(vec3(0.2), sampleFogColor(reflectionView), frx_smoothedEyeBrightness.y) + calculateSun(reflectionView) * frx_smoothedEyeBrightness.y;
            #else
                reflectColor = mix(vec3(0.2), sampleSkyReflection(reflectionView), frx_smoothedEyeBrightness.y);
            #endif

            for(int i = 0; i < SSR_STEPS; i++) {
                //vec3 currentScreenPos = (screenPos + rayScreenDir * float(i / 1) * stepLength);
                screenPos += rayScreenDir * stepLength * mix(1.0, frx_noise2d(texcoord + mod(frx_renderSeconds, 100.0)) * 1.0, 0.25);

                float depthQuery = texelFetch(u_depth, ivec2(frxu_size * screenPos.xy), 0).r;

                if(clamp01(screenPos.xy) != screenPos.xy) {
                    break;
                } else if(screenPos.z > depthQuery && abs(screenPos.z - depthQuery) < .01 && depthQuery != 1.0) {
                    // if(numRefinements < maxRefinements) {
                    //     screenPos -= rayScreenDir * stepLength;
                    //     stepLength *= 0.5;
                    //     numRefinements++;
                    // } else {
                        reflectColor = texture(u_previous_frame, screenPos.xy).rgb;
                    // }
                    break;
                } else {
                }
            }
            reflectance = getReflectance(f0 / 20.0, clamp01(dot(normal, -normalize(viewSpacePos))));
            // if(f0.r / 20.0 > 0.99) reflectance *= 0.5 * sceneColor * sceneColor;
            //reflectance = vec3(0.5);
        }
    #else
        if(depth != 1.0 && f0.r > 0.0) {
            vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
            vec3 cleanViewSpacePos = setupCleanViewSpacePos(texcoord, depth);

            vec3 viewDir = normalize(viewSpacePos);
            vec3 cleanViewDir = normalize(cleanViewSpacePos);

            vec3 reflectedViewDir = reflect(viewDir, normal);
            vec3 cleanReflectedViewDir = reflect(cleanViewDir, normal);

            // vec3 reflectedScreenDir = viewSpaceToScreenSpace(reflectedViewDir);
            vec3 cleanReflectedScreenDir = cleanViewSpaceToScreenSpace(cleanReflectedViewDir);

            #ifdef SIMPLE_SKY_REFLECTION
                reflectColor = mix(vec3(0.2), sampleFogColor(reflectedViewDir) + calculateSun(reflectedViewDir), frx_smoothedEyeBrightness.y);
            #else
                reflectColor = mix(vec3(0.2), sampleSkyReflection(reflectedViewDir), frx_smoothedEyeBrightness.y);
            #endif

            // bool isMetal = false;
            // if(f0.r == 20.0) {
            //     isMetal = true;
            // }

            if(clamp01(cleanReflectedScreenDir.xy) != cleanReflectedScreenDir.xy) {
                cleanReflectedScreenDir.xy = clamp01(cleanReflectedScreenDir.xy);
                // sky reflection
            } else if (texture(u_depth, cleanReflectedScreenDir.xy).r < 1.0) {
                reflectColor = texture(u_previous_frame, cleanReflectedScreenDir.xy).rgb;
            }

            float NdotV = max(0.0, dot(-normal, viewDir));
            reflectance = getReflectance(f0 / 20.0, clamp01(NdotV));
        }
    #endif

    if(frx_luminance(reflectColor) > 7.0) reflectance = vec3(0.5); // test for sun

    sceneColor = mix(sceneColor, reflectColor, clamp01(reflectance));

    fragColor = max(vec4(1.0 / 65536.0), vec4(sceneColor, 1.0));
}