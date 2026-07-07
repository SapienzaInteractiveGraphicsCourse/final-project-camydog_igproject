# Pet Room
<!-- Badge -->

![JavaScript](https://img.shields.io/badge/JavaScript-ES6-f4a7b9?style=plastic&logo=javascript&logoColor=white&labelColor=555555)
![WebGL](https://img.shields.io/badge/WebGL-1.0-f4a7b9?style=plastic&logo=webgl&logoColor=white&labelColor=555555)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-f4a7b9?style=plastic&logo=html5&logoColor=white&labelColor=555555)
![CSS3](https://img.shields.io/badge/CSS3-UI%20Design-f4a7b9?style=plastic&logo=css3&logoColor=white&labelColor=555555)
![Cannon.js](https://img.shields.io/badge/Cannon.js-Physics-f4a7b9?style=plastic&logoColor=white&labelColor=555555)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-f4a7b9?style=plastic&logo=githubpages&logoColor=white&labelColor=555555)
![GitHub](https://img.shields.io/badge/GitHub-Camilla--Giuliani--GitHub-f4a7b9?style=plastic&logo=github&logoColor=white&labelColor=555555)
# Demo
https://sapienzainteractivegraphicscourse.github.io/final-project-camydog_igproject/
Sto aggiungendo la shadow map con 6 direzioni (?)
## Compatibility
 ✅OK Chrome with GPU acceleration
 
 ⚠️Slow with FirefoxChrome  without acceleration


- Problem: light behind walls still visible :c

# Slides for exam
https://canva.link/6hl5piamvf281bk

# Manuale (???????)

Funzioni complicate 

function drawObject(obj,
     texture,
      modelMatrix,
       viewMatrix,
        projectionMatrix,
    useTexture = true,
     isLightMarker=false,
     twoSided = false, 
     receiveShadow = true,
     wallShadowMode=false,
    isSunHalo = false,
    globalAlpha = 1.0,
    ) 
# Main functions
init()
render()
initShadowMap(?)()

# La luce
La mia luce ora è una point light, quindi illumina in tutte le direzioni partendo dalla sfera gialla.

Non è una luce “a freccia” che va solo lungo una linea.

        \  |  /
      --- luce ---
        /  |  \

# Shadow Mapping
6 direzioni
ciclo in Shadow Pass in render()

# Animations -- Cannon used

## Ball Animation -- (Cannon)
Comandi nell'HTML
velocitaà - vel angolare ecc
shaodw mapping 
-table collision detection


## Cloth finestra
Ok messo con Cannon... ci sta l'ombra da sistemare ma mi sempre carino

# FPS indicazione sopra canvas
FPS shown on the canvas

# Night/Day mode


# Rigged Dog

[Mermaid live link for graph](https://mermaid.live/edit#pako:eNqdl2tv2jAUhv-KZalSK1GaKwU-TEpDNrIFUiWZJnWZIou4NGpI0FnYrep_n2EKBGI7rHwBx-9zfHxe28EveFGmFI_xEsj6CUWTGOICsc_FBbqzbHfuoxsU-H6ELgOSZguKUpqjFWPyvLyqxVvB5dcYfynzx2TbCKcfiwpd3pFFVpQ3QVlWVzH-doWur9-hnShcZwVNFHUnbIY5SPJkmhWpR5fsey3RwZm6iGQ5GzFRtL2oMdnw3p1baOIHoeU59fN2qq0ZaEcjtntagC4EdD5gCAGDC0TlmjfBiRtYM-vB9ecOsn3P85HDJm153NnWMQ6x53TxfOqXFMgTOyc_skVOd0X_DxJEZGM29QwiJ4yso6jNRPnpJ4qi1ou1-bzPnrNVenY0jvXNjhN505atvs0Jil4_bqVddwjz7g6oiQJqbwyoiwLqbwxoiAIaZwbME4eAaAkKGHgDM6UkTT6Sn7zVOrNC2_E8iy1Yz51_-Hy8Yo_IdkCnSNtJCJioLJYbenLK7aFWLxfUpaAuBg3e1P3Ase2pe3zInHrCc4uTPwgx4GCNJB6s2b2FrHnkBC5LCIXu3A2jwDpJinPsdJxnzT3JFfD2ZudA76EsKt4LTdTPhT8VlErpvYCLW8VzLucPCm6AO5LnUn4v4OJRSc-xcuK0jAR5faHLSDjXyM6B5EaCzEjoMhKkRkKnkSA3ErqMBKmRcKaR937YsSlP_9zx_iBuC6Dy1lpbIMK1LlwT4sKd0hbwcNE-afXz4HOLy90m4tJCV2lBWlroKi1ISwtdpQVpaaGjtCArLXSV1vYnx3U8uVdwLhy8N-pxHwcyJJAhgsxdB-6x61yW4nEFG9rDKworsm3il22wGFdPdEVjPGY_U_pINnkV47h4ZdiaFA9luapJKDfLJzx-JPl31tqsU1LRSUbYXfEgoUVKwS43bNixqiijXRA8fsG_8PjaUPqmpqraaKAMVdPQe_g3U5lKnzWMkanpI828Hb728J_dqEp_NBrcDvXBSB2Y-tDUtB6maVaVMPt3S91dVl__AuV5xks)

## Walk Mode


# 3D Model Sources

## Procedurally Generated & Physics
-firflies => createSphere mia funzione
-cloth (Cannon)

## Third-Party 3D Models

- **CGTrader**: [Kishu Inu Japan Dog (6$)](https://www.cgtrader.com/3d-models/animal/mammal/kishu-inu-japan-dog-breed), 
[Grass patch(3$)](https://www.cgtrader.com/3d-models/plant/grass/photorealistic-grass-with-patch-generator-and-animatio), 
[Moon ](https://www.cgtrader.com/items/6369973/download-page), 
[Sun1](https://www.cgtrader.com/items/5092264/download-page), 
[Sun2](https://www.cgtrader.com/items/5092264/download-page), 
[Frisbee(2.5$)](https://www.cgtrader.com/3d-models/sports/toy/flat-disc-frisbee),
[Leaf](https://www.cgtrader.com/free-3d-models/plant/leaf/tree-leaf), 
[Bench](https://www.cgtrader.com/free-3d-models/exterior/street-exterior/park-bench-modern-outdoor-bench-long-seat), 
[Music Note](https://www.cgtrader.com/free-3d-models/various/various-models/music-note-33d9edfd57a7bc1b72f2d9dedbea46e5).

- **Free3D**: [Ball](https://free3d.com/it/3d-model/beach-ball-v2--259926.html), 
[Table](https://free3d.com/3d-model/tablle-396579.html?dd_referrer=), 
[Heart](https://free3d.com/3d-model/heart-v1--539992.html).


- **Interactive Graphics Course**: Teapot


# Textures references

- dog Kishu Inu: model folder
-ball: model folder
- moon: googles images
- bench : model folder 
- table : model folder
-sun texture: google images
- grass_patch: model folder
- fireflies : generated color
- frisbee : generated color
-music note: generated color

# Sounds references
Everyone comes from PixaBay

Water:
Jingle toy:
Caress:
Background_home:
Background_park_night:
Background_park_day:
Kibbles:


# Icons references
From **FlatIcon**

* [Shiba Icon (Pinterest)](https://it.pinterest.com/pin/56295064084237515/)
* [Settings](https://www.flaticon.com/free-icon/setting_2040510?term=settings&page=1&position=58&origin=search&related_id=2040510)
* [Call Dog Hand](https://www.flaticon.com/free-icon/open-hand_889822)
* [Wave Hand / Caress](https://www.flaticon.com/free-icon/wave_9606501?term=wave+hand&related_id=9606501)
* [Open Hand Frisbee](https://www.flaticon.com/free-icon/five-fingers_9971672?term=open+hand&related_id=9971672)
* [Hand Holding Frisbee](https://www.flaticon.com/free-icon/grab_1196462)
* [Mute / Audio Off](https://www.flaticon.com/free-icon/mute_561228)
* [Auto Moving Sun](https://www.flaticon.com/free-icon/greenhouse_4772346)
* [Frisbee](https://www.flaticon.com/free-icon/frisbee_7601483?term=frisbee&page=1&position=23&origin=search&related_id=7601483)
* [Music On](https://www.flaticon.com/free-icon/musical-note_2995101?term=music+notes&page=1&position=9&origin=search&related_id=2995101)
* [Music Off](https://www.flaticon.com/free-icon/music-off_13407074?term=music+off&page=1&position=29&origin=search&related_id=13407074)
* [Ball](https://www.flaticon.com/free-icon/beach-ball_3012458?term=ball&page=1&position=8&origin=search&related_id=3012458)
* [Dog Water Bowl](https://www.flaticon.com/free-icon/dog-bowl_6004496?term=dog+bowl+water&page=1&position=7&origin=search&related_id=6004496)
* [Dog Food Bowl](https://www.flaticon.com/free-icon/dog-food_8876508?term=bowl+dog&page=1&position=8&origin=search&related_id=8876508)
* [Sun](https://www.flaticon.com/free-icon/sun_10484062?term=sun&page=1&position=4&origin=search&related_id=10484062)
* [Moon](https://www.flaticon.com/free-icon/full-moon_9689786?term=moon&page=1&position=4&origin=tag&related_id=9689786)
* [Audio On](https://www.flaticon.com/free-icon/volume_10628912?term=audio&related_id=10628912)
* [Teapot Icon](https://www.flaticon.com/free-icon/teapot_491609?term=teapot&page=1&position=4&origin=search&related_id=491609)
* [Camera Icon](https://www.flaticon.com/free-icon/cctv-camera_2642651?term=camera&page=1&position=23&origin=search&related_id=2642651)
* [Shiba Icon (Flaticon)](https://www.flaticon.com/free-icon/dog_13163763?term=shiba+inu&page=4&position=41&origin=tag&related_id=13163763)
* [Paw Icon](https://www.flaticon.com/free-icon/paw_18548576?term=paw&page=4&position=90&origin=search&related_id=18548576)