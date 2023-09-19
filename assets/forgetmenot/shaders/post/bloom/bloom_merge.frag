#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl
#include forgetmenot:shaders/lib/inc/exposure.glsl

uniform sampler2D u_color;
uniform sampler2D u_downsampled;
uniform sampler2D u_upsampled;

uniform sampler2D u_sort;
uniform sampler2D u_solid_depth;

uniform sampler2D u_exposure;

layout(location = 0) out vec4 fragColor;

in vec2 texcoord;

vec4 frx_sampleTentLod(sampler2D tex, vec2 uv, vec2 dist, float lod) {
	vec4 d = dist.xyxy * vec4(1.0, 1.0, -1.0, 0.0);

	vec4 sum = textureLod(tex, uv - d.xy, lod)
	+ textureLod(tex, uv - d.wy, lod) * 2.0
	+ textureLod(tex, uv - d.zy, lod)
	+ textureLod(tex, uv + d.zw, lod) * 2.0
	+ textureLod(tex, uv, lod) * 4.0
	+ textureLod(tex, uv + d.xw, lod) * 2.0
	+ textureLod(tex, uv + d.zy, lod)
	+ textureLod(tex, uv + d.wy, lod) * 2.0
	+ textureLod(tex, uv + d.xy, lod);

	return sum * (1.0 / 16.0);
}

void main() {
	initGlobals();

	vec4 color = texture(u_color, texcoord);
	vec4 bloom = frx_sampleTent(u_upsampled, texcoord, 1. / frxu_size, 0) / 7.0;

	fragColor = mix(color, bloom, 0.2 + 0.4 * frx_cameraInFluid + 0.2 * frx_worldIsNether);
	//fragColor = bloom;
}