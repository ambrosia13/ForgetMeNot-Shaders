#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/packing.glsl
#include forgetmenot:shaders/lib/inc/material.glsl

uniform sampler2D u_rtao;
uniform sampler2D u_depth;
uniform usampler2D u_data;

in vec2 texcoord;

layout(location = 0) out vec4 rtaoTarget;
layout(location = 1) out vec4 depthTarget;
layout(location = 2) out vec4 normalTarget;

void main() {
	initGlobals();
	
	Material material = unpackMaterial(texture(u_data, texcoord).xyz);

	rtaoTarget = texture(u_rtao, texcoord);
	depthTarget = texture(u_depth, texcoord);
	normalTarget = vec4(material.vertexNormal, 1.0);
}