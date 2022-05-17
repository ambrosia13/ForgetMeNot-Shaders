// For all my magic numbers :)
#ifdef BLOOM_MIX_FACTOR
    const vec3 SUN_COLOR = vec3(4.0, 3.8, 2.4) * 5.0;
    #ifdef DEPRESSING_MODE
        const vec3 MOON_COLOR = vec3(1.2, 2.9, 3.8) * 5.0;
    #else
        const vec3 MOON_COLOR = vec3(1.8, 2.4, 3.1) * 4.5;
    #endif
#else
    const vec3 SUN_COLOR = vec3(4.0, 3.2, 0.9);
    const vec3 MOON_COLOR = vec3(0.8, 2.8, 3.8);
#endif
