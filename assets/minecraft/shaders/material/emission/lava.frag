#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
	vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);
	uv = floor(uv * 16.0) / 32.0;

	uv.x += snoise(uv.yy * 0.3 + frx_renderSeconds / 60.0) / 5.0;

	int noiseOctaves = int(mix(2.0, 7.0, smoothstep(0.0, 0.2, dot(-frx_vertexNormal, normalize(frx_vertex.xyz)))));

	float noiseA = fmn_fbm2D(uv * vec2(2.0, 1.0), noiseOctaves, 0.01);
	float noiseB = fmn_fbm2D(uv * vec2(2.0, 1.0) + 0.1, noiseOctaves, 0.01);

	vec3 coldLavaColor = vec3(0.5, 0.15, 0.1) * 0.75;
	vec3 hotLavaColor = vec3(2.0, 1.0, 0.05);

	float hotLavaFactor = smoothstep(0.0, 0.01, pow(abs(noiseA - noiseB), 2.0));

	frx_fragColor.rgb = mix(coldLavaColor, hotLavaColor, hotLavaFactor);

	#ifdef INTERNAL_MATERIALS
		//frx_fragColor.rgb *= vec3(1.75, 0.4, 0.05) * 1.5;
		frx_fragColor.rgb *= normalize(vec3(2.0, 1.5, 1.0));
	#endif

	#ifdef PBR_ENABLED
		fmn_autoGenNormalStrength = 0.0;
	#endif

	frx_fragEmissive = hotLavaFactor;
	frx_fragEnableDiffuse = false;
	frx_fragEnableAo = false;
}