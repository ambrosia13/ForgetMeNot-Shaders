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
  vec4 centerColor = textureLod(image, uv, frxu_lod);
  vec3 centerNormal = texture(imageNormal, uv).rgb;

  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
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
  vec3 centerNormal = texture(normal, uv).rgb;
  vec4 centerColor = texture(image, uv);

	vec2 texel = 1.0 / frxu_size;

  float weight = 0.0;
  vec4 col = vec4(0.0);

  float d = 1.0;
  vec2 samp = vec2(radius) / float(quality);

	mat2 ang = mat2(0.73736882209777832, -0.67549037933349609, 0.67549037933349609, 0.73736882209777832);


	for(int i = 0; i < quality * quality; i++) {
    d += 1.0 / d;
    samp *= ang;
    vec2 uv = uv + samp * (d - 1.0) * texel;
    vec3 currentNormal = texture(normal, uv).rgb;

    float w = 1.0 / max(0.01, d - 1.0);
    if(all(equal(currentNormal, centerNormal))) {
      weight += w;
      col += texture(image, uv) * w;
    } else {
      col += centerColor * w;
      weight += w;  
    }
	}
  return col / max(0.01, weight);
}
float shadowFilter(sampler2DArrayShadow shadowMap, vec3 shadowPos, int cascade, float radius, int samples) {
	vec2 texel = 1.0 / vec2(1024.0);

  float weight = 0.0;
  float shadowResult = 0.0;

  float d = 1.0;
  vec2 samp = vec2(radius) / samples;

	mat2 ang = mat2(.73736882209777832,-.67549037933349609,.67549037933349609,.73736882209777832);

	for(int i = 0;i<samples*samples;i++) {
    d += 1.0 / d;
    samp *= ang;

    float w = 1.0 / (d - 1.0);
    vec2 shadowUv = shadowPos.xy + samp * (d - 1.0) * texel;

		shadowResult += texture(shadowMap, vec4(shadowUv, cascade, shadowPos.z)) * w;
    weight += w;
	}
  return shadowResult / weight;//+hash1(c-r)/128.;
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
    float sat      = (1.0 - clamp(mx - mn, 0.0, 1.0)) * clamp(1.0 - mx, 0.0, 1.0) * frx_luminance(color) * 5.0;
    vec3 lightness = vec3((mn + mx) * 0.5);

    // Vibrance
    color = mix(color, mix(lightness, color, intensity), sat);
    // Negative vibrance
    color = mix(color, lightness, (1.0 - lightness) * (1.0 - intensity) * 0.5 * abs(intensity));
}
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Hash without Sine
// MIT License...
/* Copyright (c)2014 David Hoskins.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/

//----------------------------------------------------------------------------------------
//  1 out, 1 in...
float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

//----------------------------------------------------------------------------------------
//  1 out, 2 in...
float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

//----------------------------------------------------------------------------------------
//  1 out, 3 in...
float hash13(vec3 p3)
{
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

//----------------------------------------------------------------------------------------
//  2 out, 1 in...
vec2 hash21(float p)
{
	vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx+p3.yz)*p3.zy);

}

//----------------------------------------------------------------------------------------
///  2 out, 2 in...
vec2 hash22(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);

}

//----------------------------------------------------------------------------------------
///  2 out, 3 in...
vec2 hash23(vec3 p3)
{
	p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}

//----------------------------------------------------------------------------------------
//  3 out, 1 in...
vec3 hash31(float p)
{
   vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
   p3 += dot(p3, p3.yzx+33.33);
   return fract((p3.xxy+p3.yzz)*p3.zyx); 
}


//----------------------------------------------------------------------------------------
///  3 out, 2 in...
vec3 hash32(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy+p3.yzz)*p3.zyx);
}

//----------------------------------------------------------------------------------------
///  3 out, 3 in...
vec3 hash33(vec3 p3)
{
	p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yxx)*p3.zyx);

}

//----------------------------------------------------------------------------------------
// 4 out, 1 in...
vec4 hash41(float p)
{
	vec4 p4 = fract(vec4(p) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+33.33);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);
    
}

//----------------------------------------------------------------------------------------
// 4 out, 2 in...
vec4 hash42(vec2 p)
{
	vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+33.33);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);

}

//----------------------------------------------------------------------------------------
// 4 out, 3 in...
vec4 hash43(vec3 p)
{
	vec4 p4 = fract(vec4(p.xyzx)  * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+33.33);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

//----------------------------------------------------------------------------------------
// 4 out, 4 in...
vec4 hash44(vec4 p4)
{
	p4 = fract(p4  * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+33.33);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
// --------------------------------------------------------------------------------------------------------

#ifndef VERTEX_SHADER
// https://github.com/spiralhalo/CanvasTutorial/wiki/Chapter-4
// Helper function
vec3 shadowDist(int cascade, vec4 pos)
{
  vec4 c = frx_shadowCenter(cascade);
  return abs((c.xyz - pos.xyz) / c.w);
}

// Function for obtaining the cascade level
int selectShadowCascade(vec4 shadowViewSpacePos)
{
  vec3 d3 = shadowDist(3, shadowViewSpacePos);
  vec3 d2 = shadowDist(2, shadowViewSpacePos);
  vec3 d1 = shadowDist(1, shadowViewSpacePos);

  int cascade = 0;

  if (d3.x < 1.0 && d3.y < 1.0 && d3.z < 1.0) {
    cascade = 3;
  } else if (d2.x < 1.0 && d2.y < 1.0 && d2.z < 1.0) {
    cascade = 2;
  } else if (d1.x < 1.0 && d1.y < 1.0 && d1.z < 1.0) {
    cascade = 1;
  }

  return cascade;
}
#endif

// --------------------------------------------------------------------------------------------------------
// 3D Noise from Bálint#1673, slightly modified
// --------------------------------------------------------------------------------------------------------
float noise(vec3 p) {
    vec3 f = fract(p);
    p = floor(p);
    return mix(
        mix(
            mix(
                hash13(p + vec3(0, 0, 0)),
                hash13(p + vec3(0, 0, 1)),
                f.z
            ),
            mix(
                hash13(p + vec3(0, 1, 0)),
                hash13(p + vec3(0, 1, 1)),
                f.z
            ),
            f.y
        ),
        mix(
            mix(
                hash13(p + vec3(1, 0, 0)),
                hash13(p + vec3(1, 0, 1)),
                f.z
            ),
            mix(
                hash13(p + vec3(1, 1, 0)),
                hash13(p + vec3(1, 1, 1)),
                f.z
            ),
            f.y
        ),
        f.x
    );
}

float fbm(vec3 pos) {
    float val = 0.0;
    float weight = 0.5;
    float totalWeight = 0.0;
    float frequency = 0.1;
    for (int i = 0; i < 8; i++) {
        val += noise(pos * frequency) * weight;
        totalWeight += weight;
        weight /= 2.0;
        frequency *= 2.0;
    }
    return val / totalWeight;
}


// From LowellCamp#8190
const ivec2 interleave_vec = ivec2(1125928, 97931);
const float interleaved_z = 52.9829189;
const float fixed2float = 1.0 / exp2(24.0);
const int ref_fixed_point = int(exp2(24.0));

float interleaved_gradient(ivec2 seed, int t) {
    ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
    int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
    return fract(float(internal_modulus) * (fixed2float * interleaved_z));
}
#ifndef VERTEX_SHADER
float interleaved_gradient() {
    ivec2 seed = ivec2(gl_FragCoord.xy);
    int t = int(frx_renderFrames % 100u);
    ivec2 components = ivec2(seed + 5.588238 * t) * interleave_vec;
    int internal_modulus = (components.x + components.y) & (ref_fixed_point - 1);
    return fract(float(internal_modulus) * (fixed2float * interleaved_z));
}
#endif