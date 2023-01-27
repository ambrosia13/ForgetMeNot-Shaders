#define INCLUDE_SPACES
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_current;
uniform sampler2D u_previous;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	if(!shouldReprojectFrame()) {
		fragColor = texture(u_current, texcoord);
	} else {
		float depth = texture(u_depth, texcoord).r;
		vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);
		vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;

		vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(sceneSpacePos + positionDifference);
		vec2 sampleCoord = mix(lastScreenPos.xy, texcoord, abs(sign(clamp01(lastScreenPos.xy) - lastScreenPos.xy)));

		fragColor = texture(u_previous, sampleCoord);
	}
}