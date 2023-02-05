#define INCLUDE_SPACES
#define INCLUDE_SKY
#define INCLUDE_IGN
#define INCLUDE_SHADOW
#define INCLUDE_NOISE
#define INCLUDE_CUBEMAPS
#define INCLUDE_PACKING
#define INCLUDE_LIGHTING
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform usampler2D u_data;
uniform sampler2D u_depth;
uniform sampler2D u_ssao;

uniform sampler2DArrayShadow u_shadow_map;
uniform sampler2DArray u_shadow_tex;

uniform samplerCube u_skybox;
uniform sampler2D u_transmittance;

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

	if(isModdedDimension()) {
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
		//material.vanillaAo = pow2(texture(u_ssao, texcoord * 0.5).r);
		material.vanillaAo = pow(material.vanillaAo, 1.3);

		color = basicLighting(
			color,
			sceneSpacePos,
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
			8
		);
	} else {
		color = textureLod(u_skybox, viewDir, 0).rgb;
	}

	fragColor = color.rgbb * FMN_MASK.xxxy + FMN_MASK.yyyx;
}