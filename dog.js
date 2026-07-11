function isSkinnedDogReady() {
    if (!skinnedDog) {
        return false;
    }

    if (typeof skinnedDog !== "object") {
        return false;
    }
    if (skinnedDog.isReady === true) {
        return true;
    }

    var possibleArrays = [
        "meshes",
        "meshBuffers",
        "primitives",
        "parts",
        "drawParts",
        "nodes",
        "jointNodes",
        "boneMatrices",
        "inverseBindMatrices"
    ];

    for (var i = 0; i < possibleArrays.length; i++) {
        var key = possibleArrays[i];

        if (
            skinnedDog[key] &&
            skinnedDog[key].length &&
            skinnedDog[key].length > 0
        ) {
            return true;
        }
    }

    return false;
}

function showDogLoadErrorOverlay(message) {
    if (dogLoadErrorShown) {
        return;
    }

    dogLoadErrorShown = true;

    var overlay = document.getElementById("DogLoadErrorOverlay");
    var refreshButton = document.getElementById("ButtonRefreshAfterDogError");

    if (overlay) {
        overlay.classList.remove("hidden");
    }

    if (refreshButton) {
        refreshButton.onclick = function () {
            window.location.reload();
        };
    }

    console.error(
        "Dog model loading error:",
        message || skinnedDogLoadErrorMessage
    );
}

function checkDogModelHealth(deltaTime) {
    if (dogLoadErrorShown) {
        return;
    }

    if (skinnedDogLoadState === "failed") {
        showDogLoadErrorOverlay(
            skinnedDogLoadErrorMessage ||
            "The dog model failed to load."
        );
        return;
    }

    /*
        If it's still pending or loading, we don't want to show an error yet.
    */
    if (
        skinnedDogLoadState === "pending" ||
        skinnedDogLoadState === "loading"
    ) {
        return;
    }

    
    if (skinnedDogLoadState === "ready" && !isSkinnedDogReady()) {
        dogMissingCheckTimer += deltaTime;

        if (dogMissingCheckTimer > 1.0) {
            showDogLoadErrorOverlay(
                "The dog model was loaded, but its buffers are incomplete."
            );
        }

        return;
    }

    dogMissingCheckTimer = 0.0;
}

/////////////////////////////////////////////////
function initDogPositionIfNeeded() {
    if (dogCurrentX === null || dogCurrentZ === null) {
        dogCurrentX = dogBasePos[0];
        dogCurrentZ = dogBasePos[2];
    }
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

    // Stops in front of the camera, not inside the camera
    var stopDistance = 3.5;

    var targetX = eye[0] + dirX * stopDistance;
    var targetZ = eye[2] + dirZ * stopDistance;

    /*
        Internal room limit.
        Using a margin because the dog should not stick exactly to the wall.
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

    // Avoid choosing a point inside the table
    var corrected = keepDogOutsideTable(targetX, targetZ);

    /*
        e-clamp after the table, because keepDogOutsideTable
        might have moved it slightly.
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
    // Avoid conflicts with the ball minigame
    if (miniGameActive) {
        console.log("Stop Ball before calling the dog.");
        return;
    }
    showDogHeart = true;
    dogHeartTimer = 0.0;

    // Remove any states left from the ball
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

        // Also used to orient the dog
        dogFetchTarget = {
            x: target.x,
            z: target.z
        };
    } else {
        dogCallPathIndex++;

        if (dogCallPathIndex >= dogCallPath.length) {
            dogCallPathIndex = dogCallPath.length - 1;
            dogCallMode = false;

            // Arrived: turn the dog towards the camera
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



    // corrects the upside-down heart
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

// dog petting mode
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

    
    noteMatrix = mult(
        noteMatrix,
        rotate(90.0, [0, 1, 0])
    );

    // rotation on itself to adjust the orientation of the note
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