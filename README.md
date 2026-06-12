# prova_project_IG

# Demo
https://sapienzainteractivegraphicscourse.github.io/final-project-camydog_igproject/
Sto aggiungendo la shadow map con 6 direzioni (?)

- Problema che se la luce è dietro alle pareti comunque si vede :c


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
     wallShadowMode
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
