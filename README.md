# Forget-Me-Not Shaders

Immersive semi-realistic pipeline shader for Canvas. Early in development, visual style is not finalized and things will change a lot.

Icon by [jahan](https://www.instagram.com/jahan.artt/), go check out their other amazing works!

## how to use
1. Be sure you're on 1.18.2 or above. I can only offer support for the MC versions that Canvas supports.
2. Install [Fabric](https://fabricmc.net/) and get some cool mods that you like
3. Get Canvas Renderer mod through either [GitHub](https://github.com/vram-guild/canvas/releases) (unstable builds) or [Curseforge](https://www.curseforge.com/minecraft/mc-mods/canvas-renderer) (stable builds). **Keep in mind that Canvas is not compatible with Sodium, Iris, or Optifine/Optifabric**.
4. Download Forget-me-not, either via the [releases tab](https://github.com/Poisoned-Honey/ForgetMeNot-Shaders/releases) or the green `Code` button on this GitHub page.
5. Launch your game, put Forget-me-not into your resource packs folder and activate the resource pack.
6. Activate your preferred pipeline shaderpack in `Options / Video Settings / Canvas / Pipeline Options / Pipelines`

## troubleshooting
- Experiencing shadow flickering? It's being worked on. In the meantime, set shadow culling mode to `TIERED` in `Options / Video Settings / Canvas / Debug`. Mountains may not cast shadows properly as of now.

- Shaders not compiling, and it's not an issue exclusive to Forget-me-not? First, check if everything works in Canvas Basic. Next, try Canvas Standard. If the former works and the latter doesn't, chances are that your machine is incompatible with Fabulous Graphics, which most Canvas pipelines use. Unfortunately, there's no fix for this.

- Forget-me-not not working, but the other pipelines work alright? Please grab your log in `.minecraft/logs/latest.log` and all contents of the `.minecraft/canvas_shader_debug/` folder. Additionally, a screenhot of the game with the F3 menu open would help. Once you have these, please either open a GitHub issue or let me know about it on my discord (whose link is at the bottom of the page).

## cool features
- bloom, tone mapping, and HDR shader effects
- custom atmosphere, including atmospheric fog, semi-realistic skies, and properly shaded clouds
- water waves & reflections
- shadows & advanced ambient light (RTAO)
- TAA that removes almost all noise and aliasing

## credits
-  [Blur function](https://github.com/Jam3/glsl-fast-gaussian-blur) used for bloom
- Global illumination filter adapted from [Xordev's blur function](https://github.com/XorDev/Ominous-Shaderpack/blob/main/shaders/lib/Blur.inc)
- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help, and also references for a working TAA implementation

## discord
https://discord.gg/Zzn4jJapRH

## screenshots
![a](https://cdn.discordapp.com/attachments/734161464184799296/1003051783909802015/unknown.png)
![a](https://cdn.discordapp.com/attachments/839653070622818337/1003153222938148904/unknown.png)
![a](https://cdn.discordapp.com/attachments/736930818835873813/1003347482014654524/unknown.png)
![a](https://cdn.discordapp.com/attachments/839653070622818337/1003169821766209606/unknown.png)
![a](https://media.discordapp.net/attachments/903175815401975889/1003170619136938034/unknown.png?width=1276&height=676)