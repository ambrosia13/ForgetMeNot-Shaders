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

vec3 getValFromSkyLUT(vec3 rayDir, vec3 sunDir, sampler2D skyLut) {
     float height = length(skyViewPos);
     vec3 up = skyViewPos * rcp(height);
     
     float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
     float altitudeAngle = horizonAngle - acos(dot(rayDir, up)); // Between -PI/2 and PI/2
     float azimuthAngle; // Between 0 and 2*PI
     if (abs(altitudeAngle) > (HALF_PI - .0001)) {
          // Looking nearly straight up or down.
          azimuthAngle = 0.0;
     } else {
          vec3 right = cross(sunDir, up);
          vec3 forward = cross(up, right);
          
          vec3 projectedDir = normalize(rayDir - up*(dot(rayDir, up)));
          float sinTheta = dot(projectedDir, right);
          float cosTheta = dot(projectedDir, forward);
          azimuthAngle = atan(sinTheta, cosTheta) + PI;
     }
     
     // Non-linear mapping of altitude angle. See Section 5.3 of the paper.
     float v = 0.5 + 0.5*sign(altitudeAngle)*sqrt(abs(altitudeAngle)*2.0/PI);
     vec2 uv = vec2(azimuthAngle / (TAU), v);
     
     return texture(skyLut, uv).rgb;
}
vec3 getSkyColor(in vec3 viewDir, const in float sunBrightness) {
     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 blueHourMultiplier = fNormalize(vec3(0.8, 1.1, 1.5)) * 1.5;
     blueHourMultiplier = mix(vec3(1.0), blueHourMultiplier, linearstep(0.05, -0.05, sunVector.y));

     vec3 sunTransmittance = getValFromTLUT(u_transmittance, skyViewPos, sunVector);
     vec3 moonTransmittance = moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector);
     
     float intersectedPlanet = step(rayIntersectSphere(skyViewPos, viewDir, groundRadiusMM), 0.0);

     vec3 dayColor = (2.0 * getValFromSkyLUT(viewDir, sunVector, u_sky) + sunBrightness * step(0.9997, dot(viewDir, sunVector)) * intersectedPlanet * sunTransmittance) * 20.0;
     vec3 nightColor = (getValFromSkyLUT(viewDir, moonVector, u_sky_night) + 4.0 * sunBrightness * step(0.9997, dot(viewDir, moonVector)) * intersectedPlanet * moonTransmittance) * 20.0;

     return blueHourMultiplier * (dayColor + nightColor);
}
vec3 getClouds(in vec3 viewDir, in vec3 skyColor) {
     vec2 cloudsSample = sqrt(texture(u_clouds, viewDir).rg);

     vec2 plane = 2.0 * viewDir.xz * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y);
     vec3 cumulusPos = skyViewPos + vec3(0.0, 0.0005 * dot(plane, getSunVector().xz), 0.0);


     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 scatteringColor = getValFromTLUT(u_transmittance, cumulusPos, sunVector) + moonFlux * getValFromTLUT(u_transmittance, cumulusPos, moonVector);
     vec3 ambientColor = getSkyColor(vec3(0.0, 1.0, 0.0), 0.0) * 0.5;

     vec3 scattering = 4.0 * scatteringColor * mix(cloudsSample.g, 1.0, getMiePhase(dot(viewDir, frx_skyLightVector), 0.7) + getMiePhase(dot(viewDir, -frx_skyLightVector), 0.7)) + ambientColor;
     float transmittance = linearstep(0.0, 1.0, cloudsSample.r);

     return mix(scattering, skyColor, transmittance);
}


void main() {
     // if(frx_renderFrames % 3u != 0u) {
     //      discard;
     // }

     vec3 viewDirs[6] = vec3[6] (
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0)
     );
     getCubemapViewDirs(texcoord, viewDirs);

     fragColor0 = vec4(getClouds(viewDirs[0], getSkyColor(viewDirs[0], 1.0)), 1.0);
     fragColor1 = vec4(getClouds(viewDirs[1], getSkyColor(viewDirs[1], 1.0)), 1.0);
     fragColor2 = vec4(getClouds(viewDirs[2], getSkyColor(viewDirs[2], 1.0)), 1.0);
     fragColor3 = vec4(getClouds(viewDirs[3], getSkyColor(viewDirs[3], 1.0)), 1.0);
     fragColor4 = vec4(getClouds(viewDirs[4], getSkyColor(viewDirs[4], 1.0)), 1.0);
     fragColor5 = vec4(getClouds(viewDirs[5], getSkyColor(viewDirs[5], 1.0)), 1.0);
}