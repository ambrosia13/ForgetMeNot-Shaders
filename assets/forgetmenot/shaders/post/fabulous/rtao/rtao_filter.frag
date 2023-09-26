#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_rtao;
uniform sampler2D u_depth;
uniform sampler2D u_normal;
uniform sampler2D u_rtao_mips;
uniform sampler2D u_disocclusion;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();
	
	float disocclusion = texture(u_disocclusion, texcoord).r;

	float centerDepth = linearizeDepth(texture(u_depth, texcoord).r);
	vec3 centerNormal = texture(u_normal, texcoord).rgb;
	vec4 centerColor = texture(u_rtao, texcoord);

	int samples = 9;
	float radius = 8.0 + 12.0 * (exp(-centerColor.a * 0.1));
	// samples += int(radius - 8.0);

	for(int i = 0; i < samples; i++) {
		vec2 sampleOffset = diskSampling(i, samples, 0.0);
		vec2 sampleCoord = texcoord + sampleOffset * radius / frxu_size;

		float depth = linearizeDepth(texture(u_depth, sampleCoord).r);
		vec3 normal = texture(u_normal, sampleCoord).rgb;

		float diff = abs(depth - centerDepth);
		float factor = step(diff, 0.5);

		factor *= float(normal == centerNormal);

		fragColor += mix(centerColor, texture(u_rtao, sampleCoord), factor) / samples;
	}

	// fragColor *= 1.0 - clamp01(disocclusion + exp(-centerColor.a));

	// const int blurWidth = 1;
	// for(int y = -blurWidth; y <= blurWidth; y++) {
	// 	for(int x = -blurWidth; x <= blurWidth; x++) {
	// 		vec2 sampleCoord = texcoord + vec2(x, y) / frxu_size * 4.0;

	// 		float depth = linearizeDepth(texture(u_depth, sampleCoord).r);
	// 		vec3 normal = texture(u_normal, sampleCoord).rgb;

	// 		float diff = abs(depth - centerDepth);
	// 		float factor = step(diff, 0.5);

	// 		factor *= float(normal == centerNormal);

	// 		float k = 1.0 / pow2(blurWidth * 2.0 + 1.0);
	// 		fragColor += mix(centerColor * k, texture(u_rtao, sampleCoord) * k, factor);
	// 	}
	// }
}