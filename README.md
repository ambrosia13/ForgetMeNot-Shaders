# Forget-Me-Not Shaders

Immersive semi-realistic pipeline shader for Canvas. Early in development.

**Shaders are bundled in a resource pack, please don't extract! This won't work for Optifine, Iris, or Sodium! You need Canvas! See `how to use` section for instructions.**

**For now, only works with Nvidia and AMD Mesa graphics.**

Icon by [jahan](https://www.instagram.com/jahan.artt/), go check out their other amazing works!

## how to use
1. Be sure you're on 1.18.2 or above. I can only offer support for the MC versions that Canvas actively supports.
2. Install [Fabric](https://fabricmc.net/) and get some cool mods that you like
3. Get Canvas Renderer mod through either [GitHub](https://github.com/vram-guild/canvas/releases) (unstable builds) or [Modrinth](https://modrinth.com/mod/canvas) (stable builds). **Keep in mind that Canvas does not work with Sodium, Iris, OptiFine, or OptiFabric.**
4. Download Forget-me-not, either via the [releases tab](https://github.com/Poisoned-Honey/ForgetMeNot-Shaders/releases) or the green `Code` button on this GitHub page.
5. Launch your game, put Forget-me-not into your resource packs folder and activate the resource pack.
6. Activate Forget-me-not in `Options / Video Settings / Canvas / Pipeline Options / Pipelines`

## troubleshooting
- Experiencing shadow flickering? In `Options / Video Settings / Canvas / Debug`, set `Shadow Priming Strategy` to `TIERED` and `Disable Shadow Self-Occlusion` to true.

- Shaders not compiling, and it's not an issue exclusive to Forget-me-not? First, check if everything works in Canvas Basic. Next, try Canvas Standard. If the former works and the latter doesn't, chances are that your machine is incompatible with Fabulous Graphics, which most Canvas pipelines use. Unfortunately, there's no fix for this.

- Forget-me-not breaks, but all other pipelines work alright? Please grab your log in `.minecraft/logs/latest.log` and all contents of the `.minecraft/canvas_shader_debug/` folder. Additionally, a screenshot of the game with the F3 menu opened would really help. Once you have these, please either open a GitHub issue or let me know about it on Discord.

## cool features
- HDR, bloom, and tone mapping
- dramatic skies with atmospheric scattering, custom clouds, and crepuscular rays
- water waves and reflections, as well as PBR support
- contact-hardening shadows
- advanced temporal anti-aliasing (TAA)

## credits
- Normal and depth aware blur adapted from [Xordev's blur](https://github.com/XorDev/Ominous-Shaderpack/blob/main/shaders/lib/Blur.inc)
- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help, and also references for a working TAA implementation

<!-- ## discord
https://discord.gg/Zzn4jJapRH -->

## screenshots
![a](https://cdn.discordapp.com/attachments/903175815401975889/1010347020961189929/unknown.png)
![a](https://cdn.discordapp.com/attachments/839653070622818337/1003153222938148904/unknown.png)
![a](https://cdn.discordapp.com/attachments/736930818835873813/1003347482014654524/unknown.png)
![a](https://cdn.discordapp.com/attachments/839653070622818337/1003169821766209606/unknown.png)
![a](https://media.discordapp.net/attachments/903175815401975889/1003170619136938034/unknown.png?width=1276&height=676)