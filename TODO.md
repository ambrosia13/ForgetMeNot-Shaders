# TO DO

- in sort.frag: split off into separate passes, e.g. refract, water fog, etc. (perhaps split into "presort", "sort", "postsort")
- in a pre-sort pass, merge the depth textures into a rgba32f texture since the sort pass has 12 bound textures which may be too much for some machines
  - can only merge 4 depths into one image at full precision, so choose the most essential:
    - solid
    - translucent
    - entity
    - particles
  - the others, weather and clouds, can be revisited later but for now just kept as they are now
- revisit material data packing system, there's definitely a better way to do it
- revisit sky and clouds implementation, make code less horrible
- revisit the way we handle cursed things like global variables, exposure/atmosphere profiles, FMN PBR, etc.
- revisit the material shader PBR system, perhaps remove entirely? TBD
- rework automatic exposure, perhaps if compute shaders are added to can-pipe we can replace with histogram exposure
- rework post-processing pipeline, add back motion blur, consider adding depth of field, for a more detailed camera emulation

# FINISHED:

- reorganize the pipeline system to group by feature rather than object type (why did I do that in the first place?)
  - list of "features":
    - smooth uniforms
    - shadows
    - sky preprocessing + atmosphere implementation + skybox + sky display
    - hi-z downsample
    - pre-sort, sort, and post-sort programs
    - material program (gbuffer, etc.)
    - taa
    - bloom
    - exposure meter
    - final

