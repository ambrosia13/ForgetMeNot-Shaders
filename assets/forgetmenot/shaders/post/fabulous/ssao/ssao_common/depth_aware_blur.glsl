// Adapted blur function from https://github.com/Jam3/glsl-fast-gaussian-blur.
vec4 depthAwareBlur(sampler2D image, sampler2D depth, vec2 uv, const vec2 direction) {
	vec4 color = vec4(0.0);
	const vec2 off1 = vec2(1.3846153846) * direction;
	const vec2 off2 = vec2(3.2307692308) * direction;

	float centerDepth = linearizeDepth(textureLod(depth, uv, 0).r);
	vec4 centerColor = texture(image, uv * 0.5);

	color += centerColor * 0.2270270270;

	vec2 uv1 = uv + off1 / frxu_size;
	vec2 uv2 = uv - off1 / frxu_size;
	vec2 uv3 = uv + off2 / frxu_size;
	vec2 uv4 = uv - off2 / frxu_size;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv1, 0).r)) < 0.075 && clamp(uv1, 0.0, 1.0) == uv1) color += texture(image, uv1 * 0.5) * 0.3162162162;
	else color += centerColor * 0.3162162162;
	
	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv2, 0).r)) < 0.075 && clamp(uv2, 0.0, 1.0) == uv2) color += texture(image, uv2 * 0.5) * 0.3162162162;
	else color += centerColor * 0.3162162162;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv3, 0).r)) < 0.075 && clamp(uv3, 0.0, 1.0) == uv3) color += texture(image, uv3 * 0.5) * 0.0702702703;
	else color += centerColor * 0.0702702703;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv4, 0).r)) < 0.075 && clamp(uv4, 0.0, 1.0) == uv4) color += texture(image, uv4 * 0.5) * 0.0702702703;
	else color += centerColor * 0.0702702703;
	
	return color;
}