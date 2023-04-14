/*
#include forgetmenot:shaders/lib/inc/material.glsl

Contains material struct for unpacking encoded materials.
*/

struct Material {
	vec3 fragNormal;
	vec3 vertexNormal;

	float f0;
	float isMetal;
	float isWater;

	float blockLight;
	float skyLight;
	float vanillaAo;

	float roughness;
	float sssAmount;

	float disableDiffuse;
};

Material unpackMaterial(in uvec3 packedMaterial) {
	Material material;

	float[6] unpackedX = unpackUnormArb6Elements(packedMaterial.x, BITS_X);

	material.vertexNormal = normalize(vec3(unpackedX[0], unpackedX[1], unpackedX[2]) * 2.0 - 1.0);
	material.f0 = unpackedX[3];
	material.isMetal = unpackedX[4];
	material.isWater = unpackedX[5];

	float[5] unpackedY = unpackUnormArb5Elements(packedMaterial.y, BITS_Y);

	material.blockLight = unpackedY[0];
	material.skyLight = unpackedY[1];
	material.vanillaAo = unpackedY[2];
	material.roughness = unpackedY[3];
	material.sssAmount = unpackedY[4];

	float[3] unpackedZ = unpackUnormArb3Elements(packedMaterial.z, BITS_Z);

	material.fragNormal = normalize(vec3(unpackedZ[0], unpackedZ[1], unpackedZ[2]) * 2.0 - 1.0);

	return material;
//	vec4 unpackedX = vec4(0.0);
//	vec4 unpackedY = unpackUnormArb(packedMaterial.y, BITS_Y);
//	vec4 unpackedZ = unpackUnormArb(packedMaterial.z, BITS_Z);
//
//	material.vertexNormal = normalize(clamp01(unpackedX.xyz) * 2.0 - 1.0);
//
//	material.blockLight = unpackedY.x * unpackedY.x;
//	material.skyLight = mix(unpackedY.y, 1.0, 1.0 - frx_worldIsOverworld);
//	material.vanillaAo = unpackedY.z * unpackedY.z;
//
//	material.f0 = unpackedZ.x * unpackedZ.x;
//	material.roughness = unpackedZ.y * unpackedZ.y;
//	material.sssAmount = unpackedZ.z;
//
//	material.disableDiffuse = step(0.5, unpackedY.w);
//	material.isWater = step(0.5, unpackedX.w);
//
//	return material;
}