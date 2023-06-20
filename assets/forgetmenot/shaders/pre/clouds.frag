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

	CloudLayer[] cumulusCloudLayers = CloudLayer[6] (
		createCumulusCloudLayer(viewDirs[0]),
		createCumulusCloudLayer(viewDirs[1]),
		createCumulusCloudLayer(viewDirs[2]),
		createCumulusCloudLayer(viewDirs[3]),
		createCumulusCloudLayer(viewDirs[4]),
		createCumulusCloudLayer(viewDirs[5])
	);

	CloudLayer[] cirrusCloudLayers = CloudLayer[6] (
		createCirrusCloudLayer(viewDirs[0]),
		createCirrusCloudLayer(viewDirs[1]),
		createCirrusCloudLayer(viewDirs[2]),
		createCirrusCloudLayer(viewDirs[3]),
		createCirrusCloudLayer(viewDirs[4]),
		createCirrusCloudLayer(viewDirs[5])
	);

	#ifdef CLOUDS_CONTRIBUTE_TO_LIGHT
		fragColor0 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[0], cumulusCloudLayers[0])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[0], cirrusCloudLayers[0])));
		fragColor1 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[1], cumulusCloudLayers[1])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[1], cirrusCloudLayers[1])));
		fragColor2 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[2], cumulusCloudLayers[2])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[2], cirrusCloudLayers[2])));
		fragColor3 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[3], cumulusCloudLayers[3])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[3], cirrusCloudLayers[3])));
		fragColor4 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[4], cumulusCloudLayers[4])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[4], cirrusCloudLayers[4])));
		fragColor5 = min(sqrt(getCloudsTransmittanceAndScattering(viewDirs[5], cumulusCloudLayers[5])), sqrt(getCloudsTransmittanceAndScattering(viewDirs[5], cirrusCloudLayers[5])));
	#else
		fragColor0 = vec2(1.0, 0.0);
		fragColor1 = vec2(1.0, 0.0);
		fragColor2 = vec2(1.0, 0.0);
		fragColor3 = vec2(1.0, 0.0);
		fragColor4 = vec2(1.0, 0.0);
		fragColor5 = vec2(1.0, 0.0);
	#endif
}