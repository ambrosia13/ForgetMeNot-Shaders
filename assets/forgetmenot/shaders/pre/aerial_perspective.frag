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

	const int LAYER_SIZE = 15;
	const int TOTAL_SIZE = LAYER_SIZE * LAYER_SIZE;

	ivec2 coord = ivec2(gl_FragCoord.xy);
	
	int layer = coord.x * LAYER_SIZE / TOTAL_SIZE;
	layer += coord.y * LAYER_SIZE / TOTAL_SIZE * LAYER_SIZE;
	
	vec3 color = vec3(0.0);
	vec2 layerCoord = vec2(coord % LAYER_SIZE + 0.5) / LAYER_SIZE;

	vec3 viewDir = normalize(setupSceneSpacePos(layerCoord, 1.0));

	float tMax = (2.0 * layer) / 1e4;
	color = raymarchScattering(skyViewPos, viewDir, getSunVector(), tMax, 32.0, u_transmittance, u_multiscattering) * 20.0;
	color += nightAdjust(raymarchScattering(skyViewPos, viewDir, getMoonVector(), tMax, 32.0, u_transmittance, u_multiscattering) * 20.0);

	fragColor = vec4(color, 1.0);
}