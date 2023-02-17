#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/packing.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/space.glsl

uniform sampler2D u_depth;
uniform usampler2D u_data;
uniform sampler2D u_blue_noise;

uniform sampler2D u_previous;
uniform sampler2D u_previous_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

const int rays = 30;

void castRay(inout float ssao, vec3 viewNormal, vec3 viewSpacePos, vec3 screenSpacePos, float linearDepth, int i) {
	vec3 blueNoiseSample = fract(texelFetch(u_blue_noise, (ivec2(gl_FragCoord) + (ivec2(i) * ivec2(113, 127)) & ivec2(511)) % 128, 0).rgb + float(i) / float(rays));

	vec3 viewSpaceDir = generateCosineVector(viewNormal, blueNoiseSample.rg);
	//vec3 viewSpaceDir = generateCosineVector(viewNormal, vec2(randFStatic(), randFStatic()));

	// Prevent rays from going behind the camera
	if((viewSpacePos + viewSpaceDir).z > 0.0) return;

	// Factor to switch between tracing adjusted for near objects vs far objects
	float farFactor = 1.0;//smoothstep(10.0, 20.0, linearDepth);
	
	bool hit = false;

	vec3 projectedDir = (
		viewSpaceToScreenSpace(viewSpacePos + viewSpaceDir) -
		screenSpacePos
	);
	float screenSpaceTraceLength = length(projectedDir);
	vec3 screenSpaceTraceDir = normalize(projectedDir);

	// nearScreenSpaceDir traces relative to the screen; farScreenSpaceDir traces relative to the world
	vec3 nearScreenSpaceDir = screenSpaceTraceDir * 0.15;
	vec3 farScreenSpaceDir = screenSpaceTraceDir * max(0.01, screenSpaceTraceLength);

	// March the ray
	screenSpacePos += mix(nearScreenSpaceDir, farScreenSpaceDir, farFactor) * (interleavedGradientStatic(i) * 0.9 + 0.1);
	if(clamp01(screenSpacePos.xy) != screenSpacePos.xy) return;

	float depthQuery = textureLod(u_depth, screenSpacePos.xy, 0).r;

	float linearTracePos = linearizeDepth(screenSpacePos.z);
	float linearSamplePos = linearizeDepth(depthQuery);
	hit = linearTracePos > linearSamplePos && abs(linearTracePos - linearSamplePos) < (2.0);

	ssao -= float(hit) * rcp(rays);
}

float doSSAO(vec3 viewNormal, vec3 viewSpacePos, vec3 screenSpacePos, float linearDepth) {
	float ssao = 1.0;

	for(int i = 0; i < rays; i++) {
		castRay(ssao, viewNormal, viewSpacePos, screenSpacePos, linearDepth, i);
	}

	return ssao;
}

void main() {
	float depth = textureLod(u_depth, texcoord, 0).r;
	if(depth == 1.0) {
		discard;
		return;
	}

	float linearDepth = linearizeDepth(depth);

	vec3 normal = fNormalize(unpackUnormArb(texture(u_data, texcoord).x, BITS_X).xyz * 2.0 - 1.0);
	vec3 viewNormal = frx_normalModelMatrix * normal;

	const int rays = 20;

	vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
	vec3 screenSpacePos = vec3(texcoord, depth);

	float ssao = doSSAO(viewNormal, viewSpacePos, screenSpacePos, linearDepth);

	// vec2 lastFrameCoords = lastFrameSceneSpaceToScreenSpace(setupSceneSpacePos(texcoord, depth) + (frx_cameraPos - frx_lastCameraPos)).xy;

	// vec2 lastFrameSample = texture(u_previous, lastFrameCoords * 0.5).rg;

	// float previousDepth = texture(u_previous_depth, lastFrameCoords * 0.5).r;
	// float previousSSAO = lastFrameSample.r;
	// float pixelAge = lastFrameSample.g;
	
	// float depthWeight = exp(-abs(linearizeDepth(depth) - linearizeDepth(previousDepth)));
	//if(clamp01(lastFrameCoords) == lastFrameCoords) ssao = mix(ssao, previousSSAO, 0.95 * depthWeight);

	fragColor = vec4(ssao, vec3(1.0));
}