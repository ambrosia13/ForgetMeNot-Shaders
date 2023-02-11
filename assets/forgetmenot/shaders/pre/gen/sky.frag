// --------------------------------------------------------------------------------------------------------
// All code from this file is taken or referenced from "Production Sky Rendering" at https://www.shadertoy.com/view/slSXRW, 
// which references "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", Hillaire (2020).
//
// Minimal code changes. Original Shadertoy code released under the MIT License.
// --------------------------------------------------------------------------------------------------------

#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/sky.glsl 

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;

in vec2 texcoord;

layout(location = 0) out vec4 dayColor;
layout(location = 1) out vec4 nightColor;

void main() {
	float u = texcoord.x;
	float v = texcoord.y;

	float clipV = v * 2.0 - 1.0;
	
	float azimuthAngle = (u - 0.5)*2.0*PI;
	// Non-linear mapping of altitude. See Section 5.3 of the paper.
	float adjV;
	if (v < 0.5) {
		float coord = -clipV;
		adjV = -coord*coord;
	} else {
		float coord = clipV;
		adjV = coord*coord;
	}
	
	float height = length(skyViewPos);
	vec3 up = skyViewPos / height;
	float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height) - 0.5*PI;
	float altitudeAngle = adjV*0.5*PI - horizonAngle;
	
	float cosAltitude = cos(altitudeAngle);
	vec3 rayDir = vec3(cosAltitude*sin(azimuthAngle), sin(altitudeAngle), -cosAltitude*cos(azimuthAngle));
	
	float sunAltitude = (0.5*PI) - acos(dot(getSunVector(), up));
	vec3 sunDir = vec3(0.0, sin(sunAltitude), -cos(sunAltitude));

	float sunAltitudeMoon = (0.5*PI) - acos(dot(getMoonVector(), up));
	vec3 sunDirMoon = vec3(0.0, sin(sunAltitudeMoon), -cos(sunAltitudeMoon));
	
	float atmoDist = rayIntersectSphere(skyViewPos, rayDir, atmosphereRadiusMM);
	float groundDist = rayIntersectSphere(skyViewPos, rayDir, groundRadiusMM);
	float tMax = (groundDist < 0.0) ? atmoDist : groundDist;

	dayColor = vec4(raymarchScattering(skyViewPos, rayDir, sunDir, tMax, float(numScatteringSteps), u_transmittance, u_multiscattering) * 0.5, 1.0);
	nightColor = vec4(raymarchScattering(skyViewPos, rayDir, sunDirMoon, tMax, float(numScatteringSteps), u_transmittance, u_multiscattering) * moonFlux, 1.0);
}