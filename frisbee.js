

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

    var groundY = -2.32;

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

        //frisbeeEndPos = vec3(endX, groundY, endZ);
        var safeLanding = pushFrisbeeOutsideBenchCollider(endX, endZ);

        frisbeeEndPos = vec3(
            safeLanding.x,
            groundY,
            safeLanding.z
        );

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

function pushFrisbeeOutsideBenchCollider(x, z) {
    /*
        Usiamo la stessa zona della panchina,
        ma con un piccolo margine extra per non far atterrare
        il frisbee proprio attaccato al bordo.
    */

    var extra = 0.35;

    var halfX = BENCH_COLLIDER_DEPTH / 2.0 + BENCH_DOG_MARGIN + extra;
    var halfZ = BENCH_COLLIDER_WIDTH / 2.0 + BENCH_DOG_MARGIN + extra;

    var minX = BENCH_COLLIDER_X - halfX;
    var maxX = BENCH_COLLIDER_X + halfX;

    var minZ = BENCH_COLLIDER_Z - halfZ;
    var maxZ = BENCH_COLLIDER_Z + halfZ;

    if (x > minX && x < maxX && z > minZ && z < maxZ) {
        var distLeft  = Math.abs(x - minX);
        var distRight = Math.abs(x - maxX);
        var distBack  = Math.abs(z - minZ);
        var distFront = Math.abs(z - maxZ);

        var minDist = Math.min(distLeft, distRight, distBack, distFront);

        if (minDist === distLeft) {
            x = minX;
        } else if (minDist === distRight) {
            x = maxX;
        } else if (minDist === distBack) {
            z = minZ;
        } else {
            z = maxZ;
        }
    }

    return {
        x: x,
        z: z
    };
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

    showDogMusicNote = true;

    if (!dogHappySoundPlayed) {
        playDogHappySound();
        dogHappySoundPlayed = true;
    }

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

    /* var bodyStopOffset = 1.10;

    var bodyTargetX = targetX;
    var bodyTargetZ = targetZ;

    if (dist > 0.001) {
        bodyTargetX = targetX - (dx / dist) * bodyStopOffset;
        bodyTargetZ = targetZ - (dz / dist) * bodyStopOffset;
    }

    
    dogPath = [
        {
            x: bodyTargetX,
            z: bodyTargetZ
        }
    ]; */

    var approachTarget = getSafeFrisbeeApproachTarget(
        dogFetchX,
        dogFetchZ,
        targetX,
        targetZ
    );

   /*  dogPath = [
        {
            x: approachTarget.x,
            z: approachTarget.z
        }
    ];
 */
    dogPath = computeDogPathAroundBench(
        dogFetchX,
        dogFetchZ,
        approachTarget.x,
        approachTarget.z
    );

    dogPathIndex = 0;
    dogFetchBallMode = true;

    dogFetchTarget = {
        x: targetX,
        z: targetZ
    };

    console.log("Skinned dog goes to frisbee:", dogPath);
}


function startSkinnedDogReturnFrisbeeToCamera_old() {
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
function startSkinnedDogReturnFrisbeeToCamera() {
    dogReturningWithFrisbee = true;
    dogFetchObjectType = "frisbee";
    

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;

    var targetX;
    var targetZ;

    if (frisbeeReturnTarget) {
        targetX = frisbeeReturnTarget.x;
        targetZ = frisbeeReturnTarget.z;
    } else {
        var forward = normalize(subtract(at, eye));

        targetX = eye[0] + forward[0] * 3.0;
        targetZ = eye[2] + forward[2] * 3.0;

        targetX = Math.max(-6.0, Math.min(6.0, targetX));
        targetZ = Math.max(-6.0, Math.min(6.0, targetZ));
    }

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

    console.log("Dog returns frisbee to saved target:", dogPath);
}

function getSafeFrisbeeApproachTarget(dogX, dogZ, frisbeeX, frisbeeZ) {
    /*
        Target normale: il cane si ferma un po' prima del frisbee,
        così non mette il corpo sopra al disco.
    */
    var dx = frisbeeX - dogX;
    var dz = frisbeeZ - dogZ;
    var dist = Math.sqrt(dx * dx + dz * dz);

    var bodyStopOffset = 0.70;

    var directX = frisbeeX;
    var directZ = frisbeeZ;

    if (dist > 0.001) {
        directX = frisbeeX - (dx / dist) * bodyStopOffset;
        directZ = frisbeeZ - (dz / dist) * bodyStopOffset;
    }

    /*
        Rettangolo reale della panchina usato dal cane.
        Deve essere coerente con keepDogOutsideParkObstacles.
    */
    var halfX = BENCH_COLLIDER_DEPTH / 2.0 + BENCH_DOG_MARGIN;
    var halfZ = BENCH_COLLIDER_WIDTH / 2.0 + BENCH_DOG_MARGIN;

    var minX = BENCH_COLLIDER_X - halfX;
    var maxX = BENCH_COLLIDER_X + halfX;

    var minZ = BENCH_COLLIDER_Z - halfZ;
    var maxZ = BENCH_COLLIDER_Z + halfZ;

    function pointInsideBench(x, z) {
        return (
            x > minX &&
            x < maxX &&
            z > minZ &&
            z < maxZ
        );
    }

    function segmentHitsBench(x1, z1, x2, z2) {
        var steps = 30;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;

            var x = x1 + (x2 - x1) * t;
            var z = z1 + (z2 - z1) * t;

            if (pointInsideBench(x, z)) {
                return true;
            }
        }

        return false;
    }

    /*
        Se il target diretto è raggiungibile, uso quello.
    */
    if (
        !pointInsideBench(directX, directZ) &&
        !segmentHitsBench(dogX, dogZ, directX, directZ)
    ) {
        return {
            x: directX,
            z: directZ
        };
    }

    /*
        Caso problematico:
        il frisbee è vicino/dietro la panchina.
        Provo 4 punti intorno al collider e scelgo quello più comodo.
    */
    var extra = 0.05;

    var candidates = [
        // lato sinistro del collider
        {
            x: minX - extra,
            z: frisbeeZ
        },

        // lato destro del collider
        {
            x: maxX + extra,
            z: frisbeeZ
        },

        // lato dietro
        {
            x: frisbeeX,
            z: minZ - extra
        },

        // lato davanti
        {
            x: frisbeeX,
            z: maxZ + extra
        }
    ];

    var best = null;
    var bestScore = 999999.0;

    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];

        if (pointInsideBench(c.x, c.z)) {
            continue;
        }

        if (segmentHitsBench(dogX, dogZ, c.x, c.z)) {
            continue;
        }

        var dDogX = c.x - dogX;
        var dDogZ = c.z - dogZ;
        var distDog = Math.sqrt(dDogX * dDogX + dDogZ * dDogZ);

        var dFrisbeeX = c.x - frisbeeX;
        var dFrisbeeZ = c.z - frisbeeZ;
        var distFrisbee = Math.sqrt(dFrisbeeX * dFrisbeeX + dFrisbeeZ * dFrisbeeZ);

        /*
            Preferisco punti vicini al frisbee,
            ma comunque raggiungibili dal cane.
        */
        var score = distFrisbee * 2.0 + distDog;

        if (score < bestScore) {
            bestScore = score;
            best = c;
        }
    }

    if (best) {
        return best;
    }

    /*
        Fallback: se proprio non trova nulla,
        almeno non mando il cane dentro la panchina.
    */
    var corrected = keepDogOutsideParkObstacles(directX, directZ);

    return {
        x: corrected.x,
        z: corrected.z
    };
}

function shouldDrawFrisbee() {

    /*
        if it's day time, always draw the frisbee on the grass
    */
    if (!isNight) {
        return true;
    }

    /*
        if it's night time, don't draw the frisbee on the grass by default.
        But draw it if it's being used:
        - it's in hand
        - aiming
        - flying
        - landed and the dog needs to fetch it
        - the dog has it in its mouth
        - the dog is returning with it
    */
    if (
        frisbeeThrowMode ||
        frisbeeAttachedToHand ||
        frisbeeFlying ||
        frisbeeLanded ||
        dogHasFrisbee ||
        dogReturningWithFrisbee
    ) {
        return true;
    }

    return false;
}

function cancelDogFrisbeeMission() {
    /*
        Cancella la missione del cane legata al frisbee.
        Serve quando il frisbee viene tolto mentre è in volo
        oppure mentre il cane sta già andando a prenderlo.
    */

    if (
        dogFetchObjectType !== "frisbee" &&
        !frisbeeAlreadyTargeted &&
        !dogHasFrisbee &&
        !dogReturningWithFrisbee
    ) {
        return;
    }

    // Ferma il movimento verso il frisbee
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Toglie abbassamento / posa tipo raccolta
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    // Toglie stati del frisbee nel cane
    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;
    dogFetchObjectType = null;

    showDogMusicNote = false;
    dogHappySoundPlayed = false;
}


function putAwayFrisbee(buttonFrisbee) {

    /* cancelDogFrisbeeMission();


    frisbeeThrowMode = false;
    frisbeeAttachedToHand = false;
    frisbeeFlying = false;
    frisbeeLanded = false;
    frisbeePreparingThrow = false;
    frisbeeHasMousePosition = false;

    frisbeePreparingThrow = false;
    frisbeeHasMousePosition = false;

    frisbeeReturnedAndWaiting = false;
    frisbeeAlreadyTargeted = false;

    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;
    dogFetchObjectType = null;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    if (buttonFrisbee) {
        buttonFrisbee.classList.remove("active");
        buttonFrisbee.title = "Take Frisbee";
    }

    updateCanvasCursor();

    showGameMessage("Frisbee put away!", 1400); */

     /*
        Reset completo del frisbee.
        Importante: se il cane sta già andando verso il frisbee,
        bisogna cancellare anche il suo path, altrimenti continua
        verso il vecchio target fantasma.
    */

    stopDogFrisbeeFetch();

    // Stop movimento/fetch del cane
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Stop target visivo/rotazione verso il frisbee
    dogLookAtBallX = dogFetchX;
    dogLookAtBallZ = dogFetchZ;

    // Stop stati del cane legati al frisbee
    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;
    dogFetchObjectType = null;

    // Stop animazioni di raccolta / sdraiamento
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    showDogMusicNote = false;
    dogHappySoundPlayed = false;

    // Reset stati del frisbee
    frisbeeThrowMode = false;
    frisbeeAttachedToHand = false;
    frisbeeFlying = false;
    frisbeeLanded = false;
    frisbeePreparingThrow = false;
    frisbeeHasMousePosition = false;

    frisbeeReturnedAndWaiting = false;
    frisbeeAlreadyTargeted = false;

    if (buttonFrisbee) {
        buttonFrisbee.classList.remove("active");
        buttonFrisbee.title = "Take Frisbee";
    }

    updateCanvasCursor();

    showGameMessage("Frisbee put away!", 1400);
}


function stopDogFrisbeeFetch() {
    /*
        Ferma il cane quando il frisbee non è più il suo target.
        Serve sia quando metti via il frisbee, sia quando lo riprendi in mano
        mentre il cane sta andando a prenderlo.
    */

    if (dogFetchObjectType !== "frisbee" && !frisbeeAlreadyTargeted) {
        return;
    }

    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    dogLookAtBallX = dogFetchX;
    dogLookAtBallZ = dogFetchZ;

    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;
    dogFetchObjectType = null;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    showDogMusicNote = false;
    dogHappySoundPlayed = false;

    frisbeeAlreadyTargeted = false;
}