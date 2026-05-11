"use strict";

var gl;
var program;
var canvas;

var fpsValueElement = null;
var fpsFrameCount = 0;
var fpsLastTime = performance.now();
var currentFPS = 0;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var axis = 0;
var theta = [0, 0, 0];
var flag_rot_teapot = true;
var flag_rot_table = false;

var modelViewMatrixLoc;


var lightPosition = vec4(3.0, 3.0, 5.0, 1.0);
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
var lightDiffuse = vec4(0.0, 0.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var lightSphereBuffers;

var materialAmbient = vec4(0.3, 0.3, 0.3, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.8, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

//parte joystick

var objPos = vec3(0.0, 0.0, 0.0);
var lastButtonA = false;

var tx = 0.0;
var ty = 0.0;
var tz = 0.0;

var camAngle = 0.0;
var camPitch = 0.0;
var camRadius = 8.0;

var cameraFov = 80.0;
var cameraAngle = 35.0;
var cameraHeight = 4.0;
var cameraDistance = 10.0;   // questo è lo zoom

var at = vec3(0.0, 0.5, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var eye = vec3(0.0, 4.0, 10.0);
var aspect;


// ===============Cloth variables================

var curtain = null;
var curtainTexture = null;


// ===== BALL MINI-GAME / CANNON PHYSICS =====

var ROOM_MIN_X = -7.0;
var ROOM_MAX_X =  7.0;
var ROOM_MIN_Z = -7.0;
var ROOM_MAX_Z =  7.0;

var WALL_HEIGHT = 4.0;
var WALL_THICKNESS = 0.25;
var PHYSICS_FLOOR_Y = -2.0;
var miniGameActive = false;
var ballVisible = false;

var physicsWorld = null;
var ballBody = null;


var fixedTimeStep = 1.0 / 60.0;

//variabili per ombre dinamiche

var shadowFramebuffer;
var shadowTexture;
var shadowProgram;

var SHADOW_SIZE = 2048;

var lightViewMatrix;
var lightProjectionMatrix;


// variabile per rotazione automatica
var rotationSpeed_teapot = 1.0;
var rotationSpeed_table = 1.0;
var tableTheta = 0.0;

// cat walk
var moveCat = false;
var catBasePos = vec3(1.2,-0.95, 0.8);
var catWalkTime = 0.0;
var catWalkSpeed = 0.01;
var catWalkRange = 1.0;

//dog walk 
var moveDog = false;
var dogBasePos = vec3(-3.0, -1.8, 0.8);
var dogWalkTime = 0.0;
var dogWalkSpeed = 0.025;
var dogWalkRange = 2.0;

// room buffers
var roomPlaneBuffers;
var roomBoxBuffers;

//right wall buffers
var rightWallWindowBuffers;

//ball buffers
var ballBuffers = null;
var ballTexture = null;

//skybox
var skyboxProgram;
var skyboxBuffer;

var skyboxPosLoc;
var skyboxMvpLoc;
var skyboxSamplerLoc;


var isNight = false;
var daySkyboxTexture;
var nightSkyboxTexture;
var parkSkyboxTexture;


//focus teapot button
var teapotFocus = false;

//light direction visualization
var showLightDirection = false;
var debugLineProgram;
var debugLineBuffer;
var debugLinePositionLoc;
var debugLineViewMatrixLoc;
var debugLineProjectionMatrixLoc;




//new shadow variables

var isPointShadowPass = false;

var POINT_SHADOW_FAR = 40.0;

var usePointShadowMap = true;

var POINT_SHADOW_SIZE = 2048;

var pointShadowFramebuffers = [];
var pointShadowTextures = [];

var pointLightViewMatrices = [];
var pointLightProjectionMatrix;
var pointShadowDirections = [
    vec3( 1.0,  0.0,  0.0), // +X
    vec3(-1.0,  0.0,  0.0), // -X
    vec3( 0.0,  1.0,  0.0), // +Y
    vec3( 0.0, -1.0,  0.0), // -Y
    vec3( 0.0,  0.0,  1.0), // +Z
    vec3( 0.0,  0.0, -1.0)  // -Z
];

var pointShadowUps = [
    vec3(0.0, -1.0,  0.0), // +X
    vec3(0.0, -1.0,  0.0), // -X
    vec3(0.0,  0.0,  1.0), // +Y
    vec3(0.0,  0.0, -1.0), // -Y
    vec3(0.0, -1.0,  0.0), // +Z
    vec3(0.0, -1.0,  0.0)  // -Z
];



//var per collisioni
var tableColliderX = 0.0;
var tableColliderY = -1.3;
var tableColliderZ = 0.0;

var tableColliderSX = 3.4;
var tableColliderSY = 0.3;
var tableColliderSZ = 4.0;

var tableColliderBody = null;

function initPointShadowMaps()
{
    pointShadowFramebuffers = [];
    pointShadowTextures = [];

    for (var i = 0; i < 6; i++) {
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

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

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        var depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(
            gl.RENDERBUFFER,
            gl.DEPTH_COMPONENT16,
            POINT_SHADOW_SIZE,
            POINT_SHADOW_SIZE
        );

        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );

        gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER,
            depthBuffer
        );

        pointShadowFramebuffers.push(framebuffer);
        pointShadowTextures.push(texture);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


// comandi col cursore
var isDraggingCamera = false;
var lastMouseX = 0;
var lastMouseY = 0;
var mouseSensitivityX = 0.2;
var mouseSensitivityY = 0.02;



onload = async function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;

    // bianco clear color gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // arancione gl.clearColor(0.9, 0.5, 0.3, 1.0);
    gl.clearColor(0.7, 0.9,0.7, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    fpsValueElement = document.getElementById("FpsValue");
   
    var startButton = document.getElementById("ButtonStartGame");
    var startScreen = document.getElementById("startScreen");

    if (!ENABLE_START_SCREEN) {
        document.body.classList.remove("game-not-started");

        if (startScreen) {
            startScreen.style.display = "none";
        }
    } else {
        document.body.classList.add("game-not-started");

        if (startButton && startScreen) {
            startButton.onclick = function () {
                document.body.classList.remove("game-not-started");

                startScreen.classList.add("hidden");

                setTimeout(function () {
                    startScreen.style.display = "none";
                }, 500);
            };
        }
    }


    program = initShaders(gl, "vertex-shader", "fragment-shader");
    console.log("Program =", program);
    gl.useProgram(program);
    shadowProgram = initShaders(gl, "shadow-vertex-shader", "shadow-fragment-shader");
    console.log("shadowProgram =", shadowProgram);
    initShadowMap();


    //new shadow map for point light
    initPointShadowMaps();


    //carico le texture per teapot e tavolo + cat

    teapotTexture = loadTexture(path_img_teapot);
    tableTexture = loadTexture(path_img_table);
    catTexture = loadTexture(path_img_cat);
    wallTexture = loadTexture(path_img_wall);
    floorTexture = loadTexture(path_img_floor);
    dogTexture = loadTexture(path_img_dog);
    paintingTexture = loadTexture(path_img_painting);
    corniceTexture = loadTexture(path_img_cornice);
    ballTexture = loadTexture(path_img_ball);
    curtainTexture = loadTexture(path_img_curtain);
    

    
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

    //Buffers per luce 
    var lightSphere = createSphere(1.0, 16, 16);
    lightSphereBuffers = createBuffers(
        lightSphere.points,
        lightSphere.normals,
        lightSphere.texCoords
    );

    //carico teapot
    await loadOBJ(modelPath_teapot);
    console.log("OBJ  Teapot loaded");
        
    var teapotPoints = pointsArray.slice();
    var teapotNormals = normalsArray.slice();
    var teapotTex = texCoordsArray.slice();
    teapotBuffers = createBuffers(teapotPoints, teapotNormals, teapotTex);


    //carico parte del tavolo 
    await loadOBJ(modelPath_table);
    console.log("OBJ  Table loaded");


    var tablePoints = pointsArray.slice();
    var tableNormals = normalsArray.slice();
    var tableTex = texCoordsArray.slice();
    tableBuffers = createBuffers(tablePoints, tableNormals, tableTex);

    await loadOBJ(modelPath_cat);
    console.log("OBJ Cat loaded");

    var catPoints = pointsArray.slice();
    var catNormals = normalsArray.slice();
    var catTex = texCoordsArray.slice();
    catBuffers = createBuffers(catPoints, catNormals, catTex);

    await loadOBJ(modelPath_dog);
    console.log("OBJ Dog loaded");

    var dogPoints = pointsArray.slice();
    var dogNormals = normalsArray.slice();
    var dogTex = texCoordsArray.slice();

    dogBuffers = createBuffers(dogPoints, dogNormals, dogTex);


    //room buffers
    roomPlaneBuffers = createPlaneBuffers();
    roomBoxBuffers = createBoxBuffers();
    //roomBoxBuffers = createRoomBoxWithoutRightWallBuffers();

    //right wall buffers
    rightWallWindowBuffers = createRightWallWithWindowBuffers();

    //ball buffers
    await loadOBJ(modelPath_ball);
    console.log("OBJ Ball loaded");
    
    var ballPoints = pointsArray.slice();
    var ballNormals = normalsArray.slice();
    var ballTex = texCoordsArray.slice();

    ballBuffers = createBuffers(ballPoints, ballNormals, ballTex);


    //   SKYBOXX    //////////////////
    // skybox buffers

     //skybox shader program
    skyboxProgram = initShaders(gl, "skybox-vertex-shader", "skybox-fragment-shader");
    console.log("skyboxProgram =", skyboxProgram);
    skyboxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);

    skyboxTexture = LoadSkyboxTexture(gl);
    parkSkyboxTexture = LoadSkyboxTexturePark(gl);
    
    nightSkyboxTexture = LoadSkyboxTextureFromCross(gl,
       path_img_skybox_night);

    skyboxPosLoc = gl.getAttribLocation(skyboxProgram, "pos");
    skyboxMvpLoc = gl.getUniformLocation(skyboxProgram, "mvp");
    skyboxSamplerLoc = gl.getUniformLocation(skyboxProgram, "skybox");


    //parte program per visualizzazione direzione luce (debug)
    debugLineProgram = initShaders(
        gl,
        "debug-line-vertex-shader",
        "debug-line-fragment-shader"
    );

    debugLinePositionLoc = gl.getAttribLocation(debugLineProgram, "vPosition");
    debugLineViewMatrixLoc = gl.getUniformLocation(debugLineProgram, "viewMatrix");
    debugLineProjectionMatrixLoc = gl.getUniformLocation(debugLineProgram, "projectionMatrix");

    debugLineBuffer = gl.createBuffer();
    
    //inizializzazione fisica per mini-game
    initPhysics();
   
    //creation curtain
    curtain = new CannonCurtain(
        gl,
        physicsWorld,
        28,     // rows
        24,     // cols
        2.7,    // width lungo Z
        2.2,    // height lungo Y
        6.92,   // originX, poco dentro la parete destra
        1.25,   // originY, bordo alto della tenda
        -1.28    // originZ, centro finestra circa
    );
    var windSlider = document.getElementById("windSlider");
    var windValue = document.getElementById("windValue");

    if (windSlider && windValue) {
        windSlider.addEventListener("input", function () {
            curtainWindStrength = parseFloat(this.value);
            windValue.textContent = curtainWindStrength.toFixed(3);
        });
    }


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    //park or home mode
    document.getElementById("ButtonGoOut").onclick = function () {
        currentScene = "park";
    };

    document.getElementById("ButtonGoHome").onclick = function () {
        currentScene = "home";
    };

    //minigame settings buttons
    document.getElementById("ButtonMiniGame").onclick = function () {
    miniGameActive = !miniGameActive;

    if (miniGameActive) {
            this.textContent = "Stop Ball ";
            startBallMiniGame();
        } else {
            this.textContent = "Start Ball ";
            stopBallMiniGame();
        }
    };

    // settings bottoni + sliders
    document.getElementById("ButtonLightDir").onclick = function () {
        showLightDirection = !showLightDirection;
        this.textContent = showLightDirection ? "Hide Light Direction" : "Show Light Direction";
    };
    document.getElementById("ButtonNightDay").onclick = function () {
        isNight = !isNight;

        if (isNight) {
            this.textContent = "Day Mode";
        } else {
            this.textContent = "Night Mode";
        }
    };
    document.getElementById("ButtonTeapotFocus").onclick = function () {
        teapotFocus = !teapotFocus;

        this.textContent = teapotFocus ? "Exit Teapot Focus" : "Focus Teapot";
    };
    document.getElementById("ButtonCatMove").onclick = function () {
        moveCat = !moveCat;
        console.log("Cat walk:", moveCat);
    };
    document.getElementById("ButtonDogMove").onclick = function () {
        moveDog = !moveDog;
        console.log("Dog walk:", moveDog);
    };
    document.getElementById("ButtonX").onclick = () => axis = 0;
    document.getElementById("ButtonY").onclick = () => axis = 1;
    document.getElementById("ButtonZ").onclick = () => axis = 2;
    document.getElementById("ButtonT").onclick = () => flag_rot_teapot = !flag_rot_teapot;
    document.getElementById("ButtonTableRotation").onclick = () => flag_rot_table = !flag_rot_table;
    document.getElementById("ButtonTex").onclick = function() {
        useTexture_teapot = !useTexture_teapot;
        console.log("Texture teapot :", useTexture_teapot);
        useTexture_table = !useTexture_table;
        console.log("Texture table :", useTexture_table);

         this.textContent = useTexture_teapot ? "Disable Textures" : "Enable Textures";
        
        
    };
    var speedSlider_teapot = document.getElementById("RotationSpeed_teapot");
    var speedValue_teapot = document.getElementById("RotationSpeedValue_teapot");

    speedSlider_teapot.oninput = function () {
        rotationSpeed_teapot = parseFloat(speedSlider_teapot.value);
        speedValue_teapot.innerHTML = rotationSpeed_teapot.toFixed(1)+ "x";
    };

    var speedSlider_table = document.getElementById("RotationSpeed_table");
    var speedValue_table = document.getElementById("RotationSpeedValue_table");

    speedSlider_table.oninput = function () {
        rotationSpeed_table = parseFloat(speedSlider_table.value);
        speedValue_table.innerHTML = rotationSpeed_table.toFixed(1)+ "x";
    };

    var lightXSlider = document.getElementById("LightX");
    var lightYSlider = document.getElementById("LightY");
    var lightZSlider = document.getElementById("LightZ");

    var lightXValue = document.getElementById("LightXValue");
    var lightYValue = document.getElementById("LightYValue");
    var lightZValue = document.getElementById("LightZValue");
    
    function updateLightPositionFromSliders() {
        lightPosition[0] = parseFloat(lightXSlider.value);
        lightPosition[1] = parseFloat(lightYSlider.value);
        lightPosition[2] = parseFloat(lightZSlider.value);
        lightPosition[3] = 1.0;

        lightXValue.innerHTML = lightPosition[0].toFixed(1);
        lightYValue.innerHTML = lightPosition[1].toFixed(1);
        lightZValue.innerHTML = lightPosition[2].toFixed(1);
    }

    lightXSlider.oninput = updateLightPositionFromSliders;
    lightYSlider.oninput = updateLightPositionFromSliders;
    lightZSlider.oninput = updateLightPositionFromSliders;

    updateLightPositionFromSliders();

    //listener per ball mini-game
    function connectSlider(id, valueId, callback) {
        var slider = document.getElementById(id);
        var value = document.getElementById(valueId);

        if (!slider || !value) return;

        function update() {
            var v = parseFloat(slider.value);
            value.innerHTML = v.toFixed(2);
            if (callback) callback(v);
        }

        slider.oninput = update;
        update();
    }

    connectSlider("BallVelX", "BallVelXValue", function(v) {
        ballVelX = v;
    });

    connectSlider("BallVelY", "BallVelYValue", function(v) {
        ballVelY = v;
    });

    connectSlider("BallVelZ", "BallVelZValue", function(v) {
        ballVelZ = v;
    });

    connectSlider("BallBounce", "BallBounceValue", function(v) {
        ballBounce = v;

        if (ballFloorContact) {
            ballFloorContact.restitution = ballBounce;
        }
    });

    connectSlider("BallFriction", "BallFrictionValue", function(v) {
        ballFriction = v;

        if (ballFloorContact) {
            ballFloorContact.friction = ballFriction;
        }
    });

    connectSlider("BallAngVelX", "BallAngVelXValue", function(v) {
        ballAngVelX = v;
    });

    connectSlider("BallAngVelY", "BallAngVelYValue", function(v) {
        ballAngVelY = v;
    });

    connectSlider("BallAngVelZ", "BallAngVelZValue", function(v) {
        ballAngVelZ = v;
    });

    connectSlider("BallLinearDamping", "BallLinearDampingValue", function(v) {
        ballLinearDamping = v;

        if (ballBody) {
            ballBody.linearDamping = ballLinearDamping;
        }
    });

    connectSlider("BallAngularDamping", "BallAngularDampingValue", function(v) {
        ballAngularDamping = v;

        if (ballBody) {
            ballBody.angularDamping = ballAngularDamping;
        }
    });

    document.getElementById("ButtonBounceBall").onclick = function () {
        startBallBounceAnimation();
    };



    var cameraAngleSlider = document.getElementById("CameraAngle");
    var cameraHeightSlider = document.getElementById("CameraHeight");
    var cameraDistanceSlider = document.getElementById("CameraDistance");

    var cameraAngleValue = document.getElementById("CameraAngleValue");
    var cameraHeightValue = document.getElementById("CameraHeightValue");
    var cameraDistanceValue = document.getElementById("CameraDistanceValue");

    function updateOrbitCameraFromSliders() {
        cameraAngle = parseFloat(cameraAngleSlider.value);
        cameraHeight = parseFloat(cameraHeightSlider.value);
        cameraDistance = parseFloat(cameraDistanceSlider.value);

        var rad = radians(cameraAngle);

        eye = vec3(
            cameraDistance * Math.sin(rad),
            cameraHeight,
            cameraDistance * Math.cos(rad)
        );

        cameraAngleValue.innerHTML = cameraAngle.toFixed(0) + "°";
        cameraHeightValue.innerHTML = cameraHeight.toFixed(1);
        cameraDistanceValue.innerHTML = cameraDistance.toFixed(1);
    }

    cameraAngleSlider.oninput = updateOrbitCameraFromSliders;
    cameraHeightSlider.oninput = updateOrbitCameraFromSliders;
    cameraDistanceSlider.oninput = updateOrbitCameraFromSliders;

    updateOrbitCameraFromSliders();

   canvas.addEventListener("mousedown", function(event) {
        isDraggingCamera = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    window.addEventListener("mouseup", function() {
        isDraggingCamera = false;
    });

    window.addEventListener("mousemove", function(event) {
        if (!isDraggingCamera) {
            return;
        }

        var dx = event.clientX - lastMouseX;
        var dy = event.clientY - lastMouseY;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        // horizontal drag -> camera angle
        var currentAngle = parseFloat(cameraAngleSlider.value);
        currentAngle += dx * mouseSensitivityX;

        currentAngle = currentAngle % 360.0;
        if (currentAngle < 0.0) {
            currentAngle += 360.0;
        }

        cameraAngleSlider.value = currentAngle;

        // vertical drag -> camera height
        var currentHeight = parseFloat(cameraHeightSlider.value);

        // se trascini verso l'alto, dy è negativo.
        // Con il meno, verso l'alto aumenta l'altezza.
        currentHeight -= dy * mouseSensitivityY;

        var minHeight = parseFloat(cameraHeightSlider.min);
        var maxHeight = parseFloat(cameraHeightSlider.max);

        currentHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight));

        cameraHeightSlider.value = currentHeight;

        updateOrbitCameraFromSliders();
    });

    /* canvas.addEventListener("wheel", function(event) {
    event.preventDefault();

    cameraDistance += event.deltaY * 0.01;

    if (cameraDistance < 3.0) {
        cameraDistance = 3.0;
    }

    if (cameraDistance > 25.0) {
        cameraDistance = 25.0;
    }

    document.getElementById("CameraDistance").value = cameraDistance;
    document.getElementById("CameraDistanceValue").innerHTML = cameraDistance.toFixed(1);

    var rad = radians(cameraAngle);

    eye = vec3(
        cameraDistance * Math.sin(rad),
        cameraHeight,
        cameraDistance * Math.cos(rad)
    );
    });
 */

    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();

        cameraFov += event.deltaY * 0.015;

        // Limiti per evitare crash: FOV troppo piccolo = proiezione instabile
        if (cameraFov < 20.0) {
            cameraFov = 20.0;
        }

        if (cameraFov > 120.0) {
            cameraFov = 120.0;
        }
    });

    render();
};





async function loadOBJ(url) {
    const response = await fetch(url);
    const text = await response.text();

    const lines = text.split("\n");

    var vertices = [];
    var texCoords = [];
    var faces = [];

    // 1. Parse OBJ
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;

        let parts = line.split(/\s+/);

        if (parts[0] === "v") {
            let x = parseFloat(parts[1]);
            let y = parseFloat(parts[2]);
            let z = parseFloat(parts[3]);

            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                vertices.push(vec3(x, y, z));
            }
        }

        if (parts[0] === "vt") {
            let u = parseFloat(parts[1]);
            let v = parseFloat(parts[2]);

            if (!isNaN(u) && !isNaN(v)) {
                texCoords.push(vec2(u, v));
            }
        }

        if (parts[0] === "f") {
            let face = [];

            for (let i = 1; i < parts.length; i++) {
                let vals = parts[i].split("/");

                let vIndex = parseInt(vals[0]) - 1;
                let vtIndex = vals[1] ? parseInt(vals[1]) - 1 : -1;

                face.push({
                    v: vIndex,
                    vt: vtIndex
                });
            }

            // triangolazione a ventaglio
            for (let i = 1; i < face.length - 1; i++) {
                faces.push([face[0], face[i], face[i + 1]]);
            }
        }
    }

    // 2. Centra e scala il modello
    var min = [Infinity, Infinity, Infinity];
    var max = [-Infinity, -Infinity, -Infinity];

    for (let v of vertices) {
        for (let i = 0; i < 3; i++) {
            if (v[i] < min[i]) min[i] = v[i];
            if (v[i] > max[i]) max[i] = v[i];
        }
    }

    var center = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2
    ];

    var size = Math.max(
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2]
    );

    for (let i = 0; i < vertices.length; i++) {
        vertices[i] = vec3(
            (vertices[i][0] - center[0]) / size * 2.0,
            (vertices[i][1] - center[1]) / size * 2.0,
            (vertices[i][2] - center[2]) / size * 2.0
        );
    }

    // 3. Accumulatori per smooth normals
    var vertexNormals = [];
    for (let i = 0; i < vertices.length; i++) {
        vertexNormals.push(vec3(0.0, 0.0, 0.0));
    }

    // 4. Somma normali di faccia sui vertici
    for (let f of faces) {
        let a = vertices[f[0].v];
        let b = vertices[f[1].v];
        let c = vertices[f[2].v];

        let edge1 = subtract(b, a);
        let edge2 = subtract(c, a);

        let faceNormal = cross(edge1, edge2);

        vertexNormals[f[0].v] = add(vertexNormals[f[0].v], faceNormal);
        vertexNormals[f[1].v] = add(vertexNormals[f[1].v], faceNormal);
        vertexNormals[f[2].v] = add(vertexNormals[f[2].v], faceNormal);
    }

    // 5. Normalizza tutte le normali per vertice
    for (let i = 0; i < vertexNormals.length; i++) {
        let n = normalize(vertexNormals[i]);
        vertexNormals[i] = vec3(n[0], n[1], n[2]);
    }

    // 6. Espandi arrays finali
    pointsArray = [];
    normalsArray = [];
    texCoordsArray = [];

    for (let f of faces) {
        for (let k = 0; k < 3; k++) {
            let vIdx = f[k].v;
            let vtIdx = f[k].vt;

            let v = vertices[vIdx];
            let n = vertexNormals[vIdx];

            pointsArray.push(vec4(v[0], v[1], v[2], 1.0));
            normalsArray.push(vec4(n[0], n[1], n[2], 0.0));

            if (vtIdx >= 0 && texCoords[vtIdx]) {
                texCoordsArray.push(vec2(texCoords[vtIdx][0], texCoords[vtIdx][1]));
            } else {
                texCoordsArray.push(vec2(0.0, 0.0));
            }
        }
    }

    //console.log("Loaded points:", pointsArray.length);
    //console.log("Loaded normals:", normalsArray.length);
    //console.log("Loaded texCoords:", texCoordsArray.length);
}



function readGamepad() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = gamepads[0];
    if (!gp) return;

    // -----------------------------
    // 1) Tasto A -> toggle rotazione automatica
    // -----------------------------
    var pressedA = gp.buttons[0].pressed;
    if (pressedA && !lastButtonA) {
        flag_rot_teapot = !flag_rot_teapot;
        console.log("Toggle rotation:", flag_rot_teapot);
    }
    lastButtonA = pressedA;

    // -----------------------------
    // 2) Stick sinistro -> rotazione teapot
    // -----------------------------
    var lx = gp.axes[0];
    var ly = gp.axes[1];

    if (Math.abs(lx) < 0.15) lx = 0.0;
    if (Math.abs(ly) < 0.15) ly = 0.0;

    theta[1] += lx * 2.0;   // Y
    theta[0] += ly * 2.0;   // X

    // -----------------------------
    // 3) D-pad -> camera
    // -----------------------------
    var camSpeed = 0.04;

    // D-pad left/right
    if (gp.buttons[14].pressed) camAngle -= camSpeed;
    if (gp.buttons[15].pressed) camAngle += camSpeed;

    // D-pad up/down
    if (gp.buttons[12].pressed) camPitch += camSpeed;
    if (gp.buttons[13].pressed) camPitch -= camSpeed;

    // clamp per evitare ribaltamenti strani
    camPitch = Math.max(-1.2, Math.min(1.2, camPitch));
    console.log("angle:", camAngle, "pitch:", camPitch);

    // -----------------------------
    // 4) Assi locali della camera
    // -----------------------------
    // eye della camera orbitale
    var eye = vec3(
        camRadius * Math.sin(camAngle) * Math.cos(camPitch),
        camRadius * Math.sin(camPitch),
        camRadius * Math.cos(camAngle) * Math.cos(camPitch)
    );

    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    // forward = direzione dalla camera verso il target
    var forward = normalize(subtract(at, eye));

    // right = destra della camera
    var right = normalize(cross(forward, up));

    // up corretto della camera
    var camUp = normalize(cross(right, forward));

    // -----------------------------
    // 5) Stick destro -> traslazione relativa alla camera
    // -----------------------------
    var rx = gp.axes[2];
    var ry = gp.axes[3];

    if (Math.abs(rx) < 0.15) rx = 0.0;
    if (Math.abs(ry) < 0.15) ry = 0.0;

    var moveSpeed = 0.06;

    // destra/sinistra relativa alla vista attuale
    objPos = add(objPos, scale(rx * moveSpeed, right));

    // su/giu relativa alla camera
    objPos = add(objPos, scale(-ry * moveSpeed, camUp));

    // -----------------------------
    // 6) RT / LT -> avanti / indietro relativi alla camera
    // -----------------------------
    var zOut = gp.buttons[6].value; // LT
    var zIn  = gp.buttons[7].value; // RT

    objPos = add(objPos, scale((zIn - zOut) * 0.08, forward));
}







function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateFPSCounter();
    //controllo se è stato premuto il tasto A del gamepad per attivare/disattivare la rotazione
    readGamepad();
    clampTeapotToTable();

   

    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(cameraFov, aspect, 0.1, 120.0)


    if (currentScene === "home") {
        drawHomeScene(gl,viewMatrix, projectionMatrix);

    } else if (currentScene === "park") {
        drawParkScene(gl,viewMatrix, projectionMatrix);
    }

    requestAnimFrame(render);
}

function drawObject(obj,
     texture,
      modelMatrix,
       viewMatrix,
        projectionMatrix,
    useTexture = true,
     isLightMarker=false,
     twoSided = false, 
     receiveShadow = true,
     wallShadowMode) {

    if (wallShadowMode === undefined) {
        wallShadowMode = 0;
    }

    var modelViewMatrix = mult(viewMatrix, modelMatrix);

    
    var nMatrix = normalMatrix(modelViewMatrix, true);
    // Normal matrix in world space, used for shadow-related world normals
    var modelNMatrix = normalMatrix(modelMatrix, true);


    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.nBuffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.tBuffer);
    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.uniform1i(gl.getUniformLocation(program, "shadowMap"), 1);

    // Point shadow maps: 6 textures, one for each direction
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[0]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap0"), 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[1]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap1"), 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[2]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap2"), 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[3]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap3"), 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[4]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap4"), 6);

    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[5]);
    gl.uniform1i(gl.getUniformLocation(program, "pointShadowMap5"), 7);

    gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "pointLightViewMatrix0"),
        false,
        flatten(pointLightViewMatrices[0])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightViewMatrix1"),
        false,
        flatten(pointLightViewMatrices[1])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightViewMatrix2"),
        false,
        flatten(pointLightViewMatrices[2])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightViewMatrix3"),
        false,
        flatten(pointLightViewMatrices[3])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightViewMatrix4"),
        false,
        flatten(pointLightViewMatrices[4])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightViewMatrix5"),
        false,
        flatten(pointLightViewMatrices[5])
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "pointLightProjectionMatrix"),
        false,
        flatten(pointLightProjectionMatrix)
    );

    // parte che già c'era 
    gl.uniform1i(
    gl.getUniformLocation(program, "useTexture"),
        useTexture_teapot ? 1 : 0
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "isLightMarker"),
        isLightMarker ? 1 : 0
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "twoSided"),
        twoSided ? 1 : 0
    );
    gl.uniform1i(
        gl.getUniformLocation(program, "receiveShadow"),
        receiveShadow ? 1 : 0
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "wallShadowMode"),
        wallShadowMode
    );

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(nMatrix));

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "lightViewMatrix"),
        false,
        flatten(lightViewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "lightProjectionMatrix"),
        false,
        flatten(lightProjectionMatrix)
    );

    var modelNormalMatrix = [
        vec3(modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]),
        vec3(modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2]),
        vec3(modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2])
    ];

    gl.uniformMatrix3fv(
        gl.getUniformLocation(program, "modelNormalMatrix"),
        false,
        flatten(modelNMatrix)
    ); 

    //shadow map point light
    gl.uniform1i(
        gl.getUniformLocation(program, "usePointShadowMap"),
        usePointShadowMap ? 1 : 0
    );

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}



function drawShadowObject(obj, modelMatrix) {
    var lightModelViewMatrix = mult(lightViewMatrix, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    var vPosition = gl.getAttribLocation(shadowProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "lightModelViewMatrix"),
        false,
        flatten(lightModelViewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "lightProjectionMatrix"),
        false,
        flatten(lightProjectionMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniform4fv(
        gl.getUniformLocation(shadowProgram, "lightPosition"),
        flatten(lightPosition)
    );

    gl.uniform1i(
        gl.getUniformLocation(shadowProgram, "pointShadowPass"),
        isPointShadowPass ? 1 : 0
    );

    gl.uniform1i(
        gl.getUniformLocation(shadowProgram, "pointShadowPass"),
        isPointShadowPass ? 1 : 0
    );

    gl.uniform1f(
        gl.getUniformLocation(shadowProgram, "pointShadowFar"),
        POINT_SHADOW_FAR
    );

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}

function clampTeapotToTable() {
    // Altezza minima consentita per la teapot.
    // Se scende sotto questo valore, la riportiamo sopra il tavolo.
    var minY = -2.0+0.6; // altezza del tavolo + metà dell'altezza della teapot

    if (objPos[1] < minY) {
        objPos[1] = minY;
    }
}


