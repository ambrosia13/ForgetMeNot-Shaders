#include forgetmenot:shaders/lib/materials.glsl

// Checks for axis-aligned normals to differentiate from grass cross model and grass block
bool isGrassBlock() {
	return 
		abs(dot(frx_vertexNormal.xyz, vec3(1.0, 0.0, 0.0))) > 0.99 ||
		abs(dot(frx_vertexNormal.xyz, vec3(0.0, 1.0, 0.0))) > 0.99 ||
		abs(dot(frx_vertexNormal.xyz, vec3(0.0, 0.0, 1.0))) > 0.99;
}

void frx_materialFragment() {
	float luminance = frx_luminance(frx_sampleColor.rgb);

	// Checks for saturation
	bool isGrass = distance(vec3(luminance), frx_sampleColor.rgb) < 0.1;

	#ifdef PBR_ENABLED
		if(isGrass) {
			frx_fragRoughness = 0.5 + 0.3 * luminance;
			frx_fragReflectance = 0.05;


			#if FMN_PBR >= 3
				if(!isGrassBlock()) {
					fmn_sssAmount = 1.0;
				}

				fmn_isFoliage = 1;
			#endif
		}

		fmn_autoGenNormalStrength = 0.75;
	#endif
}
