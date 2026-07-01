function createParkGrassPatchInstances() {
    grassPatchInstances = [];

    var count = 200;   // prova 50 / 70 / 100
    var minX = -6.0;
    var maxX =  6.0;
    var minZ = -5.5;
    var maxZ =  7.0;

    for (var i = 0; i < count; i++) {
        var x = minX + Math.random() * (maxX - minX);
        var z = minZ + Math.random() * (maxZ - minZ);

        /*
            Scala random: meglio piccoli ciuffi,
            non tutti uguali.
        */
        var s = 0.3 + Math.random() * 0.30;

        grassPatchInstances.push({
            x: x,
            y: -2.28,
            z: z,
            scale: s,
            rotY: Math.random() * 360.0
        });
    }
}


function drawParkGrassPatches(viewMatrix, projectionMatrix) {
    if (!grassBlockBuffers) return;

    gl.disable(gl.CULL_FACE);

    for (var i = 0; i < grassPatchInstances.length; i++) {
        var g = grassPatchInstances[i];

        var m = mat4();

        m = mult(m, translate(g.x, g.y, g.z));
        m = mult(m, rotate(g.rotY, [0, 1, 0]));
        m = mult(m, scalem(g.scale, g.scale, g.scale));

        drawObject(
            grassBlockBuffers,
            grassBlockTexture,   // oppure grassTexture se vuoi usare quella
            m,
            viewMatrix,
            projectionMatrix,
            true,    // useTexture
            false,   // isLightMarker
            false,    // twoSided
            true,   // receiveShadow, per ora meglio false sui fili d'erba
            6      //wallMode=6 for grass block
        );
    }

    gl.enable(gl.CULL_FACE);
}

/****LEAVES */
function updateFallingLeaves(deltaTime) {
    if (isNight) {
        return; // di notte magari poi mettiamo lucciole
    }

    leafSpawnTimer += deltaTime;

    if (
        leafSpawnTimer >= nextLeafSpawnTime &&
        fallingLeaves.length < maxLeaves
    ) {
        spawnFallingLeaf();

        leafSpawnTimer = 0.0;

        // prossimo spawn random
        nextLeafSpawnTime =
            0.35 + Math.random() * 0.65;
    }

    for (var i = fallingLeaves.length - 1; i >= 0; i--) {
        var leaf = fallingLeaves[i];

        leaf.age += deltaTime;

        leaf.y -= leaf.fallSpeed * deltaTime;

        leaf.x +=
            Math.sin(leaf.age * leaf.swingSpeed + leaf.phase)
            * leaf.swingAmount
            * deltaTime;

        leaf.z += leaf.windSpeed * deltaTime;

        leaf.rot += leaf.rotSpeed * deltaTime;

        if (leaf.y < -2.35) {
            fallingLeaves.splice(i, 1);
        }
    }
}

function spawnFallingLeaf() {
    fallingLeaves.push({
        x: -5.5 + Math.random() * 11.0,
        y: 5.0 + Math.random() * 2.5,
        z: -4.5 + Math.random() * 9.0,

        fallSpeed: 0.25 + Math.random() * 0.35,

        windX: -0.15 + Math.random() * 0.30,
        windZ: -0.10 + Math.random() * 0.20,

        swaySpeed: 1.5 + Math.random() * 2.5,
        swayAmount: 0.25 + Math.random() * 0.35,

        rotY: Math.random() * 360.0,
        rotX: Math.random() * 360.0,
        rotZ: Math.random() * 360.0,

        rotSpeedY: -80.0 + Math.random() * 160.0,
        rotSpeedX: -45.0 + Math.random() * 90.0,
        rotSpeedZ: -60.0 + Math.random() * 120.0,

        scale: 0.10 + Math.random() * 0.06,

        phase: Math.random() * 6.28318,
        age: 0.0
    });
}

function updateFallingLeaves(deltaTime) {
    if (isNight) {
        fallingLeaves = [];
        return;
    }

    leafSpawnTimer += deltaTime;

    if (
        leafSpawnTimer >= nextLeafSpawnTime &&
        fallingLeaves.length < maxFallingLeaves
    ) {
        spawnFallingLeaf();

        leafSpawnTimer = 0.0;

        nextLeafSpawnTime =
            0.35 + Math.random() * 0.65;
    }

    var t = performance.now() * 0.001;

    var gust =
        Math.sin(t * 0.8) * 0.5 +
        Math.sin(t * 1.7) * 0.25;

    for (var i = fallingLeaves.length - 1; i >= 0; i--) {
        var leaf = fallingLeaves[i];

        leaf.age += deltaTime;

        // caduta verticale
        leaf.y -= leaf.fallSpeed * deltaTime;

        // oscillazione naturale
        var windMultiplier =
            1.0 + parkWindStrength * 7.0;

        var sway =
            Math.sin(
                leaf.age * leaf.swaySpeed * windMultiplier +
                leaf.phase
            ) * leaf.swayAmount * windMultiplier;
        
        // vento: più parkWindStrength è alto, più si muove
        leaf.x +=
            (
                sway +
                leaf.windX * parkWindStrength * 2.5 +
                gust * parkWindStrength * 1.2
            ) * deltaTime;

        leaf.z +=
            (
                leaf.windZ * parkWindStrength * 1.8 +
                gust * parkWindStrength * 0.6
            ) * deltaTime;

        // rotazione aumentata dal vento
        leaf.rotY +=
            (
                leaf.rotSpeedY +
                parkWindStrength * 180.0
            ) * deltaTime;

        leaf.rotX +=
            (
                leaf.rotSpeedX +
                parkWindStrength * 120.0
            ) * deltaTime;

        leaf.rotZ +=
            (
                leaf.rotSpeedZ +
                parkWindStrength * 140.0
            ) * deltaTime;

        // se arriva sotto il prato o troppo fuori, la elimino
        if (
            leaf.y < -2.35 ||
            leaf.x < -8.0 ||
            leaf.x > 8.0 ||
            leaf.z < -7.0 ||
            leaf.z > 9.0
        ) {
            fallingLeaves.splice(i, 1);
        }
    }
}

function drawFallingLeaves(viewMatrix, projectionMatrix) {
    if (isNight) {
        return;
    }

    if (!leafBuffers) {
        return;
    }

    gl.disable(gl.CULL_FACE);

    for (var i = 0; i < fallingLeaves.length; i++) {
        var leaf = fallingLeaves[i];

        var m = mat4();

        m = mult(
            m,
            translate(
                leaf.x,
                leaf.y,
                leaf.z
            )
        );

        m = mult(
            m,
            rotate(
                leaf.rotY,
                [0, 1, 0]
            )
        );

        m = mult(
            m,
            rotate(
                leaf.rotX,
                [1, 0, 0]
            )
        );

        m = mult(
            m,
            rotate(
                leaf.rotZ,
                [0, 0, 1]
            )
        );

        m = mult(
            m,
            scalem(
                leaf.scale,
                leaf.scale,
                leaf.scale
            )
        );

        drawObject(
            leafBuffers,
            leafTexture,
            m,
            viewMatrix,
            projectionMatrix,
            true,    // useTexture
            false,   // isLightMarker
            true,    // twoSided, così la foglia si vede da entrambi i lati
            false,   // receiveShadow: meglio false, evita flickering
            0
        );
    }

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
}


function initFireflies() {
    fireflies = [];

    for (var i = 0; i < maxFireflies; i++) {
        fireflies.push({
            baseX: -5.5 + Math.random() * 11.0,
            baseY: -1.4 + Math.random() * 2.2,
            baseZ: -4.5 + Math.random() * 9.0,

            x: 0.0,
            y: 0.0,
            z: 0.0,

            phase: Math.random() * 6.28318,

            speed: 0.45 + Math.random() * 0.75,

            radiusX: 0.25 + Math.random() * 0.55,
            radiusY: 0.12 + Math.random() * 0.35,
            radiusZ: 0.20 + Math.random() * 0.50,

            pulseSpeed: 1.2 + Math.random() * 2.2,

            scale: 0.032 + Math.random() * 0.018
        });
    }

    firefliesInitialized = true;
}

function updateFireflies(deltaTime) {
    if (!isNight) {
        firefliesInitialized = false;
        fireflies = [];
        return;
    }

    if (!firefliesInitialized) {
        initFireflies();
    }

    var t = performance.now() * 0.001;

    for (var i = 0; i < fireflies.length; i++) {
        var f = fireflies[i];

        f.x =
            f.baseX +
            Math.sin(t * f.speed + f.phase) * f.radiusX +
            Math.sin(t * 0.37 + f.phase * 1.7) * 0.18;

        f.y =
            f.baseY +
            Math.sin(t * f.speed * 1.8 + f.phase) * f.radiusY;

        f.z =
            f.baseZ +
            Math.cos(t * f.speed * 0.9 + f.phase) * f.radiusZ +
            Math.sin(t * 0.51 + f.phase) * 0.12;
    }
}

function drawFireflies(viewMatrix, projectionMatrix) {
    if (!isNight) {
        return;
    }

    if (!fireflySphereBuffers || !fireflyTexture) {
        return;
    }

    var t = performance.now() * 0.001;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.disable(gl.CULL_FACE);

    for (var i = 0; i < fireflies.length; i++) {
        var f = fireflies[i];

        var pulse =
            0.75 +
            0.35 * Math.sin(t * f.pulseSpeed + f.phase);

        var s =
            f.scale * pulse;

        var m = mat4();

        m = mult(
            m,
            translate(
                f.x,
                f.y,
                f.z
            )
        );

        m = mult(
            m,
            scalem(
                s,
                s,
                s
            )
        );

        drawObject(
            fireflySphereBuffers,
            fireflyTexture,
            m,
            viewMatrix,
            projectionMatrix,
            true,   // useTexture
            true,   // isLightMarker: luminosa
            false,  // twoSided
            false,  // receiveShadow
            0
        );
    }

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.disable(gl.BLEND);
}

function updateDogFireflyCatch(deltaTime) {
    if (
        !isNight ||
        !fireflies ||
        fireflies.length === 0 ||
        dogFetchBallMode ||
        dogCrouchAmount > 0.05 ||
        dogHasBall ||
        dogHasFrisbee
    ) {
        dogFireflyCatchActive = false;
        dogFireflyCatchPhase = "idle";
        dogFireflyTarget = null;

        if (dogFireflyPreviousTarget) {
            dogFetchTarget = dogFireflyPreviousTarget;
            dogFireflyPreviousTarget = null;
        }

        return;
    }

    if (dogFireflyCatchActive) {
        dogFireflyCatchTimer += deltaTime;

        /*
            FASE 1:
            il cane corre su una traiettoria circolare
            nella zona delle lucciole.
        */
        if (dogFireflyCatchPhase === "chase") {
            dogFireflyOrbitAngle += deltaTime * 2.5;

            var wobble =
                0.12 * Math.sin(dogFireflyCatchTimer * 4.0);

            var r =
                dogFireflyChaseRadius + wobble;

            dogFetchX =
                dogFireflyCircleCenterX +
                Math.cos(dogFireflyOrbitAngle) * r;

            dogFetchZ =
                dogFireflyCircleCenterZ +
                Math.sin(dogFireflyOrbitAngle) * r;

            /*
                IMPORTANTISSIMO:
                non guarda la lucciola fissa,
                guarda un punto più avanti sul cerchio.
                Così sembra che corra davvero lungo la traiettoria.
            */
            var lookAheadAngle =
                dogFireflyOrbitAngle + 0.55;

            dogFetchTarget = {
                x:
                    dogFireflyCircleCenterX +
                    Math.cos(lookAheadAngle) * r,

                z:
                    dogFireflyCircleCenterZ +
                    Math.sin(lookAheadAngle) * r
            };

            if (dogFireflyCatchTimer >= dogFireflyChaseDuration) {
                /*
                    Si ferma esattamente dove è arrivato
                    e passa alla posa sulle zampe posteriori.
                */
                dogFireflyCatchPhase = "rear";
                dogFireflyCatchTimer = 0.0;

                if (dogFireflyTarget) {
                    dogFetchTarget = {
                        x: dogFireflyTarget.x,
                        z: dogFireflyTarget.z
                    };
                }
            }

            return;
        }

        /*
            FASE 2:
            saltino + zampe anteriori.
        */
        if (dogFireflyCatchPhase === "rear") {
            /*
                Durante questa fase NON cambio dogFetchX/Z.
                Quindi il cane resta fermo nel punto in cui ha finito la corsa.
            */

            if (dogFireflyTarget) {
                dogFetchTarget = {
                    x: dogFireflyTarget.x,
                    z: dogFireflyTarget.z
                };
            }

            if (dogFireflyCatchTimer >= dogFireflyRearDuration) {
                dogFireflyCatchActive = false;
                dogFireflyCatchPhase = "idle";
                dogFireflyTarget = null;

                if (dogFireflyPreviousTarget) {
                    dogFetchTarget = dogFireflyPreviousTarget;
                    dogFireflyPreviousTarget = null;
                }

                dogFireflyCatchCooldown =
                    3.0 + Math.random() * 4.0;
            }

            return;
        }
    }

    dogFireflyCatchCooldown -= deltaTime;

    if (dogFireflyCatchCooldown > 0.0) {
        return;
    }

    /*
        Scelgo una lucciola vicina al cane.
    */
    var bestFirefly = null;
    var bestDist = 999999.0;

    for (var i = 0; i < fireflies.length; i++) {
        var f = fireflies[i];

        var dx = f.x - dogFetchX;
        var dz = f.z - dogFetchZ;

        var d = Math.sqrt(dx * dx + dz * dz);

        if (d < bestDist && d < 5.5) {
            bestDist = d;
            bestFirefly = f;
        }
    }

    if (!bestFirefly) {
        dogFireflyCatchCooldown =
            2.0 + Math.random() * 3.0;
        return;
    }

    /*
        Centro della zona delle lucciole:
        faccio una media delle lucciole vicine alla target.
        Così il cerchio non è centrato sul cane,
        ma sulla zona luminosa.
    */
    var sumX = 0.0;
    var sumZ = 0.0;
    var count = 0;

    for (var j = 0; j < fireflies.length; j++) {
        var ff = fireflies[j];

        var dfx = ff.x - bestFirefly.x;
        var dfz = ff.z - bestFirefly.z;

        var dd = Math.sqrt(dfx * dfx + dfz * dfz);

        if (dd < 3.0) {
            sumX += ff.x;
            sumZ += ff.z;
            count++;
        }
    }

    if (count > 0) {
        dogFireflyCircleCenterX = sumX / count;
        dogFireflyCircleCenterZ = sumZ / count;
    } else {
        dogFireflyCircleCenterX = bestFirefly.x;
        dogFireflyCircleCenterZ = bestFirefly.z;
    }

    /*
        Calcolo raggio e angolo iniziale in modo che il cane
        parta dalla sua posizione attuale, senza teleport brutto.
    */
    var startDx =
        dogFetchX - dogFireflyCircleCenterX;

    var startDz =
        dogFetchZ - dogFireflyCircleCenterZ;

    dogFireflyChaseRadius =
        Math.sqrt(startDx * startDx + startDz * startDz);

    if (dogFireflyChaseRadius < 0.9) {
        dogFireflyChaseRadius = 0.9;

        var randomAngle =
            Math.random() * Math.PI * 2.0;

        dogFireflyCircleCenterX =
            dogFetchX -
            Math.cos(randomAngle) * dogFireflyChaseRadius;

        dogFireflyCircleCenterZ =
            dogFetchZ -
            Math.sin(randomAngle) * dogFireflyChaseRadius;

        dogFireflyOrbitAngle = randomAngle;
    } else {
        dogFireflyOrbitAngle =
            Math.atan2(startDz, startDx);
    }

    dogFireflyPreviousTarget = dogFetchTarget;

    dogFireflyTarget = bestFirefly;
    dogFireflyCatchActive = true;
    dogFireflyCatchPhase = "chase";
    dogFireflyCatchTimer = 0.0;
}