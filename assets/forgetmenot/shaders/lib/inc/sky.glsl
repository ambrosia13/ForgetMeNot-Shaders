// --------------------------------------------------------------------------------------------------------
// Most code from this file is taken or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes; modified for my use case. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

const vec3 moonFlux = vec3(0.56, 0.8, 1.1);

vec3 nightAdjust(in vec3 color) {
	return color * 0.005;//mix(vec3(frx_luminance(color)) * moonFlux, color, 0.05) * 0.075;
}

#define ATMOSPHERE_EARTH 0
#define ATMOSPHERE_MARS 1
#define ATMOSPHERE_
#define ATMOSPHERE_PRESET ATMOSPHERE_EARTH

#if ATMOSPHERE_PRESET == ATMOSPHERE_EARTH
	// Units are in megameters.
	const float groundRadiusMM = 6.360;
	const float atmosphereRadiusMM = 6.460;

	const vec3 groundAlbedo = vec3(0.0);

	// Units are per-megameter
	const vec3 rayleighScatteringBase = vec3(5.802, 13.558, 33.1);
	const float rayleighAbsorptionBase = 0.0;

	const float turbidity = 1.0;

	const float mieScatteringBase = 25.996 * turbidity;
	const float mieAbsorptionBase = 4.4;

	const vec3 ozoneAbsorptionBase = vec3(0.650, 1.881, 0.085);
#elif ATMOSPHERE_PRESET == ATMOSPHERE_MARS
	// Units are in megameters.
	const float groundRadiusMM = 3.376;
	const float atmosphereRadiusMM = groundRadiusMM + 0.08;

	const vec3 groundAlbedo = vec3(0.840, 0.604, 0.404) * 0.3;

	// Units are per-megameter
	const vec3 rayleighScatteringBase = vec3(33, 25, 10);
	const float rayleighAbsorptionBase = 0.0;

	const float mieScatteringBase = 50.0;
	const float mieAbsorptionBase = 4.4;

	const vec3 ozoneAbsorptionBase = vec3(0.3, 0.6, 0.9);
#endif

// 500M above the ground.
const vec3 skyViewPos = vec3(0.0, groundRadiusMM + 0.0005, 0.0);

// Phase function from Jessie
// https://www.patreon.com/user?u=49201970
float kleinNishinaPhase(float cosTheta, float g) {
	float e = 1.0;
	for (int i = 0; i < 8; ++i) {
		float gFromE = 1.0 / e - 2.0 / log(2.0 * e + 1.0) + 1.0;
		float deriv = 4.0 / ((2.0 * e + 1.0) * pow2(log(2.0 * e + 1.0))) - 1.0 / pow2(e);
		if (abs(deriv) < 0.00000001) break;
		e = e - (gFromE - g) / deriv;
	}

	return e / (2.0 * PI * (e * (1.0 - cosTheta) + 1.0) * log(2.0 * e + 1.0));
}

float getMiePhase(float cosTheta) {
	return kleinNishinaPhase(cosTheta, 0.76385);
}
float getMiePhase(float cosTheta, float g) {	
	return kleinNishinaPhase(cosTheta, g);
}

float getRayleighPhase(float cosTheta) {
	return 0.05968310365 * (1.0 + cosTheta * cosTheta);
}

void getScatteringValues(
	vec3 pos, 
	out vec3 rayleighScattering, 
	out float mieScattering,
	out vec3 extinction
) {
	float altitudeKM = (length(pos) - groundRadiusMM) * 1000.0;
	// Note: Paper gets these switched up.
	float rayleighDensity = exp(-altitudeKM / 8.0);
	float mieDensity = exp(-altitudeKM / 1.2);
	
	rayleighScattering = rayleighScatteringBase * rayleighDensity;
	float rayleighAbsorption = rayleighAbsorptionBase * rayleighDensity;
	
	mieScattering = mieScatteringBase * mieDensity;
	float mieAbsorption = mieAbsorptionBase * mieDensity;
	
	vec3 ozoneAbsorption = ozoneAbsorptionBase * max(0.0, 1.0 - abs(altitudeKM - 25.0) / 15.0);
	
	extinction = rayleighScattering + rayleighAbsorption + mieScattering + mieAbsorption + ozoneAbsorption;
}

float safeacos(const float x) {
	return acos(clamp(x, -1.0, 1.0));
}

// From https://gamedev.stackexchange.com/questions/96459/fast-ray-sphere-collision-code.
float rayIntersectSphere(vec3 ro, vec3 rd, float rad) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - rad * rad;
	if (c > 0.0 && b > 0.0) return -1.0;
	float discr = b * b - c;
	if (discr < 0.0) return -1.0;
	// Special case: inside sphere, use far discriminant
	if (discr > b * b) return (-b + sqrt(discr));
	return -b - sqrt(discr);
}

/*
* Same parameterization here.
*/
vec3 getValFromTLUT(sampler2D tex, vec3 pos, vec3 sunDir) {
	float height = length(pos);
	vec3 up = pos / height;
	float sunCosZenithAngle = dot(sunDir, up);
	vec2 uv = vec2(clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				max(0.0, min(1.0, (height - groundRadiusMM) / (atmosphereRadiusMM - groundRadiusMM))));
				
	return texture(tex, uv).rgb;
}
vec3 getValFromMultiScattLUT(sampler2D tex, vec3 pos, vec3 sunDir) {
	float height = length(pos);
	vec3 up = pos / height;
	float sunCosZenithAngle = dot(sunDir, up);
	vec2 uv = vec2(clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				max(0.0, min(1.0, (height - groundRadiusMM) / (atmosphereRadiusMM - groundRadiusMM))));
	
	return texture(tex, uv).rgb;
}

// Calculates the actual sky-view! It's a lat-long map (or maybe altitude-azimuth is the better term),
// but the latitude/altitude is non-linear to get more resolution near the horizon.
const int numScatteringSteps = 32;
vec3 raymarchScattering(
	vec3 pos, 
	vec3 rayDir, 
	vec3 sunDir,
	float tMax,
	float numSteps,
	float mieScatteringAmount,
	sampler2D transmittanceLut,
	sampler2D multiscatteringLut
) {
	float cosTheta = dot(rayDir, sunDir);
	
	float miePhaseValue = getMiePhase(cosTheta);
	float rayleighPhaseValue = getRayleighPhase(-cosTheta);
	
	vec3 lum = vec3(0.0);
	vec3 transmittance = vec3(1.0);
	float t = 0.0;
	for (float i = 0.0; i < numSteps; i += 1.0) {
		float newT = ((i + 0.3)/numSteps)*tMax;
		float dt = newT - t;
		t = newT;
		
		vec3 newPos = pos + t * rayDir;
		
		vec3 rayleighScattering, extinction;
		float mieScattering;
		getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
		
		vec3 sampleTransmittance = exp(-dt*extinction);

		vec3 sunTransmittance = getValFromTLUT(transmittanceLut, newPos, sunDir);
		vec3 psiMS = getValFromMultiScattLUT(multiscatteringLut, newPos, sunDir);
		
		vec3 rayleighInScattering = rayleighScattering*(rayleighPhaseValue*sunTransmittance + psiMS);
		vec3 mieInScattering = mieScattering*(miePhaseValue*sunTransmittance + psiMS);
		vec3 inScattering = (rayleighInScattering + mieInScattering * mieScatteringAmount);

		// Integrated scattering within path segment.
		vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

		lum += scatteringIntegral*transmittance;
		
		transmittance *= sampleTransmittance;
	}
	return lum;
}

vec3 raymarchScattering(
	vec3 pos, 
	vec3 rayDir, 
	vec3 sunDir,
	float tMax,
	float numSteps,
	sampler2D transmittanceLut,
	sampler2D multiscatteringLut
) {
	return raymarchScattering(
		pos, 
		rayDir, 
		sunDir,
		tMax,
		numSteps,
		1.0,
		transmittanceLut,
		multiscatteringLut
	);
}

vec3 getValFromSkyLUT(vec3 rayDir, vec3 sunDir, sampler2D skyLut) {
	float height = length(skyViewPos);
	vec3 up = skyViewPos * rcp(height);
	
	float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
	float altitudeAngle = horizonAngle - acos(dot(rayDir, up)); // Between -PI/2 and PI/2
	float azimuthAngle; // Between 0 and 2*PI
	if (abs(altitudeAngle) > (HALF_PI - .0001)) {
		// Looking nearly straight up or down.
		azimuthAngle = 0.0;
	} else {
		vec3 right = cross(sunDir, up);
		vec3 forward = cross(up, right);
		
		vec3 projectedDir = normalize(rayDir - up*(dot(rayDir, up)));
		float sinTheta = dot(projectedDir, right);
		float cosTheta = dot(projectedDir, forward);
		azimuthAngle = atan(sinTheta, cosTheta) + PI;
	}
	
	// Non-linear mapping of altitude angle. See Section 5.3 of the paper.
	float v = 0.5 + 0.5*sign(altitudeAngle)*sqrt(abs(altitudeAngle)*2.0/PI);
	vec2 uv = vec2(azimuthAngle / (TAU), v);
	
	return texture(skyLut, uv).rgb;
}
