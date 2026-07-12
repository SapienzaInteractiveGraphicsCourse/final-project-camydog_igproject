var ballRadius = 0.20;


var ballVelX = 1.0;
var ballVelY = 4.0;
var ballVelZ = -4.0;
var ballBounce = 0.55;
var ballFriction = 0.35;
var ballFloorContact = null;

var ballAngVelX = 4.0;
var ballAngVelY = 0.0;
var ballAngVelZ = 2.0;
var ballLinearDamping = 0.12;
var ballAngularDamping = 0.25;

var ballIdleBounceActive = false;
var ballIdleBounceCount = 0;
var ballIdleBounceMax = 4;
var ballIdleBounceCooldown = 0;


var lastPhysicsTime = performance.now();

//curtain physics parameters
var curtainWindStrength = 0.07;

//collider table
var tableBody = null;

var TABLE_X = 0.0;
var TABLE_Y = -2.09;
var TABLE_Z = 0.0;

var TABLE_TOP_WIDTH  = 3.6;
var TABLE_TOP_HEIGHT = 0.18;
var TABLE_TOP_DEPTH  = 4.5;

var TABLE_TOP_OFFSET_Y = 0.70;

var TABLE_LEG_WIDTH  = 0.18;
var TABLE_LEG_HEIGHT = 1.20;
var TABLE_LEG_DEPTH  = 0.18;

var TABLE_LEG_OFFSET_Y = -0.15;

var TABLE_LEG_MARGIN_X = 0.41;
var TABLE_LEG_MARGIN_Z = 0.50;

///////////
var ballStoppedTimer = 0.0;
var ballAlreadyTargeted = false;

//area to avoid when dog goes to ball
var DOG_TABLE_AVOID_MARGIN = 0.7;
var halfW = TABLE_TOP_WIDTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
var halfD = TABLE_TOP_DEPTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
var dogPath = [];
var dogPathIndex = 0;
var dogCurrentWaypointIndex = 0;


var candidates = [
    { x: TABLE_X - halfW - 0.4, z: TABLE_Z }, // sinistra
    { x: TABLE_X + halfW + 0.4, z: TABLE_Z }, // destra
    { x: TABLE_X, z: TABLE_Z - halfD - 0.4 }, // dietro
    { x: TABLE_X, z: TABLE_Z + halfD + 0.4 }  // davanti
];

function checkBallOutsideHome() {
    if (currentScene !== "home") return;
    if (!miniGameActive) return;
    if (!ballVisible) return;
    if (!ballBody) return;

    var margin = 0.35;

    var x = ballBody.position.x;
    var y = ballBody.position.y;
    var z = ballBody.position.z;

    var outside =
        x < ROOM_MIN_X - margin ||
        x > ROOM_MAX_X + margin ||
        z < ROOM_MIN_Z - margin ||
        z > ROOM_MAX_Z + margin ||
        y < PHYSICS_FLOOR_Y - 1.2;

    if (outside) {
        ballOutsideHomeActive = true;

        /*
            Important: avoid dog logic to retarget the ball. 
            Before we had false, but in this case it must be true.
        */
       
        skinnedDogAlreadyTargeted = true;

        /*
            stop to avoid dog logic to retarget the ball.
        */
        dogFetchObjectType = null;
        dogFetchBallMode = false;
        dogFetchLoweringActive = false;
        dogFetchLowerAmount = 0.0;

        dogCrouchActive = false;
        dogCrouchAmount = 0.0;

        dogHasBall = false;

        dogPath = [];
        dogPathIndex = 0;

        dogFetchTarget = {
            x: dogFetchX,
            z: dogFetchZ
        };

        showDogMusicNote = false;

        if (typeof resetSkinnedDogBallInteraction === "function") {
            resetSkinnedDogBallInteraction();
        }

        if (!ballOutsideHomeWarningShown) {
            ballOutsideHomeWarningShown = true;

            showGameMessage(
                "The ball went outside the house!\nStop the ball minigame and try again.",
                2800
            );
        }

        return;
    }

    ballOutsideHomeActive = false;
    ballOutsideHomeWarningShown = false;
}



function getTableAvoidRect() {
    var halfW = TABLE_TOP_WIDTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
    var halfD = TABLE_TOP_DEPTH / 2.0 + DOG_TABLE_AVOID_MARGIN;

    return {
        minX: TABLE_X - halfW,
        maxX: TABLE_X + halfW,
        minZ: TABLE_Z - halfD,
        maxZ: TABLE_Z + halfD
    };
}

function isInsideTableAvoidZone(x, z) {
    var r = getTableAvoidRect();

    return (
        x > r.minX &&
        x < r.maxX &&
        z > r.minZ &&
        z < r.maxZ
    );
}

function getSafeDogBodyTargetForFetch(objectX, objectZ, stopOffset) {
    /*
        compute a point where the dog's body can stop to fetch the ball/frisbee.
        Important: the body point must not be inside the table zone, 
        otherwise the dog gets stuck on the edge.
    */

    var dx = objectX - dogFetchX;
    var dz = objectZ - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    var bodyTargetX = objectX;
    var bodyTargetZ = objectZ;

    if (dist > 0.001) {
        bodyTargetX = objectX - (dx / dist) * stopOffset;
        bodyTargetZ = objectZ - (dz / dist) * stopOffset;
    }

    if (currentScene === "home") {
        
        var safeBodyTarget = getReachableBallTarget(
            bodyTargetX,
            bodyTargetZ
        );

        safeBodyTarget = clampDogTargetToRoom(
            safeBodyTarget.x,
            safeBodyTarget.z
        );

        return safeBodyTarget;
    }

    /*
        in the park avoid  the obstacles
    */
    return keepDogOutsideParkObstacles(
        bodyTargetX,
        bodyTargetZ
    );
}


function getReachableBallTarget(ballX, ballZ) {
    var r = getTableAvoidRect();

    if (!isInsideTableAvoidZone(ballX, ballZ)) {
        return {
            x: ballX,
            z: ballZ
        };
    }

    
    // if the ball is inside/close to the table
    //choose the closest point on the external border of the danger zone
    var distLeft   = Math.abs(ballX - r.minX);
    var distRight  = Math.abs(r.maxX - ballX);
    var distBack   = Math.abs(ballZ - r.minZ);
    var distFront  = Math.abs(r.maxZ - ballZ);

    var minDist = Math.min(distLeft, distRight, distBack, distFront);

    var safeX = ballX;
    var safeZ = ballZ;

    var extra = 0.25; 
    //  extra distance to avoid the dog to get stuck on the edge of the table

    if (minDist === distLeft) {
        safeX = r.minX - extra;
    } else if (minDist === distRight) {
        safeX = r.maxX + extra;
    } else if (minDist === distBack) {
        safeZ = r.minZ - extra;
    } else {
        safeZ = r.maxZ + extra;
    }

    return {
        x: safeX,
        z: safeZ
    };
}

function dist2D(x1, z1, x2, z2) {
    var dx = x2 - x1;
    var dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
}


function segmentIntersectsTableAvoidZone(x1, z1, x2, z2) {
    var steps = 40;

    for (var i = 0; i <= steps; i++) {
        var t = i / steps;

        var x = x1 + (x2 - x1) * t;
        var z = z1 + (z2 - z1) * t;

        if (isInsideTableAvoidZone(x, z)) {
            return true;
        }
    }

    return false;
}



function computeDogPathToBall(startX, startZ, targetX, targetZ) {
    /*
       if dog can go straight to the ball, no waypoints are needed
    */
    if (!segmentIntersectsTableAvoidZone(startX, startZ, targetX, targetZ)) {
        return [
            { x: targetX, z: targetZ }
        ];
    }

    var r = getTableAvoidRect();

    var extra = 0.6;

    var corners = [
        { x: r.minX - extra, z: r.minZ - extra }, // back-left
        { x: r.maxX + extra, z: r.minZ - extra }, // back-right
        { x: r.minX - extra, z: r.maxZ + extra }, // front-left
        { x: r.maxX + extra, z: r.maxZ + extra }  // front-right
    ];

    var bestPath = null;
    var bestCost = Infinity;

    function firstStepBackwardPenalty(nextX, nextZ) {
        /*
            Penalizes paths where the first waypoint is in the opposite
            direction of the ball. This prevents the dog from taking a
            step backward before moving forward.
        */
        var toTargetX = targetX - startX;
        var toTargetZ = targetZ - startZ;

        var toNextX = nextX - startX;
        var toNextZ = nextZ - startZ;

        var lenTarget = Math.sqrt(
            toTargetX * toTargetX +
            toTargetZ * toTargetZ
        );

        var lenNext = Math.sqrt(
            toNextX * toNextX +
            toNextZ * toNextZ
        );

        if (lenTarget < 0.001 || lenNext < 0.001) {
            return 0.0;
        }

        var dot =
            (toTargetX * toNextX + toTargetZ * toNextZ) /
            (lenTarget * lenNext);

        if (dot < -0.15) {
            return 1000.0;
        }

        if (dot < 0.15) {
            return 8.0;
        }

        return 0.0;
    }

    /*
        Firstly I try paths with ONE corner. They are more natural and reduce strange turns.
    */
    for (var i = 0; i < corners.length; i++) {
        var c = corners[i];

        var bad1 =
            segmentIntersectsTableAvoidZone(
                startX,
                startZ,
                c.x,
                c.z
            );

        var bad2 =
            segmentIntersectsTableAvoidZone(
                c.x,
                c.z,
                targetX,
                targetZ
            );

        if (bad1 || bad2) {
            continue;
        }

        var cost =
            dist2D(startX, startZ, c.x, c.z) +
            dist2D(c.x, c.z, targetX, targetZ) +
            firstStepBackwardPenalty(c.x, c.z);

        if (cost < bestCost) {
            bestCost = cost;

            bestPath = [
                { x: c.x, z: c.z },
                { x: targetX, z: targetZ }
            ];
        }
    }

    /*
        2) If one corner is not enough, try paths with TWO corners.
    */
    for (var a = 0; a < corners.length; a++) {
        for (var b = 0; b < corners.length; b++) {
            if (a === b) continue;

            var c1 = corners[a];
            var c2 = corners[b];

            var badA =
                segmentIntersectsTableAvoidZone(
                    startX,
                    startZ,
                    c1.x,
                    c1.z
                );

            var badB =
                segmentIntersectsTableAvoidZone(
                    c1.x,
                    c1.z,
                    c2.x,
                    c2.z
                );

            var badC =
                segmentIntersectsTableAvoidZone(
                    c2.x,
                    c2.z,
                    targetX,
                    targetZ
                );

            if (badA || badB || badC) {
                continue;
            }

            var pathCost =
                dist2D(startX, startZ, c1.x, c1.z) +
                dist2D(c1.x, c1.z, c2.x, c2.z) +
                dist2D(c2.x, c2.z, targetX, targetZ) +
                firstStepBackwardPenalty(c1.x, c1.z);

            if (pathCost < bestCost) {
                bestCost = pathCost;

                bestPath = [
                    { x: c1.x, z: c1.z },
                    { x: c2.x, z: c2.z },
                    { x: targetX, z: targetZ }
                ];
            }
        }
    }

    /*
        Fallback: if something goes wrong, still try the target.
    */
    if (!bestPath) {
        return [
            { x: targetX, z: targetZ }
        ];
    }

    return bestPath;
}

function computeDogPathToBall_OLD(startX, startZ, targetX, targetZ) {
    // If the dog can go straight, no waypoints
    if (!segmentIntersectsTableAvoidZone(startX, startZ, targetX, targetZ)) {
        return [
            { x: targetX, z: targetZ }
        ];
    }

    var r = getTableAvoidRect();

    var extra = 0.6;

    var corners = [
        { x: r.minX - extra, z: r.minZ - extra }, // back-left
        { x: r.maxX + extra, z: r.minZ - extra }, // back-right
        { x: r.minX - extra, z: r.maxZ + extra }, // front-left
        { x: r.maxX + extra, z: r.maxZ + extra }  // front-right
    ];

    var bestPath = null;
    var bestCost = Infinity;

    for (var i = 0; i < corners.length; i++) {
        for (var j = 0; j < corners.length; j++) {
            if (i === j) continue;

            var c1 = corners[i];
            var c2 = corners[j];

            var bad1 = segmentIntersectsTableAvoidZone(startX, startZ, c1.x, c1.z);
            var bad2 = segmentIntersectsTableAvoidZone(c1.x, c1.z, c2.x, c2.z);
            var bad3 = segmentIntersectsTableAvoidZone(c2.x, c2.z, targetX, targetZ);

            if (bad1 || bad2 || bad3) {
                continue;
            }

            var cost =
                dist2D(startX, startZ, c1.x, c1.z) +
                dist2D(c1.x, c1.z, c2.x, c2.z) +
                dist2D(c2.x, c2.z, targetX, targetZ);

            if (cost < bestCost) {
                bestCost = cost;
                bestPath = [
                    c1,
                    c2,
                    { x: targetX, z: targetZ }
                ];
            }
        }
    }

    // Fallback: if something goes wrong, still try the target
    if (!bestPath) {
        var distFront =
            Math.abs(startZ - frontZ) +
            Math.abs(targetZ - frontZ);

        var distBack =
            Math.abs(startZ - backZ) +
            Math.abs(targetZ - backZ);

        var sideZ;

        if (distFront < distBack) {
            sideZ = frontZ;
        } else {
            sideZ = backZ;
        }

        var p1 = keepDogOutsideTable(startX, sideZ);
        p1 = clampDogTargetToRoom(p1.x, p1.z);

        var p2 = keepDogOutsideTable(targetX, sideZ);
        p2 = clampDogTargetToRoom(p2.x, p2.z);

        var p3 = keepDogOutsideTable(targetX, targetZ);
        p3 = clampDogTargetToRoom(p3.x, p3.z);

        return [
            { x: p1.x, z: p1.z },
            { x: p2.x, z: p2.z },
            { x: p3.x, z: p3.z }
        ];
    }

    return bestPath;
}

////////////////////// Bowl collider
function createBowlCollider() {
    var bowlShape = new CANNON.Cylinder(
        bowlColliderRadius,
        bowlColliderRadius,
        bowlColliderHeight,
        32
    );

    bowlBody = new CANNON.Body({
        mass: 0
    });
    
    bowlBody.collisionFilterGroup = GROUP_BOWL;
    bowlBody.collisionFilterMask = -1;

    bowlBody.addShape(bowlShape);

    bowlBody.position.set(
        bowlX,
        bowlColliderY,
        bowlZ
    );

    // same logic as the debug drawing
    bowlBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);

    physicsWorld.addBody(bowlBody);
}


function getBowlColliderMatrix() {
    var m = mat4();

    m = mult(m, translate(
        bowlX,
        bowlColliderY,
        bowlZ
    ));

    // cylinder along Z -> vertical on Y
    m = mult(m, rotate(90, [1, 0, 0]));

    m = mult(m, scalem(
        bowlColliderRadius,
        bowlColliderRadius,
        bowlColliderHeight
    ));

    return m;
}
/////////////////////////
//Bench collider
function getBenchColliderDebugMatrix() {
    var m = mat4();

    m = mult(
        m,
        translate(
            BENCH_COLLIDER_X,
            BENCH_COLLIDER_Y,
            BENCH_COLLIDER_Z
        )
    );

    // same rotation as the bench
    m = mult(
        m,
        rotate(BENCH_COLLIDER_ROT_Y, [0, 1, 0])
    );

    m = mult(
        m,
        scalem(
            BENCH_COLLIDER_WIDTH,
            BENCH_COLLIDER_HEIGHT,
            BENCH_COLLIDER_DEPTH
        )
    );

    return m;
}

// bowl physics
function updateWater(deltaTime) {
    var target = waterVisible ? 1.0 : 0.0;

    if (waterFillAmount < target) {
        waterFillAmount += waterFillSpeed * deltaTime;

        if (waterFillAmount > 1.0) {
            waterFillAmount = 1.0;
        }
    } else if (waterFillAmount > target) {
        waterFillAmount -= waterFillSpeed * deltaTime;

        if (waterFillAmount < 0.0) {
            waterFillAmount = 0.0;
        }
    }
}
/////////////////////////////////////////////////

/////////////////////////////////////////////////////////
// Food part -> Kibbles
// ///////////////////////////////////////////////////


function startKibblePour() {
    clearKibbleParticles();

    kibbleVisible = true;
    kibbleSpawnRemaining = numKibbles;
    kibbleSpawnTimer = 0.0;
    kibbleSpawnIndex = 0;
    playPouringFoodSound();
}

function updateKibbleSpawner(deltaTime) {
    if (!kibbleVisible) return;
    if (kibbleSpawnRemaining <= 0) return;

    kibbleSpawnTimer += deltaTime;

    if (kibbleSpawnTimer >= kibbleSpawnInterval) {
        kibbleSpawnTimer = 0.0;

        spawnOneKibble(kibbleSpawnIndex);

        kibbleSpawnIndex++;
        kibbleSpawnRemaining--;
    }
}

function spawnOneKibble(index) {
    var landing = getKibbleLandingSpot(index);

    /*
        Different starting point for each kibble.
        This way they appear poured, not all spawned from the same pixel.
    */
    var sourceX = bowlX - 0.18 + (index % 3) * 0.09 + (Math.random() - 0.5) * 0.04;
    var sourceY = bowlY + 0.90 + index * 0.015 + Math.random() * 0.04;
    var sourceZ = bowlZ - 0.20 + Math.floor(index / 3) * 0.05 + (Math.random() - 0.5) * 0.04;

    var kibbleShape = new CANNON.Sphere(kibbleRadius);

    var kibbleBody = new CANNON.Body({
        mass: 0.015,
        shape: kibbleShape,
        position: new CANNON.Vec3(sourceX, sourceY, sourceZ)
    });

    kibbleBody.collisionFilterGroup = GROUP_KIBBLE;
    kibbleBody.collisionFilterMask = GROUP_WORLD | GROUP_KIBBLE;

    kibbleBody.linearDamping = 0.90;
    kibbleBody.angularDamping = 0.92;

    /*
        NOT towards the center.
        Each kibble goes towards its own landing spot.
    */
    var dirX = landing.x - sourceX;
    var dirZ = landing.z - sourceZ;

    kibbleBody.velocity.set(
        dirX * 0.75 + (Math.random() - 0.5) * 0.015,
        -0.035,
        dirZ * 0.75 + (Math.random() - 0.5) * 0.015
    );

    kibbleBody.angularVelocity.set(
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 0.7
    );

    kibbleBody.allowSleep = true;
    kibbleBody.sleepSpeedLimit = 0.035;
    kibbleBody.sleepTimeLimit = 0.5;

    physicsWorld.addBody(kibbleBody);

    kibbleParticles.push({
        body: kibbleBody,
        radius: kibbleRadius,

        scaleX: 1.05 + Math.random() * 0.15,
        scaleY: 0.95 + Math.random() * 0.10,
        scaleZ: 1.00 + Math.random() * 0.15,

        age: 0.0,
        settled: false,

        finalX: landing.x,
        finalY: landing.y,
        finalZ: landing.z,

        rotX: Math.random() * 25.0,
        rotY: Math.random() * 360.0,
        rotZ: Math.random() * 25.0,

        meshIndex: Math.floor(Math.random() * kibbleObjects.length),
    });
}


function getKibbleLandingSpot(index) {
    var spots = [
        [ 0.00,  0.00, 0.000],
        [ 0.09,  0.03, 0.012],
        [-0.09,  0.02, 0.016],
        [ 0.04, -0.08, 0.020],
        [-0.05, -0.08, 0.024],
        [ 0.02,  0.08, 0.030],
        [ 0.10, -0.04, 0.036],
        [-0.10, -0.03, 0.040],
        [ 0.07,  0.08, 0.046],
        [-0.07,  0.08, 0.052]
    ];

    var p = spots[index % spots.length];

    return {
        x: bowlX + p[0],
        y: bowlY - 0.035 + p[2],
        z: bowlZ + p[1]
    };
}

function createKibbleCatchCollider() {
   

    var kibbleCatchShape = new CANNON.Cylinder(
        kibbleCatchRadius,
        kibbleCatchRadius,
        kibbleCatchHeight,
        32
    );

    kibbleCatchBody = new CANNON.Body({
        mass: 0
    });

     kibbleCatchBody.collisionFilterGroup = GROUP_CATCH;
    kibbleCatchBody.collisionFilterMask = -1;

    kibbleCatchBody.addShape(kibbleCatchShape);

    kibbleCatchBody.position.set(
        bowlX,
        bowlY +0.11,
        bowlZ
    );

    // same as the bowl collider: cylinder vertical on Y
    kibbleCatchBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);

    physicsWorld.addBody(kibbleCatchBody);
}
function createKibbleBowlWalls() {
    kibbleWallBodies = [];

    var angleStep = (2.0 * Math.PI) / kibbleWallSegments;

    var wallLength = (2.0 * Math.PI * kibbleWallRadius) / kibbleWallSegments;

    for (var i = 0; i < kibbleWallSegments; i++) {
        var angle = i * angleStep;

        var x = bowlX + Math.cos(angle) * kibbleWallRadius;
        var z = bowlZ + Math.sin(angle) * kibbleWallRadius;

        var wallShape = new CANNON.Box(
            new CANNON.Vec3(
                wallLength * 0.45,          // tangential length
                kibbleWallHeight * 0.5,     // height
                kibbleWallThickness * 0.5   // thickness
            )
        );

        var wallBody = new CANNON.Body({
            mass: 0
        });

        wallBody.addShape(wallShape);

        wallBody.position.set(
            x,
            bowlY + 0.11,
            z
        );

        // orient the box along the circular edge
        wallBody.quaternion.setFromEuler(
            0,
            Math.PI / 2.0 - angle,
            0
        );

        wallBody.collisionFilterGroup = GROUP_WORLD;
        wallBody.collisionFilterMask = -1;

        physicsWorld.addBody(wallBody);
        kibbleWallBodies.push(wallBody);
    }
}


function spawnKibbleParticles() {
    clearKibbleParticles();

    kibbleVisible = true;

    for (var i = 0; i < numKibbles; i++) {
        var angle = i * 2.399963 + Math.random() * 0.25;
        var spawnRadius = Math.sqrt(Math.random()) * 0.09;

        var startX = bowlX + Math.cos(angle) * spawnRadius;
        var startZ = bowlZ + Math.sin(angle) * spawnRadius;
        var startY = bowlY + 0.75 + Math.random() * 0.25 + i * 0.002;

        var kibbleShape = new CANNON.Sphere(kibbleRadius);

        var kibbleBody = new CANNON.Body({
            mass: 0.008,
            shape: kibbleShape,
            position: new CANNON.Vec3(startX, startY, startZ)
        });

        kibbleBody.collisionFilterGroup = GROUP_KIBBLE;

        // no collision between kibbles, only with bowl/catch/invisible floor
        kibbleBody.collisionFilterMask = GROUP_WORLD ; //  |  GROUP_KIBBLE      ;

        kibbleBody.linearDamping = 0.94;
        kibbleBody.angularDamping = 0.96;

        kibbleBody.velocity.set(
            (Math.random() - 0.5) * 0.002,
            -0.01,
            (Math.random() - 0.5) * 0.002
        );

        kibbleBody.angularVelocity.set(
            Math.random() * 0.15,
            Math.random() * 0.15,
            Math.random() * 0.15
        );

        kibbleBody.allowSleep = true;
        kibbleBody.sleepSpeedLimit = 0.03;
        kibbleBody.sleepTimeLimit = 0.25;

        physicsWorld.addBody(kibbleBody);

        kibbleParticles.push({
            body: kibbleBody,
            radius: kibbleRadius,

            scaleX: 1.0,
            scaleY: 1.0,
            scaleZ: 1.0,

            yOffset: Math.random() * 0.03,
            age: 0.0,

            meshIndex: Math.floor(Math.random() * kibbleObjects.length)
        });
    }
}

function clearKibbleParticles() {
    for (var i = 0; i < kibbleParticles.length; i++) {
        if (kibbleParticles[i].body) {
            physicsWorld.removeBody(kibbleParticles[i].body);
        }
    }

    kibbleParticles = [];
    kibbleVisible = false;
}




function drawKibbleParticles(viewMatrix, projectionMatrix) {
    if (!kibbleVisible) return;
    if (!kibbleObjects || kibbleObjects.length === 0) return;

    for (var i = 0; i < kibbleParticles.length; i++) {
        var kibble = kibbleParticles[i];

        var x, y, z;

        if (kibble.settled) {
            x = kibble.finalX;
            y = kibble.finalY;
            z = kibble.finalZ;
        } else {
            if (!kibble.body) continue;

            x = kibble.body.position.x;
            y = kibble.body.position.y;
            z = kibble.body.position.z;
        }

        var modelMatrixKibble = mat4();

        modelMatrixKibble = mult(
            modelMatrixKibble,
            translate(x, y, z)
        );

        modelMatrixKibble = mult(
            modelMatrixKibble,
            rotate(kibble.rotY, [0, 1, 0])
        );

        modelMatrixKibble = mult(
            modelMatrixKibble,
            rotate(kibble.rotX, [1, 0, 0])
        );

        modelMatrixKibble = mult(
            modelMatrixKibble,
            rotate(kibble.rotZ, [0, 0, 1])
        );

        modelMatrixKibble = mult(
            modelMatrixKibble,
            scalem(
                kibble.radius * kibbleVisualScale * kibble.scaleX,
                kibble.radius * kibbleVisualScale * kibble.scaleY,
                kibble.radius * kibbleVisualScale * kibble.scaleZ
            )
        );

        var obj = kibbleObjects[kibble.meshIndex];

        drawObject(
            obj,
            kibbleTexture,
            modelMatrixKibble,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            true
        );
    }
}

function keepKibblesInsideBowl() {
    if (!kibbleVisible) return;

    var minY = bowlY + 0.0;

    for (var i = 0; i < kibbleParticles.length; i++) {
        var body = kibbleParticles[i].body;

        if (body.position.y < minY) {
            body.position.y = minY;

            body.velocity.set(0.0, 0.0, 0.0);
            body.angularVelocity.set(0.0, 0.0, 0.0);

            body.sleep();
        }
    }
}




function updateKibbles(deltaTime) {
    if (!kibbleVisible) return;

    for (var i = 0; i < kibbleParticles.length; i++) {
        var kibble = kibbleParticles[i];

        if (kibble.settled) {
            continue;
        }

        var body = kibble.body;
        if (!body) continue;

        kibble.age += deltaTime;

        if (body.velocity.y < -kibbleMaxFallSpeed) {
            body.velocity.y = -kibbleMaxFallSpeed;
        }

        
        //when it enters the bowl, I "freeze" it
        if (kibble.age > 0.45 && body.position.y < bowlY + 0.12) {
            kibble.settled = true;

            // remove the body from Cannon: from now on it is visually static
            physicsWorld.removeBody(body);
            kibble.body = null;
        }
    }
}



///////////////////////////////////
function getBowlFinalRadiusForDog() {
    return bowlColliderRadius + BOWL_FINAL_MARGIN;
}

function getBowlAvoidRadiusForDog() {
    return bowlColliderRadius + BOWL_STAND_MARGIN;
}

function keepDogOutsideBowl(x, z) {
    var radius = getBowlAvoidRadiusForDog();

    var dx = x - bowlX;
    var dz = z - bowlZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist >= radius) {
        return {
            x: x,
            z: z
        };
    }

    if (dist < 0.001) {
        dx = 1.0;
        dz = 0.0;
        dist = 1.0;
    }

    dx /= dist;
    dz /= dist;

    return {
        x: bowlX + dx * radius,
        z: bowlZ + dz * radius
    };
}

function slideDogCloserToBowlWhileLowering() {
    var finalRadius = getBowlFinalRadiusForDog();

    var dx = dogFetchX - bowlX;
    var dz = dogFetchZ - bowlZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.001) {
        return;
    }

    if (dist <= finalRadius) {
        return;
    }

    dx /= dist;
    dz /= dist;

    var targetX = bowlX + dx * finalRadius;
    var targetZ = bowlZ + dz * finalRadius;

    dogFetchX += (targetX - dogFetchX) * 0.035;
    dogFetchZ += (targetZ - dogFetchZ) * 0.035;
}

function keepDogOutsideTeapotChaseObstacles(x, z) {
   

    /*
    Order:
    1. room limits
    2. outside the table
    3. outside the bowl
    4. recheck table/room
    */ 

    var p = clampDogTargetToRoom(x, z);

    p = keepDogOutsideTable(p.x, p.z);
    p = keepDogOutsideBowl(p.x, p.z);

    p = keepDogOutsideTable(p.x, p.z);
    p = clampDogTargetToRoom(p.x, p.z);

    return p;
}

function segmentIntersectsBowlAvoidZone(startX, startZ, targetX, targetZ) {
    var radius = getBowlAvoidRadiusForDog();

    var vx = targetX - startX;
    var vz = targetZ - startZ;

    var wx = bowlX - startX;
    var wz = bowlZ - startZ;

    var len2 = vx * vx + vz * vz;

    if (len2 < 0.001) {
        return false;
    }

    var t = (wx * vx + wz * vz) / len2;
    t = Math.max(0.0, Math.min(1.0, t));

    var closestX = startX + vx * t;
    var closestZ = startZ + vz * t;

    var dx = closestX - bowlX;
    var dz = closestZ - bowlZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    return dist < radius;
}

function computeDogPathAroundBowl(startX, startZ, targetX, targetZ) {
    if (!segmentIntersectsBowlAvoidZone(startX, startZ, targetX, targetZ)) {
        return [
            {
                x: targetX,
                z: targetZ
            }
        ];
    }

    var radius = getBowlAvoidRadiusForDog() + 0.45;

    var dirX = targetX - startX;
    var dirZ = targetZ - startZ;

    var len = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (len < 0.001) {
        return [
            {
                x: targetX,
                z: targetZ
            }
        ];
    }

    dirX /= len;
    dirZ /= len;

    var perpX = -dirZ;
    var perpZ = dirX;

    var sideA = keepDogOutsideTeapotChaseObstacles(
        bowlX + perpX * radius,
        bowlZ + perpZ * radius
    );

    var sideB = keepDogOutsideTeapotChaseObstacles(
        bowlX - perpX * radius,
        bowlZ - perpZ * radius
    );

    var costA =
        dist2D(startX, startZ, sideA.x, sideA.z) +
        dist2D(sideA.x, sideA.z, targetX, targetZ);

    var costB =
        dist2D(startX, startZ, sideB.x, sideB.z) +
        dist2D(sideB.x, sideB.z, targetX, targetZ);

    var best = costA < costB ? sideA : sideB;

    return [
        {
            x: best.x,
            z: best.z
        },
        {
            x: targetX,
            z: targetZ
        }
    ];
}


function computeDogPathToTeapot(startX, startZ, targetX, targetZ) {
    /*
        Path for Teapot Chase.

        I create wide paths around the table and choose the shortest one
        among: front, back, left, right.
        The dog should never aim directly through the table.
    */

    var safeTarget = keepDogOutsideTeapotChaseObstacles(
        targetX,
        targetZ
    );

    if (typeof pushTeapotTargetAwayFromTable === "function") {
        safeTarget = pushTeapotTargetAwayFromTable(
            safeTarget.x,
            safeTarget.z
        );
    }

    /*
        If the direct path does not cross the table,
        it can go directly.
    */
    if (
        !segmentIntersectsTableAvoidZone(
            startX,
            startZ,
            safeTarget.x,
            safeTarget.z
        )
    ) {
        return [
            {
                x: safeTarget.x,
                z: safeTarget.z
            }
        ];
    }

    var r = getTableAvoidRect();

    var extra =
        typeof DOG_TEAPOT_PATH_EXTRA !== "undefined"
            ? DOG_TEAPOT_PATH_EXTRA
            : 1.65;

    var frontZ = r.maxZ + extra;
    var backZ  = r.minZ - extra;
    var leftX  = r.minX - extra;
    var rightX = r.maxX + extra;

    var candidates = [
        // giro davanti al tavolo
        [
            { x: startX,       z: frontZ },
            { x: safeTarget.x, z: frontZ },
            { x: safeTarget.x, z: safeTarget.z }
        ],

        // giro dietro al tavolo
        [
            { x: startX,       z: backZ },
            { x: safeTarget.x, z: backZ },
            { x: safeTarget.x, z: safeTarget.z }
        ],

        // giro a sinistra del tavolo
        [
            { x: leftX,        z: startZ },
            { x: leftX,        z: safeTarget.z },
            { x: safeTarget.x, z: safeTarget.z }
        ],

        // giro a destra del tavolo
        [
            { x: rightX,       z: startZ },
            { x: rightX,       z: safeTarget.z },
            { x: safeTarget.x, z: safeTarget.z }
        ]
    ];

    var bestPath = null;
    var bestCost = Infinity;

    for (var i = 0; i < candidates.length; i++) {
        var rawPath = candidates[i];
        var path = [];
        var currentX = startX;
        var currentZ = startZ;
        var cost = 0.0;
        var badPath = false;

        for (var j = 0; j < rawPath.length; j++) {
            var p = clampDogTargetToRoom(
                rawPath[j].x,
                rawPath[j].z
            );

            p = keepDogOutsideTeapotChaseObstacles(
                p.x,
                p.z
            );

            if (
                segmentIntersectsTableAvoidZone(
                    currentX,
                    currentZ,
                    p.x,
                    p.z
                )
            ) {
                badPath = true;
                break;
            }

            cost += dist2D(
                currentX,
                currentZ,
                p.x,
                p.z
            );

            path.push({
                x: p.x,
                z: p.z
            });

            currentX = p.x;
            currentZ = p.z;
        }

        if (!badPath && cost < bestCost) {
            bestCost = cost;
            bestPath = path;
        }
    }

    /*
        Fallback: if for some reason all paths are problematic,
        I still choose a wide turn in front/back, never the direct path.
    */
    if (!bestPath) {
        var frontCost =
            Math.abs(startZ - frontZ) +
            Math.abs(safeTarget.z - frontZ);

        var backCost =
            Math.abs(startZ - backZ) +
            Math.abs(safeTarget.z - backZ);

        var sideZ = frontCost < backCost ? frontZ : backZ;

        var p1 = clampDogTargetToRoom(startX, sideZ);
        p1 = keepDogOutsideTeapotChaseObstacles(p1.x, p1.z);

        var p2 = clampDogTargetToRoom(safeTarget.x, sideZ);
        p2 = keepDogOutsideTeapotChaseObstacles(p2.x, p2.z);

        var p3 = keepDogOutsideTeapotChaseObstacles(
            safeTarget.x,
            safeTarget.z
        );

        bestPath = [
            { x: p1.x, z: p1.z },
            { x: p2.x, z: p2.z },
            { x: p3.x, z: p3.z }
        ];
    }

    /*
        Remove nearly identical points, so the dog doesn't make unnecessary micro-rotations.
    */
    var cleanedPath = [];
    var lastX = startX;
    var lastZ = startZ;

    for (var c = 0; c < bestPath.length; c++) {
        if (
            dist2D(
                lastX,
                lastZ,
                bestPath[c].x,
                bestPath[c].z
            ) > 0.35
        ) {
            cleanedPath.push(bestPath[c]);
            lastX = bestPath[c].x;
            lastZ = bestPath[c].z;
        }
    }

    if (cleanedPath.length === 0) {
        cleanedPath.push({
            x: safeTarget.x,
            z: safeTarget.z
        });
    }

    return cleanedPath;
}
function pushTeapotTargetAwayFromTable(x, z) {
    /*
        If the dog's target for the teapot is too close to the table,
        I move it to the nearest outer side.
        This way, the dog doesn't try to stop right at the edge of the table.
    */

    var r = getTableAvoidRect();

    var extra =
        typeof DOG_TEAPOT_TABLE_TARGET_EXTRA !== "undefined"
            ? DOG_TEAPOT_TABLE_TARGET_EXTRA
            : 0.85;

    var minX = r.minX - extra;
    var maxX = r.maxX + extra;
    var minZ = r.minZ - extra;
    var maxZ = r.maxZ + extra;

    /*
        If the point is already far enough from the table,
        I don't modify it.
    */
    if (
        x < minX ||
        x > maxX ||
        z < minZ ||
        z > maxZ
    ) {
        return {
            x: x,
            z: z
        };
    }

    /*
        The point is inside the "too close" zone.
        I move it towards the nearest edge of the expanded zone.
    */
    var distLeft = Math.abs(x - minX);
    var distRight = Math.abs(maxX - x);
    var distBack = Math.abs(z - minZ);
    var distFront = Math.abs(maxZ - z);

    var minDist = Math.min(
        distLeft,
        distRight,
        distBack,
        distFront
    );

    if (minDist === distLeft) {
        x = minX;
    } else if (minDist === distRight) {
        x = maxX;
    } else if (minDist === distBack) {
        z = minZ;
    } else {
        z = maxZ;
    }

    var p = clampDogTargetToRoom(x, z);

    /*
        Recheck the bowl as well, because in your case there's also the bowl.
    */
    p = keepDogOutsideBowl(p.x, p.z);
    p = clampDogTargetToRoom(p.x, p.z);

    return p;
}

function getSafeDogTargetNearTeapot(teapotX, teapotZ) {
    /*
        The teapot is up.
        The dog follows its X/Z projection,
        but stops at a safe distance.
    */

    var dx = teapotX - dogFetchX;
    var dz = teapotZ - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    var targetX = teapotX;
    var targetZ = teapotZ;

    if (dist > 0.001) {
        targetX = teapotX - (dx / dist) * TEAPOT_CHASE_STOP_OFFSET;
        targetZ = teapotZ - (dz / dist) * TEAPOT_CHASE_STOP_OFFSET;
    }

     var safeTarget = keepDogOutsideTeapotChaseObstacles(
        targetX,
        targetZ
    );

    /*
        Extra safety:
        if the teapot is near the table, the dog's target is moved
        further out, so it doesn't get stuck on the edge.
    */
    safeTarget = pushTeapotTargetAwayFromTable(
        safeTarget.x,
        safeTarget.z
    );

    return safeTarget;
}


function updateDogFollowTeapot(deltaTime) {
    if (!dogFollowTeapotMode) {
        return;
    }

    if (currentScene !== "home") {
        return;
    }

    //if dog is eating/drinking or busy at bowl, stop following teapot
    if (blockActionIfDogBusyAtBowl()) {
        dogFollowTeapotMode = false;

        var teapotButton = document.getElementById("ButtonTeapotChase");
        if (teapotButton) {
            teapotButton.classList.remove("active");
        }

        if (typeof updateTeapotControlsLegend === "function") {
            updateTeapotControlsLegend();
        }

        return;
    }

    var teapotX = objPos[0];
    var teapotZ = objPos[2];

    /*
        The dog always looks at the real teapot,
        but doesn't start immediately while I'm moving it.
    */
    dogLookAtBallX = teapotX;
    dogLookAtBallZ = teapotZ;

    dogFetchTarget = {
        x: teapotX,
        z: teapotZ
    };

    /*
        Check if the teapot is moving.
        If it is, the dog waits still.
    */
    var observedMove = dist2D(
        dogTeapotLastObservedX,
        dogTeapotLastObservedZ,
        teapotX,
        teapotZ
    );

    if (observedMove > DOG_TEAPOT_STILL_EPSILON) {
        dogTeapotStillTimer = 0.0;

        dogTeapotLastObservedX = teapotX;
        dogTeapotLastObservedZ = teapotZ;

        /*
            While I'm moving the teapot, the dog doesn't chase.
            This way, it doesn't continuously recalculate strange paths around the table.
        */
        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        dogFetchObjectType = "teapot";

        showDogMusicNote = false;

        return;
    }

    /*
        If the teapot is not moving, accumulate time.
        The dog will start only after DOG_TEAPOT_WAIT_AFTER_MOVE seconds.
    */
    dogTeapotStillTimer += deltaTime;

    if (dogTeapotStillTimer < DOG_TEAPOT_WAIT_AFTER_MOVE) {
        return;
    }

    dogFollowTeapotRepathTimer += deltaTime;

    var movedX = teapotX - dogFollowTeapotLastX;
    var movedZ = teapotZ - dogFollowTeapotLastZ;

    var teapotMoved = Math.sqrt(
        movedX * movedX +
        movedZ * movedZ
    );

    /*
        If the dog is already going towards the final position
        and the teapot hasn't moved enough, don't recalculate.
    */
    if (
        dogFetchBallMode &&
        dogFollowTeapotRepathTimer < DOG_TEAPOT_REPATH_INTERVAL &&
        teapotMoved < DOG_TEAPOT_MIN_MOVE_TO_REPATH
    ) {
        return;
    }

    var safeTarget = getSafeDogTargetNearTeapot(
        teapotX,
        teapotZ
    );

    dogPath = computeDogPathToTeapot(
        dogFetchX,
        dogFetchZ,
        safeTarget.x,
        safeTarget.z
    );

    dogPathIndex = 0;
    dogFetchBallMode = true;

    dogFetchObjectType = "teapot";

    showDogMusicNote = true;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogFollowTeapotLastX = teapotX;
    dogFollowTeapotLastZ = teapotZ;
    dogFollowTeapotRepathTimer = 0.0;
}


//////////////////////////////////////////////


function createTableCompoundCollider() {
    tableBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(TABLE_X, TABLE_Y, TABLE_Z)
    });

    var topShape = new CANNON.Box(new CANNON.Vec3(
        TABLE_TOP_WIDTH / 2.0,
        TABLE_TOP_HEIGHT / 2.0,
        TABLE_TOP_DEPTH / 2.0
    ));

    var legShape = new CANNON.Box(new CANNON.Vec3(
        TABLE_LEG_WIDTH / 2.0,
        TABLE_LEG_HEIGHT / 2.0,
        TABLE_LEG_DEPTH / 2.0
    ));

    var legOffsetX = TABLE_TOP_WIDTH / 2.0 - TABLE_LEG_MARGIN_X;
    var legOffsetZ = TABLE_TOP_DEPTH / 2.0 - TABLE_LEG_MARGIN_Z;

    tableBody.addShape(
        topShape,
        new CANNON.Vec3(0.0, TABLE_TOP_OFFSET_Y, 0.0)
    );

    tableBody.addShape(
        legShape,
        new CANNON.Vec3(-legOffsetX, TABLE_LEG_OFFSET_Y, -legOffsetZ)
    );

    tableBody.addShape(
        legShape,
        new CANNON.Vec3(legOffsetX, TABLE_LEG_OFFSET_Y, -legOffsetZ)
    );

    tableBody.addShape(
        legShape,
        new CANNON.Vec3(-legOffsetX, TABLE_LEG_OFFSET_Y, legOffsetZ)
    );

    tableBody.addShape(
        legShape,
        new CANNON.Vec3(legOffsetX, TABLE_LEG_OFFSET_Y, legOffsetZ)
    );

    tableBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 1, 0),
        tableTheta * Math.PI / 180.0
    );

    physicsWorld.addBody(tableBody);
}

function initPhysics() {
    physicsWorld = new CANNON.World();

    physicsWorld.gravity.set(0, -9.82, 0);
    physicsWorld.broadphase = new CANNON.NaiveBroadphase();
    physicsWorld.solver.iterations = 20;
    
    physicsWorld.solver.tolerance = 0.0001;

    // Materials
    var ballMaterial = new CANNON.Material("ballMaterial");
    var floorMaterial = new CANNON.Material("floorMaterial");

    var ballFloorContact = new CANNON.ContactMaterial(
        ballMaterial,
        floorMaterial,
        {
            friction: ballFriction,
            restitution: ballBounce // rimbalzo
        }
    );

    physicsWorld.addContactMaterial(ballFloorContact);

    // Invisible physical floor
    var floorShape = new CANNON.Plane();
    var floorBody = new CANNON.Body({
        mass: 0,
        material: floorMaterial
    });

    floorBody.collisionFilterGroup = GROUP_WORLD;
    floorBody.collisionFilterMask = -1;

    floorBody.addShape(floorShape);

    // The default Cannon Plane is vertical: rotate it to horizontal
    floorBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2
    );
    floorBody.position.set(0.0, PHYSICS_FLOOR_Y, 0.0);

    physicsWorld.addBody(floorBody);

    // ===== Invisible physical walls =====
    // vertical center of the walls
    var wallCenterY = PHYSICS_FLOOR_Y + WALL_HEIGHT * 0.5;

    // parete sinistra
    addStaticBoxCollider(
        ROOM_MIN_X,
        wallCenterY,
        0.0,
        WALL_THICKNESS,
        WALL_HEIGHT,
        ROOM_MAX_Z - ROOM_MIN_Z,
        floorMaterial
    );

    // parete destra
    addStaticBoxCollider(
        ROOM_MAX_X,
        wallCenterY,
        0.0,
        WALL_THICKNESS,
        WALL_HEIGHT,
        ROOM_MAX_Z - ROOM_MIN_Z,
        floorMaterial
    );

    // parete dietro
    addStaticBoxCollider(
        0.0,
        wallCenterY,
        ROOM_MIN_Z,
        ROOM_MAX_X - ROOM_MIN_X,
        WALL_HEIGHT,
        WALL_THICKNESS,
        floorMaterial
    );

    // ===== Invisible physical collider for the table =====
    // WARNING: these values need to be adjusted based on your visible table

   
    // collider table
    createTableCompoundCollider();

    //collider for bowl
    createBowlCollider();

    // collider for kibbles
    createKibbleCatchCollider();

    // ===== Invisible physical collider for the ball =====
    var ballShape = new CANNON.Sphere(ballRadius);

    ballBody = new CANNON.Body({
        mass: 1.0,
        material: ballMaterial,
        position: new CANNON.Vec3(0.0, 2.5, 3.0)
    });

    ballBody.addShape(ballShape);

    // A bit of damping to prevent it from bouncing forever
    ballBody.linearDamping = 0.35;
    ballBody.angularDamping = 0.75;

    physicsWorld.addBody(ballBody);

    // Initially hide it below the scene
    ballBody.position.set(0.0, -100.0, 0.0);
}

function startBallMiniGame() {

     if (blockActionIfDogBusyAtBowl()) {
        return;
    }

    if (!ballBody) {
        console.warn("ballBody not initialized yet");
        return;
    }

    ballVisible = true;
    dogHasBall = false;

    
    ballIdleBounceActive = false;
    ballIdleBounceCount = 0;
    ballIdleBounceCooldown = 0;

    // Reset ball position
    ballBody.position.set(0.0, PHYSICS_FLOOR_Y + 3.0, 7.0);

    // REVIEW - MODIFICATION FOR BALL FPS DROP IN FIREFOX
    resetBallRenderPositionToPhysics();


    // Reset velocity
    ballBody.velocity.set(0.0, 0.0, 0.0);
    ballBody.angularVelocity.set(0.0, 0.0, 0.0);

    // Initial launch
    ballBody.velocity.set(ballVelX, ballVelY, ballVelZ);
    ballBody.angularVelocity.set(ballAngVelX, ballAngVelY, ballAngVelZ);
    ballBody.linearDamping = ballLinearDamping;
    ballBody.angularDamping = ballAngularDamping;

}

function stopBallMiniGame() {
    ballVisible = false;
    showDogMusicNote = false;

    resetTeapotBreak();

    // REVIEW - MODIFICATION FOR BALL FPS DROP IN FIREFOX
    ballRenderInitialized = false;


    if (!ballBody) return;

    ballBody.velocity.set(0.0, 0.0, 0.0);
    ballBody.angularVelocity.set(0.0, 0.0, 0.0);

    // Move it below the room
   ballBody.position.set(0.0, -50.0, 4.0);
}

function addStaticBoxCollider(x, y, z, sx, sy, sz, material) {
    var shape = new CANNON.Box(new CANNON.Vec3(
        sx * 0.5,
        sy * 0.5,
        sz * 0.5
    ));

    var body = new CANNON.Body({
        mass: 0,
        material: material
    });

    body.addShape(shape);
    body.position.set(x, y, z);

    physicsWorld.addBody(body);

    return body;
}

function isBallOnGround() {
    if (!ballBody) return false;

    var groundY = PHYSICS_FLOOR_Y + ballRadius + 0.12;

    return (
        ballBody.position.y <= groundY &&
        Math.abs(ballBody.velocity.y) < 0.45
    );
}

function isBallOnTable() {
    if (!ballBody) {
        return false;
    }

    /*
        Check X/Z: the ball is inside the table top area.
        Use the actual table top, not the wide area used to avoid the dog.
    */
    var halfW = TABLE_TOP_WIDTH / 2.0 + ballRadius * 0.6;
    var halfD = TABLE_TOP_DEPTH / 2.0 + ballRadius * 0.6;

    var insideTableXZ =
        ballBody.position.x > TABLE_X - halfW &&
        ballBody.position.x < TABLE_X + halfW &&
        ballBody.position.z > TABLE_Z - halfD &&
        ballBody.position.z < TABLE_Z + halfD;

    if (!insideTableXZ) {
        return false;
    }

    /*
        Height of the table top.
        The ball above the table has its center approximately at:
        topSurfaceY + ballRadius.
    */
    var tableTopSurfaceY =
        TABLE_Y +
        TABLE_TOP_OFFSET_Y +
        TABLE_TOP_HEIGHT / 2.0;

    var expectedBallY = tableTopSurfaceY + ballRadius;

    var nearTableTop =
        ballBody.position.y > expectedBallY - 0.45 &&
        ballBody.position.y < expectedBallY + 0.65;

    return nearTableTop;
}

//function to check if the ball is almost stopped (used to trigger idle bounce)
function isBallAlmostStopped() {
    if (!ballBody) return false;

    var v = ballBody.velocity;
    var speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

    // threshold: if it's almost stopped
    return speed < 0.15 && ballBody.position.y < PHYSICS_FLOOR_Y + ballRadius + 0.15;
}




function startBallBounceAnimation() {
    if (blockActionIfDogBusyAtBowl()) {
        return;
    }

    if (!ballBody || !ballVisible) {
        console.warn("Ball is not visible yet");
        return;
    }

    ballIdleBounceActive = true;
    ballIdleBounceCount = 0;
    ballIdleBounceCooldown = 0;

    ballBody.velocity.x = 0.0;
    ballBody.velocity.z = 0.0;
    ballBody.velocity.y = 0.0;

    ballBody.angularVelocity.set(0.0, 0.0, 0.0);
}

function updateBallBounceAnimation() {
    if (!ballIdleBounceActive || !ballBody || !ballVisible) {
        return;
    }

    // After the first bounce, wait for the ball to return to the ground
    if (ballIdleBounceCount > 0 && !isBallOnGround()) {
        return;
    }

    if (ballIdleBounceCount < ballIdleBounceMax) {
        var bounceStrength = 3.2 - ballIdleBounceCount * 0.40;

        ballBody.velocity.x = 0.0;
        ballBody.velocity.z = 0.0;
        ballBody.velocity.y = bounceStrength;

        ballBody.angularVelocity.set(
            2.0,
            0.8,
            1.5
        );

        ballIdleBounceCount++;
    } else {
        ballIdleBounceActive = false;
        ballBody.angularVelocity.set(0.0, 0.0, 0.0);
    }
}


 function updateDogMovement(deltaTime) {
    if (!dogMovingToBall) return;

    var dx = dogTargetX - dogPosX;
    var dz = dogTargetZ - dogPosZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
        dogMovingToBall = false;
        return;
    }

    var dogSpeed = 1.2; // unità al secondo

    var dirX = dx / dist;
    var dirZ = dz / dist;

    dogPosX += dirX * dogSpeed * deltaTime;
    dogPosZ += dirZ * dogSpeed * deltaTime;
}
 

function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}

function keepDogOutsideParkObstacles(x, z) {
    /*
        This function uses the same values as the debug box.
        So what you see is what blocks the dog.
    */

    var halfX = BENCH_COLLIDER_DEPTH / 2.0 + BENCH_DOG_MARGIN;
    var halfZ = BENCH_COLLIDER_WIDTH / 2.0 + BENCH_DOG_MARGIN;

    var minX = BENCH_COLLIDER_X - halfX;
    var maxX = BENCH_COLLIDER_X + halfX;

    var minZ = BENCH_COLLIDER_Z - halfZ;
    var maxZ = BENCH_COLLIDER_Z + halfZ;

    if (x > minX && x < maxX && z > minZ && z < maxZ) {
        var distLeft  = Math.abs(x - minX);
        var distRight = Math.abs(x - maxX);
        var distBack  = Math.abs(z - minZ);
        var distFront = Math.abs(z - maxZ);

        var minDist = Math.min(
            distLeft,
            distRight,
            distBack,
            distFront
        );

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
function segmentIntersectsBenchCollider(x1, z1, x2, z2) {
    var halfX = BENCH_COLLIDER_DEPTH / 2.0 + BENCH_DOG_MARGIN;
    var halfZ = BENCH_COLLIDER_WIDTH / 2.0 + BENCH_DOG_MARGIN;

    var minX = BENCH_COLLIDER_X - halfX;
    var maxX = BENCH_COLLIDER_X + halfX;
    var minZ = BENCH_COLLIDER_Z - halfZ;
    var maxZ = BENCH_COLLIDER_Z + halfZ;

    var steps = 40;

    for (var i = 0; i <= steps; i++) {
        var t = i / steps;

        var x = x1 + (x2 - x1) * t;
        var z = z1 + (z2 - z1) * t;

        if (x > minX && x < maxX && z > minZ && z < maxZ) {
            return true;
        }
    }

    return false;
}

function computeDogPathAroundBench(startX, startZ, targetX, targetZ) {
    /*
        If the direct path does not cross the bench,
        the dog goes directly to the target.
    */
    if (!segmentIntersectsBenchCollider(startX, startZ, targetX, targetZ)) {
        return [
            {
                x: targetX,
                z: targetZ
            }
        ];
    }

    /*
        Otherwise, go through one of the outer corners of the bench area.
    */
    var halfX = BENCH_COLLIDER_DEPTH / 2.0 + BENCH_DOG_MARGIN;
    var halfZ = BENCH_COLLIDER_WIDTH / 2.0 + BENCH_DOG_MARGIN;

    var minX = BENCH_COLLIDER_X - halfX;
    var maxX = BENCH_COLLIDER_X + halfX;
    var minZ = BENCH_COLLIDER_Z - halfZ;
    var maxZ = BENCH_COLLIDER_Z + halfZ;

    var extra = 0.45;

    var candidates = [
        { x: minX - extra, z: minZ - extra },
        { x: minX - extra, z: maxZ + extra },
        { x: maxX + extra, z: minZ - extra },
        { x: maxX + extra, z: maxZ + extra }
    ];

    var best = candidates[0];
    var bestScore = 999999.0;

    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];

        /*
            I want a corner reachable by the dog
            and from which it can then reach the frisbee.
        */
        if (segmentIntersectsBenchCollider(startX, startZ, c.x, c.z)) {
            continue;
        }

        if (segmentIntersectsBenchCollider(c.x, c.z, targetX, targetZ)) {
            continue;
        }

        var d1 = dist2D(startX, startZ, c.x, c.z);
        var d2 = dist2D(c.x, c.z, targetX, targetZ);

        var score = d1 + d2;

        if (score < bestScore) {
            bestScore = score;
            best = c;
        }
    }

    return [
        {
            x: best.x,
            z: best.z
        },
        {
            x: targetX,
            z: targetZ
        }
    ];
}


function keepDogOutsideTable(x, z) {
    var halfW = TABLE_TOP_WIDTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
    var halfD = TABLE_TOP_DEPTH / 2.0 + DOG_TABLE_AVOID_MARGIN;

    var minX = TABLE_X - halfW;
    var maxX = TABLE_X + halfW;
    var minZ = TABLE_Z - halfD;
    var maxZ = TABLE_Z + halfD;

    if (!(x > minX && x < maxX && z > minZ && z < maxZ)) {
        return { x: x, z: z };
    }

    var distLeft = Math.abs(x - minX);
    var distRight = Math.abs(maxX - x);
    var distBack = Math.abs(z - minZ);
    var distFront = Math.abs(maxZ - z);

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

    return { x: x, z: z };
}



function updateDogMovementToBall1(deltaTime) {
    if (!dogMovingToBall) return;
    if (!dogPath || dogPath.length === 0) return;

    initDogPositionIfNeeded();

    var target = dogPath[dogPathIndex];

    var dx = target.x - dogCurrentX;
    var dz = target.z - dogCurrentZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.20) {
        dogPathIndex++;

        if (dogPathIndex >= dogPath.length) {
            dogMovingToBall = false;
        }

        return;
    }

    var dogSpeed = 1.2;

    var dirX = dx / dist;
    var dirZ = dz / dist;


    var nextX = dogCurrentX + dirX * dogSpeed * deltaTime;
    var nextZ = dogCurrentZ + dirZ * dogSpeed * deltaTime;

    // Safety check: if the next step enters the table,
    // do not let it enter.
    if (!isInsideTableAvoidZone(nextX, nextZ)) {
        dogCurrentX = nextX;
        dogCurrentZ = nextZ;
    }

    dogAngleToBall = Math.atan2(dirX, dirZ) * 180.0 / Math.PI;
}

function updateDogMovementToBall(deltaTime) {
    if (!dogMovingToBall) return;
    if (!dogPath || dogPath.length === 0) return;

    initDogPositionIfNeeded();

    var distanceToBall = dist2D(
        dogCurrentX,
        dogCurrentZ,
        ballBody.position.x,
        ballBody.position.z
    );

    if (distanceToBall < 0.90) {
        dogMovingToBall = false;
        return;
    }

    var target = dogPath[dogPathIndex];

    var dx = target.x - dogCurrentX;
    var dz = target.z - dogCurrentZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.20) {
        dogPathIndex++;

        if (dogPathIndex >= dogPath.length) {
            dogMovingToBall = false;
        }

        return;
    }

    var dogSpeed = 1.2;

    var dirX = dx / dist;
    var dirZ = dz / dist;

    var nextX = dogCurrentX + dirX * dogSpeed * deltaTime;
    var nextZ = dogCurrentZ + dirZ * dogSpeed * deltaTime;

    // safety: if for some reason it's entering the table,
    // move to the next waypoint instead of getting stuck there
    if (isInsideTableAvoidZone(nextX, nextZ)) {
        dogPathIndex++;

        if (dogPathIndex >= dogPath.length) {
            dogMovingToBall = false;
        }

        return;
    }

    dogCurrentX = nextX;
    dogCurrentZ = nextZ;

    dogAngleToBall = Math.atan2(dirX, dirZ) * 180.0 / Math.PI;
}

function isBallUnderTable() {
    if (!ballBody) return false;

    /*
        Check if the ball is within the X/Z area of the table.
    */
    var halfW = TABLE_TOP_WIDTH / 2.0 + ballRadius * 0.6;
    var halfD = TABLE_TOP_DEPTH / 2.0 + ballRadius * 0.6;

    var insideTableXZ =
        ballBody.position.x > TABLE_X - halfW &&
        ballBody.position.x < TABLE_X + halfW &&
        ballBody.position.z > TABLE_Z - halfD &&
        ballBody.position.z < TABLE_Z + halfD;

    if (!insideTableXZ) {
        return false;
    }

    /*
        Calculate the bottom part of the table top.
        If the ball is below that height, the dog cannot reach it.
    */
    var tableTopBottomY =
        TABLE_Y +
        TABLE_TOP_OFFSET_Y -
        TABLE_TOP_HEIGHT / 2.0;

    var ballTopY = ballBody.position.y + ballRadius;

    return ballTopY < tableTopBottomY + 0.08;
}



/*

    Skinned Dog +ball part

*/
function startSkinnedDogFetchBall() {

    // if dog is drinking/eating do nothing
    if (blockActionIfDogBusyAtBowl()) {
        return;
    }

    if (!ballBody) return;
    dogFetchObjectType = "ball";


     if (!dogHappySoundPlayed) {
        playDogHappySound();
        dogHappySoundPlayed = true;
    }


    showDogMusicNote = true;

    // RESET previous state of the dog
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogBowlConsumeTimer = 0.0;
    dogBowlConsumeDone = false;

    dogPath = [];
    dogPathIndex = 0;

    // avoid starting already inside the table area
    var correctedStart = keepDogOutsideTable(dogFetchX, dogFetchZ);
    dogFetchX = correctedStart.x;
    dogFetchZ = correctedStart.z;

    var ballX = ballBody.position.x;
    var ballZ = ballBody.position.z;
    dogLookAtBallX = ballX;
    dogLookAtBallZ = ballZ;

    // safe target with respect to the table
    var safeTarget = getReachableBallTarget(ballX, ballZ);

    // target sicuro rispetto alle pareti
    safeTarget = clampDogTargetToRoom(safeTarget.x, safeTarget.z);

    
    var bodyStopOffset = 0.85;

    var clampedBodyTarget = getSafeDogBodyTargetForFetch(
        safeTarget.x,
        safeTarget.z,
        bodyStopOffset
    );

    /*
    If the ball is close to a wall, the dog must stop
    further inside the room, otherwise when it lowers
    it enters the wall.
    */
    clampedBodyTarget = clampDogTargetToRoomWithMargin(
        clampedBodyTarget.x,
        clampedBodyTarget.z,
        DOG_WALL_PICKUP_MARGIN
    );



    dogPath = computeDogPathToBall(
        dogFetchX,
        dogFetchZ,
        clampedBodyTarget.x,
        clampedBodyTarget.z
    );

    dogPathIndex = 0;
    dogFetchBallMode = true;
    dogFetchLowerAmount = 0.0; 

    // this is the point the dog looks at: the real/safe ball

    var safeLookTarget = clampDogTargetToRoomWithMargin(
        safeTarget.x,
        safeTarget.z,
        DOG_WALL_PICKUP_MARGIN - 0.25
    );

    dogFetchTarget = {
        x: safeLookTarget.x,
        z: safeLookTarget.z
    };

    console.log("Skinned dog path:", dogPath);
}
function disableBallAfterLeavingHouse_no() {
    if (ballBody) {
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        ballBody.force.set(0, 0, 0);
        ballBody.torque.set(0, 0, 0);

        /*
            Move it below the floor so it is not visible
            outside the room.
        */
        ballBody.position.set(0, PHYSICS_FLOOR_Y - 5.0, 0);
        ballBody.sleep();
    }

    ballVisible = false;
    ballIdleBounceActive = false;
}


function updateDogFacingTarget(targetX, targetZ, deltaTime) {
    var dx = targetX - dogFetchX;
    var dz = targetZ - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    /*
        If the target is too close, do not change orientation:
        this is often where the dog spins on itself.
    */
    if (dist < 0.25) {
        return;
    }

    /*
        Use the same direction already used in the dog.
        If the dog looks in the opposite direction, remove the two negatives.
    */
    var targetAngle =
        Math.atan2(-dx, -dz) * 180.0 / Math.PI;

    targetAngle = normalizeAngleDegrees(targetAngle);

    var turnAmount = Math.min(deltaTime * 8.0, 1.0);

    dogCurrentAngle = lerpAngleDegrees(
        dogCurrentAngle,
        targetAngle,
        turnAmount
    );
}

function startDogBallPickupLowering() {
    if (currentScene === "home") {
        /*
            Before lowering, keep the dog's body
            further away from the walls.
        */
        var safePickupPosition = clampDogTargetToRoomWithMargin(
            dogFetchX,
            dogFetchZ,
            DOG_WALL_PICKUP_MARGIN
        );

        dogFetchX = safePickupPosition.x;
        dogFetchZ = safePickupPosition.z;
    }

    dogFetchBallMode = false;

    dogPath = [];
    dogPathIndex = 0;

    dogFetchLoweringActive = true;
    dogFetchLowerAmount = 0.0;

    var safeLookTarget = clampDogTargetToRoomWithMargin(
        dogLookAtBallX,
        dogLookAtBallZ,
        DOG_WALL_PICKUP_MARGIN - 0.25
    );

    dogFetchTarget = {
        x: safeLookTarget.x,
        z: safeLookTarget.z
    };

    showDogMusicNote = false;
}


function isDogBusyAtBowl() {
    return (
        (
            dogFetchObjectType === "bowlWater" ||
            dogFetchObjectType === "bowlFood"
        ) &&
        (
            dogFetchLoweringActive ||
            dogBowlWaitingForEmpty ||
            dogBowlRisingActive ||
            dogFetchLowerAmount > 0.02
        )
    );
}

function blockActionIfDogBusyAtBowl() {
    if (!isDogBusyAtBowl()) {
        dogBowlBusyMessageShown = false;
        return false;
    }

    if (!dogBowlBusyMessageShown) {
        if (typeof showGameMessage === "function") {
            showGameMessage(
                "The dog is eating/drinking!\nWait until it finishes.",
                2600
            );
        } else {
            console.log("The dog must finish eating/drinking first.");
        }

        dogBowlBusyMessageShown = true;
    }

    return true;
}

function getDogSafeBowlStandPosition() {
    var radius =
        typeof getBowlAvoidRadiusForDog === "function"
            ? getBowlAvoidRadiusForDog()
            : bowlColliderRadius + 0.80;

    var dx = dogFetchX - bowlX;
    var dz = dogFetchZ - bowlZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.001) {
        dx = 1.0;
        dz = 0.0;
        dist = 1.0;
    }

    dx /= dist;
    dz /= dist;

    var targetX = bowlX + dx * radius;
    var targetZ = bowlZ + dz * radius;

    if (typeof clampDogTargetToRoom === "function") {
        var clamped = clampDogTargetToRoom(targetX, targetZ);
        targetX = clamped.x;
        targetZ = clamped.z;
    }

    return {
        x: targetX,
        z: targetZ
    };
}

function slideDogBackOutsideBowlWhileRising() {
    var standPos = getDogSafeBowlStandPosition();

    var riseBackSpeed = 0.020;

    dogFetchX += (standPos.x - dogFetchX) * riseBackSpeed;
    dogFetchZ += (standPos.z - dogFetchZ) * riseBackSpeed;
}
function restoreDogBowlStateIfLocked() {
    if (
        dogBowlInteractionLocked &&
        (
            dogBowlActiveKind === "bowlWater" ||
            dogBowlActiveKind === "bowlFood"
        )
    ) {
        dogFetchObjectType = dogBowlActiveKind;
    }
}

function isDogBusyAtBowl() {
    return (
        dogBowlInteractionLocked ||
        (
            (
                dogFetchObjectType === "bowlWater" ||
                dogFetchObjectType === "bowlFood"
            ) &&
            (
                dogFetchLoweringActive ||
                dogBowlRisingActive ||
                dogBowlWaitingForEmpty ||
                dogFetchLowerAmount > 0.02
            )
        )
    );
}

function blockActionIfDogBusyAtBowl() {
    if (!isDogBusyAtBowl()) {
        dogBowlBusyMessageShown = false;
        return false;
    }

    restoreDogBowlStateIfLocked();

    if (!dogBowlBusyMessageShown) {
        if (typeof showGameMessage === "function") {
            showGameMessage(
                "The dog is eating/drinking!\nWait until it finishes.",
                2600
            );
        } else {
            console.log("The dog must finish eating/drinking first.");
        }

        dogBowlBusyMessageShown = true;
    }

    return true;
}

function updateSkinnedDogFetchBall(deltaTime) {

    if (dogFetchLoweringActive) {

        if (
            dogFetchObjectType === "bowlWater" ||
            dogFetchObjectType === "bowlFood"
        ) {
            /*
                Same pose for water and kibble.
                The dog lowers its head slightly towards the bowl.
            */
           var bowlLowerTarget = dogBowlRisingActive ? 0.0 : 0.68;

            var bowlLowerSpeed = dogBowlRisingActive ? 0.055 : 0.04;

            dogFetchLowerAmount +=
                (bowlLowerTarget - dogFetchLowerAmount) * bowlLowerSpeed;

            dogCrouchActive = false;
            dogCrouchAmount = 0.0;

            dogFetchBallMode = false;


            //REVIEW - modification for dog snap
            dogPath = [];
            dogPathIndex = 0;


            dogFetchTarget = {
                x: bowlX,
                z: bowlZ
            };

            if (dogBowlRisingActive) {
                slideDogBackOutsideBowlWhileRising();
            } else if (!dogBowlWaitingForEmpty) {
                slideDogCloserToBowlWhileLowering();
            }
            

            updateDogFacingTarget(
                bowlX,
                bowlZ,
                deltaTime
            );

            if (
                !dogBowlConsumeDone &&
                dogFetchLowerAmount > dogBowlConsumePoseThreshold
            ) {
                var eatDeltaTime =
                    typeof deltaTime === "number" && isFinite(deltaTime)
                        ? Math.min(deltaTime, 0.05)
                        : 1.0 / 60.0;

                dogBowlConsumeTimer += eatDeltaTime;

                if (dogBowlConsumeTimer >= dogBowlConsumeDelay) {
                    if (dogFetchObjectType === "bowlWater") {
                        if (typeof deactivateWater === "function") {
                            deactivateWater();
                        } else {
                            waterVisible = false;
                        }
                    }

                    if (dogFetchObjectType === "bowlFood") {
                        if (typeof deactivateFood === "function") {
                            deactivateFood();
                        } else if (typeof clearKibbleParticles === "function") {
                            clearKibbleParticles();
                        }
                    }

                    dogBowlConsumeDone = true;

                    if (dogFetchObjectType === "bowlWater") {
                        dogBowlWaitingForEmpty = true;
                    } else {
                        
                        dogBowlRisingActive = true;
                        dogBowlRiseAngleLocked = true;
                        dogBowlRiseLockedAngle = dogCurrentAngle;
                    }


                }
            } else if (!dogBowlConsumeDone) {
                dogBowlConsumeTimer = 0.0;
            }


            if (dogBowlWaitingForEmpty) {
                if (
                    typeof waterFillAmount === "undefined" ||
                    waterFillAmount <= dogBowlEmptyThreshold
                ) {
                    dogBowlWaitingForEmpty = false;
                    dogBowlRisingActive = true;

                    // to lock angle
                    dogBowlRiseAngleLocked = true;
                    dogBowlRiseLockedAngle = dogCurrentAngle;
                }
            }

            if (dogBowlRisingActive && dogFetchLowerAmount < 0.0003) {

                

                dogFetchLowerAmount = 0.0;
                dogFetchLoweringActive = false;
                dogBowlRisingActive = false;
                dogBowlWaitingForEmpty = false;

                  // lock the angle on the last good angle
                if (dogBowlRiseAngleLocked) {
                    dogCurrentAngle = dogBowlRiseLockedAngle;
                }

                dogBowlRiseAngleLocked = false;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchObjectType = null;

                dogBowlInteractionLocked = false;
                dogBowlActiveKind = null;
                dogBowlBusyMessageShown = false;

                dogFetchTarget = {
                    x: dogFetchX,
                    z: dogFetchZ
                };
            }

            return;
        }

        else if (dogFetchObjectType === "frisbee") {
            var pickupDeltaTime =
                typeof deltaTime === "number" && isFinite(deltaTime)
                    ? Math.min(deltaTime, 0.05)
                    : 1.0 / 60.0;

            pickupDeltaTime *= frisbeePickupSlowMotion;
            /*
                First phase: the dog lowers towards the frisbee.
                Do not attach the frisbee to the mouth immediately.
            */
            var frisbeeLowerTarget = 0.50;

            if(!dogHasFrisbee) {
                dogFetchLowerAmount +=
                    (frisbeeLowerTarget - dogFetchLowerAmount) * 0.035;
            }
            showDogMusicNote = false;
            dogHappySoundPlayed = false;

            /*
                Only when it is low enough, the frisbee goes into the mouth.
            */
            if (dogFetchLowerAmount > 0.38 && !dogHasFrisbee) {
                dogHasFrisbee = true;
                //frisbeePickupBlend = 1.0;
                frisbeePickupHoldTimer = 0.0;

                console.log("Dog picked up the frisbee!");
            }

            /*
                Small pause with the dog still lowered.
                Then the return starts.
            */
            if (dogHasFrisbee) {
                frisbeePickupHoldTimer += pickupDeltaTime;

                var recovery =
                    Math.min(
                        frisbeePickupHoldTimer / frisbeePickupHoldDuration,
                        1.0
                    );

                frisbeePickupBlend = 1.0 - recovery;
                /*
                    While waiting, the dog slowly raises its head.
                    Starts from a low position and returns to 0.
                */
                var recoveryTarget =
                    frisbeeLowerTarget * (1.0 - recovery);

                dogFetchLowerAmount +=
                    (recoveryTarget - dogFetchLowerAmount) * 0.18;


                if (frisbeePickupHoldTimer >= frisbeePickupHoldDuration) {
                    frisbeePickupBlend = 0.0;
                    dogFetchLoweringActive = false;
                    dogFetchLowerAmount = 0.0;

                    frisbeePickupHoldTimer = 0.0;

                    startSkinnedDogReturnFrisbeeToCamera();
                }
            }

            return;
        }

        else {
            /*
                Old behavior for the ball:
                here we leave a more pronounced lowering.
            */
            dogFetchLowerAmount += (1.0 - dogFetchLowerAmount) * 0.08;

            if (dogFetchLowerAmount > 0.85 && !dogHasBall) {
                dogHasBall = true;

                showDogMusicNote = false;
                dogHappySoundPlayed = false;

                dogCrouchActive = true;

                ballVisible = true;
                ballIdleBounceActive = false;

                if (ballBody) {
                    ballBody.velocity.set(0, 0, 0);
                    ballBody.angularVelocity.set(0, 0, 0);
                    ballBody.force.set(0, 0, 0);
                    ballBody.torque.set(0, 0, 0);
                    ballBody.sleep();
                }

                console.log("Dog picked up the ball!");
            }
        }
    }

    if (dogCrouchActive) {
        dogCrouchAmount += (1.0 - dogCrouchAmount) * 0.08;
    } else {
        dogCrouchAmount += (0.0 - dogCrouchAmount) * 0.08;
    }

    if (!dogFetchBallMode || !dogPath || dogPath.length === 0) {
        return;
    }

    //REVIEW - modification for dog turning on itself

    /*
        Avoid the dog stopping/rotating on waypoints that are too close.
        This happens especially near the table, when the path generates
        an intermediate point almost under or behind the dog.
    */
    while (dogPathIndex < dogPath.length - 1) {
        var currentWaypoint = dogPath[dogPathIndex];

        var wdx = currentWaypoint.x - dogFetchX;
        var wdz = currentWaypoint.z - dogFetchZ;

        var waypointDistance = Math.sqrt(
            wdx * wdx +
            wdz * wdz
        );

        if (waypointDistance > 0.35) {
            break;
        }

        dogPathIndex++;
    }

    var target = dogPath[dogPathIndex];

    var dx = target.x - dogFetchX;
    var dz = target.z - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);


    updateDogFacingTarget(
        target.x,
        target.z,
        deltaTime
    );

    //REVIEW -  MODIFICA TEMPO DI MOVIMENTO DEL CANE
    //var speed = 0.035;

    var safeDeltaTime =
    typeof deltaTime === "number" && isFinite(deltaTime)
        ? deltaTime
        : 1.0 / 60.0;

    safeDeltaTime = Math.min(safeDeltaTime, 0.05);

    /*
        Previously, the dog moved approximately 0.035 units per frame.
        At 60 FPS, this equals:
        0.035 * 60 = 2.1 units per second.

        Now, the speed is in units/second,
        and it automatically adapts to the actual FPS.
    */
    var dogSpeedPerSecond = 2.1;

    if (
        dogFetchObjectType === "bowlWater" ||
        dogFetchObjectType === "bowlFood"
    ) {
        dogSpeedPerSecond = 1.6;
    }

    if (dogFetchObjectType === "frisbee") {
        dogSpeedPerSecond = 3.0;
    }

    if (dogFetchObjectType === "frisbee" && dogReturningWithFrisbee) {
        dogSpeedPerSecond = 2.7;
    }

    if (dogFetchObjectType === "ball" && dogLookAtBallX !== null) {
        var distToRealBall = dist2D(
            dogFetchX,
            dogFetchZ,
            dogLookAtBallX,
            dogLookAtBallZ
        );

        if (distToRealBall < 2.0) {
            dogSpeedPerSecond = 1.25;
        }
    }

    var speed = dogSpeedPerSecond * safeDeltaTime;

    /*
        For the Teapot Chase, I don't want the dog to arrive
        exactly on the waypoint before turning.

        With a larger radius, when the dog is close enough
        to the waypoint, it already moves to the next point.
        This makes the curve less jerky.
    */
    var waypointRadius = 0.12;

    if (dogFetchObjectType === "teapot") {
        waypointRadius =
            typeof DOG_TEAPOT_WAYPOINT_RADIUS !== "undefined"
                ? DOG_TEAPOT_WAYPOINT_RADIUS
                : 0.55;
    }

    if (dist > waypointRadius) {
        /* var nextX = dogFetchX + (dx / dist) * speed;
        var nextZ = dogFetchZ + (dz / dist) * speed; */
        var step = Math.min(speed, dist);

        var nextX = dogFetchX + (dx / dist) * step;
        var nextZ = dogFetchZ + (dz / dist) * step;

        

        // safety: keep the dog outside the table area, even if the path is wrong
        if (currentScene === "home") {
            var corrected;

            if (dogFetchObjectType === "teapot") {
                corrected = keepDogOutsideTeapotChaseObstacles(
                    nextX,
                    nextZ
                );
            } else {
                corrected = keepDogOutsideTable(
                    nextX,
                    nextZ
                );

                if (
                    dogFetchObjectType === "bowlWater" ||
                    dogFetchObjectType === "bowlFood"
                ) {
                    corrected = keepDogOutsideBowl(
                        corrected.x,
                        corrected.z
                    );
                }
            }

            /*
                Anti-stuck for Teapot Chase:
                if the anti-table correction doesn't advance the dog,
                skip to the next waypoint instead of leaving it stuck on the edge.
            */
            if (dogFetchObjectType === "teapot") {
                var beforeDist = dist2D(
                    dogFetchX,
                    dogFetchZ,
                    target.x,
                    target.z
                );

                var afterDist = dist2D(
                    corrected.x,
                    corrected.z,
                    target.x,
                    target.z
                );

                if (
                    beforeDist > waypointRadius &&
                    afterDist >= beforeDist - 0.001
                ) {
                    dogPathIndex++;

                    if (dogPathIndex >= dogPath.length) {
                        dogPathIndex = dogPath.length - 1;
                        dogFetchBallMode = false;
                    }

                    return;
                }
            }

            dogFetchX = corrected.x;
            dogFetchZ = corrected.z;
        }

        else {
            // park mode
            var correctedPark = keepDogOutsideParkObstacles(
                nextX,
                nextZ
            );

            dogFetchX = correctedPark.x;
            dogFetchZ = correctedPark.z;
        }

        dogFetchTarget = {
            x: target.x,
            z: target.z
        };
    }

    else {
        dogPathIndex++;

        if (dogPathIndex >= dogPath.length) {

            dogPathIndex = dogPath.length - 1;
            dogFetchBallMode = false;

            if (
                dogFetchObjectType === "bowlWater" ||
                dogFetchObjectType === "bowlFood"
            ) {
                /*
                    The dog has reached the bowl:
                    it stops and starts lowering its head.
                */
                dogFetchBallMode = false;

                dogPath = [];
                dogPathIndex = 0;

                var safeBowlPos = keepDogOutsideBowl(dogFetchX, dogFetchZ);
                dogFetchX = safeBowlPos.x;
                dogFetchZ = safeBowlPos.z;

                dogFetchLoweringActive = true;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchTarget = {
                    x: bowlX,
                    z: bowlZ
                };

                showDogMusicNote = false;

                /* updateDogFacingTarget(
                    bowlX,
                    bowlZ,
                    deltaTime
                ); */

                if (dogBowlRiseAngleLocked) {
                    dogCurrentAngle = dogBowlRiseLockedAngle;
                } else {
                    updateDogFacingTarget(
                        bowlX,
                        bowlZ,
                        deltaTime
                    );
                }

                return;
            }

            if (dogFetchObjectType === "teapot") {
                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchTarget = {
                    x: objPos[0],
                    z: objPos[2]
                };

                showDogMusicNote = false;

                return;
            }

            if (dogFetchObjectType === "frisbee" && dogReturningWithFrisbee) {
                /*
                    The dog has returned to the camera with the frisbee.
                    It should not lower its head again.
                */
                dogReturningWithFrisbee = false;
                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchTarget = {
                    x: eye[0],
                    z: eye[2]
                };

                frisbeeReturnedAndWaiting = true;

                var buttonFrisbee = document.getElementById("ButtonFrisbee");

                if (buttonFrisbee) {
                    buttonFrisbee.classList.add("active");
                    buttonFrisbee.title = "Put away Frisbee";
                }

                console.log("Dog returned with the frisbee!");
            }

            else {
                /*
                    First arrival: dog has reached the target.
                    But for the frisbee, also check the actual distance from the disc.
                */

                if (dogFetchObjectType === "frisbee") {
                    var fx = dogLookAtBallX - dogFetchX;
                    var fz = dogLookAtBallZ - dogFetchZ;

                    var distToFrisbee = Math.sqrt(fx * fx + fz * fz);

                    var frisbeePickupDistance =1.55;

                    if (distToFrisbee > frisbeePickupDistance) {
                        /*
                            The dog has reached the first safe point,
                            but the frisbee is still far away.
                            So I create a new target closer to the disc.
                        */

                        var closerStopOffset = 1.25;

                        var closerTargetX = dogLookAtBallX;
                        var closerTargetZ = dogLookAtBallZ;

                        if (distToFrisbee > 0.001) {
                            closerTargetX =
                                dogLookAtBallX -
                                (fx / distToFrisbee) * closerStopOffset;

                            closerTargetZ =
                                dogLookAtBallZ -
                                (fz / distToFrisbee) * closerStopOffset;
                        }

                        /*
                            Avoid having the new target end up inside the bench.
                        */
                        var correctedCloserTarget = keepDogOutsideParkObstacles(
                            closerTargetX,
                            closerTargetZ
                        );

                        dogPath = computeDogPathAroundBench(
                            dogFetchX,
                            dogFetchZ,
                            correctedCloserTarget.x,
                            correctedCloserTarget.z
                        );

                        dogPathIndex = 0;
                        dogFetchBallMode = true;

                        dogFetchLoweringActive = false;
                        dogFetchLowerAmount = 0.0;

                        dogFetchTarget = {
                            x: dogLookAtBallX,
                            z: dogLookAtBallZ
                        };

                        console.log(
                            "Frisbee too far, moving closer:",
                            distToFrisbee,
                            dogPath
                        );

                        return;
                    }
                }

                

                else if (dogFetchObjectType === "ball" && !dogHasBall) {
                    var bx = dogLookAtBallX - dogFetchX;
                    var bz = dogLookAtBallZ - dogFetchZ;

                    var distToBall = Math.sqrt(bx * bx + bz * bz);

                    /*
                        A bit more permissive.
                        Previously it was 0.95: in some cases the dog was visually close,
                        but the code still considered it "too far".
                    */
                    var ballPickupDistance = 1.20;

                    if (distToBall > ballPickupDistance) {
                        var closerStopOffset = 0.45;

                       

                        var correctedCloserTarget =
                            getSafeDogBodyTargetForFetch(
                                dogLookAtBallX,
                                dogLookAtBallZ,
                                closerStopOffset
                            );

                        correctedCloserTarget = clampDogTargetToRoomWithMargin(
                            correctedCloserTarget.x,
                            correctedCloserTarget.z,
                            DOG_WALL_PICKUP_MARGIN
                        );

                        /*
                            If the safe target is practically where the dog already is,
                            don't recalculate the path endlessly: make it lower.
                        */
                        var distToCloserTarget = dist2D(
                            dogFetchX,
                            dogFetchZ,
                            correctedCloserTarget.x,
                            correctedCloserTarget.z
                        );

                       if (distToCloserTarget < 0.22) {
                            startDogBallPickupLowering();
                            return;
                        }

                        if (currentScene === "home") {
                            dogPath = computeDogPathToBall(
                                dogFetchX,
                                dogFetchZ,
                                correctedCloserTarget.x,
                                correctedCloserTarget.z
                            );
                        } else {
                            dogPath = computeDogPathAroundBench(
                                dogFetchX,
                                dogFetchZ,
                                correctedCloserTarget.x,
                                correctedCloserTarget.z
                            );
                        }

                        dogPathIndex = 0;
                        dogFetchBallMode = dogPath && dogPath.length > 0;

                        dogFetchLoweringActive = false;
                        dogFetchLowerAmount = 0.0;

                        /*
                            SOO IMPORTANT : while dog is walking,
                            it must look at the next waypoint,
                            NOT directly at the ball.
                            Otherwise, it spins around near the table.
                        */
                        if (dogFetchBallMode) {
                            dogFetchTarget = {
                                x: dogPath[0].x,
                                z: dogPath[0].z
                            };
                        } else {
                            dogFetchTarget = {
                                x: correctedCloserTarget.x,
                                z: correctedCloserTarget.z
                            };
                        }

                        

                        return;
                    }
                }

               
               startDogBallPickupLowering();


                console.log("DOG ARRIVED - LOWER:", dogFetchLowerAmount);
            }
        }

        else {
            /*
                Update the visual target immediately towards the next waypoint.
                This way, the dog doesn't remain oriented towards the old point.
            */
            dogFetchTarget = {
                x: dogPath[dogPathIndex].x,
                z: dogPath[dogPathIndex].z
            };
        }
    }
}


function isBallOutsideHome() {
    if (!ballBody) return false;
    if (currentScene !== "home") return false;

    var margin = 0.35;

    var x = ballBody.position.x;
    var y = ballBody.position.y;
    var z = ballBody.position.z;

    return (
        x < ROOM_MIN_X - margin ||
        x > ROOM_MAX_X + margin ||
        z < ROOM_MIN_Z - margin ||
        z > ROOM_MAX_Z + margin ||
        y < PHYSICS_FLOOR_Y - 1.2
    );
}

function checkBallStoppedAndSendSkinnedDog() {
    if (!miniGameActive || !ballBody || !ballVisible) {
        return;
    }

    /*
        Special case: ball outside the house.
        This check must be BEFORE the speed check,
        because if the ball flies out while moving, the dog should not
        try to chase it anyway.
    */
    if (isBallOutsideHome()) {
        if (!ballOutsideHomeWarningShown) {
            showGameMessage(
                "The ball went outside the house!\nThe dog cannot reach it.",
                2800
            );
            //disableBallAfterLeavingHouse();
        }

        ballOutsideHomeWarningShown = true;
        ballBlockedOutsideHome = true;

        /*
            Block the dog's retargeting.
        */
        skinnedDogAlreadyTargeted = true;

        /*
            Immediate stop of the fetch.
        */
        dogFetchObjectType = null;
        dogFetchBallMode = false;
        dogFetchLoweringActive = false;
        dogFetchLowerAmount = 0.0;

        dogCrouchActive = false;
        dogCrouchAmount = 0.0;

        dogHasBall = false;

        dogPath = [];
        dogPathIndex = 0;

        dogFetchTarget = {
            x: dogFetchX,
            z: dogFetchZ
        };

        showDogMusicNote = false;

        return;
    }

    var v = ballBody.velocity;

    var ballSpeed = Math.sqrt(
        v.x * v.x +
        v.y * v.y +
        v.z * v.z
    );

    /*
        If the ball is still moving, reset the warnings.
        This way, if it is thrown again, the message can reappear.
    */
    if (ballSpeed > 0.18) {
        ballOnTableWarningShown = false;
        ballBlockedOnTable = false;

        ballUnderTableWarningShown = false;
        ballBlockedUnderTable = false;

        /*
            Do not reset ballOutsideHomeWarningShown here,
            because if the ball is outside the house, the check above has already returned.
        */

        return;
    }

    /*
        Special case: ball stopped on the table.
        The dog cannot reach it.
    */
    if (isBallOnTable()) {
        if (!ballOnTableWarningShown) {
            showGameMessage(
                "The ball is on the table!\nThe dog cannot reach it.",
                2800
            );
        }

        ballOnTableWarningShown = true;
        ballBlockedOnTable = true;

        skinnedDogAlreadyTargeted = true;

        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        showDogMusicNote = false;

        return;
    }

    /*
        Special case: ball stopped under the table.
        The dog cannot reach it.
    */
    if (isBallUnderTable()) {
        if (!ballUnderTableWarningShown) {
            showGameMessage(
                "The ball is under the table!\nThe dog cannot reach it.",
                2800
            );
        }

        ballUnderTableWarningShown = true;
        ballBlockedUnderTable = true;

        skinnedDogAlreadyTargeted = true;

        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        showDogMusicNote = false;

        return;
    }

    /*
        If the ball was previously blocked outside the house, on the table, or under the table,
        but is no longer, allow the dog to start again.
    */
    if (
        ballBlockedOutsideHome ||
        ballBlockedOnTable ||
        ballBlockedUnderTable
    ) {
        ballBlockedOutsideHome = false;
        ballOutsideHomeWarningShown = false;

        ballBlockedOnTable = false;
        ballOnTableWarningShown = false;

        ballBlockedUnderTable = false;
        ballUnderTableWarningShown = false;

        skinnedDogAlreadyTargeted = false;
    }

    if (skinnedDogAlreadyTargeted) {
        return;
    }

    if (isBallAlmostStopped()) {
        startSkinnedDogFetchBall();
        skinnedDogAlreadyTargeted = true;
    }
}



function checkBallStoppedAndSendSkinnedDog_OLD() {
    if (!miniGameActive || !ballBody || !ballVisible) {
        return;
    }

    var v = ballBody.velocity;

    var ballSpeed = Math.sqrt(
        v.x * v.x +
        v.y * v.y +
        v.z * v.z
    );

    /*
        If the ball is still moving, reset the warnings.
        This way, if it is thrown again, the message can reappear.
    */
    if (ballSpeed > 0.18) {
        ballOnTableWarningShown = false;
        ballBlockedOnTable = false;

        ballUnderTableWarningShown = false;
        ballBlockedUnderTable = false;

        return;
    }

    /*
        Special case: ball stopped on the table.
        The dog cannot reach it.
    */
    if (isBallOnTable()) {
        if (!ballOnTableWarningShown) {
            showGameMessage(
                "The ball is on the table!\nThe dog cannot reach it.",
                2800
            );
        }

        ballOnTableWarningShown = true;
        ballBlockedOnTable = true;

        skinnedDogAlreadyTargeted = true;

        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        return;
    }

    /*
        Special case: ball stopped under the table.
        The dog cannot reach it.
    */
    if (isBallUnderTable()) {
        if (!ballUnderTableWarningShown) {
            showGameMessage(
                "The ball is under the table!\nThe dog cannot reach it.",
                2800
            );
        }

        ballUnderTableWarningShown = true;
        ballBlockedUnderTable = true;

        skinnedDogAlreadyTargeted = true;

        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        return;
    }

    /*
        If the ball was previously blocked on the table or under the table,
        but is no longer, allow the dog to start again.
    */
    if (ballBlockedOnTable || ballBlockedUnderTable) {
        ballBlockedOnTable = false;
        ballOnTableWarningShown = false;

        ballBlockedUnderTable = false;
        ballUnderTableWarningShown = false;

        skinnedDogAlreadyTargeted = false;
    }

    if (skinnedDogAlreadyTargeted) {
        return;
    }

    if (isBallAlmostStopped()) {
        startSkinnedDogFetchBall();
        skinnedDogAlreadyTargeted = true;
    }
}



function clampDogTargetToRoomWithMargin(x, z, margin) {
    var minX = -7.2 + margin;
    var maxX =  7.2 - margin;

    var minZ = -5.8 + margin;
    var maxZ =  8.5 - margin;

    return {
        x: Math.max(minX, Math.min(maxX, x)),
        z: Math.max(minZ, Math.min(maxZ, z))
    };
}


function clampDogTargetToRoom(x, z) {

    return clampDogTargetToRoomWithMargin(
        x,
        z,
        1.25
    );
}

function resetSkinnedDogBallInteraction() {
    dogHasBall = false;

    dogFetchBallMode = false;
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    skinnedDogAlreadyTargeted = false;

    
    if (typeof dogCrouchAmount !== "undefined") {
        dogCrouchAmount = 0.0;
    }

    if (ballBody) {
        ballBody.wakeUp();
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);
        ballBody.force.set(0, 0, 0);
        ballBody.torque.set(0, 0, 0);
    }
}

function resetSkinnedDogFetchState() {
    // Ball no longer in mouth
    dogHasBall = false;

    // Movement towards the ball
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Lowering of neck and head
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    // Crouching pose
    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    // Allows the dog to be sent towards the new ball
    skinnedDogAlreadyTargeted = false;

}

function getBallModelMatrix() {
    var modelMatrixBall = mat4();

    if (dogHasBall) {
        var rad = dogCurrentAngle * Math.PI / 180.0;

        var forwardX = Math.sin(rad);
        var forwardZ = Math.cos(rad);

        var crouchBodyDown = 0.22 * dogCrouchAmount;

        // When the dog is crouching, the mouth moves backward and downward
        var mouthForwardOffset = 1.10 - 0.28 * dogCrouchAmount;
        var mouthDownOffset = 0.32 * dogCrouchAmount;

        var mouthX = dogFetchX + forwardX * mouthForwardOffset;
        var mouthY = -1.50 - crouchBodyDown - mouthDownOffset;
        var mouthZ = dogFetchZ + forwardZ * mouthForwardOffset;

        modelMatrixBall = mult(
            modelMatrixBall,
            translate(mouthX, mouthY, mouthZ)
        );

        modelMatrixBall = mult(
            modelMatrixBall,
            scalem(ballRadius, ballRadius, ballRadius)
        );
    } else {
        


        if (!ballBody) return modelMatrixBall;

        if (!ballRenderInitialized) {
            resetBallRenderPositionToPhysics();
        }

        /*
            Controlled visual smoothing.
            Does not use Cannon's interpolatedPosition, so it does not risk
            fetching old positions under the floor.
        */
        var vx = ballBody.velocity.x;
        var vy = ballBody.velocity.y;
        var vz = ballBody.velocity.z;

        var ballSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);

        /*
            When the ball is thrown fast, I follow it more.
            When it slows down, I keep more smoothing.
        */
        var smoothing = ballSpeed > 2.0 ? 0.75 : 0.55;

        ballRenderX += (ballBody.position.x - ballRenderX) * smoothing;
        ballRenderY += (ballBody.position.y - ballRenderY) * smoothing;
        ballRenderZ += (ballBody.position.z - ballRenderZ) * smoothing;

        modelMatrixBall = mult(
            modelMatrixBall,
            translate(
                ballRenderX,
                ballRenderY,
                ballRenderZ
            )
        );

        modelMatrixBall = mult(
            modelMatrixBall,
            scalem(ballRadius, ballRadius, ballRadius)
        );
        
    }

    return modelMatrixBall;
}

function resetBallRenderPositionToPhysics() {
    if (!ballBody) {
        return;
    }

    ballRenderX = ballBody.position.x;
    ballRenderY = ballBody.position.y;
    ballRenderZ = ballBody.position.z;

    ballRenderInitialized = true;
}

/*///////////////////////////////////////////////////
* CLOTH PART
*
*////////////////////////////////////////////////////*/

class CannonCurtain {
    constructor(gl, world, rows, cols, width, height, originX, originY, originZ) {
        this.gl = gl;
        this.world = world;

        this.rows = rows;
        this.cols = cols;
        this.width = width;
        this.height = height;

        // Top-center point of the curtain
        this.originX = originX;
        this.originY = originY;
        this.originZ = originZ;

        this.bodies = [];

        // Mesh triangulated without indices
        this.numVertices = (rows - 1) * (cols - 1) * 6;

        this.positions = new Float32Array(this.numVertices * 4);
        this.normals = new Float32Array(this.numVertices * 4);
        this.texCoords = new Float32Array(this.numVertices * 2);

        this.initPhysics();
        this.initBuffers();
        this.updateMesh();
    }

    index(x, y) {
        return y * this.cols + x;
    }

    getBody(x, y) {
        return this.bodies[this.index(x, y)];
    }

    initPhysics() {
        var mass = 0.04;

        // The curtain is in the Y-Z plane, near the right wall
        for (var y = 0; y < this.rows; y++) {
            for (var x = 0; x < this.cols; x++) {
                var u = x / (this.cols - 1);
                var v = y / (this.rows - 1);

                var px = this.originX;
                var py = this.originY - v * this.height;
                var pz = this.originZ + (u - 0.5) * this.width;

                var pinned = (y === 0 && x % 3 === 0);
                var body = new CANNON.Body({
                    mass: pinned ? 0.0 : mass,
                    position: new CANNON.Vec3(px, py, pz),
                    shape: new CANNON.Particle()
                });

                body.linearDamping = 0.55;

                this.world.addBody(body);
                this.bodies.push(body);
            }
        }

        this.addConstraints();
    }

    addConstraints() {
        var restX = this.width / (this.cols - 1);
        var restY = this.height / (this.rows - 1);

        var maxForce = 5e4;
        var structuralForce = 5e4;
        var diagonalForce = 8e3;

        for (var y = 0; y < this.rows; y++) {
            for (var x = 0; x < this.cols; x++) {
                if (x < this.cols - 1) {
                    this.world.addConstraint(
                        new CANNON.DistanceConstraint(
                            this.getBody(x, y),
                            this.getBody(x + 1, y),
                            restX,
                            structuralForce
                        )
                    );
                }

                if (y < this.rows - 1) {
                    this.world.addConstraint(
                        new CANNON.DistanceConstraint(
                            this.getBody(x, y),
                            this.getBody(x, y + 1),
                            restY,
                            structuralForce
                        )
                    );
                }

                // diagonals to make the fabric less "rubbery"
                if (x < this.cols - 1 && y < this.rows - 1) {
                    var diag = Math.sqrt(restX * restX + restY * restY);

                    this.world.addConstraint(
                        new CANNON.DistanceConstraint(
                            this.getBody(x, y),
                            this.getBody(x + 1, y + 1),
                            diag,
                            diagonalForce
                        )
                    );

                    this.world.addConstraint(
                        new CANNON.DistanceConstraint(
                            this.getBody(x + 1, y),
                            this.getBody(x, y + 1),
                            diag,
                            diagonalForce
                        )
                    );
                }
            }
        }
    }

    initBuffers() {
        var gl = this.gl;

        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);

        this.nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);

        this.tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.DYNAMIC_DRAW);
    }

    applyWind(time) {
        // light wind towards the inside of the room
        for (var y = 1; y < this.rows; y++) {
            for (var x = 0; x < this.cols; x++) {
                var body = this.getBody(x, y);

                var u = x / (this.cols - 1);
                var v = y / (this.rows - 1);

                var strength =
                    Math.sin(time * 0.002 + u * 5.0 + v * 2.0) * curtainWindStrength;

                // The right wall is at x=7, inside the room towards -X
                body.applyForce(
                    new CANNON.Vec3(-strength, 0.0, 0.005),
                    body.position
                );
            }
        }
    }

    updateMesh() {
        var k = 0;

        for (var y = 0; y < this.rows - 1; y++) {
            for (var x = 0; x < this.cols - 1; x++) {
                var b00 = this.getBody(x, y);
                var b10 = this.getBody(x + 1, y);
                var b01 = this.getBody(x, y + 1);
                var b11 = this.getBody(x + 1, y + 1);

                var u0 = x / (this.cols - 1);
                var u1 = (x + 1) / (this.cols - 1);
                var v0 = y / (this.rows - 1);
                var v1 = (y + 1) / (this.rows - 1);

                // due triangoli
                k = this.writeTriangle(k, b00, b01, b10, u0, v0, u0, v1, u1, v0);
                k = this.writeTriangle(k, b10, b01, b11, u1, v0, u0, v1, u1, v1);
            }
        }

        var gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.normals);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.texCoords);
    }

    writeTriangle(k, b0, b1, b2, u0, v0, u1, v1, u2, v2) {
        var p0 = b0.position;
        var p1 = b1.position;
        var p2 = b2.position;

        var ux = p1.x - p0.x;
        var uy = p1.y - p0.y;
        var uz = p1.z - p0.z;

        var vx = p2.x - p0.x;
        var vy = p2.y - p0.y;
        var vz = p2.z - p0.z;

        // cross product
        var nx = uy * vz - uz * vy;
        var ny = uz * vx - ux * vz;
        var nz = ux * vy - uy * vx;

        var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len < 0.00001) {
            nx = -1.0;
            ny = 0.0;
            nz = 0.0;
        } else {
            nx /= len;
            ny /= len;
            nz /= len;
        }

        k = this.writeVertex(k, p0, nx, ny, nz, u0, v0);
        k = this.writeVertex(k, p1, nx, ny, nz, u1, v1);
        k = this.writeVertex(k, p2, nx, ny, nz, u2, v2);

        return k;
    }

    writeVertex(k, p, nx, ny, nz, u, v) {
        var pi = k * 4;
        var ti = k * 2;

        this.positions[pi + 0] = p.x;
        this.positions[pi + 1] = p.y;
        this.positions[pi + 2] = p.z;
        this.positions[pi + 3] = 1.0;

        this.normals[pi + 0] = nx;
        this.normals[pi + 1] = ny;
        this.normals[pi + 2] = nz;
        this.normals[pi + 3] = 0.0;

        this.texCoords[ti + 0] = u;
        this.texCoords[ti + 1] = v;

        return k + 1;
    }
}



function startSkinnedDogGoToBowl(kind) {
    if (currentScene !== "home") {
        return;
    }

    if (typeof bowlX === "undefined" || typeof bowlZ === "undefined") {
        return;
    }

    /*
        Uso lo stesso sistema del fetch della palla,
        ma con un tipo diverso di target.
    */
    dogFetchObjectType = kind === "food"
        ? "bowlFood"
        : "bowlWater";

    dogBowlInteractionLocked = true;
    dogBowlActiveKind = dogFetchObjectType;
    dogBowlBusyMessageShown = false;


    // quando va alla ciotola non deve restare nello stato "palla in bocca"
    dogHasBall = false;

    if (typeof dogHasFrisbee !== "undefined") {
        dogHasFrisbee = false;
    }

    if (typeof dogReturningWithFrisbee !== "undefined") {
        dogReturningWithFrisbee = false;
    }

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogBowlConsumeTimer = 0.0;
    dogBowlConsumeDone = false;
    dogBowlRisingActive = false;

    dogBowlWaitingForEmpty = false;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;

    showDogMusicNote = true;

    /*
        Il cane guarda la ciotola vera.
    */
    dogLookAtBallX = bowlX;
    dogLookAtBallZ = bowlZ;

    /*
        Non deve arrivare sopra la ciotola, ma fermarsi davanti.
    */
    var dx = bowlX - dogFetchX;
    var dz = bowlZ - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.001) {
        dx = 1.0;
        dz = 0.0;
        dist = 1.0;
    }

    var stopDistance =
        typeof getBowlAvoidRadiusForDog === "function"
            ? getBowlAvoidRadiusForDog()
            : 1.35;

    var targetX = bowlX - (dx / dist) * stopDistance;
    var targetZ = bowlZ - (dz / dist) * stopDistance;

    /*
        Tengo il cane fuori da tavolo, bowl e limiti stanza.
        Questa funzione già gestisce anche la bowl.
    */
    var safeTarget;

    if (typeof keepDogOutsideTeapotChaseObstacles === "function") {
        safeTarget = keepDogOutsideTeapotChaseObstacles(targetX, targetZ);
    } else {
        safeTarget = keepDogOutsideTable(targetX, targetZ);
        safeTarget = clampDogTargetToRoom(safeTarget.x, safeTarget.z);
    }

    dogPath = computeDogPathToBall(
        dogFetchX,
        dogFetchZ,
        safeTarget.x,
        safeTarget.z
    );

    dogPathIndex = 0;
    dogFetchBallMode = dogPath && dogPath.length > 0;

    if (dogFetchBallMode) {
        dogFetchTarget = {
            x: dogPath[0].x,
            z: dogPath[0].z
        };
    } else {
        dogFetchTarget = {
            x: bowlX,
            z: bowlZ
        };
    }
}


function stopSkinnedDogGoToBowl() {
    if (
        dogFetchObjectType !== "bowlWater" &&
        dogFetchObjectType !== "bowlFood"
    ) {
        return;
    }

    dogFetchObjectType = null;
    dogFetchBallMode = false;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;

    dogFetchTarget = {
        x: dogFetchX,
        z: dogFetchZ
    };

    showDogMusicNote = false;
}


// 
//          TEAPOT + BALL
///
function getTeapotPosition() {
    return vec3(
        objPos[0],
        objPos[1],
        objPos[2]
    );
}

function checkBallTeapotCollision() {
    if (teapotBroken) return;
    if (!ballBody) return;

    var ballPos = ballBody.position;
    var ballVel = ballBody.velocity;

    var teapotPos = getTeapotPosition();

    var dx = ballPos.x - teapotPos[0];
    var dy = ballPos.y - teapotPos[1];
    var dz = ballPos.z - teapotPos[2];

    /*
        Collision on the table plane.
        XZ controls horizontal distance.
        Y only checks that the ball is roughly at teapot height.
    */
    var distanceXZ =
        Math.sqrt(dx * dx + dz * dz);

    var speed =
        Math.sqrt(
            ballVel.x * ballVel.x +
            ballVel.y * ballVel.y +
            ballVel.z * ballVel.z
        );

    if (
        distanceXZ < 0.95 &&
        Math.abs(dy) < 0.85 &&
        speed > 0.3
    ) {
        breakTeapot(
            vec3(ballPos.x, ballPos.y, ballPos.z),
            vec3(ballVel.x, ballVel.y, ballVel.z)
        );
    }
}

function breakTeapot(hitPosition, hitVelocity) {
    teapotBroken = true;
    teapotBreakTimer = 0.0;
    teapotFragments = [];

    var teapotPos = getTeapotPosition();

    for (var i = 0; i < 16; i++) {
        teapotFragments.push({
            position: vec3(
                teapotPos[0] + (Math.random() - 0.5) * 0.35,
                teapotPos[1] + (Math.random() - 0.5) * 0.25,
                teapotPos[2] + (Math.random() - 0.5) * 0.35
            ),

            velocity: vec3(
                hitVelocity[0] * 0.20 + (Math.random() - 0.5) * 2.0,
                Math.random() * 2.0 + 1.2,
                hitVelocity[2] * 0.20 + (Math.random() - 0.5) * 2.0
            ),

            rotation: vec3(
                Math.random() * 360.0,
                Math.random() * 360.0,
                Math.random() * 360.0
            ),

            angularVelocity: vec3(
                (Math.random() - 0.5) * 220.0,
                (Math.random() - 0.5) * 220.0,
                (Math.random() - 0.5) * 220.0
            ),

            scale: 0.035 + Math.random() * 0.035
        });
    }

    playGlassBreakingSound();
    showGameMessage(
        "The ball broke the teapot!\nThe dog cannot reach it.",
        4000
    );
    
    
}


function applyTeapotSmashBallPreset() {
    setBallSliderValue("BallVelX", 0.90);
    setBallSliderValue("BallVelY", 5.50);
    setBallSliderValue("BallVelZ", -5.00);

    setBallSliderValue("BallBounce", 0.25);
    setBallSliderValue("BallFriction", 0.80);

    setBallSliderValue("BallAngVelX", 4.00);
    setBallSliderValue("BallAngVelY", 0.00);
    setBallSliderValue("BallAngVelZ", 2.00);

    setBallSliderValue("BallLinearDamping", 0.35);
    setBallSliderValue("BallAngularDamping", 0.75);
}



function updateTeapotFragments(deltaTime) {
    if (!teapotBroken) return;

    teapotBreakTimer += deltaTime;

    for (var i = 0; i < teapotFragments.length; i++) {
        var f = teapotFragments[i];

        f.velocity[1] -= 5.5 * deltaTime;

        f.position[0] += f.velocity[0] * deltaTime;
        f.position[1] += f.velocity[1] * deltaTime;
        f.position[2] += f.velocity[2] * deltaTime;

        f.rotation[0] += f.angularVelocity[0] * deltaTime;
        f.rotation[1] += f.angularVelocity[1] * deltaTime;
        f.rotation[2] += f.angularVelocity[2] * deltaTime;

        /*
            Simple floor/table stop.
            Tune this y value based on your room/table height.
        */
        if (f.position[1] < -2.25) {
            f.position[1] = -2.25;
            f.velocity[1] *= -0.25;
            f.velocity[0] *= 0.75;
            f.velocity[2] *= 0.75;
        }
    }

    /* if (teapotBreakTimer > teapotRespawnTime) {
        resetTeapotBreak();
    } */

}

function resetTeapotBreak() {
    teapotBroken = false;
    teapotFragments = [];
    teapotBreakTimer = 0.0;
}


function drawTeapotFragments(viewMatrix, projectionMatrix) {
    for (var i = 0; i < teapotFragments.length; i++) {
        var f = teapotFragments[i];

        var modelMatrix = mat4();

        modelMatrix = mult(
            modelMatrix,
            translate(
                f.position[0],
                f.position[1],
                f.position[2]
            )
        );

        modelMatrix = mult(
            modelMatrix,
            rotate(f.rotation[0], vec3(1, 0, 0))
        );

        modelMatrix = mult(
            modelMatrix,
            rotate(f.rotation[1], vec3(0, 1, 0))
        );

        modelMatrix = mult(
            modelMatrix,
            rotate(f.rotation[2], vec3(0, 0, 1))
        );

        modelMatrix = mult(
            modelMatrix,
            scalem(f.scale, f.scale, f.scale)
        );

        drawObject(
            teapotBuffers,
            teapotTexture,
            modelMatrix,
            viewMatrix,
            projectionMatrix,
            useTexture_teapot,
            false,
            false,
            false,
            8
        );
    }
}