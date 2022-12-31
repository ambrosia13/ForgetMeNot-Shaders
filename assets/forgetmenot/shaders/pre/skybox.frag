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

in vec2 texcoord;

layout(location = 0) out vec4 fragColor0;
layout(location = 1) out vec4 fragColor1;
layout(location = 2) out vec4 fragColor2;
layout(location = 3) out vec4 fragColor3;
layout(location = 4) out vec4 fragColor4;
layout(location = 5) out vec4 fragColor5;

vec3 getValFromSkyLUT(vec3 rayDir, vec3 sunDir, sampler2D skyLut) {
     float height = length(skyViewPos);
     vec3 up = skyViewPos / height;
     
     float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
     float altitudeAngle = horizonAngle - acos(dot(rayDir, up)); // Between -PI/2 and PI/2
     float azimuthAngle; // Between 0 and 2*PI
     if (abs(altitudeAngle) > (0.5*PI - .0001)) {
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
     vec2 uv = vec2(azimuthAngle / (2.0*PI), v);
     
     return texture(skyLut, uv).rgb;
}

float sampleCumulusNoise(in vec2 plane) {
     return smoothstep(0.5, 0.9, fbmHash(plane, 6, 0.05));
}
vec3 getClouds(in vec3 viewDir, in vec3 skyColor) {
     if(viewDir.y < 0.0) return skyColor;
     // return vec3(1.0);

     vec2 plane = viewDir.xz / (viewDir.y + 0.1 * length(viewDir.xz));
     plane *= 2.0;

     vec2 rayDirection = fNormalize(getSunVector().xz / abs(getSunVector().y) - viewDir.xz / viewDir.y);
     rayDirection = mix(rayDirection, fNormalize(getMoonVector().xz / abs(getMoonVector().y) - viewDir.xz / viewDir.y), linearstep(0.0, 0.2, getMoonVector().y));

     vec3 cumulusPos = skyViewPos + vec3(0.0, 0.0005, 0.0) * (1.0 + 1.0 * dot(plane, getSunVector().xz));


     float noise = sampleCumulusNoise(plane);

     float transmittance = exp(-noise * 2.0);
     
     vec3 scattering = getValFromTLUT(u_transmittance, cumulusPos, getSunVector());
     scattering += getValFromTLUT(u_transmittance, cumulusPos, getMoonVector()) * moonFlux;
     scattering *= 2.0;

     float lightOpticalDepth;
     
     for(int i = 0; i < 1; i++) {
          plane += rayDirection * 1.0 * interleavedGradient(i);
          lightOpticalDepth += sampleCumulusNoise(plane) / 1.0;
     }
     scattering *= exp(-lightOpticalDepth * 2.0) + getMiePhase(dot(viewDir, frx_skyLightVector), 0.8) + getMiePhase(dot(viewDir, -frx_skyLightVector), 0.8);

     scattering *= 1.0 - transmittance;
     return mix(skyColor * transmittance + scattering, skyColor, linearstep(0.2, 0.0, viewDir.y));
}

void main() {
     if(frx_renderFrames % 3u != 0u) {
          discard;
     }

     vec3 viewDirs[6] = vec3[6] (
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0)
     );

     getCubemapViewDirs(texcoord, viewDirs);

     vec3 sunVector = getSunVector();
     vec3 moonVector = getMoonVector();

     vec3 blueHourMultiplier = fNormalize(vec3(0.8, 1.1, 1.5)) * 1.5;
     blueHourMultiplier = mix(vec3(1.0), blueHourMultiplier, smoothstep(0.05, -0.05, sunVector.y));

     const float sunBrightness = 5.0;

     vec3 dayColor[6] = vec3[6] (
          (2.0 * getValFromSkyLUT(viewDirs[0], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[0], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[0], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0,
          (2.0 * getValFromSkyLUT(viewDirs[1], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[1], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[1], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0,
          (2.0 * getValFromSkyLUT(viewDirs[2], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[2], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[2], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0,
          (2.0 * getValFromSkyLUT(viewDirs[3], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[3], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[3], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0,
          (2.0 * getValFromSkyLUT(viewDirs[4], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[4], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[4], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0,
          (2.0 * getValFromSkyLUT(viewDirs[5], sunVector, u_sky) + (rayIntersectSphere(skyViewPos, viewDirs[5], groundRadiusMM) >= 0.0 ? vec3(0.0) : sunBrightness * step(0.9997, dot(viewDirs[5], sunVector)) * getValFromTLUT(u_transmittance, skyViewPos, sunVector))) * 20.0
     );
     vec3 nightColor[6] = vec3[6] (
          (getValFromSkyLUT(viewDirs[0], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[0], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[0], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0,
          (getValFromSkyLUT(viewDirs[1], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[1], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[1], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0,
          (getValFromSkyLUT(viewDirs[2], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[2], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[2], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0,
          (getValFromSkyLUT(viewDirs[3], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[3], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[3], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0,
          (getValFromSkyLUT(viewDirs[4], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[4], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[4], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0,
          (getValFromSkyLUT(viewDirs[5], moonVector, u_sky_night) + (rayIntersectSphere(skyViewPos, viewDirs[5], groundRadiusMM) >= 0.0 ? vec3(0.0) : 4.0 * sunBrightness * step(0.9997, dot(viewDirs[5], moonVector)) * moonFlux * getValFromTLUT(u_transmittance, skyViewPos, moonVector))) * 20.0
     );

     fragColor0 = vec4(getClouds(viewDirs[0], blueHourMultiplier * (max(vec3(0.0), dayColor[0]) + max(vec3(0.0), nightColor[0]))), step(0.9997, dot(viewDirs[0], sunVector)) + step(0.9997, dot(viewDirs[0], moonVector)));
     fragColor1 = vec4(getClouds(viewDirs[1], blueHourMultiplier * (max(vec3(0.0), dayColor[1]) + max(vec3(0.0), nightColor[1]))), step(0.9997, dot(viewDirs[1], sunVector)) + step(0.9997, dot(viewDirs[1], moonVector)));
     fragColor2 = vec4(getClouds(viewDirs[2], blueHourMultiplier * (max(vec3(0.0), dayColor[2]) + max(vec3(0.0), nightColor[2]))), step(0.9997, dot(viewDirs[2], sunVector)) + step(0.9997, dot(viewDirs[2], moonVector)));
     fragColor3 = vec4(getClouds(viewDirs[3], blueHourMultiplier * (max(vec3(0.0), dayColor[3]) + max(vec3(0.0), nightColor[3]))), step(0.9997, dot(viewDirs[3], sunVector)) + step(0.9997, dot(viewDirs[3], moonVector)));
     fragColor4 = vec4(getClouds(viewDirs[4], blueHourMultiplier * (max(vec3(0.0), dayColor[4]) + max(vec3(0.0), nightColor[4]))), step(0.9997, dot(viewDirs[4], sunVector)) + step(0.9997, dot(viewDirs[4], moonVector)));
     fragColor5 = vec4(getClouds(viewDirs[5], blueHourMultiplier * (max(vec3(0.0), dayColor[5]) + max(vec3(0.0), nightColor[5]))), step(0.9997, dot(viewDirs[5], sunVector)) + step(0.9997, dot(viewDirs[5], moonVector)));
}