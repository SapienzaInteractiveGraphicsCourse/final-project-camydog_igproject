function getDogTargetNearCamera() {
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

        dogFetchX = corrected.x;
        dogFetchZ = corrected.z;

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