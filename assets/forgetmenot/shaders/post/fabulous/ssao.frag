#define INCLUDE_PACKING
#define INCLUDE_NOISE
#define INCLUDE_IGN
#define INCLUDE_SPACES
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_depth;
uniform usampler2D u_data;

uniform sampler2D u_previous;
uniform sampler2D u_previous_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	float depth = texture(u_depth, texcoord).r;
	float linearDepth = linearizeDepth(depth);

	vec3 normal = fNormalize(unpackUnormArb(texture(u_data, texcoord).x, BITS_X).xyz * 2.0 - 1.0);
	vec3 viewNormal = frx_normalModelMatrix * normal;

	if(depth == 1.0) {
		discard;
		return;
	}

	const int rays = 20;
	float ssao = 1.0;

	vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
	vec3 screenSpacePos = vec3(texcoord, depth);

	for(int i = 0; i < rays; i++) {
		vec3 hitPos;
		bool hit = false;


		vec3 viewSpaceDir = generateCosineVector(viewNormal);
		vec3 screenSpaceDir = (
			normalize(
				viewSpaceToScreenSpace(viewSpacePos + viewSpaceDir) -
				screenSpacePos
			)
		);

		if((viewSpacePos + viewSpaceDir).z > 0.0) continue;

		screenSpacePos += screenSpaceDir * max(0.01, 0.05 - linearDepth / 256.0) * interleavedGradient(i);

		if(clamp01(screenSpacePos.xy) != screenSpacePos.xy) continue;

		float depthQuery = textureLod(u_depth, screenSpacePos.xy, 0).r;
		// for(int lod = 8; lod >= 2; lod -= 2) {
			hit = screenSpacePos.z > depthQuery && abs(linearizeDepth(screenSpacePos.z) - linearizeDepth(depthQuery)) < 3.0;
		// 	if(!hit) {
		// 		break;
		// 	}
		// }

		// hit = raytrace(
		// 	pos_ws,
		// 	dir_ws,
		// 	80,
		// 	u_depths,
		// 	hitPos
		// );

		ssao -= float(hit) / rays * 1.0;
	}
	
	vec2 lastFrameCoords = lastFrameSceneSpaceToScreenSpace(setupSceneSpacePos(texcoord, depth) + (frx_cameraPos - frx_lastCameraPos)).xy;

	vec2 lastFrameSample = texture(u_previous, lastFrameCoords * 0.5).rg;

	float previousDepth = texture(u_previous_depth, lastFrameCoords * 0.5).r;
	float previousSSAO = lastFrameSample.r;
	float pixelAge = lastFrameSample.g;
	
	float depthWeight = exp(-abs(linearizeDepth(depth) - linearizeDepth(previousDepth)));
	if(clamp01(lastFrameCoords) == lastFrameCoords) ssao = mix(ssao, previousSSAO, 0.95 * depthWeight);

	fragColor = vec4(vec2(clamp01(ssao), 1.0), 0.0, 1.0);
}