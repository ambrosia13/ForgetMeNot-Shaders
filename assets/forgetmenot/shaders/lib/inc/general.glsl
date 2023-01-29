/*
#include forgetmenot:shaders/lib/inc/general.glsl

Contains general Canvas-specific utility functions.
*/

vec3 getSunVector() {
	return frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
}
vec3 getMoonVector() {
	return -getSunVector();
}

// Should not be used for lighting effects
vec3 getTimeOfDayFactors() {
	// vec3(dayFactor, nightFactor, sunsetFactor)
	return vec3(
		frx_worldIsMoonlit == 0 ? frx_skyLightTransitionFactor : 0.0, 
		frx_worldIsMoonlit == 1 ? frx_skyLightTransitionFactor : 0.0, 
		1.0 - frx_skyLightTransitionFactor
	);
}

float getWorldTime() {
	return frx_worldTime + frx_worldDay;
}
int getWorldTicks() {
	return int(getWorldTime() * 24000.0);
}