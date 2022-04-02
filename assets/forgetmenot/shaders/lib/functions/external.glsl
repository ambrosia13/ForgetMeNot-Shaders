// --------------------------------------------------------------------------------------------------------
// Taken from https://github.com/Jam3/glsl-fast-gaussian-blur - MIT License - changed deprecated texture2D() function to compile.
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