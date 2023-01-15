// --------------------------------------------------------------------------------------------------------
// General utility functions for generic use. #include what you need to minimize compile times.
// --------------------------------------------------------------------------------------------------------

vec3 getSunVector() {
	return frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
}
vec3 getMoonVector() {
	return -getSunVector();
}
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

#ifdef INCLUDE_GENERAL_UTIL
	#ifdef INCLUDE_SPACES
		#ifdef FRAGMENT_SHADER
			// View direction in world space
			vec3 getViewDir() {
				vec2 screenUv = gl_FragCoord.xy / frxu_size.xy;
				return fNormalize(setupSceneSpacePos(screenUv, 1.0));
			}
		#endif
	#endif
#endif

#ifdef INCLUDE_PBR
	// Schlick fresnel approximation
	vec3 getReflectance(in vec3 f0, in float NdotV, in float r) {
		float k = 1.0 / inversesqrt(r);
		return f0 + (1.0 - f0) * (pow((1.0 - k) * (1.0 - NdotV) + k * 0.5, 5.0));
	}
#endif
