#ifdef INCLUDE_SEASONS
     vec4 getSeasonFactors(out float time) {
          time = frx_worldDay + frx_worldTime;

          #if STARTING_SEASON == SEASON_SUMMER
               time += SEASON_LENGTH + TRANSITION_LENGTH;
          #elif STARTING_SEASON == SEASON_AUTUMN
               time += SEASON_LENGTH * 2.0 + TRANSITION_LENGTH * 2.0;
          #elif STARTING_SEASON == SEASON_WINTER
               time += SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 3.0;
          #endif

          time = mod(time, SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 4.0);

          float toSummer = smoothstep(SEASON_LENGTH, SEASON_LENGTH + TRANSITION_LENGTH, time);
          float toAutumn = smoothstep(SEASON_LENGTH * 2.0 + TRANSITION_LENGTH, SEASON_LENGTH * 2.0 + TRANSITION_LENGTH * 2.0, time);
          float toWinter = smoothstep(SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 2.0, SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 3.0, time);
          float toSpring = smoothstep(SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 3.0, SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 4.0, time);

          return vec4(toSummer, toAutumn, toWinter, toSpring);
     }
     vec4 getSeasonFactors() {
          float time; // Sometimes we just don't care about time
          return getSeasonFactors(time);
     }

     // Foliage and tree color depending on season.
     vec3 getSeasonColor(in vec3 vertexColor, in int isLeafBlock, vec3 worldCoord) {
          #ifdef SEASONS
               float time = 0.0;
               vec4 seasonFactors = getSeasonFactors(time);

               float toSummer = seasonFactors.x;
               float toAutumn = seasonFactors.y;
               float toWinter = seasonFactors.z;
               float toSpring = seasonFactors.w;

               #ifdef VARIED_TREE_COLOR
                    float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01));
               #else
                    float noise = 0.0;
               #endif
               
               float leaves = float(isLeafBlock);

               vertexColor = mix(vertexColor, vec3(1.000,0.592,0.837) * 2.0, leaves * noise);
               vec3 seasonColor = vertexColor;

               seasonColor = mix(seasonColor, vec3(0.9, 1.0, 0.4), toSummer); // summer
               seasonColor = mix(seasonColor, mix(vec3(1.000,0.666,0.346), mix(vec3(1.000,0.480,0.105), vec3(1.000,0.341,0.158) * 1.5, noise), leaves), toAutumn); // autumn
               seasonColor = mix(seasonColor, mix(vec3(0.828,1.000,0.844), vec3(1.000,0.874,0.912), leaves), toWinter); // winter
               seasonColor = mix(seasonColor, vertexColor, toSpring); // spring

               return seasonColor;
          #else
               return vertexColor;
          #endif
     }

     // Threshold for leaves to be discarded based on season.
     float getLeavesFallingThreshold(vec3 worldCoord) {
          #ifdef SEASONS
               float time = 0.0;
               vec4 seasonFactors = getSeasonFactors(time);

               float toSummer = seasonFactors.x;
               float toAutumn = seasonFactors.y;
               float toWinter = seasonFactors.z;
               float toSpring = seasonFactors.w;

               #ifdef VARIED_TREE_COLOR
                    float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01 + 1000.0));
               #else
                    float noise = 0.0;
               #endif

               float threshold = 2.0;
               threshold = mix(threshold, 2.0, toSummer); // summer
               threshold = mix(threshold, mix(0.95, 0.9, noise), toAutumn); // autumn
               threshold = mix(threshold, mix(0.5, 0.4, noise), toWinter); // winter
               threshold = mix(threshold, 2.0, toSpring); // spring

               return threshold;
          #else
               return 2.0;
          #endif
     }

     // Season-dependent fog factor. To be added onto original fog factor.
     float getSeasonFogFactor() {
          #ifdef SEASONS
               float time = 0.0;
               vec4 seasonFactors = getSeasonFactors(time);

               float toSummer = seasonFactors.x;
               float toAutumn = seasonFactors.y;
               float toWinter = seasonFactors.z;
               float toSpring = seasonFactors.w;

               float fog = 0.25;
               fog = mix(fog, 0.0, toSummer);   // summer
               fog = mix(fog, 0.25, toAutumn); // autumn
               fog = mix(fog, 0.75, toWinter); // winter
               fog = mix(fog, 0.25, toSpring); // spring

               return fog * (1.0 - sqrt(max(0.0001, getSunVector().y)));
          #else
               return 0.0;
          #endif
     }

     float getSeasonCloudsFactor() {
          #ifdef SEASONS
               float time = 0.0;
               vec4 seasonFactors = getSeasonFactors(time);

               float toSummer = seasonFactors.x;
               float toAutumn = seasonFactors.y;
               float toWinter = seasonFactors.z;
               float toSpring = seasonFactors.w;

               float lowerBound = 0.4;
               lowerBound = mix(lowerBound, 0.55, toSummer);   // summer
               lowerBound = mix(lowerBound, 0.35, toAutumn); // autumn
               lowerBound = mix(lowerBound, 0.20, toWinter); // winter
               lowerBound = mix(lowerBound, 0.40, toSpring); // spring

               return lowerBound;
          #else
               return 0.4;
          #endif
     }
#endif