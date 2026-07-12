function isHoldingFrisbeeInHand() {
    return (
        currentScene === "park" &&
        frisbeeThrowMode &&
        frisbeeAttachedToHand &&
        !frisbeeFlying &&
        !frisbeeLanded
    );
}

function setFrisbeeHandCameraView() {

        /**
         * Save camera angle before switching to frisbee hand camera view.
         * This ensures that when you pick up the frisbee, the camera
         * maintains the direction you were already looking from.
         */
    var currentAngle = cameraAngle;

    if (isNaN(currentAngle)) {
        currentAngle = parseFloat(cameraAngleSlider.value);
    }

    if (isNaN(currentAngle)) {
        currentAngle = 358.0;
    }

    cameraFocusMode = "free";
    cameraDogAutoAngle = false;

    if (typeof updateDogCameraModeButton === "function") {
        updateDogCameraModeButton();
    }

    cameraPanOffset = vec3(0.0, 0.0, 0.0);


    //keep current angle, but set height and zoom specific for frisbee
    cameraAngle = currentAngle;
    cameraHeight = 0.4;
    cameraDistance = 13.0;
    cameraFov = 58.0;

    if (cameraAngleSlider) {
        cameraAngleSlider.value = cameraAngle.toFixed(0);
    }

    if (cameraHeightSlider) {
        cameraHeightSlider.value = cameraHeight.toFixed(1);
    }

    if (cameraDistanceSlider) {
        cameraDistanceSlider.value = cameraDistance.toFixed(1);
    }

    updateOrbitCameraFromSliders();
}

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


    var groundY = -2.32;

    
    //direction from the camera towards the frisbee in hand
    var dir = normalize(subtract(frisbeeStartPos, eye));

    
    //fall back if the ray is almost parallel to the ground
    if (Math.abs(dir[1]) < 0.001) {
        frisbeeEndPos = vec3(
            frisbeeStartPos[0],
            groundY,
            frisbeeStartPos[2] - 5.0
        );
    } else {
        var t = (groundY - eye[1]) / dir[1];

        // if t too small, the frisbee is too close to the camera, so we force a minimum distance
        if (t < 1.0) {
            t = 7.0;
        }

        // increase the throw distance
        var throwPower = 1.8;

        var endX = eye[0] + dir[0] * t * throwPower;
        var endZ = eye[2] + dir[2] * t * throwPower;

        // park boundaries
        endX = Math.max(-7.0, Math.min(7.0, endX));
        endZ = Math.max(-7.0, Math.min(7.0, endZ));

        
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

        function clamp01(x) {
            return Math.max(0.0, Math.min(1.0, x));
        }

        function lerpValue(a, b, t) {
            return a + (b - a) * t;
        }

        var rad = dogCurrentAngle * Math.PI / 180.0;

        var forwardX = Math.sin(rad);
        var forwardZ = Math.cos(rad);

        /*
            0 =  pickup pos
            1 = final position in mouth
        */
        var carryBlend = 1.0;

        if (
            typeof dogFetchObjectType !== "undefined" &&
            dogFetchObjectType === "frisbee" &&
            typeof dogFetchLoweringActive !== "undefined" &&
            dogFetchLoweringActive &&
            typeof frisbeePickupHoldTimer !== "undefined" &&
            typeof frisbeePickupHoldDuration !== "undefined"
        ) {
            var headLower = 0.0;

            if (typeof dogFetchLowerAmount !== "undefined") {
                headLower = clamp01(dogFetchLowerAmount / 0.50);
            }

            
            headLower = headLower * headLower * (3.0 - 2.0 * headLower);

            /*
                carryBlend:
                0 = low pick up position
                1 = final position in mouth
            */
            var carryBlend = 1.0 - headLower;
        }

        var mouthForwardOffset = lerpValue(
            frisbeePickupForwardOffset,
            frisbeeMouthForwardOffset,
            carryBlend
        );

        var mouthY = lerpValue(
            frisbeePickupY,
            frisbeeMouthY,
            carryBlend
        ); 

       
        var sideOffset = lerpValue(
            frisbeePickupSideOffset,
            frisbeeMouthSideOffset,
            carryBlend
        );

        var mouthScale = lerpValue(
            frisbeePickupScale,
            frisbeeMouthScale,
            carryBlend
        );

        var mouthTiltZ = lerpValue(
            frisbeePickupTiltZ,
            frisbeeMouthTiltZ,
            carryBlend
        );

        var sideX = Math.cos(rad) * sideOffset;
        var sideZ = -Math.sin(rad) * sideOffset;


        var mouthX =
            dogFetchX +
            forwardX * mouthForwardOffset +
            sideX;

        var mouthZ =
            dogFetchZ +
            forwardZ * mouthForwardOffset +
            sideZ;

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            translate(mouthX, mouthY, mouthZ)
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(dogCurrentAngle, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(90, [0, 1, 0])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            rotate(mouthTiltZ, [0, 0, 1])
        );

        modelMatrixFrisbee = mult(
            modelMatrixFrisbee,
            scalem(mouthScale, mouthScale, mouthScale)
        );

        return modelMatrixFrisbee;
    }
        

    
    // 1) Frisbee in the hand, ready to be thrown
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

    // 2) frisbee has landed on the ground after being thrown
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

    // trajectory arc
    var arcHeight = Math.sin(Math.PI * t) * 2.0;
    var y = frisbeeStartPos[1] + (frisbeeEndPos[1] - frisbeeStartPos[1]) * s + arcHeight;

    //frisbeeSpin += 22.0;
    var elapsedSeconds = (now - frisbeeStartTime) / 1000.0;
    frisbeeSpin = elapsedSeconds * 900.0;

    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        translate(x, y, z)
    );

    // quick spin while flying
    modelMatrixFrisbee = mult(
        modelMatrixFrisbee,
        rotate(frisbeeSpin, [0, 1, 0])
    );

    // horizonthal orientation
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
        Using the same area as the bench,
        but with a small extra margin to prevent the frisbee from landing
        right at the edge.
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
        Offset relative to the cursor/hand.
        Change these if the frisbee doesn't fit well in the palm.
    */
    mouseX += 18;
    mouseY += 12;

    var nx = (mouseX / rect.width) * 2.0 - 1.0;
    var ny = 1.0 - (mouseY / rect.height) * 2.0;

    var forward = normalize(subtract(at, eye));
    var right = normalize(cross(forward, up));
    var cameraUp = normalize(cross(right, forward));

    /*
        Distance of the frisbee from the camera.
        Lower = closer to user.
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
        In the park, we don't want to clamp to the room/table.
        But we keep a margin to prevent the dog from landing exactly on the frisbee.
    */
    var dx = targetX - dogFetchX;
    var dz = targetZ - dogFetchZ;
    var dist = Math.sqrt(dx * dx + dz * dz);

  

    var approachTarget = getSafeFrisbeeApproachTarget(
        dogFetchX,
        dogFetchZ,
        targetX,
        targetZ
    );

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
        Point near the camera, but projected onto the lawn.
        I don't use eye directly because the camera is high.
    */
    var forward = normalize(subtract(at, eye));

    var targetX = eye[0] + forward[0] * 3.0;
    var targetZ = eye[2] + forward[2] * 3.0;

    // park limits
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

    

    /*
        Even when returning with the frisbee, the dog must avoid the bench.
        Previously, it went directly towards the camera and could brush against the collider.
    */
    var safeReturnTarget = keepDogOutsideParkObstacles(
        targetX,
        targetZ
    );

    dogPath = computeDogPathAroundBench(
        dogFetchX,
        dogFetchZ,
        safeReturnTarget.x,
        safeReturnTarget.z
    );

    dogPathIndex = 0;
    dogFetchBallMode = dogPath && dogPath.length > 0;

    /*
        While walking, the dog looks at the first waypoint,
        not directly at the final target.
    */
    if (dogFetchBallMode) {
        dogFetchTarget = {
            x: dogPath[0].x,
            z: dogPath[0].z
        };
    } else {
        dogFetchTarget = {
            x: safeReturnTarget.x,
            z: safeReturnTarget.z
        };
    }
    console.log("Dog returns frisbee to saved target:", dogPath);
}

function getSafeFrisbeeApproachTarget(dogX, dogZ, frisbeeX, frisbeeZ) {
    /*
        Normal target: the dog stops a bit before the frisbee,
        so it doesn't place its body directly over the disc.
    */
    var dx = frisbeeX - dogX;
    var dz = frisbeeZ - dogZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    var frisbeeBodyStopOffset = 1.25;

    var directX = frisbeeX;
    var directZ = frisbeeZ;

    if (dist > 0.001) {
        directX = frisbeeX - (dx / dist) * frisbeeBodyStopOffset;
        directZ = frisbeeZ - (dz / dist) * frisbeeBodyStopOffset;
    }

    /*
        Actual rectangle of the bench used by the dog.
        
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
        If the direct target is reachable, use it.
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
        Problematic case:
        the frisbee is near/behind the bench.
        I try 4 points around the collider and choose the most convenient one.
    */
    var extra = 0.05;

    var candidates = [
        // left side of the collider
        {
            x: minX - extra,
            z: frisbeeZ
        },

        // right side of the collider
        {
            x: maxX + extra,
            z: frisbeeZ
        },

        // back side
        {
            x: frisbeeX,
            z: minZ - extra
        },

        // front side
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
            Prefer points close to the frisbee,
            but still reachable by the dog.
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
        Fallback: if nothing else works,
        at least don't send the dog into the bench.
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
        Cancels the dog's frisbee mission.
        Used when the frisbee is taken away while in flight
        or while the dog is already going to fetch it.
    */

    if (
        dogFetchObjectType !== "frisbee" &&
        !frisbeeAlreadyTargeted &&
        !dogHasFrisbee &&
        !dogReturningWithFrisbee
    ) {
        return;
    }

    // Stops movement towards the frisbee
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Stops lowering / fetching pose
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

     /*
        Complete reset of the frisbee.
        Important: if the dog is already going towards the frisbee,
        the path must also be cleared, otherwise it continues
        towards the old phantom target.
    */

    stopDogFrisbeeFetch();

    // Stop dog movement/fetch
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Stop visual target/rotation towards the frisbee
    dogLookAtBallX = dogFetchX;
    dogLookAtBallZ = dogFetchZ;

    // Stop dog states related to the frisbee
    dogHasFrisbee = false;
    dogReturningWithFrisbee = false;
    dogFetchObjectType = null;

    // Stop fetching / crouching animations
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    showDogMusicNote = false;
    dogHappySoundPlayed = false;

    // Reset frisbee states
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
        Stops the dog when the frisbee is no longer its target.
        Used both when putting away the frisbee and when taking it back in hand
        while the dog is going to fetch it.
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

