#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl 
#include forgetmenot:shaders/lib/inc/blur.glsl 
#include forgetmenot:shaders/lib/inc/noise.glsl 

uniform sampler2D u_color;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

const float gaussian_25[25] = float[](
	5.960464477539063e-8,
	0.000001430511474609375,
	0.000016450881958007812,
	0.00012063980102539062,
	0.0006333589553833008,
	0.002533435821533203,
	0.008022546768188477,
	0.020629405975341797,
	0.04383748769760132,
	0.07793331146240234,
	0.11689996719360352,
	0.14878177642822266,
	0.1611802577972412,
	0.14878177642822266,
	0.11689996719360352,
	0.07793331146240234,
	0.04383748769760132,
	0.020629405975341797,
	0.008022546768188477,
	0.002533435821533203,
	0.0006333589553833008,
	0.00012063980102539062,
	0.000016450881958007812,
	0.000001430511474609375,
	5.960464477539063e-8
);

vec4 blur25(in sampler2D tex, in vec2 coord, in vec2 resolution, in vec2 direction) {
	vec4 color = vec4(0.0);

	for(int i = 0; i < 25; i++) {
		int currentSample = i - 13;

		color += texture(tex, repeatAndMirrorCoords(coord + direction * (currentSample + interleavedGradient(i) - 0.5) / resolution)) * gaussian_25[i];
	}

	return color;
}

void main() {
	init();
	
	#ifdef MOTION_BLUR
		vec3 viewPos = setupSceneSpacePos(texcoord, texture(u_depth, texcoord).r);
		vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
		vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(viewPos + positionDifference);

		fragColor = blur25(u_color, texcoord, frxu_size, 100.0 * (texcoord - lastScreenPos.xy));
	#else
		fragColor = texture(u_color, texcoord);
	#endif
}