# prova_project_IG
<!-- Badge -->
[![Python](https://img.shields.io/badge/python-3.12.3-blue)](https://www.python.org/)
[![Camilla Giuliani on GitHub](https://img.shields.io/badge/Camilla–Giuliani–GitHub-181717?style=plastic&logo=github)](https://github.com/camygiuliani)

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

## Walk Mode


# Objects
-shiba
-cat
-teapot
-cloth (Cannon)
-moon model -> https://www.cgtrader.com/items/6369973/download-page
-moon texture  => from (google immaigni random)
- sun model => https://www.cgtrader.com/items/5092264/download-page
-sun texture (sphere) => from goggle immaigni random
-table -> Free 3D https://free3d.com/3d-model/tablle-396579.html?dd_referrer=
-ball
-heart
- music note
- sun model => CG trader -> https://www.cgtrader.com/items/5092264/download-page
- bench model => Buying model CG trader
- bench texture: model folder
- frisbee model => Buying model CG trader
- leaf model => https://www.cgtrader.com/free-3d-models/plant/leaf/tree-leaf
- firflies => createSphere mia funzione


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

nintendogs_icon: Google Images

shiba_icon: https://it.pinterest.com/pin/56295064084237515/

wave_hand_caress: https://www.flaticon.com/free-icon/wave_9606501?term=wave+hand&related_id=9606501

open_hand_frisbee: https://www.flaticon.com/free-icon/five-fingers_9971672?term=open+hand&related_id=9971672

hand_holding_frisbee: https://www.flaticon.com/free-icon/grab_1196462

mute_audio_off : https://www.flaticon.com/free-icon/mute_561228

auto moving sun: https://www.flaticon.com/free-icon/greenhouse_4772346

frisbee: https://www.flaticon.com/free-icon/frisbee_7601483?term=frisbee&page=1&position=23&origin=search&related_id=7601483

music_on: https://www.flaticon.com/free-icon/musical-note_2995101?term=music+notes&page=1&position=9&origin=search&related_id=2995101

music_off:  https://www.flaticon.com/free-icon/music-off_13407074?term=music+off&page=1&position=29&origin=search&related_id=13407074

ball: https://www.flaticon.com/free-icon/beach-ball_3012458?term=ball&page=1&position=8&origin=search&related_id=3012458

dog_water: https://www.flaticon.com/free-icon/dog-bowl_6004496?term=dog+bowl+water&page=1&position=7&origin=search&related_id=6004496

dog_food:   https://www.flaticon.com/free-icon/dog-food_8876508?term=bowl+dog&page=1&position=8&origin=search&related_id=8876508

sun : https://www.flaticon.com/free-icon/sun_10484062?term=sun&page=1&position=4&origin=search&related_id=10484062

moon :  https://www.flaticon.com/free-icon/full-moon_9689786?term=moon&page=1&position=4&origin=tag&related_id=9689786


yes_audio : https://www.flaticon.com/free-icon/volume_10628912?term=audio&related_id=10628912

teapot icon : 
https://www.flaticon.com/free-icon/teapot_491609?term=teapot&page=1&position=4&origin=search&related_id=491609


camera icon: https://www.flaticon.com/free-icon/cctv-camera_2642651?term=camera&page=1&position=23&origin=search&related_id=2642651

shiba icon :  https://www.flaticon.com/free-icon/dog_13163763?term=shiba+inu&page=4&position=41&origin=tag&related_id=13163763

paw icon :  https://www.flaticon.com/free-icon/paw_18548576?term=paw&page=4&position=90&origin=search&related_id=18548576