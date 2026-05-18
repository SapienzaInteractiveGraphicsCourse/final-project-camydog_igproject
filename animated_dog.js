var dogBodyPartBuffers = null;
var dogHeadPartBuffers = null;
var dogTailPartBuffers = null;

var dogEarRightBuffers = null;
var dogEarLeftBuffers = null;

var dogLegFrontRightBuffers = null;
var dogLegBackRightBuffers = null;
var dogLegFrontLeftBuffers = null;
var dogLegBackLeftBuffers = null;


// walking animation parameters
var separatedDogLoaded = false;

var separatedDogWalkEnabled = true;

var separatedDogBaseX = -2.4;
var separatedDogBaseY = -2.5;
var separatedDogBaseZ = 1.5;

var separatedDogScale = 2.0;


async function loadDogPartOBJ(gl, url) {
    const response = await fetch(url);
    const text = await response.text();

    const lines = text.split("\n");

    var vertices = [];
    var texCoords = [];
    var faces = [];

    // 1. Parse OBJ
    for (let line of lines) {
        line = line.trim();

        if (!line || line.startsWith("#")) continue;

        let parts = line.split(/\s+/);

        if (parts[0] === "v") {
            let x = parseFloat(parts[1]);
            let y = parseFloat(parts[2]);
            let z = parseFloat(parts[3]);

            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                vertices.push(vec3(x, y, z));
            }
        }

        else if (parts[0] === "vt") {
            let u = parseFloat(parts[1]);
            let v = parseFloat(parts[2]);

            if (!isNaN(u) && !isNaN(v)) {
                texCoords.push(vec2(u, v));
            }
        }

        else if (parts[0] === "f") {
            let face = [];

            for (let i = 1; i < parts.length; i++) {
                let vals = parts[i].split("/");

                let vIndex = parseInt(vals[0]) - 1;
                let vtIndex = vals[1] ? parseInt(vals[1]) - 1 : -1;

                face.push({
                    v: vIndex,
                    vt: vtIndex
                });
            }

            // triangolazione a ventaglio
            for (let i = 1; i < face.length - 1; i++) {
                faces.push([face[0], face[i], face[i + 1]]);
            }
        }
    }

    var min = [Infinity, Infinity, Infinity];
    var max = [-Infinity, -Infinity, -Infinity];

    for (let v of vertices) {
        for (let i = 0; i < 3; i++) {
            if (v[i] < min[i]) min[i] = v[i];
            if (v[i] > max[i]) max[i] = v[i];
        }
    }

    // IMPORTANTE:
    // Qui NON facciamo center/scale.
    // I pezzi del cane devono mantenere le coordinate originali di Blender.

    // 2. Calcolo smooth normals
    var vertexNormals = [];

    for (let i = 0; i < vertices.length; i++) {
        vertexNormals.push(vec3(0.0, 0.0, 0.0));
    }

    for (let f of faces) {
        let a = vertices[f[0].v];
        let b = vertices[f[1].v];
        let c = vertices[f[2].v];

        let edge1 = subtract(b, a);
        let edge2 = subtract(c, a);

        let faceNormal = cross(edge1, edge2);

        vertexNormals[f[0].v] = add(vertexNormals[f[0].v], faceNormal);
        vertexNormals[f[1].v] = add(vertexNormals[f[1].v], faceNormal);
        vertexNormals[f[2].v] = add(vertexNormals[f[2].v], faceNormal);
    }

    for (let i = 0; i < vertexNormals.length; i++) {
        let n = normalize(vertexNormals[i]);
        vertexNormals[i] = vec3(n[0], n[1], n[2]);
    }

    // 3. Array finali locali
    var dogPointsArray = [];
    var dogNormalsArray = [];
    var dogTexCoordsArray = [];

    for (let f of faces) {
        for (let k = 0; k < 3; k++) {
            let vIdx = f[k].v;
            let vtIdx = f[k].vt;

            let v = vertices[vIdx];
            let n = vertexNormals[vIdx];

            dogPointsArray.push(vec4(v[0], v[1], v[2], 1.0));
            dogNormalsArray.push(vec4(n[0], n[1], n[2], 0.0));

            if (vtIdx >= 0 && texCoords[vtIdx]) {
                dogTexCoordsArray.push(vec2(
                    texCoords[vtIdx][0],
                    texCoords[vtIdx][1]
                ));
            } else {
                dogTexCoordsArray.push(vec2(0.0, 0.0));
            }
        }
    }

    return createDogPartBuffers(
        gl,
        dogPointsArray,
        dogNormalsArray,
        dogTexCoordsArray,
        min,
        max
    );
}

function createDogPartBuffers(gl, points, normals, texCoords, min, max) {
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    return {
        vBuffer: vBuffer,
        nBuffer: nBuffer,
        tBuffer: tBuffer,
        numVertices: points.length,
        bounds: {
            min: min,
            max: max
        }
    };
}

//function to take pivot of dog legs, to make them rotate correctly
function getLegPivot(legBuffers) {
    var min = legBuffers.bounds.min;
    var max = legBuffers.bounds.max;

    return {
        x: (min[0] + max[0]) / 2.0,
        y: max[1],              // parte alta della zampa
        z: (min[2] + max[2]) / 2.0
    };
}

async function loadSeparatedDogParts(gl) {

    dogBodyPartBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "body_dog.obj"
    );

    dogHeadPartBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "testa_collo_dog.obj"
    );

    dogTailPartBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "coda_dog.obj"
    );

    dogEarRightBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "orecchio_dx_dog.obj"
    );

    dogEarLeftBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "orecchio_sx_dog.obj"
    );

    dogLegFrontRightBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "zampa_dx_av_dog.obj"
    );

    dogLegBackRightBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "zampa_dx_die_dog.obj"
    );

    dogLegFrontLeftBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "zampa_sx_av_dog.obj"
    );

    dogLegBackLeftBuffers = await loadDogPartOBJ(
        gl,
        pathFolderRiggedDog + "zampa_sx_die_dog.obj"
    );

    separatedDogLoaded = true;

    console.log("Separated dog parts loaded");
}

function drawSeparatedDog_old(viewMatrix, projectionMatrix, time) {
    if (!separatedDogLoaded) return;

    var baseMatrix = mat4();

    baseMatrix = mult(baseMatrix, translate(-3.0, -2.5, 0.8));
    baseMatrix = mult(baseMatrix, rotate(0.0, [0, 1, 0]));
    baseMatrix = mult(baseMatrix, scalem(2.0, 2.0, 2.0));

    drawObject(
        dogBodyPartBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        false,
        false,
        true,
        true,
        0
    );

    drawObject(dogHeadPartBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
    drawObject(dogTailPartBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);

    drawObject(dogEarRightBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
    drawObject(dogEarLeftBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);

    drawObject(dogLegFrontRightBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
    drawObject(dogLegBackRightBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
    drawObject(dogLegFrontLeftBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
    drawObject(dogLegBackLeftBuffers, dogTexture, baseMatrix, viewMatrix, projectionMatrix, false, false, true, true, 0);
}

//function to 

var legA = 0.0;
var legB = 0.0;

function drawSeparatedDogLeg(
                    legBuffers,
                    baseMatrix,
                    viewMatrix,
                    projectionMatrix,
                    legAngle) {

    var pivot = getLegPivot(legBuffers);
    var m = baseMatrix;

    /*
        Per ruotare attorno alla spalla/anca:

        1. mi sposto sul pivot della zampa
        2. ruoto
        3. torno indietro
        4. disegno la mesh della zampa
    */

    m = mult(m, translate(pivot.x, pivot.y, pivot.z));

    // Movimento avanti/indietro della zampa.
    // Se viene laterale o strano, cambia asse sotto.
    m = mult(m, rotate(legAngle, [1, 0, 0]));

    m = mult(m, translate(-pivot.x, -pivot.y, -pivot.z));

    drawObject(
        legBuffers,
        dogTexture,      // se non vuoi texture, metti null
        m,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );
}


function drawSeparatedDog(viewMatrix, projectionMatrix, time) {
    if (!separatedDogLoaded) return;

    var t = time * 0.001;

    /*
        Movimento globale avanti/indietro:
        il cane si sposta di 1 metro lungo Z.
    */
    var walkOffset = 0.0;
    var dogAngle = 0.0;

    if (separatedDogWalkEnabled) {
        walkOffset = Math.sin(t) * 1.0;

        // Quando torna indietro, lo giriamo di 180 gradi.
        var direction = Math.cos(t);

        if (direction >= 0.0) {
            dogAngle = 0.0;
        } else {
            dogAngle = 180.0;
        }
    }

    /*
        Oscillazione zampe.
        legA e legB sono opposti: mentre una coppia va avanti,
        l'altra va indietro.
    */
    var walkPhase = t * 6.0;

    var legA = 0.0;
    var legB = 0.0;

    if (separatedDogWalkEnabled) {
        legA = Math.sin(walkPhase) * 7.0;
        legB = Math.sin(walkPhase + Math.PI) * 7.0;
    }

    /*
        Matrice base del cane.
        Tutti i pezzi partono da questa.
    */
    var baseMatrix = mat4();

    baseMatrix = mult(
        baseMatrix,
        translate(
            separatedDogBaseX,
            separatedDogBaseY,
            separatedDogBaseZ + walkOffset
        )
    );

    baseMatrix = mult(baseMatrix, rotate(dogAngle, [0, 1, 0]));
    baseMatrix = mult(baseMatrix, scalem(
        separatedDogScale,
        separatedDogScale,
        separatedDogScale
    ));

    /*
        Parti non animate: corpo, testa, orecchie.
    */
    drawObject(
        dogBodyPartBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );

    drawObject(
        dogHeadPartBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );

    drawObject(
        dogEarRightBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );

    drawObject(
        dogEarLeftBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );

    /*
        Coda: per ora la lasciamo fissa.
        Dopo possiamo farla scodinzolare.
    */
    drawObject(
        dogTailPartBuffers,
        dogTexture,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,
        true,
        0
    );

    /*
        PIVOT ZAMPE

        Questi valori sono approssimativi.
        Servono a indicare il punto alto della zampa,
        cioè dove si attacca al corpo.

        Se una zampa ruota dal punto sbagliato,
        modifichiamo questi valori.
    */

    var frontX = 0.55;
    var backX  = -0.55;

    var rightZ = -0.22;
    var leftZ  = 0.22;

    var legPivotY = 0.10;

    /*
        Camminata alternata:
        diagonali insieme.
    */

    // davanti destra
    drawSeparatedDogLeg(
        dogLegFrontRightBuffers,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        legA
    );

    // dietro sinistra
    drawSeparatedDogLeg(
        dogLegBackLeftBuffers,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        legA
    );

    // davanti sinistra
    drawSeparatedDogLeg(
        dogLegFrontLeftBuffers,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        legB
    );

    // dietro destra
    drawSeparatedDogLeg(
        dogLegBackRightBuffers,
        baseMatrix,
        viewMatrix,
        projectionMatrix,
        legB,
        backX,
        legPivotY,
        rightZ
    );
}