// --------------------------------------------------------------------------------------------------------
// All code from this file is taken or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

#define INCLUDE_SKY
#include forgetmenot:shaders/lib/includes.glsl 

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// Generates the Transmittance LUT. Each pixel coordinate corresponds to a height and sun zenith angle, and
// the value is the transmittance from that point to sun, through the atmosphere.
const float sunTransmittanceSteps = 80.0;

vec3 getSunTransmittance(vec3 pos, vec3 sunDir) {
	if (rayIntersectSphere(pos, sunDir, groundRadiusMM) > 0.0) {
		return vec3(0.0);
	}
	
	float atmoDist = rayIntersectSphere(pos, sunDir, atmosphereRadiusMM);
	float t = 0.0;
	
	vec3 transmittance = vec3(1.0);
	for (float i = 0.0; i < sunTransmittanceSteps; i += 1.0) {
		float newT = ((i + 0.3)/sunTransmittanceSteps)*atmoDist;
		float dt = newT - t;
		t = newT;
		
		vec3 newPos = pos + t*sunDir;
		
		vec3 rayleighScattering, extinction;
		float mieScattering;
		getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
		
		transmittance *= exp(-dt*extinction);
	}
	return transmittance;
}

void main() {
	if(frx_renderFrames % 10000u > 0u) discard;

	float u = texcoord.x;
	float v = texcoord.y;
	
	float sunCosTheta = 2.0 * u - 1.0;
	float sunTheta = safeacos(sunCosTheta);
	float height = mix(groundRadiusMM, atmosphereRadiusMM, v);
	
	vec3 pos = vec3(0.0, height, 0.0); 
	vec3 sunDir = normalize(vec3(0.0, sunCosTheta, -sin(sunTheta)));
	
	fragColor = vec4(getSunTransmittance(pos, sunDir), 1.0);
}