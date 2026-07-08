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
            IMPORTANTISSIMO:
            impedisce alla logica del cane di ritargettare la palla.
            Prima avevamo false, ma in questo caso deve essere true.
        */
        skinnedDogAlreadyTargeted = true;

        /*
            Stop immediato del fetch del cane.
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

        /*
            Meglio non null: così il cane smette di cercare target strani
            e resta orientato sulla sua posizione corrente.
        */
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
        Calcola un punto dove il corpo del cane può fermarsi
        per prendere palla/frisbee.

        Importante:
        il punto del corpo NON deve finire dentro la zona del tavolo,
        altrimenti il cane si blocca sul bordo.
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
        /*
            Se il punto scelto cade dentro/vicino al tavolo,
            lo sposto automaticamente sul bordo sicuro.
        */
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
        Nel parco evito gli ostacoli del parco.
    */
    return keepDogOutsideParkObstacles(
        bodyTargetX,
        bodyTargetZ
    );
}


function getReachableBallTarget(ballX, ballZ) {
    var r = getTableAvoidRect();

    // Se la palla è già fuori dalla zona vietata, il cane può andarci direttamente
    if (!isInsideTableAvoidZone(ballX, ballZ)) {
        return {
            x: ballX,
            z: ballZ
        };
    }

    // Se invece la palla è dentro/vicino al tavolo,
    // scegliamo il punto più vicino sul bordo esterno della zona vietata.
    var distLeft   = Math.abs(ballX - r.minX);
    var distRight  = Math.abs(r.maxX - ballX);
    var distBack   = Math.abs(ballZ - r.minZ);
    var distFront  = Math.abs(r.maxZ - ballZ);

    var minDist = Math.min(distLeft, distRight, distBack, distFront);

    var safeX = ballX;
    var safeZ = ballZ;

    var extra = 0.25; // distanza di sicurezza dal bordo del tavolo

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


/* function isInsideTableAvoidZone(x, z) {
    var halfW = TABLE_TOP_WIDTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
    var halfD = TABLE_TOP_DEPTH / 2.0 + DOG_TABLE_AVOID_MARGIN;

    return (
        x > TABLE_X - halfW &&
        x < TABLE_X + halfW &&
        z > TABLE_Z - halfD &&
        z < TABLE_Z + halfD
    );
} */

/* function computeDogPathToBall(startX, startZ, targetX, targetZ) {
    if (!segmentIntersectsTableAvoidZone(startX, startZ, targetX, targetZ)) {
        return [
            { x: targetX, z: targetZ }
        ];
    }

    var halfW = TABLE_TOP_WIDTH / 2.0 + DOG_TABLE_AVOID_MARGIN;
    var halfD = TABLE_TOP_DEPTH / 2.0 + DOG_TABLE_AVOID_MARGIN;

    var extra = 0.8;

    var leftX  = TABLE_X - halfW - extra;
    var rightX = TABLE_X + halfW + extra;

    var backZ  = TABLE_Z - halfD - extra;
    var frontZ = TABLE_Z + halfD + extra;

    // Due percorsi possibili: gira a sinistra o gira a destra
    var leftPath = [
        { x: leftX, z: startZ },
        { x: leftX, z: targetZ },
        { x: targetX, z: targetZ }
    ];

    var rightPath = [
        { x: rightX, z: startZ },
        { x: rightX, z: targetZ },
        { x: targetX, z: targetZ }
    ];

    var leftCost =
        dist2D(startX, startZ, leftPath[0].x, leftPath[0].z) +
        dist2D(leftPath[0].x, leftPath[0].z, leftPath[1].x, leftPath[1].z) +
        dist2D(leftPath[1].x, leftPath[1].z, targetX, targetZ);

    var rightCost =
        dist2D(startX, startZ, rightPath[0].x, rightPath[0].z) +
        dist2D(rightPath[0].x, rightPath[0].z, rightPath[1].x, rightPath[1].z) +
        dist2D(rightPath[1].x, rightPath[1].z, targetX, targetZ);

    if (leftCost < rightCost) {
        return leftPath;
    } else {
        return rightPath;
    }
} */

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

        /*
            dot < 0 significa: primo passo in direzione opposta.
        */
        if (dot < -0.15) {
            return 1000.0;
        }

        /*
            dot piccolo significa: primo passo quasi laterale.
            Non lo vieto, ma lo penalizzo un po'.
        */
        if (dot < 0.15) {
            return 8.0;
        }

        return 0.0;
    }

    /*
        1) Prima provo percorsi con UN solo corner.
        Sono più naturali e riducono i giri strani.
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
        2) Se un solo corner non basta, provo con DUE corner.
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
        Fallback: se qualcosa va storto, prova comunque il target.
    */
    if (!bestPath) {
        return [
            { x: targetX, z: targetZ }
        ];
    }

    return bestPath;
}

function computeDogPathToBall_OLD(startX, startZ, targetX, targetZ) {
    // Se il cane può andare dritto, nessun waypoint
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

    // Fallback: se qualcosa va storto, almeno prova ad andare al target
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

    // stessa logica del disegno debug
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

    // cilindro lungo Z -> verticale su Y
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

    // stessa rotazione della panchina
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
        Punto di partenza diverso per ogni croccantino.
        Così sembrano versati, non spawnati tutti dallo stesso pixel.
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
        NON verso il centro.
        Ogni croccantino va verso il suo landing spot.
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

    // come per il collider della bowl: cilindro verticale su Y
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
                wallLength * 0.45,          // lunghezza tangenziale
                kibbleWallHeight * 0.5,     // altezza
                kibbleWallThickness * 0.5   // spessore
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

        // orienta il box lungo il bordo circolare
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

        // niente collisione tra croccantini, solo con bowl/catch/floor invisibili
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


/* function updateKibbles(deltaTime) {
    if (!kibbleVisible) return;

    var baseMinY = bowlY -0.05;
    var maxBowlRadius = 0.23;

    for (var i = 0; i < kibbleParticles.length; i++) {
        var kibble = kibbleParticles[i];
        var body = kibble.body;

        kibble.age += deltaTime;

        // caduta più lenta
        if (body.velocity.y < -kibbleMaxFallSpeed) {
            body.velocity.y = -kibbleMaxFallSpeed;
        }

        // anti-sprofondamento
        var minY = baseMinY + kibble.yOffset;

        if (body.position.y < minY) {
            body.position.y = minY;

            if (body.velocity.y < 0.0) {
                body.velocity.y = 0.0;
            }
        }

        // contenimento dentro bowl
        var dx = body.position.x - bowlX;
        var dz = body.position.z - bowlZ;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > maxBowlRadius) {
            var nx = dx / dist;
            var nz = dz / dist;

            body.position.x = bowlX + nx * maxBowlRadius;
            body.position.z = bowlZ + nz * maxBowlRadius;

            var outwardSpeed = body.velocity.x * nx + body.velocity.z * nz;

            if (outwardSpeed > 0.0) {
                body.velocity.x -= outwardSpeed * nx;
                body.velocity.z -= outwardSpeed * nz;
            }

            body.velocity.x *= 0.35;
            body.velocity.z *= 0.35;
        }

        var speed = Math.sqrt(
            body.velocity.x * body.velocity.x +
            body.velocity.y * body.velocity.y +
            body.velocity.z * body.velocity.z
        );

        if (kibble.age > 1.0 && speed < 0.025) {
            body.sleep();
        }
    }
} */

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

        // quando entra nella bowl, lo "congelo"
        if (kibble.age > 0.45 && body.position.y < bowlY + 0.12) {
            kibble.settled = true;

            // rimuovo il body da Cannon: da ora è statico visivamente
            physicsWorld.removeBody(body);
            kibble.body = null;
        }
    }
}



///////////////////////////////////
function getBowlAvoidRadiusForDog() {
    /*
        Raggio bowl + spazio per il corpo del cane.
    */
    return bowlColliderRadius + 1.05;
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

function keepDogOutsideTeapotChaseObstacles(x, z) {
    /*
        Ordine:
        1. limiti stanza
        2. fuori dal tavolo
        3. fuori dalla bowl
        4. ricontrollo tavolo/stanza
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
        Path dedicato alla Teapot Chase.

        Creo percorsi larghi attorno al tavolo e scelgo quello più corto
        tra: davanti, dietro, sinistra, destra.
        Il cane non deve mai puntare direttamente attraverso il tavolo.
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
        Se il percorso diretto non attraversa il tavolo,
        può andare direttamente.
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
        Fallback: se per qualche motivo tutti i path risultano problematici,
        scelgo comunque un giro largo davanti/dietro, mai il path diretto.
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
        Rimuovo punti quasi uguali, così il cane non fa micro-rotazioni inutili.
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
        Se il target del cane per la teapot è troppo vicino al tavolo,
        lo sposto sul lato esterno più vicino.
        Così il cane non prova a fermarsi appiccicato al bordo del tavolo.
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
        Se il punto è già abbastanza lontano dal tavolo,
        non lo modifico.
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
        Il punto è dentro la zona "troppo vicina".
        Lo sposto verso il bordo più vicino della zona espansa.
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
        Ricontrollo anche la bowl, perché nel tuo caso c'è pure la ciotola.
    */
    p = keepDogOutsideBowl(p.x, p.z);
    p = clampDogTargetToRoom(p.x, p.z);

    return p;
}

function getSafeDogTargetNearTeapot(teapotX, teapotZ) {
    /*
        La teapot è in alto.
        Il cane segue la sua proiezione X/Z,
        ma si ferma a una distanza sicura.
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
        se la teapot è vicino al tavolo, il target del cane viene spostato
        più fuori, così non resta bloccato sul bordo.
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

    var teapotX = objPos[0];
    var teapotZ = objPos[2];

    /*
        Il cane guarda sempre la teapot vera,
        ma non parte subito mentre la sto muovendo.
    */
    dogLookAtBallX = teapotX;
    dogLookAtBallZ = teapotZ;

    dogFetchTarget = {
        x: teapotX,
        z: teapotZ
    };

    /*
        Controllo se la teapot si sta muovendo.
        Se si muove, il cane aspetta fermo.
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
            Mentre sto muovendo la teapot, il cane non insegue.
            Così non ricalcola continuamente path strani intorno al tavolo.
        */
        dogFetchBallMode = false;
        dogPath = [];
        dogPathIndex = 0;

        dogFetchObjectType = "teapot";

        showDogMusicNote = false;

        return;
    }

    /*
        Se la teapot non si muove, accumulo tempo.
        Il cane partirà solo dopo DOG_TEAPOT_WAIT_AFTER_MOVE secondi.
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
        Se il cane sta già andando verso la posizione finale
        e la teapot non è cambiata abbastanza, non ricalcolo.
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

    // Materiali
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

    // Pavimento fisico invisibile
    var floorShape = new CANNON.Plane();
    var floorBody = new CANNON.Body({
        mass: 0,
        material: floorMaterial
    });

    floorBody.collisionFilterGroup = GROUP_WORLD;
    floorBody.collisionFilterMask = -1;

    floorBody.addShape(floorShape);

    // Il Plane di Cannon di default è verticale: lo ruotiamo orizzontale
    floorBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2
    );
    floorBody.position.set(0.0, PHYSICS_FLOOR_Y, 0.0);

    physicsWorld.addBody(floorBody);

    // ===== Pareti fisiche invisibili =====
    // centro verticale delle pareti
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

    // ===== Collider fisico invisibile del tavolo =====
    // ATTENZIONE: questi valori vanno regolati in base al tuo tavolo visibile

    /* // collider invisibile del tavolo
        tableColliderBody = addStaticBoxCollider(
            tableColliderX,
            tableColliderY,
            tableColliderZ,
            tableColliderSX,
            tableColliderSY,
            tableColliderSZ,
            floorMaterial
        );
    */
    // collider table
    createTableCompoundCollider();

    //collider for bowl
    createBowlCollider();

    // collider for kibbles
    createKibbleCatchCollider();

    // Pallina fisica
    var ballShape = new CANNON.Sphere(ballRadius);

    ballBody = new CANNON.Body({
        mass: 1.0,
        material: ballMaterial,
        position: new CANNON.Vec3(0.0, 2.5, 3.0)
    });

    ballBody.addShape(ballShape);

    // Un po' di damping per non farla rimbalzare per sempre
    ballBody.linearDamping = 0.35;
    ballBody.angularDamping = 0.75;

    physicsWorld.addBody(ballBody);

    // All'inizio la nascondiamo sotto la scena
    ballBody.position.set(0.0, -100.0, 0.0);
}

function startBallMiniGame() {
    if (!ballBody) {
        console.warn("ballBody not initialized yet");
        return;
    }

    ballVisible = true;
    dogHasBall = false;

    
    ballIdleBounceActive = false;
    ballIdleBounceCount = 0;
    ballIdleBounceCooldown = 0;

    // Reset posizione pallina
    ballBody.position.set(0.0, PHYSICS_FLOOR_Y + 3.0, 7.0);

    //REVIEW -  MODIFICA PER PALLA CALO FPS FIREFOX
    resetBallRenderPositionToPhysics();


    // Reset velocità
    ballBody.velocity.set(0.0, 0.0, 0.0);
    ballBody.angularVelocity.set(0.0, 0.0, 0.0);

    // Lancio iniziale
    ballBody.velocity.set(ballVelX, ballVelY, ballVelZ);
    ballBody.angularVelocity.set(ballAngVelX, ballAngVelY, ballAngVelZ);
    ballBody.linearDamping = ballLinearDamping;
    ballBody.angularDamping = ballAngularDamping;

}

function stopBallMiniGame() {
    ballVisible = false;
    showDogMusicNote = false;

    //REVIEW - MODIFICA PER PALLA CALO FPS FIREFOX
    ballRenderInitialized = false;


    if (!ballBody) return;

    ballBody.velocity.set(0.0, 0.0, 0.0);
    ballBody.angularVelocity.set(0.0, 0.0, 0.0);

    // La sposto sotto la stanza
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
        Controllo X/Z: la palla è dentro l'area del piano del tavolo.
        Uso il piano vero del tavolo, non la zona larga usata per evitare il cane.
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
        Altezza del piano superiore del tavolo.
        La palla sopra al tavolo ha il centro circa a:
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

    // soglia: se è quasi ferma
    return speed < 0.15 && ballBody.position.y < PHYSICS_FLOOR_Y + ballRadius + 0.15;
}




function startBallBounceAnimation() {
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

    // Dopo il primo salto, aspetta che la palla torni a terra
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
        Questa funzione usa gli stessi valori del box debug.
        Quindi quello che vedi è quello che blocca il cane.
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
        Se il percorso diretto non attraversa la panchina,
        il cane va direttamente al target.
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
        Altrimenti passo da uno degli angoli esterni della zona panchina.
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
            Voglio un angolo raggiungibile dal cane
            e da cui poi si possa arrivare al frisbee.
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

   /* var nextX = dogCurrentX + dirX * dogSpeed * deltaTime;
    var nextZ = dogCurrentZ + dirZ * dogSpeed * deltaTime;

    // Safety check: anche se il waypoint path sbaglia,
    // il cane non può entrare nella zona del tavolo.
    var corrected = keepDogOutsideTable(nextX, nextZ);

    dogCurrentX = corrected.x;
    dogCurrentZ = corrected.z;

    dogAngleToBall = Math.atan2(dirX, dirZ) * 180.0 / Math.PI; */
    var nextX = dogCurrentX + dirX * dogSpeed * deltaTime;
    var nextZ = dogCurrentZ + dirZ * dogSpeed * deltaTime;

    // Safety check: se il prossimo passo entra nel tavolo,
    // non lo facciamo entrare.
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

    // safety: se per qualche motivo sta entrando nel tavolo,
    // passa al waypoint successivo invece di bloccarsi lì
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
        Controllo se la palla è dentro l'area X/Z del tavolo.
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
        Calcolo la parte bassa del piano del tavolo.
        Se la palla sta sotto quella quota, il cane non può raggiungerla.
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
    if (!ballBody) return;
    dogFetchObjectType = "ball";


     if (!dogHappySoundPlayed) {
        playDogHappySound();
        dogHappySoundPlayed = true;
    }


    showDogMusicNote = true;

    // RESET stato precedente del cane
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;

    // evita di partire già dentro la zona del tavolos
    var correctedStart = keepDogOutsideTable(dogFetchX, dogFetchZ);
    dogFetchX = correctedStart.x;
    dogFetchZ = correctedStart.z;

    var ballX = ballBody.position.x;
    var ballZ = ballBody.position.z;
    dogLookAtBallX = ballX;
    dogLookAtBallZ = ballZ;

    // target sicuro rispetto al tavolo
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
    Se la palla è vicina a una parete, il cane deve fermarsi
    più all'interno della stanza, altrimenti quando si abbassa
    entra nel muro.
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

    // questo invece è il punto che il cane guarda: la palla vera/safe

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
            La sposto sotto il pavimento così non rimane visibile
            fuori dalla stanza.
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
        Se il target è troppo vicino, non cambio orientamento:
        è proprio qui che spesso nasce il giro su se stesso.
    */
    if (dist < 0.25) {
        return;
    }

    /*
        Uso lo stesso verso che già usi nel cane.
        Se il cane guarda dalla parte opposta, togli i due meno.
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
            Prima di abbassarsi, tengo il corpo del cane
            più lontano dalle pareti.
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

function updateSkinnedDogFetchBall(deltaTime) {

    if (dogFetchLoweringActive) {

        /* if (dogFetchObjectType === "frisbee") {
           
            dogFetchLowerAmount += (0.28 - dogFetchLowerAmount) * 0.12;

            if (dogFetchLowerAmount > 0.22 && !dogHasFrisbee) {
                dogHasFrisbee = true;

                showDogMusicNote = false;
                dogHappySoundPlayed = false;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                console.log("Dog picked up the frisbee!");

                startSkinnedDogReturnFrisbeeToCamera();
            }
        } */

        if (dogFetchObjectType === "frisbee") {
            var pickupDeltaTime =
                typeof deltaTime === "number" && isFinite(deltaTime)
                    ? Math.min(deltaTime, 0.05)
                    : 1.0 / 60.0;

            pickupDeltaTime *= frisbeePickupSlowMotion;
            /*
                Prima fase: il cane si abbassa verso il frisbee.
                Non attacco subito il frisbee alla bocca.
            */
            var frisbeeLowerTarget = 0.50;

            if(!dogHasFrisbee) {
                dogFetchLowerAmount +=
                    (frisbeeLowerTarget - dogFetchLowerAmount) * 0.035;
            }
            showDogMusicNote = false;
            dogHappySoundPlayed = false;

            /*
                Solo quando è abbastanza basso, il frisbee va in bocca.
            */
            if (dogFetchLowerAmount > 0.38 && !dogHasFrisbee) {
                dogHasFrisbee = true;
                //frisbeePickupBlend = 1.0;
                frisbeePickupHoldTimer = 0.0;

                console.log("Dog picked up the frisbee!");
            }

            /*
                Piccola pausa con il cane ancora abbassato.
                Poi parte il ritorno.
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
                    Mentre aspetta, il cane rialza piano0
                    );

                /*
                    Mentre aspetta, il cane rialza piano la testa.
                    Parte da lower alto e torna verso 0.
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
                Comportamento vecchio della palla:
                qui lasciamo l'abbassamento più marcato.
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

    //REVIEW -  MODIFICA per cane che gira su stesso

    /*
        Evita che il cane si fermi/ruoti su waypoint troppo vicini.
        Succede soprattutto vicino al tavolo, quando il path genera
        un punto intermedio quasi sotto o dietro al cane.
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
        Prima il cane faceva circa 0.035 unità per frame.
        A 60 FPS equivale a:
        0.035 * 60 = 2.1 unità al secondo.

        Ora quindi la velocità è in unità/secondo,
        e si adatta automaticamente agli FPS reali.
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
        Per la Teapot Chase non voglio che il cane arrivi
        esattamente sul waypoint prima di girare.

        Con un raggio più grande, quando il cane è abbastanza vicino
        al waypoint passa già al punto successivo.
        Questo rende la curva meno scattosa.
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
            }

            /*
                Anti-stuck per Teapot Chase:
                se la correzione anti-tavolo non fa avanzare il cane,
                salto al prossimo waypoint invece di lasciarlo fermo sul bordo.
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
                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogFetchTarget = {
                    x: bowlX,
                    z: bowlZ
                };

                showDogMusicNote = false;

                /*
                    Il cane resta lì vicino e guarda la ciotola.
                */
                updateDogFacingTarget(
                    bowlX,
                    bowlZ,
                    deltaTime
                );

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
                    Il cane è tornato verso la camera con il frisbee.
                    Non deve abbassarsi di nuovo.
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
                    Primo arrivo: cane arrivato al target.
                    Però per il frisbee controllo anche la distanza reale dal disco.
                */

                if (dogFetchObjectType === "frisbee") {
                    var fx = dogLookAtBallX - dogFetchX;
                    var fz = dogLookAtBallZ - dogFetchZ;

                    var distToFrisbee = Math.sqrt(fx * fx + fz * fz);

                    var frisbeePickupDistance =1.55;

                    if (distToFrisbee > frisbeePickupDistance) {
                        /*
                            Il cane è arrivato al primo punto sicuro,
                            ma il frisbee è ancora lontano.
                            Allora gli creo un nuovo target più vicino al disco.
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
                            Evito comunque che il nuovo target finisca dentro la panchina.
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

                /* else if (dogFetchObjectType === "ball" && !dogHasBall) {
                    var bx = dogLookAtBallX - dogFetchX;
                    var bz = dogLookAtBallZ - dogFetchZ;

                    var distToBall = Math.sqrt(bx * bx + bz * bz);

                    var ballPickupDistance = 1.20;

                    if (distToBall < 1.25) {
                        dogFetchBallMode = false;

                        dogPath = [];
                        dogPathIndex = 0;

                        dogFetchLoweringActive = true;
                        dogFetchLowerAmount = 0.0;

                        dogFetchTarget = {
                            x: dogLookAtBallX,
                            z: dogLookAtBallZ
                        };

                        showDogMusicNote = false;

                        return;
                    }

                    if (distToBall > ballPickupDistance) {
                        
                        //    Il cane è arrivato al primo punto sicuro,
                        //    ma la palla è ancora lontana.
                        //    Succede soprattutto quando la palla è
                        //    dall'altra parte del tavolo.
                        

                        var closerStopOffset = 0.45;

                        var correctedCloserTarget =
                            getSafeDogBodyTargetForFetch(
                                dogLookAtBallX,
                                dogLookAtBallZ,
                                closerStopOffset
                            );

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
                        dogFetchBallMode = true;

                        dogFetchLoweringActive = false;
                        dogFetchLowerAmount = 0.0;

                        dogFetchTarget = {
                            x: dogLookAtBallX,
                            z: dogLookAtBallZ
                        };

                        console.log(
                            "Ball still far, moving closer:",
                            distToBall,
                            dogPath
                        );

                        return;
                    }
                } */

                else if (dogFetchObjectType === "ball" && !dogHasBall) {
                    var bx = dogLookAtBallX - dogFetchX;
                    var bz = dogLookAtBallZ - dogFetchZ;

                    var distToBall = Math.sqrt(bx * bx + bz * bz);

                    /*
                        Un po' più permissivo.
                        Prima era 0.95: in alcuni casi il cane era visivamente vicino,
                        ma il codice lo considerava ancora "troppo lontano".
                    */
                    var ballPickupDistance = 1.20;

                    if (distToBall > ballPickupDistance) {
                        var closerStopOffset = 0.45;

                        /* var correctedCloserTarget =
                            getSafeDogBodyTargetForFetch(
                                dogLookAtBallX,
                                dogLookAtBallZ,
                                closerStopOffset
                            ); */

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
                            Se il target sicuro è praticamente dove sta già il cane,
                            non ricalcolo path all'infinito: lo faccio abbassare.
                        */
                        var distToCloserTarget = dist2D(
                            dogFetchX,
                            dogFetchZ,
                            correctedCloserTarget.x,
                            correctedCloserTarget.z
                        );

                        /* if (distToCloserTarget < 0.22) {
                            dogFetchBallMode = false;

                            dogPath = [];
                            dogPathIndex = 0;

                            dogFetchLoweringActive = true;
                            dogFetchLowerAmount = 0.0;

                            dogFetchTarget = {
                                x: dogLookAtBallX,
                                z: dogLookAtBallZ
                            };

                            showDogMusicNote = false;

                            return;
                        } */
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
                            IMPORTANTISSIMO:
                            mentre il cane cammina, deve guardare il prossimo waypoint,
                            NON direttamente la palla.
                            Altrimenti gira su sé stesso vicino al tavolo.
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

                        // console.log(
                        //     "Ball still far, moving closer:",
                        //     distToBall,
                        //     dogPath
                        // );

                        return;
                    }
                }

                /* dogFetchLoweringActive = true;

                dogFetchTarget = {
                    x: dogLookAtBallX,
                    z: dogLookAtBallZ
                };
                */
               startDogBallPickupLowering();


                console.log("DOG ARRIVED - LOWER:", dogFetchLowerAmount);
            }
        }

        else {
            /*
                Aggiorno subito il target visivo verso il prossimo waypoint.
                Così il cane non resta orientato al vecchio punto.
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
        Caso speciale: palla fuori dalla casa.
        Questo controllo deve stare PRIMA del controllo sulla velocità,
        perché se la palla vola fuori mentre si muove, il cane non deve
        comunque provare a inseguirla.
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
            Blocco il retargeting del cane.
        */
        skinnedDogAlreadyTargeted = true;

        /*
            Stop immediato del fetch.
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
        Se la palla si sta ancora muovendo, resetto i warning.
        Così se poi viene rilanciata, il messaggio può ricomparire.
    */
    if (ballSpeed > 0.18) {
        ballOnTableWarningShown = false;
        ballBlockedOnTable = false;

        ballUnderTableWarningShown = false;
        ballBlockedUnderTable = false;

        /*
            Non resetto ballOutsideHomeWarningShown qui,
            perché se la palla è fuori casa il controllo sopra ha già fatto return.
        */

        return;
    }

    /*
        Caso speciale: palla ferma sul tavolo.
        Il cane non può prenderla.
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
        Caso speciale: palla ferma sotto al tavolo.
        Il cane non può prenderla.
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
        Se prima era bloccata fuori casa, sul tavolo o sotto al tavolo,
        ma ora non lo è più, permetto di nuovo al cane di partire.
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
        Se la palla si sta ancora muovendo, resetto i warning.
        Così se poi viene rilanciata, il messaggio può ricomparire.
    */
    if (ballSpeed > 0.18) {
        ballOnTableWarningShown = false;
        ballBlockedOnTable = false;

        ballUnderTableWarningShown = false;
        ballBlockedUnderTable = false;

        return;
    }

    /*
        Caso speciale: palla ferma sul tavolo.
        Il cane non può prenderla.
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
        Caso speciale: palla ferma sotto al tavolo.
        Il cane non può prenderla.
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
        Se prima era bloccata sul tavolo o sotto al tavolo,
        ma ora non lo è più, permetto di nuovo al cane di partire.
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
    /* var margin = 1.25; // spazio per non infilare muso/corpo nelle pareti

    var minX = -7.2 + margin;
    var maxX =  7.2 - margin;

    var minZ = -5.8 + margin;
    var maxZ =  8.5 - margin;

    return {
        x: Math.max(minX, Math.min(maxX, x)),
        z: Math.max(minZ, Math.min(maxZ, z))
    }; */

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

    // opzionale, se lo hai aggiunto
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
    /* dogHasBall = false;
    dogFetchBallMode = false;

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    skinnedDogAlreadyTargeted = false; */
    // Palla non più in bocca
    dogHasBall = false;

    // Movimento verso la palla
    dogFetchBallMode = false;
    dogPath = [];
    dogPathIndex = 0;
    dogFetchTarget = null;

    // Lowering di collo e testa
    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

    // Posa sdraiata
    dogCrouchActive = false;
    dogCrouchAmount = 0.0;

    // Permette al cane di essere inviato verso la nuova palla
    skinnedDogAlreadyTargeted = false;

}

function getBallModelMatrix() {
    var modelMatrixBall = mat4();

    if (dogHasBall) {
        var rad = dogCurrentAngle * Math.PI / 180.0;

        var forwardX = Math.sin(rad);
        var forwardZ = Math.cos(rad);

        var crouchBodyDown = 0.22 * dogCrouchAmount;

        // Quando il cane è sdraiato, la bocca arretra e scende
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
        //REVIEW -  MODIFICA POSIZIONE PALLA CALO FPS FIREFOX
        /* if (!ballBody) return modelMatrixBall;

         modelMatrixBall = mult(
            modelMatrixBall,
            translate(
                ballBody.position.x,
                ballBody.position.y,
                ballBody.position.z
            )
        );  */


        if (!ballBody) return modelMatrixBall;

        if (!ballRenderInitialized) {
            resetBallRenderPositionToPhysics();
        }

        /*
            Smoothing visivo controllato.
            Non usa interpolatedPosition di Cannon, quindi non rischia
            di pescare posizioni vecchie sotto il pavimento.
        */
        var vx = ballBody.velocity.x;
        var vy = ballBody.velocity.y;
        var vz = ballBody.velocity.z;

        var ballSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);

        /*
            Quando la palla è lanciata veloce, la seguo di più.
            Quando rallenta, tengo più smoothing.
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

        // Punto alto-centro della tenda
        this.originX = originX;
        this.originY = originY;
        this.originZ = originZ;

        this.bodies = [];

        // Mesh triangolata senza indici, compatibile con il tuo drawObject()
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

        // la tenda sta nel piano Y-Z, vicino alla parete destra
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

                // diagonali: rendono la stoffa meno "gommosissima"
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
        // vento leggero verso l'interno della stanza
        for (var y = 1; y < this.rows; y++) {
            for (var x = 0; x < this.cols; x++) {
                var body = this.getBody(x, y);

                var u = x / (this.cols - 1);
                var v = y / (this.rows - 1);

                var strength =
                    Math.sin(time * 0.002 + u * 5.0 + v * 2.0) * curtainWindStrength;

                // La parete destra è a x=7, interno stanza verso -X
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

    dogFetchLoweringActive = false;
    dogFetchLowerAmount = 0.0;

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