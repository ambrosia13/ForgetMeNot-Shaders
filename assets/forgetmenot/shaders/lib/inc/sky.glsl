// --------------------------------------------------------------------------------------------------------
// Most code from this file is taken or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes; modified for my use case. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

const vec3 moonFlux = vec3(0.56, 0.8, 1.1);

vec3 nightAdjust(in vec3 color) {
	return mix(vec3(frx_luminance(color)) * moonFlux, color, 0.05) * 0.05;
} 

// Units are in megameters.
const float groundRadiusMM = 6.360;
const float atmosphereRadiusMM = 6.460;

// 500M above the ground.
const vec3 skyViewPos = vec3(0.0, groundRadiusMM + 0.0005, 0.0);

const vec2 tLUTRes = vec2(256.0, 64.0);
const vec2 msLUTRes = vec2(32.0, 32.0);
// Doubled the vertical skyLUT res from the paper, looks way
// better for sunrise.
const vec2 skyLUTRes = vec2(200.0, 200.0);

const vec3 groundAlbedo = vec3(0.0);

// These are per megameter.
const vec3 rayleighScatteringBase = vec3(5.802, 13.558, 33.1);
const float rayleighAbsorptionBase = 0.0;

const float mieScatteringBase = 25.996;
const float mieAbsorptionBase = 4.4;

const vec3 ozoneAbsorptionBase = vec3(0.650, 1.881, .085);

float getMiePhase(float cosTheta) {
	const float g = 0.8;
	const float scale = 3.0 / (8.0 * PI);
	
	float num = (1.0 - g * g) * (1.0 + cosTheta * cosTheta);
	float denom = (2.0 + g * g) * pow((1.0 + g * g - 2.0 * g * cosTheta), 1.5);
	
	return scale*num/denom;
}
float getMiePhase(float cosTheta, float g) {
	const float scale = 3.0 / (8.0 * PI);
	
	float num = (1.0 - g * g) * (1.0 + cosTheta * cosTheta);
	float denom = (2.0 + g * g) * pow((1.0 + g * g - 2.0 * g * cosTheta), 1.5);
	
	return scale*num/denom;
}

float getRayleighPhase(float cosTheta) {
	const float k = 0.05968310365;
	return k * (1.0 + cosTheta * cosTheta);
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
	vec2 uv = vec2(tLUTRes.x * clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				tLUTRes.y * max(0.0, min(1.0, (height - groundRadiusMM) / (atmosphereRadiusMM - groundRadiusMM))));
	uv /= tLUTRes;
	return texture(tex, uv).rgb;
}
vec3 getValFromMultiScattLUT(sampler2D tex, vec3 pos, vec3 sunDir) {
	float height = length(pos);
	vec3 up = pos / height;
	float sunCosZenithAngle = dot(sunDir, up);
	vec2 uv = vec2(msLUTRes.x * clamp(0.5 + 0.5 * sunCosZenithAngle, 0.0, 1.0),
				msLUTRes.y * max(0.0, min(1.0, (height - groundRadiusMM) / (atmosphereRadiusMM - groundRadiusMM))));
	uv /= msLUTRes;
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
		vec3 inScattering = (rayleighInScattering + mieInScattering);

		// Integrated scattering within path segment.
		vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

		lum += scatteringIntegral*transmittance;
		
		transmittance *= sampleTransmittance;
	}
	return lum;
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
