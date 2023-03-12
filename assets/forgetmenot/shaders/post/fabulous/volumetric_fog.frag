// Forgot when I added this, probably important for something

#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out float fogTransmittance;

void main() {
	const int VOLUMETRIC_FOG_STEPS = 5;

	float blockDistance = rcp(inversesqrt(dot(sceneSpacePos, sceneSpacePos)));
	float undergroundFactor = max(frx_smoothedEyeBrightness.y, material.skyLight);

	float fogAccumulator = 0.0;


	vec3 startPos = vec3(0.0);
	vec3 endPos = viewDir * min(blockDistance, min(128.0, frx_viewDistance));

	vec3 rayStep = (endPos - startPos) / VOLUMETRIC_FOG_STEPS;

	for(int i = 0; i < VOLUMETRIC_FOG_STEPS; i++) {
		vec3 fogPos = startPos + rayStep * (i + interleavedGradient(i));

		vec3 samplePos = (fogPos + frx_cameraPos) * vec3(0.025, 0.05, 0.025);
		fogAccumulator += 0.5 * smoothstep(0.5, 1.0, fbmHash3D(samplePos, 3)) / VOLUMETRIC_FOG_STEPS;
	}

	fogAccumulator *= rcp(inversesqrt(dot(endPos, endPos))) / 128.0;
	fogAccumulator *= linearstep(0.0, 0.5, mix(material.skyLight, 1.0, floor(composite_depth)));

	fogTransmittance = exp2(-fogAccumulator * 30.0);

}