var ballRadius = 0.20;
var BALL_RENDER_Y_OFFSET = 0.4;

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


function initPhysics() {
    physicsWorld = new CANNON.World();

    physicsWorld.gravity.set(0, -9.82, 0);
    physicsWorld.broadphase = new CANNON.NaiveBroadphase();
    physicsWorld.solver.iterations = 10;

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

    // collider invisibile del tavolo
    tableColliderBody = addStaticBoxCollider(
        tableColliderX,
        tableColliderY,
        tableColliderZ,
        tableColliderSX,
        tableColliderSY,
        tableColliderSZ,
        floorMaterial
    );
    // Pallina fisica
    var ballShape = new CANNON.Sphere(ballRadius);

    ballBody = new CANNON.Body({
        mass: 1.0,
        material: ballMaterial,
        position: new CANNON.Vec3(0.0, 2.5, 3.0)
    });

    ballBody.addShape(ballShape);

    // Un po' di damping per non farla rimbalzare per sempre
    ballBody.linearDamping = 0.18;
    ballBody.angularDamping = 0.35;

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