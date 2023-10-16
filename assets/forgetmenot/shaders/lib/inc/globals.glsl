// Rain factor variable that condenses frx_rainGradient and frx_thunderGradient
// into a single value.
float fmn_rainFactor;

// Time variable that wraps around at high values to preserve precision.
// Should be used in place of frx_renderSeconds.
float fmn_time;

// World time - not to be confused with fmn_time. 1 unit = 1 day.
float fmn_worldTime;

// Whether the dimension is modded. Checks whether any of frx_worldIsOverworld,
// frx_worldIsNether, and frx_worldIsEnd are true.
bool fmn_isModdedDimension;

// Block light color variable. Can't be constant because this is mutable by 
// pipeline settings and uses non-constant expressions.
vec3 fmn_blockLightColor;

// Struct holding various cloud parameters such as coverage. This is just namespacing
// but more cursed.
struct AtmosphereParams {
	// Normalized float describing the current cloud coverage.
	float cloudCoverage;

	// Variable describing how many blocks per unit of fog there should
	// be in the fog calculation. It's a completely arbitrary unit.
	// Values around 1200 are realistic for normal days, and values
	// around 400 are good for overcast and foggy days.
	float blocksPerFogUnit;
} fmn_atmosphereParams;

// Should be called in every program that uses these variables
void initGlobals() {
	fmn_rainFactor = frx_smoothedRainGradient * 0.5 + frx_smoothedThunderGradient * 0.5;
	fmn_time = mod(frx_renderSeconds, 4000.0);
	fmn_worldTime = frx_worldDay + frx_worldTime;

	fmn_isModdedDimension = frx_worldIsOverworld + frx_worldIsNether + frx_worldIsEnd == 0;

	fmn_blockLightColor = saturation(vec3(2.0, 0.98, 0.32), BLOCKLIGHT_WARMTH);

	// Setting atmosphere parameters
	 
	if(frx_worldIsOverworld == 0) {
		fmn_atmosphereParams = AtmosphereParams(-0.15, 1200.0);
		return;
	}

	// cloud coverage
	float cloudCoverage = 0.1;
	cloudCoverage += 0.5 * fmn_rainFactor;
	
	fmn_atmosphereParams.cloudCoverage = cloudCoverage;

	// fog density
	fmn_atmosphereParams.blocksPerFogUnit = 1500.0;
	fmn_atmosphereParams.blocksPerFogUnit -= 1200.0 * fmn_rainFactor;

	fmn_atmosphereParams.blocksPerFogUnit = mix(300.0, fmn_atmosphereParams.blocksPerFogUnit, frx_smoothedEyeBrightness.y);
}