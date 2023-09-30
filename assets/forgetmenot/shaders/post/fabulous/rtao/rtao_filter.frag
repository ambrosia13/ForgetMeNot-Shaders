#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_rtao;
uniform sampler2D u_depth;
uniform sampler2D u_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

vec4 blur(in int samples, in float radius, in vec4 centerColor, in float centerDepth, in vec3 centerNormal) {
	vec4 result = vec4(0.0);

	for(int i = 0; i < samples; i++) {
		vec2 sampleOffset = diskSampling(i, samples, 0.0);
		vec2 sampleCoord = texcoord + sampleOffset * radius / frxu_size;

		float depth = linearizeDepth(texture(u_depth, sampleCoord).r);
		vec3 normal = texture(u_normal, sampleCoord).rgb;

		float diff = abs(depth - centerDepth);
		float factor = step(diff, 0.5);

		factor *= float(normal == centerNormal);

		result += mix(centerColor, texture(u_rtao, sampleCoord), factor);
	}

	return result / samples;
}

void main() {
	initGlobals();
	
	float centerDepth = linearizeDepth(texture(u_depth, texcoord).r);
	vec3 centerNormal = texture(u_normal, texcoord).rgb;
	vec4 centerColor = texture(u_rtao, texcoord);

	const int samples = 9;
	const float radius = 12.0;

	fragColor = blur(samples, radius, centerColor, centerDepth, centerNormal);
	
}