function getDogTargetNearCamera_old() {
    //var eye = cameraPosition; // posizione della telecamera
    var at = cameraTarget;    // punto guardato dalla telecamera

    var dirX = at[0] - eye[0];
    var dirZ = at[2] - eye[2];

    var len = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (len < 0.0001) {
        dirX = 0.0;
        dirZ = -1.0;
        len = 1.0;
    }

    dirX /= len;
    dirZ /= len;

    // Si ferma davanti alla camera, non dentro di essa
    var stopDistance = 3.5;

    var targetX = eye[0] + dirX * stopDistance;
    var targetZ = eye[2] + dirZ * stopDistance;

    // Evita di scegliere un punto dentro il tavolo
    var corrected = keepDogOutsideTable(targetX, targetZ);

    return {
        x: corrected.x,
        z: corrected.z
    };

}


function getDogTargetNearCamera() {
    var at = cameraTarget;

    var dirX = at[0] - eye[0];
    var dirZ = at[2] - eye[2];

    var len = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (len < 0.0001) {
        dirX = 0.0;
        dirZ = -1.0;
        len = 1.0;
    }

    dirX /= len;
    dirZ /= len;

    // Si ferma davanti alla camera, non dentro la camera
    var stopDistance = 3.5;

    var targetX = eye[0] + dirX * stopDistance;
    var targetZ = eye[2] + dirZ * stopDistance;

    /*
        Limite interno della stanza.
        Uso un margine perché il cane non deve attaccarsi esattamente al muro.
    */
    var dogRoomMargin = 0.85;

    targetX = clamp(
        targetX,
        ROOM_MIN_X + dogRoomMargin,
        ROOM_MAX_X - dogRoomMargin
    );

    targetZ = clamp(
        targetZ,
        ROOM_MIN_Z + dogRoomMargin,
        ROOM_MAX_Z - dogRoomMargin
    );

    // Evita di scegliere un punto dentro il tavolo
    var corrected = keepDogOutsideTable(targetX, targetZ);

    /*
        Riclampo anche dopo il tavolo, perché keepDogOutsideTable
        potrebbe spostarlo leggermente.
    */
    corrected.x = clamp(
        corrected.x,
        ROOM_MIN_X + dogRoomMargin,
        ROOM_MAX_X - dogRoomMargin
    );

    corrected.z = clamp(
        corrected.z,
        ROOM_MIN_Z + dogRoomMargin,
        ROOM_MAX_Z - dogRoomMargin
    );

    return {
        x: corrected.x,
        z: corrected.z
    };
}

function callSkinnedDogToCamera() {
    // Evita conflitti con il minigioco della palla
    if (miniGameActive) {
        console.log("Stop Ball before calling the dog.");
        return;
    }
    showDogHeart = true;
    dogHeartTimer = 0.0;

    // Elimina eventuali stati rimasti dalla palla
    dogHasBall = false;

    dogFetchBallMode = false;
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    var destination = getDogTargetNearCamera();

    dogCallPath = computeDogPathToBall(
        dogFetchX,
        dogFetchZ,
        destination.x,
        destination.z
    );

    dogCallPathIndex = 0;
    dogCallMode = dogCallPath && dogCallPath.length > 0;

    if (dogCallMode) {
        dogFetchTarget = {
            x: dogCallPath[0].x,
            z: dogCallPath[0].z
        };
    }
}

function updateSkinnedDogCall(deltaTime) {
    if (!dogCallMode || !dogCallPath || dogCallPath.length === 0) {
        return;
    }

    var target = dogCallPath[dogCallPathIndex];

    var dx = target.x - dogFetchX;
    var dz = target.z - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);
    var speed = 0.035;

    if (dist > 0.12) {
        var nextX = dogFetchX + (dx / dist) * speed;
        var nextZ = dogFetchZ + (dz / dist) * speed;

        var corrected = keepDogOutsideTable(nextX, nextZ);

        /* dogFetchX = corrected.x;
        dogFetchZ = corrected.z; 
        */

        var dogRoomMargin = 0.85;

        dogFetchX = clamp(
            corrected.x,
            ROOM_MIN_X + dogRoomMargin,
            ROOM_MAX_X - dogRoomMargin
        );

        dogFetchZ = clamp(
            corrected.z,
            ROOM_MIN_Z + dogRoomMargin,
            ROOM_MAX_Z - dogRoomMargin
        );

        // Serve anche per orientare il cane
        dogFetchTarget = {
            x: target.x,
            z: target.z
        };
    } else {
        dogCallPathIndex++;

        if (dogCallPathIndex >= dogCallPath.length) {
            dogCallPathIndex = dogCallPath.length - 1;
            dogCallMode = false;

            // Arrivato: gira il cane verso la telecamera
            var lookDx = eye[0] - dogFetchX;
            var lookDz = eye[2] - dogFetchZ;

            dogCurrentAngle =
                Math.atan2(-lookDx, -lookDz) * 180.0 / Math.PI ;

            dogFetchTarget = {
                x: eye[0],
                z: eye[2]
            };

            console.log("Dog arrived near the camera.");
        } else {
            dogFetchTarget = {
                x: dogCallPath[dogCallPathIndex].x,
                z: dogCallPath[dogCallPathIndex].z
            };
        }
    }
}


function getDogHeartModelMatrix() {
    var heartMatrix = mat4();
    var heart_scale=0.25

    var t = performance.now() * 0.001;
    var floatOffset = Math.sin(t * 4.0) * 0.08;
    var pulse = 1.0 + Math.sin(t * 7.0) * 0.08;

    var rad = dogCurrentAngle * Math.PI / 180.0;

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    var heartX = dogFetchX + forwardX * 0.65;
    var heartY = -0.15 + floatOffset;
    var heartZ = dogFetchZ + forwardZ * 0.65;

    heartMatrix = mult(
        heartMatrix,
        translate(heartX, heartY, heartZ)
    );



    // corregge il cuore capovolto
    heartMatrix = mult(
        heartMatrix,
        rotate(270.0, [1, 0, 0])
    );

    heartMatrix = mult(
        heartMatrix,
        scalem(
            heart_scale * pulse,
            heart_scale * pulse,
            heart_scale * pulse
        )
    );

    return heartMatrix;
}

// modalità carezza al cane
function updateDogPetAnimation(deltaTime) {
    var targetYaw = petDogMode ? dogPetTargetYaw : 0.0;
    var targetPitch = petDogMode ? dogPetTargetPitch : 0.0;

    var smoothing = 7.0;
    var factor = Math.min(deltaTime * smoothing, 1.0);

    dogPetHeadYaw +=
        (targetYaw - dogPetHeadYaw) * factor;

    dogPetHeadPitch +=
        (targetPitch - dogPetHeadPitch) * factor;
}

//music note Matrix
/* function getDogMusicNoteModelMatrix() {
    var noteMatrix = mat4();

    var t = performance.now() * 0.001;

    var floatOffset = Math.sin(t * 4.5) * 0.10;
    var sway = Math.sin(t * 3.0) * 6.0;
    var pulse = 1.0 + Math.sin(t * 7.0) * 0.4;

    var rad = dogCurrentAngle * Math.PI / 180.0;

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    var noteX = dogFetchX + forwardX * 0.45;
    var noteY = -0.10 + floatOffset;
    var noteZ = dogFetchZ + forwardZ * 0.45;

    var t = performance.now() * 0.001;

    var floatY = Math.sin(t * 4.0) * 0.08;
    var tilt = Math.sin(t * 2.5) * 12.0;

   

    var noteScale = 0.4 * pulse;

    var noteMatrix = mat4();

    noteMatrix = mult(noteMatrix, translate(noteX, noteY + floatY, noteZ));
    noteMatrix = mult(noteMatrix, rotate(90.0, [0, 1, 0]));
    noteMatrix = mult(noteMatrix, rotate(sway, [0, 0, 1]));
    noteMatrix = mult(noteMatrix, scalem(noteScale, noteScale, noteScale));

    return noteMatrix;
}  */
/* function getDogNoteModelMatrix(noteIndex) {
    var noteMatrix = mat4();
    var t = performance.now() * 0.001;

    var pulse = 1.0 + Math.sin(t * 4.0 + noteIndex * 1.2) * 0.08;
    var floatY = Math.sin(t * 3.0 + noteIndex * 0.8) * 0.04;

    var spin = t * 120.0 + noteIndex * 35.0;

    var offsetX = 0.0;
    var offsetY = 0.0;
    var offsetZ = 0.0;
    var scale;
    var scale1= 0.5;
    var scale2= 0.3;
    var scale3= 0.2;

    if (noteIndex === 0) {
        offsetX = -0.12;
        offsetY = 0.8;
        offsetZ = 0.00;
        scale = scale1;
    }
    else if (noteIndex === 1) {
        offsetX = 0.16;
        offsetY = 1.0;
        offsetZ = 0.03;
        scale = scale2;
    }
    else if (noteIndex === 2) {
        offsetX = -0.22;
        offsetY = 1.15;
        offsetZ = -0.03;
        scale = scale3;
    }

    noteMatrix = mult(
        noteMatrix,
        translate(
            dogFetchX + offsetX,
            -0.20 + offsetY + floatY,
            dogFetchZ + offsetZ
        )
    );

    // rotazione giusta trovata per il tuo OBJ
    noteMatrix = mult(
        noteMatrix,
        rotate(90.0, [0, 1, 0])
    );
    noteMatrix = mult(
        noteMatrix,
        rotate(spin, [0, 1, 0])
    );

    noteMatrix = mult(
        noteMatrix,
        scalem(
            scale * pulse,
            scale * pulse,
            scale * pulse
        )
    );

    return noteMatrix;
} */
function getDogNoteModelMatrix(noteIndex) {
    var noteMatrix = mat4();
    var t = performance.now() * 0.001;

    var pulse =
        1.0 + Math.sin(t * 4.0 + noteIndex * 1.2) * 0.08;

    var floatY =
        Math.sin(t * 3.0 + noteIndex * 0.8) * 0.04;

    var spin =
        t * (90.0 + noteIndex * 20.0);

    var rad = dogCurrentAngle * Math.PI / 180.0;

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    var rightX = Math.cos(rad);
    var rightZ = -Math.sin(rad);

    var sideOffset;
    var forwardOffset;
    var heightOffset;
    var scale;
    var scale1= 0.4;
    var scale2= 0.3;
    var scale3= 0.2;

    if (noteIndex === 0) {
        sideOffset = -0.10;
        forwardOffset = 1.0;
        heightOffset = 0.5;
        scale = scale1;
    }
    else if (noteIndex === 1) {
        sideOffset = 0.12;
        forwardOffset = 0.72;
        heightOffset = 0.6;
        scale = scale2;
    }
    else {
        sideOffset = -0.22;
        forwardOffset = 0.68;
        heightOffset = 0.8;
        scale = scale3;
    }

    var noteX =
        dogFetchX +
        forwardX * forwardOffset +
        rightX * sideOffset;

    var noteZ =
        dogFetchZ +
        forwardZ * forwardOffset +
        rightZ * sideOffset;

    var noteY =
        -0.20 + heightOffset + floatY;

    noteMatrix = mult(
        noteMatrix,
        translate(noteX, noteY, noteZ)
    );

    // rotazione corretta per il tuo OBJ
    noteMatrix = mult(
        noteMatrix,
        rotate(90.0, [0, 1, 0])
    );

    // rotazione su se stessa
    noteMatrix = mult(
        noteMatrix,
        rotate(spin, [0, 1, 0])
    );

    noteMatrix = mult(
        noteMatrix,
        scalem(
            scale * pulse,
            scale * pulse,
            scale * pulse
        )
    );

    return noteMatrix;
}