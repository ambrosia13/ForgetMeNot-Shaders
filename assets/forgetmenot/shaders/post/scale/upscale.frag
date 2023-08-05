#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/post/scale/scale.glsl

uniform sampler2D u_color;
uniform sampler2D u_previous_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

vec4 sampleCurrent(vec2 coord) {
	return texture(u_color, coord * RESOLUTION);
}
vec4 samplePrevious(vec2 coord) {
	return texture(u_previous_color, coord);
}

void main() {
	initGlobals();

	vec2 oneTexel = 1.0 / frxu_size;

	vec4 previousSample = samplePrevious(texcoord);
	vec3 previousColor = previousSample.rgb;
	float pixelAge = previousSample.a;

	vec2 currJitter = jitter();
	vec3 currentColor = sampleCurrent(texcoord).rgb;

	vec2 scaledCoord = texcoord * RESOLUTION + jitter();

	float dist = sqmag((jitter()) * frxu_size);
	float confidence = exp(-dist * RESOLUTION * 0.025 * exp2(2.0 * pixelAge));

	neighborhoodInfo info = getNeighborhoodInfo(u_color, texcoord, 1.0 / RESOLUTION);
	vec3 diff = clamp(previousColor, info.minimum, info.maximum) - previousColor;
	pixelAge /= length(diff) * NEIGHBOR_CLIP + 1.0;

	float finalBlend = BLEND + ((1.0 - BLEND) / (pixelAge + 1.0));
	vec3 color = mix(previousColor, currentColor, finalBlend * confidence);

	pixelAge += finalBlend * confidence;

	fragColor = vec4(color, pixelAge);	
}