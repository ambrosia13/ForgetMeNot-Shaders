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