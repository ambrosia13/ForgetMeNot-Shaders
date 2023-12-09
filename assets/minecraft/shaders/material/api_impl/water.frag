#include forgetmenot:shaders/lib/materials.glsl
#include lumi:shaders/api/pbr_ext.glsl

void frx_materialFragment() {
	#ifdef PBR_ENABLED
		frx_fragReflectance = 0.02;
		frx_fragRoughness = 0.0;

		// Lumi PBR support
		#if LUMI_PBR_API >= 8
			pbr_builtinWater = true;
		#endif

		// FMN PBR is always active
		fmn_isWater = 1;
		fmn_sssAmount = 1.0;
		fmn_autoGenNormalStrength = 0.5;

		#ifdef INTERNAL_MATERIALS
			frx_fragColor = vec4(WATER_COLOR, 0.5);
		#endif
	#endif
}