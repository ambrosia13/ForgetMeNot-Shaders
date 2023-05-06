#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/sky_display.glsl

uniform sampler2D u_color;
uniform usampler2D u_data;
uniform sampler2D u_depth;
uniform sampler2D u_ssao;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;

uniform sampler2D u_transmittance;
uniform sampler2D u_sky_display;

uniform sampler2D u_smoothed_uniforms;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	init();

	// Sample everything first, use them later to give the GPU time to read the textures
	// packedSample is sampling an RGB32UI image so we put the most distance between the sample and the usage
	uvec3 packedSample = texture(u_data, texcoord).xyz;
	float depth = texture(u_depth, texcoord).r;
	vec3 color = texture(u_color, texcoord).rgb;
	vec3 albedo = color;

	vec3 viewDir = getViewDir();
	vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);

	if(isModdedDimension) {
		color = mix(color, pow(color, vec3(2.2)), floor(depth));
		fragColor = vec4(color, 1.0);
		return;
	}

	float emission = clamp01(frx_luminance(color) - 1.0);

	Material material = unpackMaterial(packedSample);

	if(material.f0 > 0.999) {
		fragColor = vec4(color, 1.0);
		return;
	}
	
	if(depth < 1.0) {
		//material.vanillaAo = pow3(texture(u_ssao, texcoord * 0.5).r);
		//material.vanillaAo = pow(material.vanillaAo, 1.3);

		color = basicLighting(
			color,
			sceneSpacePos,
			material.vertexNormal,
			material.fragNormal,
			material.blockLight,
			material.skyLight,
			material.vanillaAo,
			material.f0,
			material.roughness,
			material.sssAmount,
			material.isWater,
			u_skybox,
			u_transmittance,
			u_shadow_map,
			u_shadow_tex,
			true,
			8,
			texelFetch(u_smoothed_uniforms, ivec2(3, 0), 0).r
		);
	} else {
		color = texture(u_sky_display, texcoord).rgb;
	}

	fragColor = vec4(color, 1.0);
}