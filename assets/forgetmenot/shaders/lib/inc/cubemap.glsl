/*
#include forgetmenot:shaders/lib/inc/cubemap.glsl

Contains utility functions for working with cubemaps.
*/


void getCubemapViewDirs(in vec2 uv, out vec3 viewDirs[6]) {
	vec3 a = normalize(vec3(uv - 0.5, 0.5));
	
	viewDirs[0] = vec3( a.z, -a.y, -a.x);
	viewDirs[1] = vec3(-a.z, -a.y,  a.x);
	viewDirs[2] = vec3( a.x,  a.z,  a.y);
	viewDirs[3] = vec3( a.x, -a.z, -a.y);
	viewDirs[4] = vec3( a.x, -a.y,  a.z);
	viewDirs[5] = vec3(-a.x, -a.y, -a.z);
}

vec4 interpolateCubemap(in samplerCube cubemap, in vec3 viewDir) {
	float posZ = smoothstep(0.0, 1.0, clamp(viewDir.z, 0.0, 1.0));
	float negZ = smoothstep(0.0, 1.0, clamp(-viewDir.z, 0.0, 1.0));

	float posY = smoothstep(0.0, 1.0, clamp(viewDir.y, 0.0, 1.0));
	float negY = smoothstep(0.0, 1.0, clamp(-viewDir.y, 0.0, 1.0));

	float posX = smoothstep(0.0, 1.0, clamp(viewDir.x, 0.0, 1.0));
	float negX = smoothstep(0.0, 1.0, clamp(-viewDir.x, 0.0, 1.0));

	vec4 samplePosZ = textureLod(cubemap, vec3(0.0, 0.0, 1.0), 7);
	vec4 sampleNegZ = textureLod(cubemap, -vec3(0.0, 0.0, 1.0), 7);

	vec4 samplePosY = textureLod(cubemap, vec3(0.0, 1.0, 0.0), 7);
	vec4 sampleNegY = textureLod(cubemap, -vec3(0.0, 1.0, 0.0), 7);

	vec4 samplePosX = textureLod(cubemap, vec3(1.0, 0.0, 0.0), 7);
	vec4 sampleNegX = textureLod(cubemap, -vec3(1.0, 0.0, 0.0), 7);

	vec4 interpolated = vec4(0.0);

	interpolated = mix(interpolated, samplePosZ, posZ);
	interpolated = mix(interpolated, sampleNegZ, negZ);
	interpolated = mix(interpolated, samplePosY, posY);
	interpolated = mix(interpolated, sampleNegY, negY);
	interpolated = mix(interpolated, samplePosX, posX);
	interpolated = mix(interpolated, sampleNegX, negX);

	return interpolated;
}