# prova_project_IG

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
     receiveShadow = true) 


# La luce
La mia luce ora è una point light, quindi illumina in tutte le direzioni partendo dalla sfera gialla.

Non è una luce “a freccia” che va solo lungo una linea.

        \  |  /
      --- luce ---
        /  |  \