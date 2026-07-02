function ensureLightMatricesExist() {
    var lightPos = vec3(
        lightPosition[0],
        lightPosition[1],
        lightPosition[2]
    );

    if (!lightViewMatrix) {
        lightViewMatrix = lookAt(
            lightPos,
            vec3(0.0, 0.0, 0.0),
            vec3(0.0, 1.0, 0.0)
        );
    }

    if (!lightProjectionMatrix) {
        lightProjectionMatrix = ortho(
            -20.0, 20.0,
            -20.0, 20.0,
            0.1, 60.0
        );
    }

    if (!pointLightProjectionMatrix) {
        pointLightProjectionMatrix = perspective(
            90.0,
            1.0,
            0.1,
            POINT_SHADOW_FAR
        );
    }

    if (!pointLightViewMatrices || pointLightViewMatrices.length < 6) {
        pointLightViewMatrices = [];

        var lightTargets = [
            vec3( 1.0,  0.0,  0.0),
            vec3(-1.0,  0.0,  0.0),
            vec3( 0.0,  1.0,  0.0),
            vec3( 0.0, -1.0,  0.0),
            vec3( 0.0,  0.0,  1.0),
            vec3( 0.0,  0.0, -1.0)
        ];

        var lightUps = [
            vec3(0.0, -1.0,  0.0),
            vec3(0.0, -1.0,  0.0),
            vec3(0.0,  0.0,  1.0),
            vec3(0.0,  0.0, -1.0),
            vec3(0.0, -1.0,  0.0),
            vec3(0.0, -1.0,  0.0)
        ];

        for (var i = 0; i < 6; i++) {
            var target = add(lightPos, lightTargets[i]);

            pointLightViewMatrices[i] = lookAt(
                lightPos,
                target,
                lightUps[i]
            );
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////

function updateCanvasCursor() {
     if (frisbeeReleaseCursorActive) {
        canvas.style.cursor =  "url('./Icons/open_hand.png') 16 6, pointer";;
    }
    else if (frisbeeThrowMode) {
        canvas.style.cursor =
            "url('./Icons/hand_frisbee_4.png') 16 6, pointer";
    } 
    else if (petDogMode) {
        canvas.style.cursor =
            "url('./Icons/wave.png') 16 6, pointer";
    } else if (callDogClickMode) {
        canvas.style.cursor =
            "url('./Icons/hand_1.png') 12 4, pointer";
    } else {
        canvas.style.cursor = "move";
    }
}
//////////////////////
function resizeCanvasToDisplaySize() {
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    if (
        canvas.width !== displayWidth ||
        canvas.height !== displayHeight
    ) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        gl.viewport(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }
}
/////////////////////////
function finishInitialLoading() {
    var loadingScreen =
        document.getElementById("loadingScreen");

    var startScreen =
        document.getElementById("startScreen");

    // 1. Tolgo SEMPRE il loading
    if (loadingScreen) {
        loadingScreen.classList.add("hidden");

        setTimeout(function () {
            loadingScreen.style.display = "none";
        }, 500);
    }

    // 2. Poi decido se mostrare la schermata start oppure no
    if (ENABLE_START_SCREEN) {
        document.body.classList.add("game-not-started");

        if (startScreen) {
            startScreen.style.display = "flex";
            startScreen.classList.remove("hidden");
        }
    } else {
        document.body.classList.remove("game-not-started");

        if (startScreen) {
            startScreen.classList.add("hidden");
            startScreen.style.display = "none";
        }
    }
}
////////////////////////////////////////////
function updateAutoSun(deltaTime) {
    if (!autoSunEnabled) {
        return;
    }

    var speed;

    if (isNight) {
        // Luna un po' più lenta
        speed = 0.20;
    } else {
        // Sole un po' più veloce
        speed = 0.35;
    }

    autoSunAngle += deltaTime * speed;

    var radiusX = 8.0;
    var centerX = 0.0;

    var minY;
    var maxY;

    if (isNight) {
        minY = 3.5;
        maxY = 9.0;
    } else {
        minY = 2.2;
        maxY = 11.0;
    }

    var centerZ = 1.0;
    var radiusZ = 3.0;

    var x =
        centerX + Math.cos(autoSunAngle) * radiusX;

    var y =
        minY + Math.abs(Math.sin(autoSunAngle)) * (maxY - minY);

    var z =
        centerZ + Math.sin(autoSunAngle * 0.9) * radiusZ;

    lightPosition = vec4(x, y, z, 1.0);

    var lightXSlider = document.getElementById("LightX");
    var lightYSlider = document.getElementById("LightY");
    var lightZSlider = document.getElementById("LightZ");

    var lightXValue = document.getElementById("LightXValue");
    var lightYValue = document.getElementById("LightYValue");
    var lightZValue = document.getElementById("LightZValue");

    if (lightXSlider) lightXSlider.value = x.toFixed(1);
    if (lightYSlider) lightYSlider.value = y.toFixed(1);
    if (lightZSlider) lightZSlider.value = z.toFixed(1);

    if (lightXValue) lightXValue.textContent = x.toFixed(1);
    if (lightYValue) lightYValue.textContent = y.toFixed(1);
    if (lightZValue) lightZValue.textContent = z.toFixed(1);
}
////////////////////////////////////////////////
function createCurtainRodObject(gl, segments = 48) {
    let vertices = [];
    let normals = [];
    let texCoords = [];

    function pushVertex(x, y, z, nx, ny, nz, u, v) {
        vertices.push(vec4(x, y, z, 1.0));
        normals.push(vec4(nx, ny, nz, 0.0));
        texCoords.push(vec2(u, v));
    }

    const zMin = -0.5;
    const zMax =  0.5;

    for (let i = 0; i < segments; i++) {
        let a1 = 2.0 * Math.PI * i / segments;
        let a2 = 2.0 * Math.PI * (i + 1) / segments;

        let x1 = Math.cos(a1);
        let y1 = Math.sin(a1);

        let x2 = Math.cos(a2);
        let y2 = Math.sin(a2);

        let u1 = i / segments;
        let u2 = (i + 1) / segments;

        // lato del cilindro, primo triangolo
        pushVertex(x1, y1, zMin, x1, y1, 0.0, u1, 0.0);
        pushVertex(x1, y1, zMax, x1, y1, 0.0, u1, 1.0);
        pushVertex(x2, y2, zMin, x2, y2, 0.0, u2, 0.0);

        // lato del cilindro, secondo triangolo
        pushVertex(x1, y1, zMax, x1, y1, 0.0, u1, 1.0);
        pushVertex(x2, y2, zMax, x2, y2, 0.0, u2, 1.0);
        pushVertex(x2, y2, zMin, x2, y2, 0.0, u2, 0.0);

        // tappo sinistro
        pushVertex(0.0, 0.0, zMin, 0.0, 0.0, -1.0, 0.5, 0.5);
        pushVertex(x2, y2, zMin, 0.0, 0.0, -1.0, 1.0, 0.5);
        pushVertex(x1, y1, zMin, 0.0, 0.0, -1.0, 0.0, 0.5);

        // tappo destro
        pushVertex(0.0, 0.0, zMax, 0.0, 0.0, 1.0, 0.5, 0.5);
        pushVertex(x1, y1, zMax, 0.0, 0.0, 1.0, 0.0, 0.5);
        pushVertex(x2, y2, zMax, 0.0, 0.0, 1.0, 1.0, 0.5);
    }

    let obj = {};

    obj.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    obj.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    obj.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    obj.numVertices = vertices.length;

    return obj;
}


function initCurtainRod(gl) {
    const cyl = createCylinderVertices(32);

    curtainRodBuffers = {};

    curtainRodBuffers.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, curtainRodBuffers.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cyl.positions, gl.STATIC_DRAW);

    curtainRodBuffers.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, curtainRodBuffers.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cyl.normals, gl.STATIC_DRAW);

    curtainRodBuffers.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curtainRodBuffers.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cyl.indices, gl.STATIC_DRAW);

    curtainRodBuffers.numIndices = cyl.indices.length;
}
/////////////////////////////////////////////////
function updateMiniGameButtonAvailability() {
    var miniGameButton = document.getElementById("ButtonMiniGame");

    if (!miniGameButton) return;

    if (currentScene === "park") {
        miniGameButton.disabled = true;
        miniGameButton.title = "Ball game available only at home";
        miniGameButton.classList.add("disabled-button");
    } else {
        miniGameButton.disabled = false;
        miniGameButton.title = "Start Ball";
        miniGameButton.classList.remove("disabled-button");
    }
}

function updateSceneButtonsVisibility() {
    var isHome = currentScene === "home";

    var isPark = currentScene === "park";

    var waterButton = document.getElementById("ButtonWater");
    var foodButton = document.getElementById("ButtonFood");
    var miniGameButton = document.getElementById("ButtonMiniGame");
    var frisbeeButton = document.getElementById("ButtonFrisbee");
    var focusCurtainButton = document.getElementById("ButtonFocusCurtain");
    var focusTeapotButton = document.getElementById("ButtonTeapotFocus");
    //var windSlider = document.getElementById("windSlider");
    var bounceBallButton =document.getElementById("ButtonBounceBall");
    var ballSettingsPanel = document.getElementById("BallSettingsPanel");
    
    //var curtainSettingsPanel = document.getElementById("CurtainSettingsPanel");
    var rotationSettingsPanel = document.getElementById("RotationSettingsPanel");
    var catMoveButton = document.getElementById("ButtonCatMove");

    if (waterButton) {
        waterButton.style.display = isHome ? "flex" : "none";
    }

    if (foodButton) {
        foodButton.style.display = isHome ? "flex" : "none";
    }

    if (miniGameButton) {
        miniGameButton.style.display = isHome ? "inline-block" : "none";
    }

    if (frisbeeButton) {
        frisbeeButton.style.display = isPark ? "flex" : "none";
    }

    if (focusCurtainButton) {
    focusCurtainButton.style.display = isHome ? "inline-block" : "none";
    }

    if (focusTeapotButton) {
        focusTeapotButton.style.display = isHome ? "inline-block" : "none";
    }

   
    if( bounceBallButton){
        bounceBallButton.style.display = isHome ? "flex" : "none";
    }
    if (ballSettingsPanel) {
        ballSettingsPanel.style.display = isHome ? "block" : "none";
    }

    /* if (curtainSettingsPanel) {
        curtainSettingsPanel.style.display = isHome ? "block" : "none";
    } */

    if (rotationSettingsPanel) {
        rotationSettingsPanel.style.display = isHome ? "block" : "none";
    }
    if( catMoveButton){
        catMoveButton.style.display = isHome ? "flex" : "none";
    }
}
///////////////////////////////////////
function isBallMinigameBusyForTeapot() {
    /*
        Se la palla è attiva, visibile, in movimento,
        o il cane la sta inseguendo/prendendo,
        non permetto di attivare Teapot Chase.
    */

    if (miniGameActive) {
        return true;
    }

   if (
        dogFetchObjectType === "ball" &&
        (
            dogFetchBallMode ||
            dogFetchLoweringActive ||
            dogHasBall ||
            skinnedDogAlreadyTargeted
        )
    ) {
        return true;
    }

    if (ballVisible && ballBody) {
        var vx = ballBody.velocity.x;
        var vy = ballBody.velocity.y;
        var vz = ballBody.velocity.z;

        var speed = Math.sqrt(
            vx * vx +
            vy * vy +
            vz * vz
        );

        if (speed > 0.05) {
            return true;
        }
    }

    return false;
}
/////////////////////////////////////
function showSceneTransition(title, text) {
    var screen = document.getElementById("sceneTransitionScreen");
    var titleElement = document.getElementById("SceneTransitionTitle");
    var textElement = document.getElementById("SceneTransitionText");

    if (!screen) return;

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (textElement) {
        textElement.textContent = text;
    }

    screen.classList.add("active");
}

function hideSceneTransition() {
    var screen = document.getElementById("sceneTransitionScreen");

    if (!screen) return;

    screen.classList.remove("active");
}

function switchSceneWithTransition(targetScene, title, text, beforeSceneChange) {
    if (sceneTransitionActive) return;

    sceneTransitionActive = true;

    if (ENABLE_SCREEN_TRANSITION) {
        showSceneTransition(title, text);
    }

    var delayBeforeChange = ENABLE_SCREEN_TRANSITION ? 650 : 0;
    var delayAfterChange = ENABLE_SCREEN_TRANSITION ? 500 : 0;

    setTimeout(function () {
        if (beforeSceneChange) {
            beforeSceneChange();
        }

        currentScene = targetScene;

        updateSceneButtonsVisibility();

        if (musicButton && musicButton.classList.contains("music-on")) {
            startBackgroundMusic();
        }

        clearOldShadowMaps();

        setTimeout(function () {
            if (ENABLE_SCREEN_TRANSITION) {
                hideSceneTransition();
            }

            sceneTransitionActive = false;
        }, delayAfterChange);

    }, delayBeforeChange);
}
/////////////////////////////////////////
function createWaterDiskObject(gl, segments = 64) {
    let vertices = [];
    let normals = [];
    let texCoords = [];

    function pushVertex(x, y, z, u, v) {
        vertices.push(vec4(x, y, z, 1.0));

        // normale verso l'alto, perché Y è verticale
        normals.push(vec4(0.0, 1.0, 0.0, 0.0));

        texCoords.push(vec2(u, v));
    }

    // disco sul piano XZ, con centro in (0,0,0)
    for (let i = 0; i < segments; i++) {
        let a1 = 2.0 * Math.PI * i / segments;
        let a2 = 2.0 * Math.PI * (i + 1) / segments;

        let x1 = Math.cos(a1);
        let z1 = Math.sin(a1);

        let x2 = Math.cos(a2);
        let z2 = Math.sin(a2);

        pushVertex(0.0, 0.0, 0.0, 0.5, 0.5);
        pushVertex(x2, 0.0, z2, 0.5 + x2 * 0.5, 0.5 + z2 * 0.5);
        pushVertex(x1, 0.0, z1, 0.5 + x1 * 0.5, 0.5 + z1 * 0.5);
    }

    let obj = {};

    obj.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    obj.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    obj.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    obj.numVertices = vertices.length;

    return obj;
}


function createSolidColorTexture(gl, r, g, b, a = 255) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const pixel = new Uint8Array([r, g, b, a]);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

////////////////////////////////////////////////
function clearOldShadowMaps() {
    /*
        Bianco = profondità lontana = nessun oggetto davanti alla luce.
        Quindi è come dire: "non c'è nessuna ombra vecchia".
    */

    var oldViewport = gl.getParameter(gl.VIEWPORT);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // ===== clear point shadow maps =====
    if (pointShadowFramebuffers && pointShadowFramebuffers.length > 0) {
        gl.viewport(0, 0, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);

        for (var i = 0; i < pointShadowFramebuffers.length; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadowFramebuffers[i]);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
    }

    // ===== clear old directional shadow map, se la usi ancora =====
    if (shadowFramebuffer) {
        var directionalShadowSize = 4096;

        gl.viewport(0, 0, directionalShadowSize, directionalShadowSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // torna al framebuffer normale
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // ripristina viewport canvas
    gl.viewport(
        oldViewport[0],
        oldViewport[1],
        oldViewport[2],
        oldViewport[3]
    );

    // ripristina il clear color della scena normale
    gl.clearColor(0.7, 0.9, 0.7, 1.0);
}
////////////////////////////////////////////////
// create sphere for light source
 function loadTexture(path,isMoon=false) {
    let tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
    );

    let image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        //tolgo per texture tavolo 2000x2000
        //gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


        //per non interferire
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);


    };

    image.onerror = function() {
        console.log("texture failed:", path);
    };

    image.src = path;
    return tex;
} 



function createBuffers(points, normals, texCoords) {
    let obj = {};

    obj.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    obj.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    obj.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    obj.numVertices = points.length;

    return obj;
}


function createSphere(radius, latBands, longBands) {
    var points = [];
    var normals = [];
    var texCoords = [];

    for (var lat = 0; lat <= latBands; lat++) {
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= longBands; lon++) {
            var phi = lon * 2.0 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            normals.push(vec4(x, y, z, 0.0));
            points.push(vec4(radius * x, radius * y, radius * z, 1.0));
            texCoords.push(vec2(lon / longBands, lat / latBands));
        }
    }

    var spherePoints = [];
    var sphereNormals = [];
    var sphereTexCoords = [];

    for (var lat = 0; lat < latBands; lat++) {
        for (var lon = 0; lon < longBands; lon++) {
            var first = lat * (longBands + 1) + lon;
            var second = first + longBands + 1;

            // triangolo 1
            spherePoints.push(points[first]);
            sphereNormals.push(normals[first]);
            sphereTexCoords.push(texCoords[first]);

            spherePoints.push(points[second]);
            sphereNormals.push(normals[second]);
            sphereTexCoords.push(texCoords[second]);

            spherePoints.push(points[first + 1]);
            sphereNormals.push(normals[first + 1]);
            sphereTexCoords.push(texCoords[first + 1]);

            // triangolo 2
            spherePoints.push(points[second]);
            sphereNormals.push(normals[second]);
            sphereTexCoords.push(texCoords[second]);

            spherePoints.push(points[second + 1]);
            sphereNormals.push(normals[second + 1]);
            sphereTexCoords.push(texCoords[second + 1]);

            spherePoints.push(points[first + 1]);
            sphereNormals.push(normals[first + 1]);
            sphereTexCoords.push(texCoords[first + 1]);
        }
    }

    return {
        points: spherePoints,
        normals: sphereNormals,
        texCoords: sphereTexCoords
    };
}


function createKibbleObject(gl, radius = 1.0, latBands = 8, longBands = 10, seed = 1) {
    var points = [];
    var normals = [];
    var texCoords = [];

    function pseudoRandom(n) {
        return fract(Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453);
    }

    function fract(x) {
        return x - Math.floor(x);
    }

    for (var lat = 0; lat <= latBands; lat++) {
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= longBands; lon++) {
            var phi = lon * 2.0 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            // piccola irregolarità sulla superficie
            var noise = pseudoRandom(lat * 31.0 + lon * 17.0);
            var bump = 0.88 + noise * 0.24;

            // forma più da croccantino: ovale, non sfera perfetta
            var px = radius * x * 1.25 * bump;
            var py = radius * y * 0.75 * bump;
            var pz = radius * z * 1.05 * bump;

            points.push(vec4(px, py, pz, 1.0));

            // normale approssimata
            normals.push(vec4(x, y, z, 0.0));

            texCoords.push(vec2(lon / longBands, lat / latBands));
        }
    }

    var kibblePoints = [];
    var kibbleNormals = [];
    var kibbleTexCoords = [];

    for (var lat = 0; lat < latBands; lat++) {
        for (var lon = 0; lon < longBands; lon++) {
            var first = lat * (longBands + 1) + lon;
            var second = first + longBands + 1;

            // triangolo 1
            kibblePoints.push(points[first]);
            kibbleNormals.push(normals[first]);
            kibbleTexCoords.push(texCoords[first]);

            kibblePoints.push(points[second]);
            kibbleNormals.push(normals[second]);
            kibbleTexCoords.push(texCoords[second]);

            kibblePoints.push(points[first + 1]);
            kibbleNormals.push(normals[first + 1]);
            kibbleTexCoords.push(texCoords[first + 1]);

            // triangolo 2
            kibblePoints.push(points[second]);
            kibbleNormals.push(normals[second]);
            kibbleTexCoords.push(texCoords[second]);

            kibblePoints.push(points[second + 1]);
            kibbleNormals.push(normals[second + 1]);
            kibbleTexCoords.push(texCoords[second + 1]);

            kibblePoints.push(points[first + 1]);
            kibbleNormals.push(normals[first + 1]);
            kibbleTexCoords.push(texCoords[first + 1]);
        }
    }

    var obj = {};

    obj.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(kibblePoints), gl.STATIC_DRAW);

    obj.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(kibbleNormals), gl.STATIC_DRAW);

    obj.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(kibbleTexCoords), gl.STATIC_DRAW);

    obj.numVertices = kibblePoints.length;

    return obj;
}
////////////////////////////////////////

function deactivateWater() {
    waterVisible = false;

    if (waterButton) {
        waterButton.classList.remove("active");
        waterButton.title = "Give water";
    }

    if (waterSound) {
        waterSound.pause();
        waterSound.currentTime = 0;
    }
}

function deactivateFood() {
    clearKibbleParticles();

    kibbleSpawnRemaining = 0;
    kibbleSpawnTimer = 0.0;
    kibbleSpawnIndex = 0;

    if (foodButton) {
        foodButton.classList.remove("active");
        foodButton.title = "Give Food";
    }

    if (pouringFoodSound) {
        pouringFoodSound.pause();
        pouringFoodSound.currentTime = 0;
    }
}

////////////////////////////////
function inverseMat4(m) {
    var a = flatten(m);

    var out = new Float32Array(16);

    var a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
    var a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
    var a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;

    var det =
        b00 * b11 -
        b01 * b10 +
        b02 * b09 +
        b03 * b08 -
        b04 * b07 +
        b05 * b06;

    if (!det) {
        console.warn("Matrix not invertible");
        return mat4();
    }

    det = 1.0 / det;

    out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return mat4(
        out[0], out[1], out[2], out[3],
        out[4], out[5], out[6], out[7],
        out[8], out[9], out[10], out[11],
        out[12], out[13], out[14], out[15]
    );
}

// create plane for floor and walls
function createPlaneBuffers() {
    var points = [
        vec4(-0.5, 0.0, -0.5, 1.0),
        vec4( 0.5, 0.0,  0.5, 1.0),
        vec4( 0.5, 0.0, -0.5, 1.0),

        vec4(-0.5, 0.0, -0.5, 1.0),
        vec4(-0.5, 0.0,  0.5, 1.0),
        vec4( 0.5, 0.0,  0.5, 1.0)
    ];

    var normals = [
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),

        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0)
    ];

    var texCoords = [
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),

        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0)
    ];

    return createBuffers(points, normals, texCoords);
}

const skyboxVertices = new Float32Array([
    -1, -1, -1,
     1, -1, -1,
    -1,  1, -1,
    -1,  1, -1,
     1, -1, -1,
     1,  1, -1,

    -1, -1,  1,
    -1,  1,  1,
     1, -1,  1,
     1, -1,  1,
    -1,  1,  1,
     1,  1,  1,

    -1,  1, -1,
     1,  1, -1,
    -1,  1,  1,
    -1,  1,  1,
     1,  1, -1,
     1,  1,  1,

    -1, -1, -1,
    -1, -1,  1,
     1, -1, -1,
     1, -1, -1,
    -1, -1,  1,
     1, -1,  1,

    -1, -1, -1,
    -1,  1, -1,
    -1, -1,  1,
    -1, -1,  1,
    -1,  1, -1,
    -1,  1,  1,

     1, -1, -1,
     1, -1,  1,
     1,  1, -1,
     1,  1, -1,
     1, -1,  1,
     1,  1,  1,
]);

function createRightWallWithWindowBuffers() {
    var points = [];
    var normals = [];
    var texCoords = [];

    function addFace(a, b, c, d, normal) {
        points.push(a);
        points.push(b);
        points.push(c);

        points.push(a);
        points.push(c);
        points.push(d);

        for (var i = 0; i < 6; i++) {
            normals.push(normal);
        }

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));
        texCoords.push(vec2(0.0, 1.0));
    }

    /*
        Questa parete è costruita come una box standard:
        coordinate locali da -0.5 a +0.5.

        La parete destra è a x = +0.5.
        Il buco della finestra è nel piano x = +0.5.
        Su questa parete:
        - y = verticale
        - z = orizzontale lungo la parete
    */

    var x = 0.5;

    var yMin = -0.5;
    var yMax =  0.5;

    var zMin = -0.5;
    var zMax =  0.5;

    // Finestra in coordinate locali della box
    var winZCenter = -0.10;
    var winYCenter =  0.10;

    var winWidth  = 0.15;
    var winHeight = 0.50;

    var winZ0 = winZCenter - winWidth / 2.0;
    var winZ1 = winZCenter + winWidth / 2.0;

    var winY0 = winYCenter - winHeight / 2.0;
    var winY1 = winYCenter + winHeight / 2.0;

    // normale della parete destra della box
    //var n = vec4(1.0, 0.0, 0.0, 0.0);
    var n = vec4(-.0, 0.0, 0.0, 0.0);

    // pezzo sotto la finestra
    addFace(
        vec4(x, yMin, zMin, 1.0),
        vec4(x, yMin, zMax, 1.0),
        vec4(x, winY0, zMax, 1.0),
        vec4(x, winY0, zMin, 1.0),
        n
    );

    // pezzo sopra la finestra
    addFace(
        vec4(x, winY1, zMin, 1.0),
        vec4(x, winY1, zMax, 1.0),
        vec4(x, yMax, zMax, 1.0),
        vec4(x, yMax, zMin, 1.0),
        n
    );

    // pezzo sinistro del buco, lungo z
    addFace(
        vec4(x, winY0, zMin, 1.0),
        vec4(x, winY0, winZ0, 1.0),
        vec4(x, winY1, winZ0, 1.0),
        vec4(x, winY1, zMin, 1.0),
        n
    );

    // pezzo destro del buco, lungo z
    addFace(
        vec4(x, winY0, winZ1, 1.0),
        vec4(x, winY0, zMax, 1.0),
        vec4(x, winY1, zMax, 1.0),
        vec4(x, winY1, winZ1, 1.0),
        n
    );

    return createBuffers(points, normals, texCoords);
}

function createRoomBoxWithoutRightWallBuffers() {
    var points = [];
    var normals = [];
    var texCoords = [];

    function addFace(a, b, c, d, normal) {
        points.push(a);
        points.push(b);
        points.push(c);

        points.push(a);
        points.push(c);
        points.push(d);

        for (var i = 0; i < 6; i++) {
            normals.push(normal);
        }

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));
        texCoords.push(vec2(0.0, 1.0));
    }

    var v = [
        vec4(-0.5, -0.5,  0.5, 1.0),
        vec4( 0.5, -0.5,  0.5, 1.0),
        vec4( 0.5,  0.5,  0.5, 1.0),
        vec4(-0.5,  0.5,  0.5, 1.0),

        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4( 0.5, -0.5, -0.5, 1.0),
        vec4( 0.5,  0.5, -0.5, 1.0),
        vec4(-0.5,  0.5, -0.5, 1.0)
    ];

    // front face
    addFace(v[0], v[1], v[2], v[3], vec4(0.0, 0.0, 1.0, 0.0));

    // back face
    addFace(v[5], v[4], v[7], v[6], vec4(0.0, 0.0, -1.0, 0.0));

    // left face
    addFace(v[4], v[0], v[3], v[7], vec4(1.0, 0.0, 0.0, 0.0));

    // right face RIMOSSA perché la sostituiamo con la parete bucata
    // addFace(v[1], v[5], v[6], v[2], vec4(1.0, 0.0, 0.0, 0.0));

    // top face
    addFace(v[3], v[2], v[6], v[7], vec4(0.0, 1.0, 0.0, 0.0));

    // bottom face
    addFace(v[4], v[5], v[1], v[0], vec4(0.0, -1.0, 0.0, 0.0));

    return createBuffers(points, normals, texCoords);
}

function createSkyboxBuffer() {
    var vertices = [
        // front
        vec4(-1, -1,  1, 1),
        vec4( 1, -1,  1, 1),
        vec4( 1,  1,  1, 1),
        vec4(-1, -1,  1, 1),
        vec4( 1,  1,  1, 1),
        vec4(-1,  1,  1, 1),

        // back
        vec4( 1, -1, -1, 1),
        vec4(-1, -1, -1, 1),
        vec4(-1,  1, -1, 1),
        vec4( 1, -1, -1, 1),
        vec4(-1,  1, -1, 1),
        vec4( 1,  1, -1, 1),

        // left
        vec4(-1, -1, -1, 1),
        vec4(-1, -1,  1, 1),
        vec4(-1,  1,  1, 1),
        vec4(-1, -1, -1, 1),
        vec4(-1,  1,  1, 1),
        vec4(-1,  1, -1, 1),

        // right
        vec4(1, -1,  1, 1),
        vec4(1, -1, -1, 1),
        vec4(1,  1, -1, 1),
        vec4(1, -1,  1, 1),
        vec4(1,  1, -1, 1),
        vec4(1,  1,  1, 1),

        // top
        vec4(-1, 1,  1, 1),
        vec4( 1, 1,  1, 1),
        vec4( 1, 1, -1, 1),
        vec4(-1, 1,  1, 1),
        vec4( 1, 1, -1, 1),
        vec4(-1, 1, -1, 1),

        // bottom
        vec4(-1, -1, -1, 1),
        vec4( 1, -1, -1, 1),
        vec4( 1, -1,  1, 1),
        vec4(-1, -1, -1, 1),
        vec4( 1, -1,  1, 1),
        vec4(-1, -1,  1, 1)
    ];

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    return {
        buffer: buffer,
        numVertices: vertices.length
    };
}


function LoadSkyboxTexture(gl)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: path_folder_skyboxes + "bluecloud_rt.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: path_folder_skyboxes + "bluecloud_lf.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: path_folder_skyboxes + "bluecloud_dn.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: path_folder_skyboxes + "bluecloud_up.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: path_folder_skyboxes + "bluecloud_bk.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: path_folder_skyboxes + "bluecloud_ft.jpg",
        },
    ];

    faceInfos.forEach((faceInfo) => {
        const { target, url } = faceInfo;

        gl.texImage2D(
            target,
            0,
            gl.RGBA,
            512,
            512,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

            gl.texImage2D(
                target,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
            );
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        };

        image.src = url;
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}



function LoadSkyboxTexturePark(gl)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: path_folder_skybox_park + "negx.jpg",
            flipY: true,
            rotateDeg: 0
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: path_folder_skybox_park + "posx.jpg",
            flipY: true,
            rotateDeg: 0
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: path_folder_skybox_park + "posy.jpg",
            flipY: true,
            rotateDeg: 0
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: path_folder_skybox_park + "negy.jpg",
            flipY: false,
            rotateDeg: -90
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: path_folder_skybox_park + "posz.jpg",
            flipY: true,
            rotateDeg: 0
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: path_folder_skybox_park + "negz.jpg",
            flipY: true,
            rotateDeg: 0
        },
    ];
    faceInfos.forEach((faceInfo) => {
        const { target, url, flipY,rotateDeg } = faceInfo;

        gl.texImage2D(
            target,
            0,
            gl.RGBA,
            512,
            512,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        const image = new Image();

        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

            gl.pixelStorei(
                gl.UNPACK_FLIP_Y_WEBGL,
                flipY
            );

            uploadCubemapFace(
                gl,
                target,
                image,
                rotateDeg,
                flipY
            );

            gl.pixelStorei(
                gl.UNPACK_FLIP_Y_WEBGL,
                false
            );
        };

        image.src = url;
    });

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}


function uploadCubemapFace(gl, target, image, rotateDeg, flipY)
{
    if (rotateDeg === 0 && !flipY) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        gl.texImage2D(
            target,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");

    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (rotateDeg !== 0) {
        ctx.rotate(rotateDeg * Math.PI / 180.0);
    }

    if (flipY) {
        ctx.scale(1, -1);
    }

    ctx.drawImage(
        image,
        -image.width / 2,
        -image.height / 2
    );

    ctx.restore();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    gl.texImage2D(
        target,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvas
    );
}


function DrawSkybox(gl, viewMatrix, projectionMatrix, flipY = false)
{
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(skyboxProgram);

    gl.uniform1i(
        gl.getUniformLocation(skyboxProgram, "flipSkyboxY"),
        flipY ? 1 : 0
    );

    // for park night mode
    var nightFactorLoc = gl.getUniformLocation(
        skyboxProgram,
        "uNightFactor"
    );

    var nightFactor = 0.0;

    if (currentScene === "park" && isNight) {
        nightFactor = 0.88;
    }

    gl.uniform1f(nightFactorLoc, nightFactor);
    //////////

    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

    gl.enableVertexAttribArray(skyboxPosLoc);
    gl.vertexAttribPointer(
        skyboxPosLoc,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    var viewNoTranslation = mat4();

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            viewNoTranslation[i][j] = viewMatrix[i][j];
        }
    }

    viewNoTranslation[0][3] = 0.0;
    viewNoTranslation[1][3] = 0.0;
    viewNoTranslation[2][3] = 0.0;

    var mvp = mult(
        projectionMatrix,
        viewNoTranslation
    );

    gl.uniformMatrix4fv(
        skyboxMvpLoc,
        false,
        flatten(mvp)
    );

    gl.activeTexture(gl.TEXTURE0);

    if (currentScene === "park") {
        gl.bindTexture(
            gl.TEXTURE_CUBE_MAP,
            parkSkyboxTexture
        );
    }
    else if (isNight) {
        gl.bindTexture(
            gl.TEXTURE_CUBE_MAP,
            nightSkyboxTexture
        );
    }
    else {
        gl.bindTexture(
            gl.TEXTURE_CUBE_MAP,
            skyboxTexture
        );
    }

    

    gl.uniform1i(skyboxSamplerLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Ripristino obbligatorio
    gl.depthMask(true);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
}


function createBoxBuffers() {
    var points = [];
    var normals = [];
    var texCoords = [];

    function addFace(a, b, c, d, normal) {
        // triangolo 1
        points.push(a);
        points.push(b);
        points.push(c);

        // triangolo 2
        points.push(a);
        points.push(c);
        points.push(d);

        for (var i = 0; i < 6; i++) {
            normals.push(normal);
        }

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));

        texCoords.push(vec2(0.0, 0.0));
        texCoords.push(vec2(1.0, 1.0));
        texCoords.push(vec2(0.0, 1.0));
    }

    var v = [
        vec4(-0.5, -0.5,  0.5, 1.0), // 0 front bottom left
        vec4( 0.5, -0.5,  0.5, 1.0), // 1 front bottom right
        vec4( 0.5,  0.5,  0.5, 1.0), // 2 front top right
        vec4(-0.5,  0.5,  0.5, 1.0), // 3 front top left

        vec4(-0.5, -0.5, -0.5, 1.0), // 4 back bottom left
        vec4( 0.5, -0.5, -0.5, 1.0), // 5 back bottom right
        vec4( 0.5,  0.5, -0.5, 1.0), // 6 back top right
        vec4(-0.5,  0.5, -0.5, 1.0)  // 7 back top left
    ];

    // front face
    addFace(v[0], v[1], v[2], v[3], vec4(0.0, 0.0, 1.0, 0.0));

    // back face
    addFace(v[5], v[4], v[7], v[6], vec4(0.0, 0.0, -1.0, 0.0));

    // left face
    addFace(v[4], v[0], v[3], v[7], vec4(-1.0, 0.0, 0.0, 0.0));

    // right face
    addFace(v[1], v[5], v[6], v[2], vec4(1.0, 0.0, 0.0, 0.0));

    // top face
    addFace(v[3], v[2], v[6], v[7], vec4(0.0, 1.0, 0.0, 0.0));

    // bottom face
    addFace(v[4], v[5], v[1], v[0], vec4(0.0, -1.0, 0.0, 0.0));

    return createBuffers(points, normals, texCoords);
}

function LoadSkyboxTextureFromCross(gl, url)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceSize = 512;

    const faceInfos = [
        // target WebGL                         x                 y
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, x: 2 * faceSize, y: 1 * faceSize,rot:0, flipX: false, flipY: false }, // right
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, x: 0 * faceSize, y: 1 * faceSize,rot:0, flipX: false, flipY: false }, // left

        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, x: 1 * faceSize, y: 0 * faceSize,rot:0, flipX: false, flipY: false }, // up
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, x: 1 * faceSize, y: 2 * faceSize,rot:0, flipX: false, flipY: false }, // down

        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, x: 1 * faceSize, y: 1 * faceSize,rot:0, flipX: false, flipY: false }, // front
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, x: 3 * faceSize, y: 1 * faceSize,rot:0, flipX: false, flipY: false }, // back
    ];

    // Placeholder iniziale per ogni faccia
    faceInfos.forEach(function(faceInfo) {
        gl.texImage2D(
            faceInfo.target,
            0,
            gl.RGBA,
            faceSize,
            faceSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );
    });

    const image = new Image();

    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        faceInfos.forEach(function(faceInfo) {
            const canvas = document.createElement("canvas");
            canvas.width = faceSize;
            canvas.height = faceSize;

            const ctx = canvas.getContext("2d");

            ctx.save();

            ctx.translate(faceSize / 2, faceSize / 2);

            ctx.rotate(faceInfo.rot * Math.PI / 180.0);

            ctx.scale(
                faceInfo.flipX ? -1 : 1,
                faceInfo.flipY ? -1 : 1
            );

            ctx.drawImage(
                image,
                faceInfo.x,
                faceInfo.y,
                faceSize,
                faceSize,
                -faceSize / 2,
                -faceSize / 2,
                faceSize,
                faceSize
            );

            ctx.restore();


            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

            gl.texImage2D(
                faceInfo.target,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                canvas
            );
        });
    };

    image.src = url;

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

function DrawLightDirectionArrow(gl, lightPosition, targetPosition, viewMatrix, projectionMatrix)
{
    if (!showLightDirection) {
        return;
    }

    var lightPos = vec3(
        lightPosition[0],
        lightPosition[1],
        lightPosition[2]
    );

    var target = vec3(
        targetPosition[0],
        targetPosition[1],
        targetPosition[2]
    );

    // direzione fisica/debug: dalla luce verso il punto osservato
    var dir = normalize(subtract(target, lightPos));

    var arrowLength = 1.8;
    var endPos = add(lightPos, scale(arrowLength, dir));

    var vertices = new Float32Array([
        lightPos[0], lightPos[1], lightPos[2],
        endPos[0],   endPos[1],   endPos[2]
    ]);

    gl.useProgram(debugLineProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, debugLineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(debugLinePositionLoc);
    gl.vertexAttribPointer(debugLinePositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(debugLineViewMatrixLoc, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(debugLineProjectionMatrixLoc, false, flatten(projectionMatrix));

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);

    gl.drawArrays(gl.LINES, 0, 2);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
}

// function to update the FPS counter in the HTML page
function updateFPSCounter() {
    fpsFrameCount++;

    var now = performance.now();
    var elapsed = now - fpsLastTime;

    if (elapsed >= 500.0) {
        currentFPS = fpsFrameCount * 1000.0 / elapsed;

        if (fpsValueElement) {
            fpsValueElement.innerHTML = currentFPS.toFixed(1);
        }

        fpsFrameCount = 0;
        fpsLastTime = now;
    }
}

//// function to initialize the framebuffer and texture for shadow mapping
function initShadowMap() {
    shadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

    shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        POINT_SHADOW_SIZE,
        POINT_SHADOW_SIZE,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        shadowTexture,
        0
    );

    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depthBuffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function mat4FromGLTFArray(array, offset) {
    return mat4(
        array[offset + 0],  array[offset + 4],  array[offset + 8],  array[offset + 12],
        array[offset + 1],  array[offset + 5],  array[offset + 9],  array[offset + 13],
        array[offset + 2],  array[offset + 6],  array[offset + 10], array[offset + 14],
        array[offset + 3],  array[offset + 7],  array[offset + 11], array[offset + 15]
    );
}


function getMimeTypeFromImage(gltf, imageIndex) {
    var image = gltf.images[imageIndex];

    if (image.mimeType) {
        return image.mimeType;
    }

    return "image/png";
}


function rotationYMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;

    return m;
}
function rotationXMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;

    return m;
}
function rotationZMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;

    return m;
}



function mat4InvertRaw(a) {
    var out = new Float32Array(16);

    var a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
    var a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
    var a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;

    var det =
        b00 * b11 -
        b01 * b10 +
        b02 * b09 +
        b03 * b08 -
        b04 * b07 +
        b05 * b06;

    if (!det) {
        console.warn("mat4InvertRaw: matrix not invertible");
        return mat4IdentityRaw();
    }

    det = 1.0 / det;

    out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;

    out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;

    out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;

    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}


function mat4FromArray(array, offset) {
    return mat4(
        array[offset + 0],  array[offset + 1],  array[offset + 2],  array[offset + 3],
        array[offset + 4],  array[offset + 5],  array[offset + 6],  array[offset + 7],
        array[offset + 8],  array[offset + 9],  array[offset + 10], array[offset + 11],
        array[offset + 12], array[offset + 13], array[offset + 14], array[offset + 15]
    );
}

function copyMat4ToFloat32Array(m, array, offset) {
    var flat = flatten(m);

    for (var i = 0; i < 16; i++) {
        array[offset + i] = flat[i];
    }
}


function mat4IdentityRaw() {
    var m = new Float32Array(16);
    m[0] = 1;
    m[5] = 1;
    m[10] = 1;
    m[15] = 1;
    return m;
}

function mat4MultiplyRaw(a, b) {
    var out = new Float32Array(16);

    for (var col = 0; col < 4; col++) {
        for (var row = 0; row < 4; row++) {
            out[col * 4 + row] =
                a[0 * 4 + row] * b[col * 4 + 0] +
                a[1 * 4 + row] * b[col * 4 + 1] +
                a[2 * 4 + row] * b[col * 4 + 2] +
                a[3 * 4 + row] * b[col * 4 + 3];
        }
    }

    return out;
}

function quatToMat4Raw(x, y, z, w) {
    var out = mat4IdentityRaw();

    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;

    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;

    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;

    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);

    return out;
}

function translationMat4Raw(x, y, z) {
    var m = mat4IdentityRaw();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
}

function scaleMat4Raw(x, y, z) {
    var m = mat4IdentityRaw();
    m[0] = x;
    m[5] = y;
    m[10] = z;
    return m;
}

function quatToMat4(x, y, z, w) {
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;

    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;

    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;

    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;

    return mat4(
        1.0 - (yy + zz), xy + wz,        xz - wy,        0.0,
        xy - wz,         1.0 - (xx + zz), yz + wx,       0.0,
        xz + wy,         yz - wx,        1.0 - (xx + yy), 0.0,
        0.0,             0.0,            0.0,             1.0
    );
}


function getNumComponents(type) {
    if (type === "SCALAR") return 1;
    if (type === "VEC2") return 2;
    if (type === "VEC3") return 3;
    if (type === "VEC4") return 4;
    if (type === "MAT4") return 16;

    throw new Error("Unsupported accessor type: " + type);
}


function worldToScreen(worldPos, viewMatrix, projectionMatrix, canvas) {
    var p = vec4(worldPos[0], worldPos[1], worldPos[2], 1.0);

    var clip = mult(projectionMatrix, mult(viewMatrix, p));

    if (Math.abs(clip[3]) < 0.0001) {
        return null;
    }

    var ndcX = clip[0] / clip[3];
    var ndcY = clip[1] / clip[3];

    return {
        x: (ndcX * 0.5 + 0.5) * canvas.width,
        y: (1.0 - (ndcY * 0.5 + 0.5)) * canvas.height
    };
}


function getMoonMatrix() {
    var dx = eye[0] - lightPosition[0];
    var dy = eye[1] - lightPosition[1];
    var dz = eye[2] - lightPosition[2];

    // Rotazione orizzontale
    var yaw = Math.atan2(dx, dz) * 180.0 / Math.PI;

    // Rotazione verticale
    var horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    var pitch = -Math.atan2(dy, horizontalDistance) * 180.0 / Math.PI;

    var moonScale = 1.0;

    var modelMatrixMoon = mat4();

    modelMatrixMoon = mult(
        modelMatrixMoon,
        translate(
            lightPosition[0],
            lightPosition[1],
            lightPosition[2]
        )
    );

    modelMatrixMoon = mult(
        modelMatrixMoon,
        rotate(yaw, [0, 1, 0])
    );

    modelMatrixMoon = mult(
        modelMatrixMoon,
        rotate(pitch, [1, 0, 0])
    );

    modelMatrixMoon = mult(
        modelMatrixMoon,
        scalem(
            moonScale,
            moonScale,
            moonScale
        )
    );

    return modelMatrixMoon;
}