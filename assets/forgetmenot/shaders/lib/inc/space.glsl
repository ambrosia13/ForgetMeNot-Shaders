/*
#include forgetmenot:shaders/lib/inc/space.glsl

Contains utility functions for space conversions.
*/

// General function to convert screen space to any other space
vec3 fromScreenSpace(in vec3 screenSpacePos, in mat4 matrix) {
	vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
	vec4 temp = matrix * vec4(clipSpacePos, 1.0);
	return temp.xyz / temp.w; 
}
// General function to convert any other space back to screen space
vec3 toScreenSpace(in vec3 pos, in mat4 matrix) {
	vec4 temp = matrix * vec4(pos, 1.0);
	return (temp.xyz / temp.w) * 0.5 + 0.5;
}

// Scene space - camera origin, world space axes
vec3 setupSceneSpacePos(in vec3 screenSpacePos) {
	return fromScreenSpace(screenSpacePos, frx_inverseViewProjectionMatrix);
}
vec3 setupSceneSpacePos(in vec2 texcoord, in float depth) {
	return setupSceneSpacePos(vec3(texcoord, depth));
}
vec3 sceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
	return toScreenSpace(sceneSpacePos, frx_viewProjectionMatrix);
}

// Clean scene space - same as scene space but unaffected by things like view bobbing
vec3 setupCleanSceneSpacePos(in vec3 screenSpacePos) {
	return fromScreenSpace(screenSpacePos, frx_inverseCleanViewProjectionMatrix);
}
vec3 setupCleanSceneSpacePos(in vec2 texcoord, in float depth) {
	return setupCleanSceneSpacePos(vec3(texcoord, depth));
}
vec3 cleanSceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
	return toScreenSpace(sceneSpacePos, frx_cleanViewProjectionMatrix);
}

// Last frame scene space - same as scene space but for the previous frame
vec3 lastFrameSceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
	return toScreenSpace(sceneSpacePos, frx_lastViewProjectionMatrix);
}

// View space - camera origin, view space axes
vec3 setupViewSpacePos(in vec3 screenSpacePos) {
	return fromScreenSpace(screenSpacePos, frx_inverseProjectionMatrix);
}
vec3 setupViewSpacePos(in vec2 texcoord, in float depth) {
	return setupViewSpacePos(vec3(texcoord, depth));
}
vec3 viewSpaceToScreenSpace(in vec3 viewSpacePos) {
	return toScreenSpace(viewSpacePos, frx_projectionMatrix);
}

// Scene space to view space - todo: replace with more efficient method
vec3 sceneSpaceToViewSpace(in vec3 sceneSpacePos) {
	return setupViewSpacePos(sceneSpaceToScreenSpace(sceneSpacePos));
}
vec3 viewSpaceToSceneSpace(in vec3 viewSpacePos) {
	return setupSceneSpacePos(viewSpaceToScreenSpace(viewSpacePos));
}

float linearizeDepth(in float depth) {
	mat2 tempMatrix = mat2(
		frx_inverseProjectionMatrix[2][2], frx_inverseProjectionMatrix[2][3],
		frx_inverseProjectionMatrix[3][2], frx_inverseProjectionMatrix[3][3]
	);
	vec2 temp = tempMatrix * vec2(depth * 2.0 - 1.0, 1.0);

	return -temp.x / temp.y;
}
float delinearizeDepth(in float depth) {
	mat2 tempMatrix = mat2(
		frx_projectionMatrix[2][2], frx_projectionMatrix[2][3],
		frx_projectionMatrix[3][2], frx_projectionMatrix[3][3]
	);
	vec4 temp = frx_projectionMatrix * vec4(0.5, 0.5, depth, 1.0);

	return toScreenSpace(vec3(0.5, 0.5, -depth), frx_projectionMatrix).z;

	return ((temp.xyz / temp.w) * 0.5 + 0.5).z;
}

#ifdef FRAGMENT_SHADER
	// View direction in world space
	vec3 getViewDir() {
		vec2 screenUv = gl_FragCoord.xy / frxu_size.xy;
		return normalize(setupSceneSpacePos(screenUv, 1.0));
	}
#endif
