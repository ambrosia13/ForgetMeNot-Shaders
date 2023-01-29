/*
#include forgetmenot:shaders/lib/inc/material.glsl

Contains material struct for unpacking encoded materials.
*/

struct Material {
	vec3 fragNormal;

	float blockLight;
	float skyLight;
	float vanillaAo;

	float f0;
	float roughness;
	float sssAmount;

	float disableDiffuse;
	float isWater;
};

Material unpackMaterial(in uvec3 packedMaterial) {
	Material material;

	vec4 unpackedX = unpackUnormArb(packedMaterial.x, BITS_X);
	vec4 unpackedY = unpackUnormArb(packedMaterial.y, BITS_Y);
	vec4 unpackedZ = unpackUnormArb(packedMaterial.z, BITS_Z);

	material.fragNormal = normalize(clamp01(unpackedX.xyz) * 2.0 - 1.0);

	material.blockLight = unpackedY.x * unpackedY.x;
	material.skyLight = mix(unpackedY.y, 1.0, 1.0 - frx_worldIsOverworld);
	material.vanillaAo = unpackedY.z * unpackedY.z;

	material.f0 = unpackedZ.x * unpackedZ.x;
	material.roughness = unpackedZ.y * unpackedZ.y;
	material.sssAmount = unpackedZ.z;

	material.disableDiffuse = step(0.5, unpackedY.w);
	material.isWater = step(0.5, unpackedX.w);

	return material;
}