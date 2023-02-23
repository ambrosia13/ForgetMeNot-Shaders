#include forgetmenot:shaders/lib/inc/header.glsl 
#include forgetmenot:shaders/lib/inc/space.glsl
#include forgetmenot:shaders/lib/inc/sky.glsl 
#include forgetmenot:shaders/lib/inc/sky_display.glsl 

uniform sampler2D u_transmittance;
uniform sampler2D u_sky_day;
uniform sampler2D u_sky_night;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
	init();

	fragColor.rgb = getSkyAndClouds(
		getViewDir(),
		u_transmittance,
		u_sky_day,
		u_sky_night
	);

	fragColor.a = 1.0;
}