

function startFrisbeeThrowSequence() {
    if (currentScene !== "park") {
        return;
    }

    if (frisbeeFlying || frisbeePreparingThrow) {
        return;
    }

    frisbeePreparingThrow = false;
    frisbeeAttachedToHand = false;

    launchFrisbee();
}

function launchFrisbee() {
    frisbeePreparingThrow = false;
    frisbeeAttachedToHand = false;

    frisbeeFlying = true;
    frisbeeLanded = false;


    frisbeeAlreadyTargeted = false;

    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogFetchObjectType = null;

    frisbeeStartTime = performance.now();
    frisbeeSpin = 0.0;

    // NON resetto frisbeeStartPos qui:
    // deve partire dalla posizione della manina/cursore
    // i DON'T WANT  the same end position every time, so I randomize it a bit
   // frisbeeEndPos = vec3(3.0, -2.2, -3.2);

    var groundY = -2.2;

    // direzione dalla camera verso il frisbee in mano
    var dir = normalize(subtract(frisbeeStartPos, eye));

    // fallback se il raggio è quasi parallelo al terreno
    if (Math.abs(dir[1]) < 0.001) {
        frisbeeEndPos = vec3(
            frisbeeStartPos[0],
            groundY,
            frisbeeStartPos[2] - 5.0
        );
    } else {
        var t = (groundY - eye[1]) / dir[1];

        // se t viene negativo o troppo piccolo, uso una distanza standard
        if (t < 1.0) {
            t = 7.0;
        }

        // aumento la distanza del lancio
        var throwPower = 1.8;

        var endX = eye[0] + dir[0] * t * throwPower;
        var endZ = eye[2] + dir[2] * t * throwPower;

        // limiti del parco
        endX = Math.max(-7.0, Math.min(7.0, endX));
        endZ = Math.max(-7.0, Math.min(7.0, endZ));

        frisbeeEndPos = vec3(endX, groundY, endZ);

    }
}

function smoothFrisbeeStep(t) {
    return t * t * (3.0 - 2.0 * t);
}


function getFrisbeeModelMatrix() {
    var modelMatrixFrisbee = mat4();

    var frisbeeScale = 0.4


    if (frisbeeThrowMode && frisbeeAttachedToHand && !frisbeeFlying) {
        updateFrisbeeHandSmoothPosition();

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(
                frisbeeHandPos[0],
                frisbeeHandPos[1],
                frisbeeHandPos[2]
            )
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(frisbeeScale, frisbeeScale, frisbeeScale)
        );

        return modelMatrixFrisbee;
    }


    if (dogHasFrisbee) {
        var rad = dogCurrentAngle * Math.PI / 180.0;

        var forwardX = Math.sin(rad);
        var forwardZ = Math.cos(rad);

        // un po' più avanti rispetto al muso
        var mouthForwardOffset = 1.5;

        // un po' più in alto
        var mouthY = -0.90;

        // leggermente spostato a lato, così non taglia il muso in mezzo
        var sideOffset = 0.12;
        var sideX = Math.cos(rad) * sideOffset;
        var sideZ = -Math.sin(rad) * sideOffset;

        var mouthX = dogFetchX + forwardX * mouthForwardOffset + sideX;
        var mouthZ = dogFetchZ + forwardZ * mouthForwardOffset + sideZ;

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(mouthX, mouthY, mouthZ)
        );

        // orientamento del cane
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(dogCurrentAngle, [0, 1, 0])
        );

        // orienta il frisbee in modo più naturale in bocca
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        // piccola inclinazione, così non resta perfettamente "piatto"
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(18, [0, 0, 1])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(frisbeeScale, frisbeeScale, frisbeeScale)
        );

        return modelMatrixFrisbee;
    }

    
    // 1) Frisbee "in mano", appena prima del lancio
    if (frisbeeAttachedToHand) {
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(frisbeeStartPos[0], frisbeeStartPos[1], frisbeeStartPos[2])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(frisbeeScale, frisbeeScale, frisbeeScale)
        );

        return modelMatrixFrisbee;
    }

    // 2) Frisbee fermo dopo essere atterrato
    if (!frisbeeFlying && frisbeeLanded) {
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(frisbeeEndPos[0], frisbeeEndPos[1], frisbeeEndPos[2])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(frisbeeScale, frisbeeScale, frisbeeScale)
        );

        return modelMatrixFrisbee;
    }

    // 3) frisbee is not flying and not landed, so it is on the ground before being thrown
    if (!frisbeeFlying) {
        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(-1.2, -2.15, 2.8)
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(frisbeeScale, frisbeeScale, frisbeeScale)
        );

        return modelMatrixFrisbee;
    }

    // 4) frisbee in flight
    var now = performance.now();
    var t = (now - frisbeeStartTime) / frisbeeDuration;

    if (t >= 1.0) {
        t = 1.0;
        frisbeeFlying = false;
        frisbeeLanded = true;
    }

    var s = smoothFrisbeeStep(t);

    var x = frisbeeStartPos[0] + (frisbeeEndPos[0] - frisbeeStartPos[0]) * s;
    var z = frisbeeStartPos[2] + (frisbeeEndPos[2] - frisbeeStartPos[2]) * s;

    // arco del lancio
    var arcHeight = Math.sin(Math.PI * t) * 2.0;
    var y = frisbeeStartPos[1] + (frisbeeEndPos[1] - frisbeeStartPos[1]) * s + arcHeight;

    frisbeeSpin += 22.0;

    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        translate(x, y, z)
    );

    // rotazione veloce tipo disco
    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        rotate(frisbeeSpin, [0, 1, 0])
    );

    // lo tengo orizzontale
    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        rotate(90, [0, 1, 0])
    );

    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        scalem(frisbeeScale, frisbeeScale, frisbeeScale)
    );

    return modelMatrixFrisbee;
}

function updateFrisbeeHandPositionFromMouse_old(event) {
    if (!canvas || !viewMatrix || !projectionMatrix) {
        return;
    }

    var rect = canvas.getBoundingClientRect();

    // coordinate mouse rispetto al canvas
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    // piccolo offset per farlo stare vicino alla manina, non esattamente sotto la punta
    mouseX += 25;
    mouseY += 18;

    var x = (mouseX / rect.width) * 2.0 - 1.0;
    var y = 1.0 - (mouseY / rect.height) * 2.0;

    var viewProjection = mult(projectionMatrix, viewMatrix);
    var inverseViewProjection = inverseMat4(viewProjection);

    var nearPoint = mult(inverseViewProjection, vec4(x, y, -1.0, 1.0));
    var farPoint  = mult(inverseViewProjection, vec4(x, y,  1.0, 1.0));

    nearPoint = vec3(
        nearPoint[0] / nearPoint[3],
        nearPoint[1] / nearPoint[3],
        nearPoint[2] / nearPoint[3]
    );

    farPoint = vec3(
        farPoint[0] / farPoint[3],
        farPoint[1] / farPoint[3],
        farPoint[2] / farPoint[3]
    );

    var rayDir = subtract(farPoint, nearPoint);

    if (Math.abs(rayDir[1]) < 0.0001) {
        return;
    }

    var t = (frisbeeHandPlaneY - nearPoint[1]) / rayDir[1];

    frisbeeHandPos = vec3(
        nearPoint[0] + rayDir[0] * t,
        frisbeeHandPlaneY,
        frisbeeHandFixedZ //nearPoint[2] + rayDir[2] * t
    );
}

function updateFrisbeeHandPositionFromMouse_old_old(event) {
    if (!canvas || !viewMatrix || !projectionMatrix) {
        return;
    }

    var rect = canvas.getBoundingClientRect();

    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    // offset per tenerlo vicino alla manina
    mouseX += 25;
    mouseY += 18;

    var x = (mouseX / rect.width) * 2.0 - 1.0;
    var y = 1.0 - (mouseY / rect.height) * 2.0;

    var viewProjection = mult(projectionMatrix, viewMatrix);
    var inverseViewProjection = inverseMat4(viewProjection);

    var nearPoint = mult(
        inverseViewProjection,
        vec4(x, y, -1.0, 1.0)
    );

    var farPoint = mult(
        inverseViewProjection,
        vec4(x, y, 1.0, 1.0)
    );

    nearPoint = vec3(
        nearPoint[0] / nearPoint[3],
        nearPoint[1] / nearPoint[3],
        nearPoint[2] / nearPoint[3]
    );

    farPoint = vec3(
        farPoint[0] / farPoint[3],
        farPoint[1] / farPoint[3],
        farPoint[2] / farPoint[3]
    );

    var rayDir = subtract(farPoint, nearPoint);

    // adesso interseco con un piano Z fisso
    if (Math.abs(rayDir[2]) < 0.0001) {
        return;
    }

    var t = (frisbeeHandFixedZ - nearPoint[2]) / rayDir[2];

    var rawX = nearPoint[0] + rayDir[0] * t;
    var rawY = nearPoint[1] + rayDir[1] * t;

    // riduco la sensibilità verticale rispetto alla posizione base
    var newY =
        frisbeeHandBaseY +
        (rawY - frisbeeHandBaseY) * frisbeeHandVerticalSensitivity;

    // limito quanto può salire/scendere
    newY = Math.max(
        frisbeeHandMinY,
        Math.min(frisbeeHandMaxY, newY)
    );

    // NON aggiorno direttamente frisbeeHandPos,
    // aggiorno solo il target
    frisbeeHandTargetPos = vec3(
        rawX,
        newY,
        frisbeeHandFixedZ
    );
}

function updateFrisbeeHandPositionFromMouse_old_old_old(event) {
    var rect = canvas.getBoundingClientRect();

    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    // Primo movimento: salvo la posizione iniziale e basta
    if (frisbeeLastMouseX === null || frisbeeLastMouseY === null) {
        frisbeeLastMouseX = mouseX;
        frisbeeLastMouseY = mouseY;
        return;
    }

    var dx = mouseX - frisbeeLastMouseX;
    var dy = mouseY - frisbeeLastMouseY;

    frisbeeLastMouseX = mouseX;
    frisbeeLastMouseY = mouseY;

    var newX = frisbeeHandTargetPos[0] + dx * frisbeeHandXSpeed;

    // dy positivo = mouse va giù, quindi nel mondo Y deve scendere
    var newY = frisbeeHandTargetPos[1] - dy * frisbeeHandYSpeed;

    newX = Math.max(
        frisbeeHandMinX,
        Math.min(frisbeeHandMaxX, newX)
    );

    newY = Math.max(
        frisbeeHandMinY,
        Math.min(frisbeeHandMaxY, newY)
    );

    frisbeeHandTargetPos = vec3(
        newX,
        newY,
        frisbeeHandFixedZ
    );
}

function updateFrisbeeHandPositionFromMouse_stra_old(event) {
    if (!canvas) {
        return;
    }

    var rect = canvas.getBoundingClientRect();

    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    // normalizzo tra 0 e 1
    var nx = mouseX / rect.width;
    var ny = mouseY / rect.height;

    // clamp, per sicurezza
    nx = Math.max(0.0, Math.min(1.0, nx));
    ny = Math.max(0.0, Math.min(1.0, ny));

    // mapping controllato: mouse sinistra/destra -> X del frisbee
    var newX =
        frisbeeHandMinX +
        nx * (frisbeeHandMaxX - frisbeeHandMinX);

    // mouse alto -> Y alta, mouse basso -> Y bassa
    var newY =
        frisbeeHandMaxY +
        ny * (frisbeeHandMinY - frisbeeHandMaxY);

    frisbeeHandTargetPos = vec3(
        newX,
        newY,
        frisbeeHandFixedZ
    );

    /*
        La prima volta non faccio smoothing:
        piazzo subito il disco sotto la manina.
        Dopo invece userò lo smoothing normale.
    */
    if (!frisbeeHasMousePosition) {
        frisbeeHandPos = vec3(
            newX,
            newY,
            frisbeeHandFixedZ
        );

        frisbeeHasMousePosition = true;
    }
}



function updateFrisbeeHandPositionFromMouse(event) {
    if (!canvas || !eye || !at || !up) {
        return;
    }

    var rect = canvas.getBoundingClientRect();

    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    /*
        Offset rispetto al cursore/manina.
        Cambiali se il frisbee non sta bene nel palmo.
    */
    mouseX += 18;
    mouseY += 12;

    var nx = (mouseX / rect.width) * 2.0 - 1.0;
    var ny = 1.0 - (mouseY / rect.height) * 2.0;

    var forward = normalize(subtract(at, eye));
    var right = normalize(cross(forward, up));
    var cameraUp = normalize(cross(right, forward));

    /*
        Distanza del frisbee dalla camera.
        Più basso = più vicino a te.
    */
    var distance = frisbeeHandDistanceFromCamera;

    var fov = cameraFov;
    var fovRad = fov * Math.PI / 180.0;

    var halfY = Math.tan(fovRad * 0.5) * distance;
    var halfX = halfY * (rect.width / rect.height);

    var worldX = nx * halfX + frisbeeHandPalmOffsetX;
    var worldY = ny * halfY + frisbeeHandPalmOffsetY;

    var base = vec3(
        eye[0] + forward[0] * distance,
        eye[1] + forward[1] * distance,
        eye[2] + forward[2] * distance
    );

    var p = vec3(
        base[0] + right[0] * worldX + cameraUp[0] * worldY,
        base[1] + right[1] * worldX + cameraUp[1] * worldY,
        base[2] + right[2] * worldX + cameraUp[2] * worldY
    );

    frisbeeHandTargetPos = p;

    if (!frisbeeHasMousePosition) {
        frisbeeHandPos = vec3(p[0], p[1], p[2]);
        frisbeeHasMousePosition = true;
    }
}
function updateFrisbeeHandSmoothPosition() {
    if (!frisbeeThrowMode || !frisbeeAttachedToHand || frisbeeFlying) {
        return;
    }

    frisbeeHandPos = vec3(
        frisbeeHandPos[0] +
            (frisbeeHandTargetPos[0] - frisbeeHandPos[0]) * frisbeeHandSmoothing,

        frisbeeHandPos[1] +
            (frisbeeHandTargetPos[1] - frisbeeHandPos[1]) * frisbeeHandSmoothing,

        frisbeeHandPos[2] +
            (frisbeeHandTargetPos[2] - frisbeeHandPos[2]) * frisbeeHandSmoothing
    );
}

function showFrisbeeReleaseCursor() {
    frisbeeReleaseCursorActive = true;
    updateCanvasCursor();

    if (frisbeeReleaseCursorTimer) {
        clearTimeout(frisbeeReleaseCursorTimer);
    }

    frisbeeReleaseCursorTimer = setTimeout(function () {
        frisbeeReleaseCursorActive = false;
        updateCanvasCursor();
    }, 1600);
}


function checkFrisbeeLandedAndSendDog() {
    if (currentScene !== "park") {
        return;
    }

    if (!frisbeeLanded) {
        return;
    }

    if (frisbeeFlying) {
        return;
    }

    if (frisbeeAlreadyTargeted) {
        return;
    }

    if (dogHasFrisbee) {
        return;
    }

    startSkinnedDogFetchFrisbee();
    frisbeeAlreadyTargeted = true;
}



function startSkinnedDogFetchFrisbee() {
    if (currentScene !== "park") {
        return;
    }

    if (!frisbeeLanded || frisbeeFlying) {
        return;
    }

    if (!dogHappySoundPlayed) {
        playDogHappySound();
        dogHappySoundPlayed = true;
    }

    showDogMusicNote = true;

    dogFetchObjectType = "frisbee";

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogHasFrisbee = false;
    dogHasBall = false;

    dogPath = [];
    dogPathIndex = 0;

    var targetX = frisbeeEndPos[0];
    var targetZ = frisbeeEndPos[2];

    dogLookAtBallX = targetX;
    dogLookAtBallZ = targetZ;

    /*
        Nel parco non vogliamo clampare alla stanza/tavolo.
        Però teniamo un margine per non farlo arrivare esattamente sopra il frisbee.
    */
    var dx = targetX - dogFetchX;
    var dz = targetZ - dogFetchZ;
    var dist = Math.sqrt(dx * dx + dz * dz);

    var bodyStopOffset = 1.10;

    var bodyTargetX = targetX;
    var bodyTargetZ = targetZ;

    if (dist > 0.001) {
        bodyTargetX = targetX - (dx / dist) * bodyStopOffset;
        bodyTargetZ = targetZ - (dz / dist) * bodyStopOffset;
    }

    /*
        Per ora percorso diretto.
        Nel parco non abbiamo il tavolo da evitare.
    */
    dogPath = [
        {
            x: bodyTargetX,
            z: bodyTargetZ
        }
    ];

    dogPathIndex = 0;
    dogFetchBallMode = true;

    dogFetchTarget = {
        x: targetX,
        z: targetZ
    };

    console.log("Skinned dog goes to frisbee:", dogPath);
}


function startSkinnedDogReturnFrisbeeToCamera() {
    dogReturningWithFrisbee = true;
    dogFetchObjectType = "frisbee";

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;

    /*
        Punto vicino alla camera, ma proiettato sul prato.
        Non uso eye direttamente perché la camera sta in alto.
    */
    var forward = normalize(subtract(at, eye));

    var targetX = eye[0] + forward[0] * 3.0;
    var targetZ = eye[2] + forward[2] * 3.0;

    // limiti del parco
    targetX = Math.max(-6.0, Math.min(6.0, targetX));
    targetZ = Math.max(-6.0, Math.min(6.0, targetZ));

    dogPath = [
        {
            x: targetX,
            z: targetZ
        }
    ];

    dogFetchBallMode = true;

    dogFetchTarget = {
        x: targetX,
        z: targetZ
    };

    console.log("Dog returns frisbee to camera:", dogPath);
}