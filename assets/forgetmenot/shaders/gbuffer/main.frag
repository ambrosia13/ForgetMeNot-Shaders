#include forgetmenot:shaders/lib/api/fmn_pbr.glsl
#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/cubemap.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/lighting.glsl
#include forgetmenot:shaders/lib/inc/seasons.glsl

uniform samplerCube u_skybox;
uniform sampler2D u_transmittance;
uniform sampler2D u_glint;
uniform sampler2D u_smooth_uniforms;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out uvec4 fragData;
layout(location = 3) out uvec4 fragData1;

bool isInventory;
vec3 gamma;
mat3 tbn;

vec3 lightmap;

vec3 getClippedWorldSpacePos() {
	return floor(mod(frx_vertex.xyz + frx_cameraPos - 0.1 * frx_vertexNormal.xyz, 3000.0) * 16.0) / 16.0;
}

void autoGenNormal() {
	if(
		// fmn_autoGenNormalStrength < 0.001 || 
		frx_fragNormal != vec3(0.0, 0.0, 1.0) || 
		#ifdef REALISTIC_WATER
			fmn_isWater == 1 ||
		#endif
		!frx_modelOriginRegion
	) {
		return;
	}

	vec2 uv = frx_normalizeMappedUV(frx_texcoord);
	vec2 uv1, uv2, uv3, uv4;

	
	vec2 sampleOffset = vec2(1.0 / 16.0, 0.0);

	uv1 = uv + sampleOffset.xy;
	uv2 = uv - sampleOffset.xy;
	uv3 = uv + sampleOffset.yx;
	uv4 = uv - sampleOffset.yx;

	float lodFactor = pow(clamp01(dot(normalize(frx_vertex.xyz), -frx_vertexNormal)), 1.0 / 2.0);

	vec4 sample1 = textureLod(frxs_baseColor, frx_mapNormalizedUV(repeatAndMirrorCoords(uv1)), 0);
	vec4 sample2 = textureLod(frxs_baseColor, frx_mapNormalizedUV(repeatAndMirrorCoords(uv2)), 0);
	vec4 sample3 = textureLod(frxs_baseColor, frx_mapNormalizedUV(repeatAndMirrorCoords(uv3)), 0);
	vec4 sample4 = textureLod(frxs_baseColor, frx_mapNormalizedUV(repeatAndMirrorCoords(uv4)), 0);

	//frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(1.0, 0.0, 0.0), pow4(clamp01(dot(normalize(frx_vertex.xyz), -frx_vertexNormal))));

	//frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(1.0, 0.0, 0.0), pow4(clamp01(dot(normalize(frx_vertex.xyz), -frx_vertexNormal))));

	// Cursed way to make sure we don't sample invalid pixels.
	sample1 = mix(sample1, sample2, step(sample1.a, 0.0001));
	sample2 = mix(sample2, sample1, step(sample2.a, 0.0001));
	sample3 = mix(sample3, sample4, step(sample3.a, 0.0001));
	sample4 = mix(sample4, sample3, step(sample4.a, 0.0001));

	vec3 worldSpacePos = getClippedWorldSpacePos();

	float height1 = frx_luminance(sample1.rgb * sample1.a);// + 0.025 * (hash13(worldSpacePos) * 2.0 - 1.0);
	float height2 = frx_luminance(sample2.rgb * sample2.a);// + 0.025 * (hash13(worldSpacePos + 100.0) * 2.0 - 1.0);
	float height3 = frx_luminance(sample3.rgb * sample3.a);// + 0.025 * (hash13(worldSpacePos + 200.0) * 2.0 - 1.0);
	float height4 = frx_luminance(sample4.rgb * sample4.a);// + 0.025 * (hash13(worldSpacePos + 300.0) * 2.0 - 1.0);

	float deltaX = (height2 - height1) * 3.0 * lodFactor;
	float deltaY = (height4 - height3) * 3.0 * lodFactor;

	frx_fragNormal = fNormalize(cross(vec3(-2.0, 0.0, deltaX), vec3(0.0, -2.0, deltaY)));
}

void directionalLightmap() {
	vec3 dFdPosX = dFdx(frx_vertex.xyz);
	vec3 dFdPosY = dFdy(frx_vertex.xyz);

	vec2 dFdBlockLight = vec2(
		dFdx(frx_fragLight.x), dFdy(frx_fragLight.x)
	);
	vec2 dFdSkyLight = vec2(
		dFdx(frx_fragLight.y), dFdy(frx_fragLight.y)
	);

	vec3 blockLightDir = normalize(dFdPosX * dFdBlockLight.x + dFdPosY * dFdBlockLight.y);
	vec3 skyLightDir = normalize(dFdPosX * dFdSkyLight.x + dFdPosY * dFdSkyLight.y);
	
	frx_fragLight.x *= clamp01(dot(blockLightDir, frx_fragNormal)) * 3.0 + 1.0;
	frx_fragLight.y *= clamp01(dot(skyLightDir, frx_fragNormal)) * 3.0 + 1.0;
}

void resolveMaterials() {
	isInventory = frx_isGui && !frx_isHand;
	gamma = vec3(isInventory ? 1.0 : 2.2);
	tbn = mat3(
		frx_vertexTangent.xyz, 
		cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
		frx_vertexNormal.xyz
	);
	lightmap = vec3(1.0);

	vec3 worldSpacePos = getClippedWorldSpacePos();

	#ifdef SEASONS
		vec3 rcpVertexColor = 1.0 / frx_vertexColor.rgb;
		frx_fragColor.rgb *= mix(vec3(1.0), rcpVertexColor * getSeasonColor(frx_vertexColor.rgb, fmn_isLeafBlock, worldSpacePos), 0.5 * fmn_isFoliage * step(0.001, distance(frx_vertexColor.rgb, vec3(1.0))));
	
		frx_fragColor.a *= mix(1.0, step(hash13(mod(worldSpacePos * 20.0, 100.0)), getLeavesFallingThreshold(worldSpacePos)), fmn_isLeafBlock);
	#endif

	// Put color into linear color space
	frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
	//frx_fragColor.rgb = vec3(1.0);

	// Put normal from tangent space to world space
	autoGenNormal();
	//frx_fragNormal = abs(frx_fragNormal);
	frx_fragNormal = tbn * fNormalize(frx_fragNormal);
	//frx_fragNormal = mix(frx_fragNormal, -frx_fragNormal, 1.0 - step(0.0, dot(frx_vertexNormal.xyz, frx_fragNormal)));
	if(frx_isHand) {
		// Fix hand normals
		frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
	}

	// Rain effects
	if(fmn_rainFactor > 0.0 && fmn_isWater == 0) {
		float porosity = (frx_fragRoughness) * step(frx_fragReflectance, 0.999);

		float rainReflectionFactor = linearstep(0.0, 0.5, fmn_rainFactor) * step(0.95, frx_vertexNormal.y);
		float puddleNoise = fbmHash(worldSpacePos.xz * 0.5, 3, 0.0);
		puddleNoise += hash13(mod(worldSpacePos * 20.0, 100.0)) * 0.2 - 0.1;
		puddleNoise *= smoothstep(7.0 / 8.0, 15.0 / 16.0, frx_fragLight.y);
		puddleNoise = smoothstep(0.5 - 0.2 * frx_smoothedThunderGradient, 0.7, puddleNoise);

		float puddles = puddleNoise * rainReflectionFactor;

		frx_fragRoughness = mix(frx_fragRoughness, 0.0, clamp01(puddles + frx_smoothedThunderGradient * 0.1));
		frx_fragReflectance = mix(frx_fragReflectance, 0.025, puddles);
		frx_fragNormal = mix(frx_fragNormal, frx_vertexNormal, puddles * 0.75);

		frx_fragColor.rgb *= mix(vec3(1.0), frx_fragColor.rgb, porosity * puddles * 0.5);
	}

	if(!isInventory) {
		// If the current dimension is non-vanilla, use MC's lightmap.
		if(isModdedDimension) {
			lightmap = texture(frxs_lightmap, frx_vertexLight.xy).rgb;
			lightmap *= mix(frx_vertexLight.z, 1.0, frx_matDisableAo);

			lightmap = mix(lightmap, vec3(1.0), frx_fragEmissive);

			lightmap = pow(lightmap, gamma);
		}

		#ifdef ENABLE_BLOOM
			float emissiveBoost = frx_isHand ? EMISSION * 0.5 : EMISSION;

			frx_fragColor.rgb *= 1.0 + emissiveBoost * frx_fragEmissive;
			frx_fragColor.rgb += frx_fragColor.rgb * 1.0 * EMISSION * frx_fragEmissive;
		#endif

		// Implement some canvas material conditions
		// frx_matHurt - red flash on hurt entities
		// frx_matFlash - white flash on things like tnt
		frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(1.0, 0.0, 0.0), 0.5 * frx_matHurt); 
		frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(2.0), 0.5 * frx_matFlash); 
	} else {
		frx_fragColor.rgb *= dot(frx_vertexNormal.xyz, fNormalize(vec3(0.2, 0.8, 0.6))) * 0.4 + 0.6;
	}

	if(frx_matGlint == 1) {
		// Not entirely vanilla implementation of enchantment glint
		vec3 glint = texture(u_glint, fract(frx_normalizeMappedUV(frx_texcoord) * 0.5 + frx_renderSeconds * 0.1)).rgb;
		glint = pow(glint, vec3(4.0));
		frx_fragColor.rgb += glint;
	}

	// Fix up lightmap values
	frx_fragLight.xy = linearstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.xy);
	frx_fragLight.z = mix(pow2(frx_fragLight.z * 0.7 + 0.3), 1.0, clamp01(frx_matDisableAo + fmn_sssAmount));

	fmn_sssAmount = max(fmn_sssAmount, float(frx_matDisableDiffuse));
}

void frx_pipelineFragment() {
	init();
	resolveMaterials();

	vec4 color = frx_fragColor;

	// A non-vanilla dimension is loaded, we don't want to touch lighting.
	if(isModdedDimension) {
		color.rgb *= lightmap;
		color.rgb = mix(color.rgb, pow(frx_fogColor.rgb, gamma), frx_smootherstep(frx_fogStart, frx_fogEnd, length(frx_vertex.xyz)));
	} else if((!frx_renderTargetSolid || frx_isHand)) {
		// Non-solid lighting, in vanilla dimensions only.
		color.rgb = basicLighting(
			color.rgb,
			frx_vertex.xyz,
			frx_vertexNormal,
			frx_fragNormal,
			frx_fragLight.x,
			frx_fragLight.y,
			frx_fragLight.z,
			pow2(frx_fragReflectance),
			pow2(frx_fragRoughness),
			fmn_sssAmount,
			float(fmn_isWater),
			u_skybox,
			u_transmittance,
			frxs_shadowMap,
			frxs_shadowMapTexture,
			false,
			4,
			texelFetch(u_smooth_uniforms, ivec2(3, 0), 0).r
		);
	}

	vec3 vertexNormalUnorm = frx_vertexNormal * 0.5 + 0.5;
	vec3 fragNormalUnorm = frx_fragNormal * 0.5 + 0.5;

	uint packedX = packUnormArb6Elements(
		float[6] (
			vertexNormalUnorm.x, vertexNormalUnorm.y, vertexNormalUnorm.z,
			frx_fragReflectance, step(0.999, frx_fragReflectance), float(fmn_isWater)
		),
		BITS_X
	);

	uint packedY = packUnormArb5Elements(
		float[5] (
			frx_fragLight.x, frx_fragLight.y, frx_fragLight.z,
			frx_fragRoughness, fmn_sssAmount
		),
		BITS_Y
	);

	uint packedZ = packUnormArb3Elements(
		float[3] (
			fragNormalUnorm.x, fragNormalUnorm.y, fragNormalUnorm.z
		),
		BITS_Z
	);

	if(color.a < 0.0001) discard;
	color = max(color, vec4(0.0005));

	fragColor = color;
	fragNormal = vec4(frx_vertexNormal.xyz * 0.5 + 0.5, 1.0);
	fragData = uvec4(packedX, packedY, packedZ, 1u);
	fragData1 = fragData;

	gl_FragDepth = gl_FragCoord.z;
}
