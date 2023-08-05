Hi! If you're reading this, you might be confused about the structure of my includes. Or you could be future me irritated that my pipeline  structure is so seemingly random. Either one of the two. 

Here's an explanation:
- "material_program" refers to the Canvas material program that is  responsible for rendering the world.
- "fabulous" refers to images, framebuffers, programs, and passes that relate to the `fabulous` rendering stage in Canvas.
- "post" refers to images, framebuffers, programs, and passes that relate to the `afterRenderHand` rendering stage in Canvas.
- "oninit" refers to images, framebuffers, programs, and passes that relate to the `onInit` and `onResize` rendering stages in Canvas.
	- The exception is in `passes/clear_passes.json5`, which exclusively has all the passes that are responsible for clearing images, regardless of the rendering stage.
- "beforerender" refers to images, framebuffers, programs, and passes that relate to the `beforeWorldRender` rendering stage in Canvas. As mentioned above, this doesn't include clearing images.

Conventions:
- Image, framebuffer, program names should all be in snake_case.
- Texture sampler names should correspond to the image they point to, prefixed by "u_" (and needless to say should be snake_case)