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
    vec3 tdata = getTimeOfDayFactors();
    vec3 cloudsColor = vec3(1.0);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.2, 0.3), tdata.z);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    //normal += rand3D(texcoord) / 255.0;
    float depth = texture(u_depth, texcoord).r;
    float particlesDepth = texture(u_particles_depth, texcoord).r;

    vec3 sample = texture(u_data, texcoord).rgb;
    vec2 light = sample.gb;
    vec3 f0 = sample.rrr;

    vec3 sceneColor = texture(u_color, texcoord).rgb;

    vec3 reflectColor = vec3(0.0);
    vec3 reflectance = vec3(0.0);
    vec3 sunReflection = vec3(0.0);

    #ifdef RAYTRACE_SSR
        #define SSR_STEPS 10
        if(depth != 1.0 && f0.r > 0.0) {
            vec3 rayViewPos = setupViewSpacePos(texcoord, depth);
            vec3 nRayViewPos = normalize(rayViewPos);
            vec3 rayDirection = normalize(reflect(nRayViewPos, normal));

            float NdotV = max(0.0, dot(-normal, nRayViewPos));
            float stepLength = 40.0 / SSR_STEPS;
            //stepLength = mix(stepLength, stepLength * 2.0, 1.0 - NdotV);

            for(int i = 0; i < SSR_STEPS; i++) {
                rayViewPos += rayDirection * ((mix(4.0, 80.0, 1.0 - NdotV)) / SSR_STEPS) + rand3D(texcoord) / 2515.0;

                vec3 rayScreenPos = viewSpaceToScreenSpace(rayViewPos);

                if(clamp01(rayScreenPos.xy) != rayScreenPos.xy) {
                    reflectColor = mix(mix(calculateSkyColor(rayDirection), vec3(1.0), calculateBasicCloudsOctaves(rayDirection, 1).x * 0.5 * cloudsColor), vec3(0.2), 1.0 - step(0.9, light.y));
                    reflectColor += calculateSun(rayDirection);
                    break;
                }

                float depthQuery = texture(u_depth, rayScreenPos.xy).r;
                // if(depthQuery == 1.0) {
                //     break;
                // }

                if(rayScreenPos.z > depthQuery) {
                    reflectColor = texture(u_color, rayScreenPos.xy).rgb;
                } else {
                    reflectColor = mix(mix(calculateSkyColor(rayDirection), vec3(1.0), calculateBasicCloudsOctaves(rayDirection, 1).x * 0.5 * cloudsColor), vec3(0.2), 1.0 - step(0.9, light.y));
                    reflectColor += calculateSun(rayDirection);
                }
            }
            reflectance = getReflectance(f0 / 20.0, NdotV);
            reflectance = vec3(1.0);
        }

        // vec2 reflectionUv;

        // float maxDistance = frx_viewDistance;
        // float resolution = 0.2;
        // int steps = 15;
        // float thickness = 0.5;

        // vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
        // vec3 positionTo = viewSpacePos;
        // vec3 viewDir = normalize(viewSpacePos);
        // vec3 rayDir = reflect(viewDir, normal);

        // vec3 startView = viewSpacePos;
        // vec3 endView = viewSpacePos + rayDir * maxDistance;

        // vec3 startFrag = viewSpaceToScreenSpace(startView);
        // startFrag.xy *= frxu_size;

        // vec3 endFrag = viewSpaceToScreenSpace(endView);
        // endFrag.xy *= frxu_size;

        // vec2 frag = startFrag.xy;
        // reflectionUv = frag / frxu_size;

        // float deltaX = endFrag.x - startFrag.x;
        // float deltaY = endFrag.y - startFrag,y;

        // float useX = float(abs(deltaX) >= abs(deltaY));
        // float delta = mix(abs(deltaY), abs(deltaX), useX) * clamp01(resolution);

        // vec2 increment = vec2(deltaX, deltaY) / max(delta, 0.001);

        // float search0 = 0.0;
        // float search1 = 0.0;

        // int hit0 = 0;
        // int hit1 = 0;

        // float viewDistance = length(startView);
        // float rayDepth = thickness;

        // for(int i = 0; i < int(delta); i++) {
        //     frag += increment;
        //     reflectionUv.xy = frag / frxu_size;

        //     search1 = mix(
        //         (frag.y - startFrag.y) / deltaY,
        //         (frag.x - startFrag.x) / deltaX,
        //         useX
        //     );

        //     viewDistance = length(startView) * length(endView) / mix(length(endView), length(startView), search1);

        //     rayDepth = viewDistance - length(setupViewSpacePos(reflectionUv.xy, depth));

        //     if(depth > 0.0 && depth < thickness) {
        //         hit0 = 1;
        //         break;
        //     } else {
        //         search0 = search1;
        //     }
        // }

        // search1 = search0 + ((search1 - search0) / 2.0);

        // steps *= hit0;
        // for(int i = 0; i < steps; i++) {
        //     frag = mix(startFrag.xy, endFrag.xy, search1);
        //     reflectionUv.xy = frag / frxu_size;
        //     positionTo = setupViewSpacePos(reflectionUv, depth);

        //     viewDistance = (length(startView) * length(endView)) / mix(length(startView), length(endView), search1);
        //     depth = viewDistance - length(positionTo);

        //     if(depth > 0.0 && depth < thickness) {
        //         hit1 = 1;
        //         search1 = search0 + ((search1 - search0) / 2.0);
        //     } else {
        //         float temp = search1;
        //         search1 = search0 + ((search1 - search0) / 2.0);
        //         search0 = temp;
        //     }
        // }

    #else
        if(depth != 1.0 && f0.r > 0.0) {
            vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
            vec3 cleanViewSpacePos = setupCleanViewSpacePos(texcoord, depth);

            float lengthC = length(cleanViewSpacePos);

            vec3 viewDir = normalize(viewSpacePos);
            vec3 cleanViewDir = normalize(cleanViewSpacePos);

            vec3 reflectedViewDir = reflect(viewDir, normal);
            vec3 cleanReflectedViewDir = reflect(cleanViewDir, normal);

            vec3 reflectedScreenDir = viewSpaceToScreenSpace(reflectedViewDir);
            vec3 cleanReflectedScreenDir = cleanViewSpaceToScreenSpace(cleanReflectedViewDir * lengthC);

            bool isMetal = false;
            if(f0.r == 20.0) {
                isMetal = true;
            }

            if(clamp01(cleanReflectedScreenDir.xy) != cleanReflectedScreenDir.xy) {
                cleanReflectedScreenDir.xy = clamp01(cleanReflectedScreenDir.xy);
                reflectColor = mix(mix(calculateSkyColor(reflectedViewDir), vec3(1.0), calculateBasicCloudsOctaves(reflectedViewDir, 1).x * 0.5 * cloudsColor), vec3(0.2), 1.0 - step(0.9, light.y));
                reflectColor += calculateSun(reflectedViewDir);
                reflectColor = mix(vec3(0.2), reflectColor, frx_smoothedEyeBrightness.y);
            } else {
                reflectColor = texture(u_previous_frame, cleanReflectedScreenDir.xy).rgb;
            }

            sunReflection = calculateSun(reflectedViewDir) * (1.0 / 20.0);

            //reflectColor = cleanReflectedScreenDir.xyy;

            float NdotV = max(0.0, dot(-normal, viewDir));
            // for some reason schlick function returns NaN:
            reflectance = getReflectance(f0 / 20.0, clamp01(NdotV));
            //reflectance = vec3(0.05 + (1.0 - 0.05) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)));
        }
    #endif

    if(frx_luminance(reflectColor) > 5.0) reflectance = vec3(0.5); // test for sun

    sceneColor = mix(sceneColor, reflectColor, clamp01(reflectance));

    fragColor = vec4(sceneColor + sunReflection * 0.0, 1.0);
}