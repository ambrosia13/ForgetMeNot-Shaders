// Rain factor variable that condenses frx_rainGradient and frx_thunderGradient
// into a single variable.
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

// just for utility
const float _coverageModifiers[] = float[](
	-0.15, 0.0, 0.1, 0.3, 1.0, 0.1, -0.5,
	-0.1, -0.2, 0.0, 0.3, 0.5, 0.1, -0.1
);
const float _fogDensityModifiers[] = float[](
	1200.0, 1000.0, 800.0, 700.0, 400.0, 900.0, 1400.0,
	1200.0, 1300.0, 1000.0, 800.0, 500.0, 600.0, 1000.0
);

float _getNoise(vec2 x, float lowerBound, float upperBound, float centerness, bool reverse) {
	//return (upperBound + lowerBound) / 2.0;

	float rand = frx_noise2d(x);
	if(rand > 0.97) return upperBound * 4.0;

	rand = mix(rand, 1.0 - rand, float(reverse));

	return mix(rand, 0.5, centerness) * (upperBound - lowerBound) + lowerBound;
}
float _interpolateRandom(float x, float lowerBound, float upperBound, float centerness, bool reverse) {
	const int period = 60;
	const float offset = 81.0;

	float wrappedInput = mod(x + offset, float(period));

	int whole = int(wrappedInput);
	float part = fract(wrappedInput);
	part = part * part * (3.0 - 2.0 * part);

	float coverage1 = _getNoise(vec2(whole), lowerBound, upperBound, centerness, reverse);
	float coverage2 = _getNoise(vec2((whole + 1) % period), lowerBound, upperBound, centerness, reverse);
	
	return mix(coverage1, coverage2, part);
}

AtmosphereParams _paramsMix(AtmosphereParams a, AtmosphereParams b, float x) {
	return AtmosphereParams(
		mix(a.cloudCoverage, b.cloudCoverage, x),
		mix(a.blocksPerFogUnit, b.blocksPerFogUnit, x)
	);
}

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
	float cloudCoverage = _interpolateRandom(fmn_worldTime, -0.5, 0.25, 0.2, false);
	cloudCoverage += 0.2 * fmn_rainFactor;
	
	fmn_atmosphereParams.cloudCoverage = cloudCoverage;

	// fog density
	fmn_atmosphereParams.blocksPerFogUnit = _interpolateRandom(fmn_worldTime, 400.0, 1500.0, 0.0, true);
	fmn_atmosphereParams.blocksPerFogUnit -= 200.0 * fmn_rainFactor;

	fmn_atmosphereParams.blocksPerFogUnit = mix(300.0, fmn_atmosphereParams.blocksPerFogUnit, frx_smoothedEyeBrightness.y);
}