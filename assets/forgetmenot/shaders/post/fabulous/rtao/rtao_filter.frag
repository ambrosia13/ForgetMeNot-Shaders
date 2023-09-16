#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 

uniform sampler2D u_rtao;
uniform sampler2D u_depth;
uniform sampler2D u_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	initGlobals();
	
	float centerDepth = linearizeDepth(texture(u_depth, texcoord).r);
	vec3 centerNormal = texture(u_normal, texcoord).rgb;
	vec4 centerColor = texture(u_rtao, texcoord);

	const int blurWidth = 1;
	for(int y = -blurWidth; y <= blurWidth; y++) {
		for(int x = -blurWidth; x <= blurWidth; x++) {
			vec2 sampleCoord = texcoord + vec2(x, y) / frxu_size * 4.0;

			float depth = linearizeDepth(texture(u_depth, sampleCoord).r);
			vec3 normal = texture(u_normal, sampleCoord).rgb;

			float diff = abs(depth - centerDepth);
			float factor = step(diff, 0.5);

			factor *= float(normal == centerNormal);

			float k = 1.0 / pow2(blurWidth * 2.0 + 1.0);
			fragColor += mix(centerColor * k, texture(u_rtao, sampleCoord) * k, factor);
		}
	}
}