// --------------------------------------------------------------------------------------------------------
// Atmosphere taken from https://www.shadertoy.com/view/slSXRW, MIT license. Minimal code changes.
// --------------------------------------------------------------------------------------------------------

#define INCLUDE_SKY
#define INCLUDE_CUBEMAPS
#define INCLUDE_NOISE
#define INCLUDE_IGN
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_sky;
uniform sampler2D u_sky_night;
uniform sampler2D u_transmittance;
uniform samplerCube u_clouds;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor0;
layout(location = 1) out vec4 fragColor1;
layout(location = 2) out vec4 fragColor2;
layout(location = 3) out vec4 fragColor3;
layout(location = 4) out vec4 fragColor4;
layout(location = 5) out vec4 fragColor5;

vec3 global_sunTransmittance;
vec3 global_moonTransmittance;

vec3 getSkyColor(in vec3 viewDir, in vec3 sunTransmittance, in vec3 moonTransmittance, const in float sunBrightness) {
     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 blueHourMultiplier = fNormalize(vec3(0.8, 1.1, 1.5)) * 1.5;
     blueHourMultiplier = mix(vec3(1.0), blueHourMultiplier, linearstep(0.05, -0.05, sunVector.y));
     
     float intersectedPlanet = step(rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM), 0.0);

     vec3 dayColor = (2.0 * getValFromSkyLUT(viewDir, sunVector, u_sky) + sunBrightness * step(0.9997, dot(viewDir, sunVector)) * intersectedPlanet * sunTransmittance) * 20.0;
     vec3 nightColor = (getValFromSkyLUT(viewDir, moonVector, u_sky_night) + 4.0 * sunBrightness * step(0.9997, dot(viewDir, moonVector)) * intersectedPlanet * moonTransmittance) * 20.0;

     return 2.0 * blueHourMultiplier * (dayColor + nightColor);
}

vec3 getClouds(in vec3 viewDir, in vec3 sunTransmittance, in vec3 moonTransmittance, in vec3 skyColor) {
     vec2 cloudsSample = texture(u_clouds, viewDir).rg;

     vec2 plane = 2.0 * viewDir.xz * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y);
     vec3 cumulusPos = skyViewPos + vec3(0.0, 0.0005 * dot(plane, getSunVector().xz), 0.0);


     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 scatteringColor = sunTransmittance + moonTransmittance;
     vec3 ambientColor = getSkyColor(vec3(0.0, 1.0, 0.0), sunTransmittance, moonTransmittance, 0.0) * 0.5;

     vec3 scattering = 8.0 * scatteringColor * mix(cloudsSample.g, 1.0, getMiePhase(dot(viewDir, sunVector), 0.7) + 0.5 * getMiePhase(dot(viewDir, moonVector), 0.7)) + ambientColor;
     float transmittance = cloudsSample.r;

     return mix(scattering, skyColor, transmittance);
}


void main() {
     global_sunTransmittance = getValFromTLUT(u_transmittance, skyViewPos, getSunVector());
     global_moonTransmittance = moonFlux * getValFromTLUT(u_transmittance, skyViewPos, getMoonVector());

     vec3 viewDirs[6] = vec3[6] (
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0)
     );
     getCubemapViewDirs(texcoord, viewDirs);

     fragColor0 = vec4(getClouds(viewDirs[0], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[0], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
     fragColor1 = vec4(getClouds(viewDirs[1], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[1], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
     fragColor2 = vec4(getClouds(viewDirs[2], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[2], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
     fragColor3 = vec4(getClouds(viewDirs[3], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[3], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
     fragColor4 = vec4(getClouds(viewDirs[4], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[4], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
     fragColor5 = vec4(getClouds(viewDirs[5], global_sunTransmittance, global_moonTransmittance, getSkyColor(viewDirs[5], global_sunTransmittance, global_moonTransmittance, 8.0)), 1.0);
}