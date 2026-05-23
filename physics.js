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
var TABLE_Y = -1.9;
var TABLE_Z = 0.0;

var TABLE_TOP_WIDTH  = 3.6;
var TABLE_TOP_HEIGHT = 0.18;
var TABLE_TOP_DEPTH  = 4.5;

var TABLE_TOP_OFFSET_Y = 0.70;

var TABLE_LEG_WIDTH  = 0.18;
var TABLE_LEG_HEIGHT = 1.20;
var TABLE_LEG_DEPTH  = 0.18;

var TABLE_LEG_OFFSET_Y = -0.15;

var TABLE_LEG_MARGIN_X = 0.50;
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
        return [
            { x: targetX, z: targetZ }
        ];
    }

    return bestPath;
}


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

    
    ballIdleBounceActive = false;
    ballIdleBounceCount = 0;
    ballIdleBounceCooldown = 0;

    // Reset posizione pallina
    ballBody.position.set(0.0, PHYSICS_FLOOR_Y + 3.0, 7.0);

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


function checkBallStoppedAndSendDog(deltaTime) {
    if (!ballBody) return;

    var vx = ballBody.velocity.x;
    var vy = ballBody.velocity.y;
    var vz = ballBody.velocity.z;

    var speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    if (speed < 0.08) {
        ballStoppedTimer += deltaTime;
    } else {
        ballStoppedTimer = 0.0;
        ballAlreadyTargeted = false;
    }

    if (ballStoppedTimer > 0.6 && !ballAlreadyTargeted) {
       /*  dogTargetX = ballBody.position.x;
        dogTargetZ = ballBody.position.z; */
        initDogPositionIfNeeded();

         var reachableTarget = getReachableBallTarget(
            ballBody.position.x,
            ballBody.position.z
        );



        dogPath = computeDogPathToBall(
            dogCurrentX,
            dogCurrentZ,
            reachableTarget.x,
            reachableTarget.z
        );

        
        dogPathIndex = 0;
        dogMovingToBall = true;
        ballAlreadyTargeted = true;
    }
}

/*

    Skinned Dog +ball part

*/
function startSkinnedDogFetchBall() {
    if (!ballBody) return;

    var ballX = ballBody.position.x;
    var ballZ = ballBody.position.z;

    // target sicuro rispetto al tavolo
    var safeTarget = getReachableBallTarget(ballX, ballZ);

    // target sicuro rispetto alle pareti
    safeTarget = clampDogTargetToRoom(safeTarget.x, safeTarget.z);

    // il corpo non deve arrivare esattamente sulla palla
    var dx = safeTarget.x - dogFetchX;
    var dz = safeTarget.z - dogFetchZ;
    var dist = Math.sqrt(dx * dx + dz * dz);

    var bodyStopOffset = 0.95;

    var bodyTargetX = safeTarget.x;
    var bodyTargetZ = safeTarget.z;

    if (dist > 0.001) {
        bodyTargetX = safeTarget.x - (dx / dist) * bodyStopOffset;
        bodyTargetZ = safeTarget.z - (dz / dist) * bodyStopOffset;
    }

    // riclampiamo anche il target del corpo
    var clampedBodyTarget = clampDogTargetToRoom(bodyTargetX, bodyTargetZ);

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
    dogFetchTarget = {
        x: safeTarget.x,
        z: safeTarget.z
    };

    console.log("Skinned dog path:", dogPath);
}

function updateSkinnedDogFetchBall() {
    if (!dogFetchBallMode || !dogPath || dogPath.length === 0) return;

    var target = dogPath[dogPathIndex];

    var dx = target.x - dogFetchX;
    var dz = target.z - dogFetchZ;

    var dist = Math.sqrt(dx * dx + dz * dz);

    var speed = 0.035;

    if (dist > 0.12) {
        dogFetchX += (dx / dist) * speed;
        dogFetchZ += (dz / dist) * speed;

        dogFetchTarget = {
            x: target.x,
            z: target.z
        };
    } else {
        dogPathIndex++;

        if (dogPathIndex >= dogPath.length) {
            dogPathIndex = dogPath.length - 1;
            dogFetchBallMode = false;

            // arrivato vicino: si abbassa verso la palla
            dogFetchLowerAmount = 1.0;
            console.log("DOG ARRIVED - LOWER:", dogFetchLowerAmount);
        }
    }
}


function checkBallStoppedAndSendSkinnedDog() {
    if (!miniGameActive || !ballBody || !ballVisible) return;
    if (skinnedDogAlreadyTargeted) return;

    if (isBallAlmostStopped()) {
        startSkinnedDogFetchBall();
        skinnedDogAlreadyTargeted = true;
    }
}
function clampDogTargetToRoom(x, z) {
    var margin = 1.25; // spazio per non infilare muso/corpo nelle pareti

    var minX = -7.2 + margin;
    var maxX =  7.2 - margin;

    var minZ = -5.8 + margin;
    var maxZ =  8.5 - margin;

    return {
        x: Math.max(minX, Math.min(maxX, x)),
        z: Math.max(minZ, Math.min(maxZ, z))
    };
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
