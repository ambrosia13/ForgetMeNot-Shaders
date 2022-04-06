


in vec2 texcoord;

layout(location = 0) out vec4 globalIllumination;

void main() {
        // vec4 lastFrameSample;
        // vec3 tempViewSpacePos = setupViewSpacePos(texcoord, min_depth);
        // vec3 posDiff = frx_lastCameraPos - frx_cameraPos;
        // vec3 lastFrameViewSpacePos = tempViewSpacePos - posDiff;
        // vec2 lastFrameCoords = lastFrameViewSpaceToScreenSpace(lastFrameViewSpacePos).xy;
        // if(clamp01(lastFrameCoords) != lastFrameCoords) lastFrameCoords = texcoord;
        // lastFrameSample = normalLockedBlur(u_global_illumination, lastFrameCoords.xy, frxu_size, mix(vec2(0.0, 1.0), vec2(1.0, 0.0), mod(frx_renderFrames, 2.0)), u_solid_normal);

        // vec3 lighting = vec3(1.0);
        
        // if(min_depth < 1.0) {
        //     vec3 rayView = setupViewSpacePos(texcoord, min_depth);
        //     vec3 rayDirection = solidNormal;

        //     // #define STEPS 10
        //     for(int i = 0; i < STEPS; i++) {
        //         rayView += (solidNormal * GI_RANGE / (STEPS)) + (rand3D(texcoord + mod(frx_renderFrames, 10.0))) * GI_RANGE / (STEPS);
        //         //rayView += (rand3D(texcoord + mod(frx_renderSeconds, 100.0))) * GI_RANGE / STEPS;
        //         vec3 rayScreen = viewSpaceToScreenSpace(rayView);
        //         if(clamp01(rayScreen.xy) != rayScreen.xy) break;
        //         float depthQuery = texture(u_particles_depth, rayScreen.xy).r;
        //         vec3 color = texture(u_main_color, rayScreen.xy).rgb;
        //         // color *= 1.0 - i / STEPS.0;
        //         if(rayScreen.z > depthQuery) {
        //             lighting *= color * mix(1.0, 3.0, (1.0 - solidData.b) * frx_luminance(color));
        //             break;
        //         } else {
        //         }
        //     }
        // }

        // lighting = mix(lighting, vec3(1.0), clamp01(fogFactor));
        // lighting = mix(lighting, vec3(1.0), clamp01(frx_luminance(composite)));

        // globalIllumination = mix(lastFrameSample, vec4(lighting, 1.0), 0.05 + 0.9 * float(min_depth == 1.0));
        // // globalIllumination = max(lastFrameSample, vec4(lighting, 1.0));
}
