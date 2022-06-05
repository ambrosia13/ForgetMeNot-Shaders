# Forget-Me-Not Shaders

Immersive and atmospheric shaderpack for Canvas. 

Icon by [jahan](https://www.instagram.com/jahan.artt/), go check out their other amazing works!

## how to use
1. Install [Fabric](https://fabricmc.net/) and get some cool mods that you like
2. Get Canvas Renderer mod through either [GitHub](https://github.com/vram-guild/canvas/releases) (unstable builds) or [Curseforge](https://www.curseforge.com/minecraft/mc-mods/canvas-renderer) (stable builds). Keep in mind that Canvas is not compatible with Sodium, Iris, or Optifabric.
3. Launch your game, put Forget-me-not into your resource packs folder and activate the resource pack.
4. Activate your preferred pipeline shaderpack in `Options / Video Settings / Canvas / Pipeline Options / Pipelines`

## before you ask...
- Experiencing shadow flickering? It's being worked on. In the meantime, try to turn your render distance down to 8. Lower render distance has less chance of shadow flickering/disappearance.
- Water broken on AMD/Intel? I'm working on fixing this, but you can try turning on fast water to hopefully fix it.
- Want your normal enchantment glint back? Turn off `Pixel Locked Enchantment Glint` option in settings.

## cool features
- bloom, tone mapping, and HDR shader effects
- overhauled sky & fog visuals
- custom 2D clouds with proper shading
- water waves & terrain reflections
- shadows (wip) & volumetric light rays (very wip)
- screen space global illumination (disabled by default)

## credits
-  [Blur function](https://github.com/Jam3/glsl-fast-gaussian-blur) used for bloom
- Global illumination filter adapted from [Xordev's blur function](https://github.com/XorDev/Ominous-Shaderpack/blob/main/shaders/lib/Blur.inc)
- Contrast and vibrance post processing function from Belmu#4066 in the [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849)
- SixthSurge#3922 for helping me with curl noise used for clouds
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help

## discord
https://discord.gg/Zzn4jJapRH

## screenshots
![a](https://media.discordapp.net/attachments/286649185468678144/974029571299098724/unknown.png?width=1276&height=676)
![a](https://cdn.discordapp.com/attachments/734161464184799296/961154329191010314/unknown.png)
![a](https://cdn.discordapp.com/attachments/734161464184799296/968210355715190804/unknown.png)
![a](https://media.discordapp.net/attachments/968943385803108424/974033201217548388/unknown.png?width=1276&height=676)
![a](https://cdn.discordapp.com/attachments/766910398108532737/981453894272057386/unknown.png)