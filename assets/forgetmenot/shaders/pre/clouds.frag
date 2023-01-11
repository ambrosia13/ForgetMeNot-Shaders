#define INCLUDE_SKY
#define INCLUDE_CUBEMAPS
#define INCLUDE_NOISE
#define INCLUDE_IGN
#include forgetmenot:shaders/lib/includes.glsl

uniform samplerCube u_cube;

in vec2 texcoord;

layout(location = 0) out vec2 fragColor0;
layout(location = 1) out vec2 fragColor1;
layout(location = 2) out vec2 fragColor2;
layout(location = 3) out vec2 fragColor3;
layout(location = 4) out vec2 fragColor4;
layout(location = 5) out vec2 fragColor5;

float sampleCumulusNoise(in vec2 plane, in int octaves) {
     // plane += 0.1 * vec2(
     //      fbmHash(plane * 10.0, 4, 2.0, 0.5),
     //      fbmHash(plane * 10.0 + 2000.0, 4, 2.0, 0.5)
     // );
     // return smoothstep(0.5, 0.9, smoothHashBlocky(plane * 0.75) * 0.5 + 0.5);

     return smoothstep(
          0.5, 
          0.8, 
          fbmHash(
               plane,
               octaves, 
               2.0, 
               0.05
          )
     );
}

vec2 getCloudsTransmittanceAndScattering(in vec3 viewDir) {
     if(viewDir.y < 0.0) return vec2(1.0, 0.0);

     vec2 plane = 2.0 * viewDir.xz * rcp(0.1 * dot(viewDir.xz, viewDir.xz) + viewDir.y);

     vec2 temp = viewDir.xz * rcp(viewDir.y);
     vec2 sunLightDirection = mix(
          fNormalize(getSunVector().xz * rcp(abs(frx_skyLightVector.y)) - temp),
          fNormalize(getMoonVector().xz * rcp(abs(frx_skyLightVector.y)) - temp),
          linearstepFrom0(0.2, getMoonVector().y)
     );
     // vec2 sunLightDirection = fNormalize(mix(1.0, -1.0, linearstepFrom0(0.2, getMoonVector().y)) * getSunVector().xz * rcp(abs(frx_skyLightVector.y)) - temp);

     const int cumulusOctaves = 8;
     float noise = sampleCumulusNoise(plane, cumulusOctaves);

     float transmittance = exp2(-noise * 5.0);
     
     float scattering;

     float lightOpticalDepth = 0.0;
     
     const int STEPS = 10;
     for(int i = 0; i < STEPS; i++) {
          plane += sunLightDirection * rcp(STEPS) * (interleavedGradient(i) * 0.5 + 0.5);
          lightOpticalDepth += sampleCumulusNoise(plane, cumulusOctaves) * rcp(STEPS);
     }
     scattering = exp2(-lightOpticalDepth * 6.0);
     scattering *= 1.0 - transmittance;

     return vec2(mix(transmittance, 1.0, linearstep(0.1, 0.0, viewDir.y)), scattering);
}

void main() {
     vec3 viewDirs[6] = vec3[6] (
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0),
          vec3(0.0)
     );

     getCubemapViewDirs(texcoord, viewDirs);

     fragColor0 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[0]));
     fragColor1 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[1]));
     fragColor2 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[2]));
     fragColor3 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[3]));
     fragColor4 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[4]));
     fragColor5 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[5]));
}