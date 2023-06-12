#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/sky_display.glsl

in vec2 texcoord;

layout(location = 0) out vec2 fragColor0;
layout(location = 1) out vec2 fragColor1;
layout(location = 2) out vec2 fragColor2;
layout(location = 3) out vec2 fragColor3;
layout(location = 4) out vec2 fragColor4;
layout(location = 5) out vec2 fragColor5;

void main() {
	initGlobals();

	vec3[] viewDirs = vec3[6] (
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0)
	);

	getCubemapViewDirs(texcoord, viewDirs);

	CloudLayer[] cloudLayers = CloudLayer[6] (
		createCumulusCloudLayer(viewDirs[0]),
		createCumulusCloudLayer(viewDirs[1]),
		createCumulusCloudLayer(viewDirs[2]),
		createCumulusCloudLayer(viewDirs[3]),
		createCumulusCloudLayer(viewDirs[4]),
		createCumulusCloudLayer(viewDirs[5])
	);

	fragColor0 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[0], cloudLayers[0]));
	fragColor1 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[1], cloudLayers[1]));
	fragColor2 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[2], cloudLayers[2]));
	fragColor3 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[3], cloudLayers[3]));
	fragColor4 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[4], cloudLayers[4]));
	fragColor5 = sqrt(getCloudsTransmittanceAndScattering(viewDirs[5], cloudLayers[5]));
}