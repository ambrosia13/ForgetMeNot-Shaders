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

vec4 sampleAllCubemapFaces(in samplerCube cubemap) {
	const vec3[] FORWARD_VECS = vec3[] (
		vec3(1, 0, 0),
		vec3(-1, 0, 0),
		vec3(0, 1, 0),
		vec3(0, -1, 0),
		vec3(0, 0, 1),
		vec3(0, 0, -1)
	);

	vec4 color = vec4(0.0);
	color += textureLod(cubemap, normalize(FORWARD_VECS[0] + vec3(0.0, 1.0, 0.0)), 10) * 0.166;
	color += textureLod(cubemap, normalize(FORWARD_VECS[1] + vec3(0.0, 1.0, 0.0)), 10) * 0.166;
	color += textureLod(cubemap, normalize(FORWARD_VECS[2] + vec3(0.0, 1.0, 0.0)), 10) * 0.5;
	color += textureLod(cubemap, normalize(FORWARD_VECS[4] + vec3(0.0, 1.0, 0.0)), 10) * 0.166;
	color += textureLod(cubemap, normalize(FORWARD_VECS[5] + vec3(0.0, 1.0, 0.0)), 10) * 0.166;

	return color;
}
