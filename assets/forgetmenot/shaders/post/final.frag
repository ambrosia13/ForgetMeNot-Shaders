#include forgetmenot:shaders/lib/inc/header.glsl
#include forgetmenot:shaders/lib/inc/exposure.glsl
#include forgetmenot:shaders/lib/inc/noise.glsl
#include forgetmenot:shaders/lib/inc/palette.glsl

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// Post-processing stuff, provided by belmu
vec3 vibrance(vec3 color, float intensity) {
    float mn = min(color.r, min(color.g, color.b));
    float mx = max(color.r, max(color.g, color.b));
    float sat = (1.0 - clamp01(mx - mn)) * clamp01(1.0 - mx) * frx_luminance(color) * 5.0;
    vec3 lightness = vec3((mn + mx) * 0.5);

    // Vibrance
    color = mix(color, mix(lightness, color, intensity), sat);
    // Negative vibrance
    color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));

    return color;
}

// http://filmicworlds.com/blog/minimal-color-grading-tools/
// component-wise
float liftGammaGain(float color, float lift, float gamma, float gain) {
    float lerpV = clamp01(pow(color, gamma));
    color = gain * lerpV + lift * (1.0 - lerpV);

    return color;
}

// Lottes 2016, "Advanced Techniques and Optimization of HDR Color Pipelines"
vec3 lottes(vec3 x, float whitePoint) {
    const vec3 a = vec3(1.6);
    const vec3 d = vec3(0.977);

    vec3 hdrMax = vec3(whitePoint);

    const vec3 midIn = vec3(0.18);
    const vec3 midOut = vec3(0.267);

    vec3 b =
        (-pow(midIn, a) + pow(hdrMax, a) * midOut) /
            ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);
    vec3 c =
        (pow(hdrMax, a * d) * pow(midIn, a) - pow(hdrMax, a) * pow(midIn, a * d) * midOut) /
            ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);

    return pow(x, a) / (pow(x, a * d) * b + c);
}

void main() {
    initGlobals();

    vec3 color = texture(u_color, texcoord).rgb;

    float luminance = texelFetch(u_exposure, ivec2(0), 0).r;

    float exposureBias = 0.25;
    float minExposure = 0.0;
    float maxExposure = 1000.0;
    float exposureMultiplier = 1.0;

    if (frx_worldIsNether == 1) {
        exposureBias = 0.2;
        minExposure = MIN_EXPOSURE_NETHER;
        maxExposure = MAX_EXPOSURE_NETHER;
        exposureMultiplier = EXPOSURE_MULTIPLIER_NETHER;
    }

    if (frx_worldIsEnd == 1) {
        exposureBias = 0.2;
        minExposure = MIN_EXPOSURE_NETHER;
        maxExposure = MAX_EXPOSURE_NETHER;
        exposureMultiplier = EXPOSURE_MULTIPLIER_NETHER;
    }

    color *= getExposureValue(luminance, 0.25, 0.0, 1000.0, 1.0);

    #undef ACES_TONEMAP
    #ifndef ACES_TONEMAP
    color = lottes(color * 0.45, 8.0);
    #else
    color = frx_toneMap(color);
    #endif

    // #ifdef ENABLE_POST_PROCESSING
    // 	color = vibrance(color, VIBRANCE);

    // 	// Lift-gamma-gain component-wise
    // 	color.r = clamp01(liftGammaGain(color.r, LIFT_R, GAMMA_R, GAIN_R));
    // 	color.b = clamp01(liftGammaGain(color.b, LIFT_G, GAMMA_G, GAIN_G));
    // 	color.g = clamp01(liftGammaGain(color.g, LIFT_B, GAMMA_B, GAIN_B));
    // #endif

    color = clamp01(pow(color, vec3(1.0 / 2.2)));
    fragColor = vec4(color, 1.0);
}
