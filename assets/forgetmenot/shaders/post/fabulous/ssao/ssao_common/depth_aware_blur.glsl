// Adapted blur function from https://github.com/Jam3/glsl-fast-gaussian-blur.
vec4 depthAwareBlur(sampler2D image, sampler2D depth, vec2 uv, const vec2 direction) {
	vec4 color = vec4(0.0);
	const vec2 off1 = vec2(1.3846153846) * direction;
	const vec2 off2 = vec2(3.2307692308) * direction;

	float centerDepth = linearizeDepth(textureLod(depth, uv, 0).r);
	vec4 centerColor = texture(image, uv * 0.5);

	color += centerColor * 0.2270270270;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv + off1 / frxu_size, 0).r)) < 0.075) color += texture(image, (uv + off1 / frxu_size) * 0.5) * 0.3162162162;
	else color += centerColor * 0.3162162162;
	
	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv - off1 / frxu_size, 0).r)) < 0.075) color += texture(image, (uv - off1 / frxu_size) * 0.5) * 0.3162162162;
	else color += centerColor * 0.3162162162;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv + off2 / frxu_size, 0).r)) < 0.075) color += texture(image, (uv + off2 / frxu_size) * 0.5) * 0.0702702703;
	else color += centerColor * 0.0702702703;

	if(abs(centerDepth - linearizeDepth(textureLod(depth, uv - off2 / frxu_size, 0).r)) < 0.075) color += texture(image, (uv - off2 / frxu_size) * 0.5) * 0.0702702703;
	else color += centerColor * 0.0702702703;
	
	return color;
}