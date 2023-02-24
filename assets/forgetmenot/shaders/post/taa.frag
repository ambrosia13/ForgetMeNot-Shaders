#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous_frame;
uniform sampler2D u_depth;
uniform sampler2D u_hand_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// tone map and inverse tone map your color texture reads 
// to prevent bright regions from being fuzzy due to TAA
vec3 toneMap(in vec3 color) {
	return color;//color / (color + 1.0);
}
vec3 inverseToneMap(in vec3 color) {
	return color;//-color / (color - 1.0);
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
			vec3 color = texelFetch(currTex, ivec2(gl_FragCoord.xy) + ivec2(x, y), 0).rgb;
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
	init();

	#ifdef TAA
		vec4 color;
		vec4 previousColor;
		
		float handDepth = texture(u_hand_depth, texcoord).r;

		color = texture(u_color, texcoord);
		color.rgb = toneMap(color.rgb);
		
		// how to do temporal reprojection in 3 easy steps
		vec3 viewPos = setupSceneSpacePos(texcoord, min(texture(u_depth, texcoord).r, handDepth));
		vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
		vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(viewPos + positionDifference);

		previousColor = texture(u_previous_frame, lastScreenPos.xy);
		previousColor.rgb = toneMap(previousColor.rgb);

		vec3 tempColor = neighbourhoodClipping(u_color, previousColor.rgb);

		#ifdef NO_CLIP
			color.rgb = mix(color.rgb, previousColor.rgb, 0.95);
		#else
			color.rgb = mix(color.rgb, tempColor, clamp01(taaBlendFactor(texcoord, lastScreenPos.xy)));
		#endif

		color.rgb = inverseToneMap(color.rgb);
		fragColor = color;
	#else
		fragColor = texture(u_color, texcoord);
	#endif
}