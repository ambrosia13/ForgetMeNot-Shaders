#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 
#include forgetmenot:shaders/lib/inc/sky.glsl 

uniform sampler2D u_transmittance;
uniform sampler2D u_multiscattering;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// Naive implementation of "froxels" (if you can even call it that).
// Doesn't fit tightly to the frustum; just renders a volume around 
// the view area for aerial perspective.
void main() {
	initGlobals();
	
	vec3 color = vec3(0.0);

	vec3 viewDir = normalize(setupSceneSpacePos(texcoord, 1.0));

	float tMax = 0.025;
	color = raymarchScattering(getSkyViewPos(), viewDir, getSunVector(), tMax, 32.0, FOG_MIE_AMOUNT, u_transmittance, u_multiscattering) * 20.0;
	color += nightAdjust(raymarchScattering(getSkyViewPos(), viewDir, getMoonVector(), tMax, 32.0, FOG_MIE_AMOUNT, u_transmittance, u_multiscattering) * 20.0);

	color *= 1.6;

	fragColor = vec4(color, 1.0);
}