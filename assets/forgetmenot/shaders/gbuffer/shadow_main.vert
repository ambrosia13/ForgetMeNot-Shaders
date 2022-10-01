#include forgetmenot:shaders/lib/includes.glsl 

out vec4 shadowViewPos;

// Offsets from Chocapic13 shaders
vec2 taaOffsets[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);

const vec2[] OFFSETS = vec2[](
    vec2(0, 0),
    vec2(1, 0),
    vec2(1, 1),
    vec2(0, 1)
);

int imod(int val, int modulo) {
    return val - val / modulo * modulo;
}

ivec2 positionToPixel(vec3 position, vec2 ScreenSize, out bool inside) {
    inside = true;
    ivec2 iScreenSize = ivec2(ScreenSize) - ivec2(0, 1);
    ivec3 iPosition = ivec3(floor(position));
    int area = iScreenSize.x * iScreenSize.y / 2;
    ivec3 sides = ivec3(int(pow(float(area), 1.0 / 3.0)));

    iPosition += sides / 2;

    if (clamp(iPosition, ivec3(0), sides - 1) != iPosition) {
        inside = false;
        return ivec2(-1);
    }

    int index = iPosition.x + iPosition.z * sides.x + iPosition.y * sides.x * sides.z;
    ivec2 result = ivec2(
        imod(index, iScreenSize.x / 2) * 2,
        index / (iScreenSize.x / 2) + 1
    );
    result.x += imod(result.y, 2);

    return result;
}

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
    vec2 screenSize = vec2(frx_viewWidth, frx_viewHeight);

    vec3 offsetPos = frx_vertex.xyz - frx_vertexNormal.xyz * 0.25;

    frx_vertex.xyz = offsetPos;

    gl_Position = vec4(offsetPos.xz / screenSize, -1, 1);
    return;


    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz + frx_modelToCamera.xyz);

        // shadowViewPos = (frx_shadowViewMatrix * (frx_vertex + frx_modelToCamera));
    } else {
        // if(frx_isHand) {
        //     frx_vertex.xz = rotate2D(frx_vertex.xz, atan(frx_cameraView.x, -frx_cameraView.z));
        // }
        frx_vertex += frx_modelToCamera;
        //frx_vertex.xz = rotate2D(frx_vertex.xz, 2*PI / float(2));
        //frx_vertex.y *= acos(frx_cameraView.y);


        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
    }

    shadowViewPos = (frx_shadowViewMatrix * vec4(frx_vertex.xyz, 1.0));

    if(!frx_isGui || frx_isHand) gl_Position.xy += (taaOffsets[frx_renderFrames % 8u] * (1.0 / vec2(frx_viewWidth, frx_viewHeight))) * gl_Position.w;
}