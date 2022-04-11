// --------------------------------------------------------------------------------------------------------
// Taken from https://github.com/Jam3/glsl-fast-gaussian-normalAwareBlur - MIT License - changed deprecated texture2D() function to compile.
// --------------------------------------------------------------------------------------------------------
vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += textureLod(image, uv, frxu_lod) * 0.1964825501511404;
  color += textureLod(image, uv + (off1 / resolution), frxu_lod) * 0.2969069646728344;
  color += textureLod(image, uv - (off1 / resolution), frxu_lod) * 0.2969069646728344;
  color += textureLod(image, uv + (off2 / resolution), frxu_lod) * 0.09447039785044732;
  color += textureLod(image, uv - (off2 / resolution), frxu_lod) * 0.09447039785044732;
  color += textureLod(image, uv + (off3 / resolution), frxu_lod) * 0.010381362401148057;
  color += textureLod(image, uv - (off3 / resolution), frxu_lod) * 0.010381362401148057;
  return color;
}

vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * direction;
  color += texture(image, uv) * 0.29411764705882354;
  color += texture(image, uv + (off1 / resolution)) * 0.35294117647058826;
  color += texture(image, uv - (off1 / resolution)) * 0.35294117647058826;
  return color; 
}

vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * direction;
  vec2 off2 = vec2(3.2307692308) * direction;
  color += texture(image, uv) * 0.2270270270;
  color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
  color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
  color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
  color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
  return color;
}

// Following function adapted from previous normalAwareBlur function, kind of like edge-aware normalAwareBlur
vec4 normalLockedBlur(sampler2D image, vec2 uv, vec2 resolution, vec2 direction, sampler2D imageNormal) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  vec4 centerColor = textureLod(image, uv, frxu_lod);
  vec3 centerNormal = texture(imageNormal, uv).rgb;
  color += centerColor * 0.1964825501511404;
  if(all(equal(texture(imageNormal, uv + (off1 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv + (off1 / resolution), frxu_lod) * 0.2969069646728344;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (0.1964825501511404 + 0.2969069646728344);//vec4(1.0) * (0.98 - 0.2969069646728344);
  if(all(equal(texture(imageNormal, uv - (off1 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv - (off1 / resolution), frxu_lod) * 0.2969069646728344;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (0.1964825501511404 + 2.0 * 0.2969069646728344);//vec4(1.0) * (0.98 - 0.2969069646728344);
  if(all(equal(texture(imageNormal, uv + (off2 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv + (off2 / resolution), frxu_lod) * 0.09447039785044732;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (0.1964825501511404 + 2.0 * 0.2969069646728344 + 0.09447039785044732);//vec4(1.0) * (0.98 - 0.09447039785044732);
  if(all(equal(texture(imageNormal, uv - (off2 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv - (off2 / resolution), frxu_lod) * 0.09447039785044732;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (0.1964825501511404 + 2.0 * 0.2969069646728344 + 2.0 * 0.09447039785044732);//vec4(1.0) * (0.98 - 0.09447039785044732);
  if(all(equal(texture(imageNormal, uv + (off3 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv + (off3 / resolution), frxu_lod) * 0.010381362401148057;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (1.0 - 2.0 * 0.010381362401148057);//vec4(1.0) * (0.98 - 0.010381362401148057);
  if(all(equal(texture(imageNormal, uv - (off3 / resolution)).rgb, centerNormal))) {
    color += textureLod(image, uv - (off3 / resolution), frxu_lod) * 0.010381362401148057;
  } else return blur5(image, uv, resolution, direction * 0.3);//color = centerColor * (1.0 - 0.010381362401148057);//vec4(1.0) * (0.98 - 0.010381362401148057);
  return color;
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Adapted from Xordev's Ominous Shaderpack https://github.com/XorDev/Ominous-Shaderpack/blob/main/shaders/lib/Blur.inc, with permission
// --------------------------------------------------------------------------------------------------------
vec4 normalAwareBlur(sampler2D image,vec2 uv,float radius, int quality, sampler2D normal) {
	vec2 texel = 1.0 / frxu_size;

  float weight = 0.0;
  vec4 col = vec4(0.0);

  float d = 1.0;
  vec2 samp = vec2(radius) / float(quality);

	mat2 ang = mat2(0.73736882209777832, -0.67549037933349609, 0.67549037933349609, 0.73736882209777832);

  vec3 centerNormal = texture(normal, uv).rgb;
  vec4 centerColor = texture(image, uv);

	for(int i = 0; i < quality * quality; i++) {
    d += 1.0 / d;
    samp *= ang;

    float w = 1.0 / max(0.01, d - 1.0);
    vec2 uv = uv + samp * (d - 1.0) * texel;
    vec3 currentNormal = texture(normal, uv).rgb;
    if(all(equal(currentNormal, centerNormal))) {
      col += texture(image, uv) * w;
      weight += w;
    } else {
      col += centerColor * w;
      weight += w;  
    }
	}
  return col / max(0.01, weight);
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Taken from https://github.com/dmnsgn/glsl-tone-map/blob/master/filmic.glsl - MIT License
// --------------------------------------------------------------------------------------------------------
vec3 tonemapFilmic(vec3 x) {
  vec3 X = max(vec3(0.0), x - 0.004);
  vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
  return pow(result, vec3(2.2));
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Credit to Belmu#4066 from the shaderLABS discord channel #snippets - no changes made.
// https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849
// --------------------------------------------------------------------------------------------------------
void contrast(inout vec3 color, float contrast) {
    color = (color - 0.5) * contrast + 0.5;
}
void vibrance(inout vec3 color, float intensity) {
    float mn       = min(color.r, min(color.g, color.b));
    float mx       = max(color.r, max(color.g, color.b));
    float sat      = (1.0 - clamp01(mx - mn)) * clamp01(1.0 - mx) * frx_luminance(color) * 5.0;
    vec3 lightness = vec3((mn + mx) * 0.5);

    // Vibrance
    color = mix(color, mix(lightness, color, intensity), sat);
    // Negative vibrance
    color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));
}
// --------------------------------------------------------------------------------------------------------
