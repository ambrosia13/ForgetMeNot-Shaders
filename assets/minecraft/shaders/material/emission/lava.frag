#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	// vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);
	// uv = floor(uv * 16.0) / 64.0;

	// uv.x += snoise(uv.yy * 0.3 + frx_renderSeconds / 20.0) / 5.0;


	// float noiseA = fmn_fbm2D(uv * vec2(2.0, 1.0), 7, 0.2);
	// float noiseB = fmn_fbm2D(uv * vec2(2.0, 1.0) + 0.1, 7, 0.2);

	// frx_fragColor.rgb = mix(vec3(0.01), 1.0 * vec3(1.75, 0.5, 0.05), smoothstep(0.0, 0.01, pow(abs(noiseA - noiseB), 2.0)));

	#ifdef INTERNAL_MATERIALS
		//frx_fragColor.rgb *= vec3(1.75, 0.4, 0.05) * 1.5;
		frx_fragColor.rgb *= vec3(2.0, 1.5, 1.0);
	#endif

	#ifdef PBR_ENABLED
		fmn_autoGenNormalStrength = 0.5;
	#endif

	frx_fragEmissive = frx_luminance(frx_fragColor.rgb) * 0.5;
	frx_fragEnableDiffuse = false;
	frx_fragEnableAo = false;
}