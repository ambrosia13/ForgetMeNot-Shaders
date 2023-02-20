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
	vec3[] viewDirs = vec3[6] (
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0),
		vec3(0.0)
	);

	getCubemapViewDirs(texcoord, viewDirs);

	vec2[] planes = vec2[6] (
		createCloudPlane(viewDirs[0]),
		createCloudPlane(viewDirs[1]),
		createCloudPlane(viewDirs[2]),
		createCloudPlane(viewDirs[3]),
		createCloudPlane(viewDirs[4]),
		createCloudPlane(viewDirs[5])
	);

	CloudLayer[] cloudLayers = CloudLayer[6] (
		createCumulusCloudLayer(planes[0]),
		createCumulusCloudLayer(planes[1]),
		createCumulusCloudLayer(planes[2]),
		createCumulusCloudLayer(planes[3]),
		createCumulusCloudLayer(planes[4]),
		createCumulusCloudLayer(planes[5])
	);

	fragColor0 = sqrt(getCloudsTransmittanceAndScattering(planes[0], viewDirs[0], cloudLayers[0]));
	fragColor1 = sqrt(getCloudsTransmittanceAndScattering(planes[1], viewDirs[1], cloudLayers[1]));
	fragColor2 = sqrt(getCloudsTransmittanceAndScattering(planes[2], viewDirs[2], cloudLayers[2]));
	fragColor3 = sqrt(getCloudsTransmittanceAndScattering(planes[3], viewDirs[3], cloudLayers[3]));
	fragColor4 = sqrt(getCloudsTransmittanceAndScattering(planes[4], viewDirs[4], cloudLayers[4]));
	fragColor5 = sqrt(getCloudsTransmittanceAndScattering(planes[5], viewDirs[5], cloudLayers[5]));
}