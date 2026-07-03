// --------------------------------------------------------------------------------------------------------
// Atmosphere taken from https://www.shadertoy.com/view/slSXRW, MIT license. Minimal code changes.
// --------------------------------------------------------------------------------------------------------

#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl

#include forgetmenot:shaders/lib/inc/sky_display.glsl

uniform sampler2D u_sky_day;
uniform sampler2D u_sky_night;
uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;
uniform sampler2D u_moon_texture;
uniform samplerCube u_clouds;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor0;
layout(location = 1) out vec4 fragColor1;
layout(location = 2) out vec4 fragColor2;
layout(location = 3) out vec4 fragColor3;
layout(location = 4) out vec4 fragColor4;
layout(location = 5) out vec4 fragColor5;

void main() {
    initGlobals();

    vec3 viewDirs[6] = vec3[6](
            vec3(0.0),
            vec3(0.0),
            vec3(0.0),
            vec3(0.0),
            vec3(0.0),
            vec3(0.0)
        );
    getCubemapViewDirs(texcoord, viewDirs);

    fragColor0 = vec4(getAtmosphereColor(viewDirs[0], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
    fragColor1 = vec4(getAtmosphereColor(viewDirs[1], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
    fragColor2 = vec4(getAtmosphereColor(viewDirs[2], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
    fragColor3 = vec4(getAtmosphereColor(viewDirs[3], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
    fragColor4 = vec4(getAtmosphereColor(viewDirs[4], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);
    fragColor5 = vec4(getAtmosphereColor(viewDirs[5], u_sky_day, u_sky_night, u_transmittance, u_multiscattering), 1.0);

    if (frx_worldHasSkylight == 1) {
        float groundDist0 = rayIntersectSphere(getSkyViewPos(), viewDirs[0], groundRadiusMM);
        float groundDist1 = rayIntersectSphere(getSkyViewPos(), viewDirs[1], groundRadiusMM);
        float groundDist2 = rayIntersectSphere(getSkyViewPos(), viewDirs[2], groundRadiusMM);
        float groundDist3 = rayIntersectSphere(getSkyViewPos(), viewDirs[3], groundRadiusMM);
        float groundDist4 = rayIntersectSphere(getSkyViewPos(), viewDirs[4], groundRadiusMM);
        float groundDist5 = rayIntersectSphere(getSkyViewPos(), viewDirs[5], groundRadiusMM);

        drawCloudsOnAtmosphere(
            fragColor0.rgb,
            viewDirs[0],
            getCumulusCloudsTransmittanceScattering(viewDirs[0], groundDist0),
            getCirrusCloudsTransmittanceScattering(viewDirs[0], groundDist0),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
        drawCloudsOnAtmosphere(
            fragColor1.rgb,
            viewDirs[1],
            getCumulusCloudsTransmittanceScattering(viewDirs[1], groundDist1),
            getCirrusCloudsTransmittanceScattering(viewDirs[1], groundDist1),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
        drawCloudsOnAtmosphere(
            fragColor2.rgb,
            viewDirs[2],
            getCumulusCloudsTransmittanceScattering(viewDirs[2], groundDist2),
            getCirrusCloudsTransmittanceScattering(viewDirs[2], groundDist2),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
        drawCloudsOnAtmosphere(
            fragColor3.rgb,
            viewDirs[3],
            getCumulusCloudsTransmittanceScattering(viewDirs[3], groundDist3),
            getCirrusCloudsTransmittanceScattering(viewDirs[3], groundDist3),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
        drawCloudsOnAtmosphere(
            fragColor4.rgb,
            viewDirs[4],
            getCumulusCloudsTransmittanceScattering(viewDirs[4], groundDist4),
            getCirrusCloudsTransmittanceScattering(viewDirs[4], groundDist4),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
        drawCloudsOnAtmosphere(
            fragColor5.rgb,
            viewDirs[5],
            getCumulusCloudsTransmittanceScattering(viewDirs[5], groundDist5),
            getCirrusCloudsTransmittanceScattering(viewDirs[5], groundDist5),
            u_transmittance,
            u_sky_day,
            u_sky_night
        );
    }
}
