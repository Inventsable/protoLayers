# protoLayers

Revamp of [mightyLayers](https://github.com/Inventsable/mightyLayers) while absorbing [Scribe](https://github.com/Inventsable/scribe) functions, this will be a replica of the native Layers panel with added functionality like keyboard navigation.

---

## Real-time activeLayer and selection detection:

![](https://thumbs.gfycat.com/DecentTemptingAlligatorgar-size_restricted.gif)

## Rename layers in real-time and Tab through them:

![](https://thumbs.gfycat.com/WaryUnpleasantAnchovy-size_restricted.gif)

---

## Install

Use [ZXPInstaller](https://zxpinstaller.com/) (or any alternative) with the [latest ZXP build here](https://github.com/Inventsable/protoLayers/blob/master/_builds/protoLayers1.00.zxp).

``` bash
# Or CEP dev:
# .../AppData/Roaming/Adobe/CEP/extensions
git clone https://github.com/Inventsable/protoLayers.git
```

---

## To-do:

* ~~Basic UI~~
* ~~Basic backend for recursive layer crawling~~
* ~~Selection logic~~
* ~~Replicate bottom toolbar~~
* ~~Easily rename in bulk with `Tab`~~
* ~~Active Layer logic~~
* ~~Multiple scanners to prompt new crawl for panel update: selection, layer number, pageItem number, activeLayer~~
* ~~Easily rename layers~~
* Inject `pageItem.typename` into input if name is fully deleted
* ~~Sorting/click/drag logic~~
* Generate preview boxes for each layer/sublayer
* ~~Easily traverse layers or select multiple with `Arrow Up/Down`~~
* ~~Easily traverse inside/fold/unfold layer with `Arrow Right/Left`~~
* Dynamic context menu to replace the busy vanilla Flyout menu
* Automatic stripping of `' copy'` from layer names
* Subtle bodymovin' animations for all icons (vanilla Layers panel has animated arrows)
* Select Label Group function like After Effects
* Optional `Object` icon before layer name to display type similar to After Effects' handling of Shape and Text layers
* UI : ~~Vanilla Theme~~ / Future Theme