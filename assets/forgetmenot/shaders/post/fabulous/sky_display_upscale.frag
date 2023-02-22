#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/sky_display.glsl 

uniform sampler2D u_current;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// tone map and inverse tone map your color texture reads 
// to prevent bright regions from being fuzzy due to TAA
vec3 toneMap(in vec3 color) {
	return color / (color + 1.0);
}
vec3 inverseToneMap(in vec3 color) {
	return -color / (color - 1.0);
}

// Neighborhood clipping from "Temporal Reprojection Anti-Aliasing in INSIDE"
// Code by Belmu#4066
// Slightly modified
vec3 clipAABB(vec3 prevColor, vec3 minColor, vec3 maxColor) {
	vec3 pClip = 0.5 * (maxColor + minColor); // Center
	vec3 eClip = 0.5 * (maxColor - minColor); // Size

	vec3 vClip  = prevColor - pClip;
	vec3 aUnit  = abs(vClip / eClip);
	float denom = max(aUnit.x, max(aUnit.y, aUnit.z));

	return denom > 1.0 ? pClip + vClip / denom : prevColor;
}

#define NEIGHBORHOOD_SIZE 1
vec3 neighbourhoodClipping(sampler2D currTex, vec3 prevColor) {
	vec3 minColor = vec3(1e5), maxColor = vec3(-1e5);

	for(int x = -NEIGHBORHOOD_SIZE; x <= NEIGHBORHOOD_SIZE; x++) {
		for(int y = -NEIGHBORHOOD_SIZE; y <= NEIGHBORHOOD_SIZE; y++) {
			vec3 color = texelFetch(currTex, ivec2(gl_FragCoord.xy * 0.5) + ivec2(x, y), 0).rgb;
			color = toneMap(color);
			minColor = min(minColor, color); maxColor = max(maxColor, color); 
		}
	}
	return clipAABB(prevColor, minColor, maxColor);
}

// Blend factor referenced from BSL Shaders
float taaBlendFactor(in vec2 currentCoord, in vec2 previousCoord) {
	vec2 velocity = (currentCoord - previousCoord) * frxu_size;

	float blendFactor = float(clamp01(previousCoord) == previousCoord);
	blendFactor *= exp(-length(velocity)) * 0.19 + 0.8;

	return blendFactor;
}

void main() {
	vec4 current = texture(u_current, texcoord * 0.5);

	vec3 pos = setupSceneSpacePos(texcoord, 1.0);
	vec2 lastCoord = lastFrameSceneSpaceToScreenSpace(pos + frx_cameraPos - frx_lastCameraPos).xy;

	vec4 previous = texture(u_previous, lastCoord);
	previous.rgb = neighbourhoodClipping(u_current, toneMap(previous.rgb));

	fragColor.rgb = inverseToneMap(mix(previous.rgb, toneMap(current.rgb), 1.0 - 0.9 * float(clamp(lastCoord, vec2(0.0), vec2(1.0 - 2.0 / frxu_size)) == lastCoord)));
	fragColor.a = 1.0;
}