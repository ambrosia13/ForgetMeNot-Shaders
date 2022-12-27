// Version number. Will increment when new material flags are added.
#define FMN_PBR 3

// Flag for whether this material is water. Needed for water fog.
// Water fog color will depend on the water albedo as of FMN_PBR version 2, 
// so set the albedo of the material to whatever you want the water fog color to be.
// Version 1 feature.
int fmn_isWater = 0;

// Amount of subsurface scattering (SSS) to apply for this material. 
// In FMN, this is implemented such that SSS materials have both shadowmap-based SSS and screenspace SSS.
// Other pipelines may implement fmn_sssAmount in their own way.
// Defaults to 1.0 when diffuse shading is disabled.
// Version 1 feature.
float fmn_sssAmount = 0.0;

// Flag for whether this material is a player. 
// Version 2 feature.
int fmn_isPlayer = 0;

// Flag for whether this material is foliage and should have tinting based on season.
// Version 3 feature.
int fmn_isFoliage = 0;

// Flag for whether this material is foliage AND a leaf block. The effect of this is simply tinting to a different color per season.
// For example, autumn leaves will be orange but other foliage will be a different color.
// Version 3 feature.
int fmn_isLeafBlock = 0;