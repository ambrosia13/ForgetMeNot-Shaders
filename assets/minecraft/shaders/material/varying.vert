#include forgetmenot:shaders/lib/materials.glsl

void frx_materialVertex() {
	frx_vertex += frx_modelToWorld;
	frx_var0.xy = frx_faceUv(frx_vertex.xyz, frx_vertexNormal.xyz);
	frx_var0.zw = frx_faceUv(frx_vertex.xyz, FACE_UP);
	frx_vertex -= frx_modelToWorld;
}