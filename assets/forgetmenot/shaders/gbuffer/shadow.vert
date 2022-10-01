#include forgetmenot:shaders/lib/includes.glsl 

uniform int frxu_cascade;

vec2 map3Dto2DLayers(vec3 pos, vec3 range, vec2 textureSize) {
	// Offset by half of range to make it positive
	pos += range / 2;
	// Calculate the start of the layer
	vec2 layerPos = vec2(
		// X should increase by range.x each time, but 
		// should never go above textureSize.x
		mod(pos.y * range.x, textureSize.x),
		// y will be as many times range.y, as the layer
		// overflows on the x axis
		floor(pos.y * range.x / textureSize.x) * range.y
	);
	// We offset the layerPos by the horizontal position
	return (layerPos + pos.xz) / textureSize;
}

void frx_pipelineVertex() {
    vec4 color = texture(frxs_baseColor, frx_texcoord);
    if(distance(color.rgb, vec3(1.0, 0.0, 1.0)) < 0.01) {

    }

    gl_Position = frx_shadowViewProjectionMatrix(frxu_cascade) * (frx_vertex + frx_modelToCamera);
}