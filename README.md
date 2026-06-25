# prova_project_IG

# Demo
https://sapienzainteractivegraphicscourse.github.io/final-project-camydog_igproject/
Sto aggiungendo la shadow map con 6 direzioni (?)

- Problema che se la luce è dietro alle pareti comunque si vede :c

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


# Sounds
From PixaBay

# Icons
From FlatIcon