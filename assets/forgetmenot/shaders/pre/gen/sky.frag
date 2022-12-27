// --------------------------------------------------------------------------------------------------------
// All code from this file is taken or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

#define INCLUDE_SKY
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;

in vec2 texcoord;

layout(location = 0) out vec4 dayColor;
layout(location = 1) out vec4 nightColor;

// Calculates the actual sky-view! It's a lat-long map (or maybe altitude-azimuth is the better term),
// but the latitude/altitude is non-linear to get more resolution near the horizon.
const int numScatteringSteps = 32;
vec3 raymarchScattering(
     vec3 pos, 
     vec3 rayDir, 
     vec3 sunDir,
     float tMax,
     float numSteps,
     sampler2D transmittanceLut,
     sampler2D multiscatteringLut
) {
     float cosTheta = dot(rayDir, sunDir);
     
     float miePhaseValue = getMiePhase(cosTheta);
     float rayleighPhaseValue = getRayleighPhase(-cosTheta);
     
     vec3 lum = vec3(0.0);
     vec3 transmittance = vec3(1.0);
     float t = 0.0;
     for (float i = 0.0; i < numSteps; i += 1.0) {
          float newT = ((i + 0.3)/numSteps)*tMax;
          float dt = newT - t;
          t = newT;
          
          vec3 newPos = pos + t*rayDir;
          
          vec3 rayleighScattering, extinction;
          float mieScattering;
          getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
          
          vec3 sampleTransmittance = exp(-dt*extinction);

          vec3 sunTransmittance = getValFromTLUT(transmittanceLut, newPos, sunDir);
          vec3 psiMS = getValFromMultiScattLUT(multiscatteringLut, newPos, sunDir);
          
          vec3 rayleighInScattering = rayleighScattering*(rayleighPhaseValue*sunTransmittance + psiMS);
          vec3 mieInScattering = mieScattering*(miePhaseValue*sunTransmittance + psiMS);
          vec3 inScattering = (rayleighInScattering + mieInScattering);

          // Integrated scattering within path segment.
          vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

          lum += scatteringIntegral*transmittance;
          
          transmittance *= sampleTransmittance;
     }
     return lum;
}

void main() {
     float u = texcoord.x;
     float v = texcoord.y;
     
     float azimuthAngle = (u - 0.5)*2.0*PI;
     // Non-linear mapping of altitude. See Section 5.3 of the paper.
     float adjV;
     if (v < 0.5) {
          float coord = 1.0 - 2.0*v;
          adjV = -coord*coord;
     } else {
          float coord = v*2.0 - 1.0;
          adjV = coord*coord;
     }
     
     float height = length(skyViewPos);
     vec3 up = skyViewPos / height;
     float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height) - 0.5*PI;
     float altitudeAngle = adjV*0.5*PI - horizonAngle;
     
     float cosAltitude = cos(altitudeAngle);
     vec3 rayDir = vec3(cosAltitude*sin(azimuthAngle), sin(altitudeAngle), -cosAltitude*cos(azimuthAngle));
     
     float sunAltitude = (0.5*PI) - acos(dot(getSunVector(), up));
     vec3 sunDir = vec3(0.0, sin(sunAltitude), -cos(sunAltitude));

     float sunAltitudeMoon = (0.5*PI) - acos(dot(getMoonVector(), up));
     vec3 sunDirMoon = vec3(0.0, sin(sunAltitudeMoon), -cos(sunAltitudeMoon));
     
     float atmoDist = rayIntersectSphere(skyViewPos, rayDir, atmosphereRadiusMM);
     float groundDist = rayIntersectSphere(skyViewPos, rayDir, groundRadiusMM);
     float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

     dayColor = vec4(raymarchScattering(skyViewPos, rayDir, sunDir, tMax, float(numScatteringSteps), u_transmittance, u_multiscattering) * 0.5, 1.0);
     nightColor = vec4(raymarchScattering(skyViewPos, rayDir, sunDirMoon, tMax, float(numScatteringSteps), u_transmittance, u_multiscattering) * moonFlux, 1.0);
}