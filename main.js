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
var flag_rot_teapot = false;
var flag_rot_table = false;

var modelViewMatrixLoc;


var lightPosition = vec4(3.0, 3.0, 5.0, 1.0);
var lightAmbient = vec4(0.8, 0.8, 0.8, 1.0);
var lightDiffuse = vec4(0.5, 0.5, 0.5, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var lightSphereBuffers;

var materialAmbient = vec4(0.5, 0.5, 0.5, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.8, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

//parte joystick

var objPos = vec3(0.0, 0.0, 0.0);
objPos = vec3(
    TEAPOT_REST_X,
    TEAPOT_REST_Y,
    TEAPOT_REST_Z
);
var lastButtonA = false;

var tx = 0.0;
var ty = 0.0;
var tz = 0.0;




// ===== BALL MINI-GAME / CANNON PHYSICS =====

var ROOM_MIN_X = -7.0;
var ROOM_MAX_X =  7.0;
var ROOM_MIN_Z = -7.0;
var ROOM_MAX_Z =  7.0;

var WALL_HEIGHT = 4.0;
var WALL_THICKNESS = 0.25;
var PHYSICS_FLOOR_Y = -2.4;
var miniGameActive = false;
var ballVisible = false;

var physicsWorld = null;
var ballBody = null;


var fixedTimeStep = 1.0 / 60.0;

//variables for dynamic shadow mapping

var shadowFramebuffer;
var shadowTexture;
var shadowProgram;



var lightViewMatrix;
var lightProjectionMatrix;


// auto rotation variables
var rotationSpeed_teapot = 1.0;
var rotationSpeed_table = 1.0;
var tableTheta = 0.0;


//dog walk 
var moveDog = false;
var dogBasePos = vec3(-5.0, -1.8, 0.8);
var dogWalkTime = 0.0;
var dogWalkSpeed = 0.025;
var dogWalkRange = 2.0;



//focus teapot button
var teapotFocus = false;

//light direction visualization
var showLightDirection = false;
var debugLineProgram;
var debugLineBuffer;
var debugLinePositionLoc;
var debugLineViewMatrixLoc;
var debugLineProjectionMatrixLoc;



//variables for collisions
var tableColliderX = 0.0;
var tableColliderY = -1.3;
var tableColliderZ = 0.0;

var tableColliderSX = 3.4;
var tableColliderSY = 0.3;
var tableColliderSZ = 4.0;

var tableColliderBody = null;

//dog position
var dogCurrentX = null;
var dogCurrentZ = null;

var dogTargetX = 0.0;
var dogTargetZ = 0.0;

var dogMovingToBall = false;
var dogAngleToBall = 0.0;

var ballStoppedTimer = 0.0;
var ballAlreadyTargeted = false;

function applyStartChoicesAfterLoading() {
    /*
        Se l'utente ha scelto Park, parto direttamente dal parco.
    */
    if (startSceneChoice === "park" && currentScene !== "park") {
        setTimeout(function () {
            switchSceneWithTransition(
                "park",
                "Going out...",
                "Loading the park...",
                function () {
                    miniGameActive = false;

                    if (typeof resetBallSettingsPanelState === "function") {
                        resetBallSettingsPanelState();
                    }

                    if (typeof updateTeapotControlsLegend === "function") {
                        updateTeapotControlsLegend();
                    }
                }
            );
        }, 150);
    }

    if (showCameraHelpAtStart) {
        setTimeout(function () {
            showInitialCameraControlsLegend();
        }, startSceneChoice === "park" ? 1000 : 400);
    }
}




function waitForStartScreenChoice(startButton, startScreen, loadingScreen) {
    return new Promise(function(resolve) {
        if (!startButton) {
            resolve();
            return;
        }

        startButton.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            closeStartSettingsPanel();

            if (typeof warmUpBallThrowSound === "function") {
                warmUpBallThrowSound();
            }

            /*
                Nascondo la start screen.
            */
            if (startScreen) {
                startScreen.classList.remove("start-visible");
                startScreen.classList.add("hidden");

                setTimeout(function() {
                    startScreen.style.display = "none";
                }, 750);
            }

            /*
                Mostro il loading screen.
            */
            if (loadingScreen) {
                loadingScreen.style.display = "flex";
                loadingScreen.classList.remove("hidden");
            }

            /*
                Aspetto pochissimo solo per far vedere la transizione.
            */
            setTimeout(function() {
                resolve();
            }, 250);
        };
    });
}

function applyPreloadSettings() {
    POINT_SHADOW_SIZE = startPerformanceSaverEnabled
        ? POINT_SHADOW_SIZE_LOW
        : POINT_SHADOW_SIZE_HIGH;

    PARK_GRASS_COUNT = startPerformanceSaverEnabled ? 100 : 200;

    if (typeof maxFallingLeaves !== "undefined") {
        maxFallingLeaves = startPerformanceSaverEnabled ? 8 : 18;
    }

    if (typeof maxFireflies !== "undefined") {
        maxFireflies = startPerformanceSaverEnabled ? 8 : 22;
    }
}




onload = async function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    var derivativesExtension = gl.getExtension("OES_standard_derivatives");

    if (!derivativesExtension) {
        console.warn("OES_standard_derivatives not supported. Normal mapping may not work.");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;

    gl.clearColor(0.7, 0.9,0.7, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    fpsValueElement = document.getElementById("FpsValue");
   
    var startButton = document.getElementById("ButtonStartGame");
    var startScreen = document.getElementById("startScreen");
    var loadingScreen = document.getElementById("loadingScreen");

    var startSettingsButton = document.getElementById("ButtonStartOptions");
    var closeStartSettingsButton = document.getElementById("CloseStartSettings");

    var startGlobalAudioToggle = document.getElementById("StartGlobalAudioToggle");
    var startSceneHomeButton = document.getElementById("StartSceneHomeButton");
    var startSceneParkButton = document.getElementById("StartSceneParkButton");
    var startCameraHelpToggle = document.getElementById("StartCameraHelpToggle");
    var startPerformanceSaverToggle =
    document.getElementById("StartPerformanceSaverToggle");

    if (startSettingsButton) {
        startSettingsButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            openStartSettingsPanel();
        };
    }

    if (closeStartSettingsButton) {
        closeStartSettingsButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            closeStartSettingsPanel();
        };
    }

    if (startGlobalAudioToggle) {
        startGlobalAudioToggle.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            /*
                Cambio subito lo stato visivo del pannello Settings.
            */
            startGlobalAudioEnabled = !startGlobalAudioEnabled;

            

            toggleGlobalAudioMute();

            updateGlobalAudioButton();

            updateStartSettingsPanel();

            if (!startGlobalAudioEnabled) {
                hardStopWaterSound();
            } else {
                var waterAudio = document.getElementById("waterSound");

                if (waterAudio) {
                    waterAudio.muted = false;
                }
            }
        };
    }
    

    if (startSceneHomeButton) {
        startSceneHomeButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            setStartSceneChoice("home");
        };
    }

    if (startSceneParkButton) {
        startSceneParkButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            setStartSceneChoice("park");
        };
    }

    if (startCameraHelpToggle) {
        startCameraHelpToggle.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            toggleStartCameraHelp();
        };
    }

    if (startPerformanceSaverToggle) {
        startPerformanceSaverToggle.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            startPerformanceSaverEnabled = !startPerformanceSaverEnabled;

            updateStartSettingsPanel();

            console.log(
                "Performance saver:",
                startPerformanceSaverEnabled ? "ON" : "OFF"
            );
        };
    }

    updateStartSettingsPanel();

    /*
        Prima cosa visibile: start screen.
        Il loading resta nascosto finché l'utente non preme Start.
    */
    if (startScreen) {
        startScreen.style.display = "flex";
        startScreen.classList.remove("hidden");
        startScreen.classList.remove("start-visible");

        /*
            Piccolo delay per permettere al browser di applicare
            lo stato iniziale opacity 0 / scale 1.03.
        */
        setTimeout(function () {
            startScreen.classList.add("start-visible");
        }, 80);
    }

    if (loadingScreen) {
        loadingScreen.style.display = "none";
        loadingScreen.classList.add("hidden");
    }

    /*
        Qui il codice si ferma finché l'utente non clicca Start Game.
        Tutto il caricamento pesante parte DOPO.
    */
    await waitForStartScreenChoice(
        startButton,
        startScreen,
        loadingScreen
    );

    /*
        Ora applico le scelte prima di creare shadow map, erba, ecc.
    */
    applyPreloadSettings();

    var loadingStartTime = performance.now();
    var MIN_LOADING_SCREEN_TIME = 1800;

    setLoadingProgress(
        5,
        "Starting WebGL..."
    );

    // initialization for cursor
    callDogClickMode = false;
    isDraggingCamera = false;

    updateCanvasCursor();

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    

    setLoadingProgress(
        18,
        "Compiling shaders & shadow maps..."
    );
    
    console.log("Program =", program);
    gl.useProgram(program);
    shadowProgram = initShaders(gl, "shadow-vertex-shader", "shadow-fragment-shader");
    console.log("shadowProgram =", shadowProgram);


    wallLampShadowProgram = initShaders(
        gl,
        "wall-lamp-shadow-vertex-shader",
        "wall-lamp-shadow-fragment-shader"
    );

    console.log("wallLampShadowProgram =", wallLampShadowProgram);

    initShadowMap();


    //new shadow map for point light
    initPointShadowMaps();


    initWallLampShadowMap();

    //clear shadow map eventually for park mode
    clearOldShadowMaps();



    try {
        skinnedDogLoadState = "loading";
        skinnedDogLoadErrorMessage = "";

        setLoadingProgress(
            40,
            "Loading dog model..."
        );

        var result = await loadGLBDebug(modelPath_kishuInu_glb);

        if (!result || !result.gltf || !result.binary) {
            throw new Error("Invalid GLB result: missing gltf or binary data.");
        }

        console.log("GLB debug loaded successfully");

        // it generates the mermaid code to build the graph
        if (EXPORT_DOG_MERMAID_TXT) {
            generateDogMermaidTxtFromGltf(result.gltf);
        }

        if (DEBUG_DOG_HIERARCHY) {
            printDogParentRelationships(result.gltf);
            printDogMermaidFromGltf(result.gltf);
        }


        skinnedDog = createSkinnedDogBuffers(
            gl,
            result.gltf,
            result.binary
        );

        if (!skinnedDog) {
            throw new Error("createSkinnedDogBuffers returned null or undefined.");
        }

        /*
            Flag esplicita: da ora sappiamo che il cane è stato creato.
        */
        skinnedDog.isReady = true;

        skinnedDogLoadState = "ready";

        console.log("Skinned dog buffers created:", skinnedDog);
        console.log("Kishu Inu texture maps available:", {
            baseColor: !!skinnedDog.baseColorTexture,
            normal: !!skinnedDog.normalTexture,
            metallicRoughness: !!skinnedDog.metallicRoughnessTexture,
            specular: !!skinnedDog.specularTexture,
            normalScale: skinnedDog.normalScale
        });
        //printDogJointNames();

    } catch (error) {
        skinnedDogLoadState = "failed";

        skinnedDogLoadErrorMessage =
            error && error.message
                ? error.message
                : String(error);

        console.error("GLB debug load error:", error);
    }



    setLoadingProgress(
        50,
        "Loading Textures ..."
    );

    //teapotTexture = loadTexture(path_img_teapot);
    
    // ocra più elegante
    //teapotTexture = createSolidColorTexture(gl, 205, 150, 65, 255);
    teapotTexture = createSolidColorTexture(gl, 55, 125, 150, 255);
    tableTexture = loadTexture(path_img_table);
    wallTexture = loadTexture(path_img_wall);
    floorTexture = loadTexture(path_img_floor);
   
    paintingTexture = loadTexture(path_img_painting);
    corniceTexture = loadTexture(path_img_cornice);
    ballTexture = loadTexture(path_img_ball);
    curtainTexture = loadTexture(path_img_curtain);
    heartTexture = loadTexture(path_img_heart);

    tableColorTexture = loadTexture(path_folder_table + "table_color.jpg");
    tableSpecularTexture = loadTexture(path_folder_table + "table_specular_map.jpg");
    tableAOTexture = loadTexture(path_folder_table + "table_occlusion_map.jpg");


    musicNoteTexture = loadTexture(path_img_musicNote);
    moonTexture = loadTexture(path_img_moon, true);
    sunTexture = loadTexture(path_img_sun);
    haloTexture = loadTexture(path_img_halo);
    grassTexture= loadTexture(path_img_grass);
    //bowlTexture= loadTexture(path_img_blue);
    //bowlTexture = createSolidColorTexture(gl, 220, 205, 180, 255);
    //bowlTexture = createSolidColorTexture(gl, 125, 150, 175, 255);
    bowlTexture = loadTexture ("./Textures/bowl_2.png");

    /* bowlTexture = loadTexture(
        path_folder_bowl + "bowl_BaseColor.png"
    );
 */
    bowlNormalTexture = loadTexture(
        path_folder_bowl + "bowl_NormalOGL.png"
    );

    bowlRoughnessTexture = loadTexture(
        path_folder_bowl + "bowl_Roughness.png"
    );

    waterDiskTexture = createSolidColorTexture(gl, 130, 210, 230, 120);

    kibbleTexture = createSolidColorTexture(gl, 130, 75, 35, 255);

    benchTexture = loadTexture(path_img_bench);

    // Advanced bench material textures
    benchBaseColorTexture = loadTexture(path_folder_bench + "bench_base_color.png");
    benchNormalTexture = loadTexture(path_folder_bench + "bench_normal.png");
    benchRoughnessTexture = loadTexture(path_folder_bench + "bench_roughness.png");
    benchMetallicTexture = loadTexture(path_folder_bench + "bench_metallic.png");

    frisbeeTexture= loadTexture(path_img_frisbee);
    
    grassBlockTexture = loadTexture(path_img_grass_block);

    leafTexture = loadTexture(path_img_leaf);
    fireflyTexture = createSolidColorTexture(
        gl,
        255, 230, 110, 255
    );

    wallLampTexture = loadTexture(path_img_wall_lamp_base_color);

    wallLampNormalTexture =
        loadTexture(wallLampNormalTexturePath);

    wallLampRoughnessTexture =
        loadTexture(wallLampRoughnessTexturePath);


    setLoadingProgress(
        50,
        "Loading lights and objects ..."
    );


    //halo buffers
    haloBuffers = createBuffers(
    [
        vec4(-0.5, -0.5, 0.0, 1.0),
        vec4( 0.5, -0.5, 0.0, 1.0),
        vec4( 0.5,  0.5, 0.0, 1.0),

        vec4(-0.5, -0.5, 0.0, 1.0),
        vec4( 0.5,  0.5, 0.0, 1.0),
        vec4(-0.5,  0.5, 0.0, 1.0)
    ],
    [
        vec4(0, 0, 1, 0),
        vec4(0, 0, 1, 0),
        vec4(0, 0, 1, 0),
        vec4(0, 0, 1, 0),
        vec4(0, 0, 1, 0),
        vec4(0, 0, 1, 0)
    ],
    [
        vec2(0, 0),
        vec2(1, 0),
        vec2(1, 1),
        vec2(0, 0),
        vec2(1, 1),
        vec2(0, 1)
    ]
);
    

    
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

    //light buffers
    var lightSphere = createSphere(1.0, 16,15);
    lightSphereBuffers = createBuffers(
        lightSphere.points,
        lightSphere.normals,
        lightSphere.texCoords
    );

    haloProgram = initShaders(
        gl,
        "halo-vertex-shader",
        "halo-fragment-shader"
    );

    // loading water disk 
    waterDiskBuffers = createWaterDiskObject(gl, 64);

    //loading kibbles

    kibbleObjects = [
        createKibbleObject(gl, 1.0, 8, 10, 1),
        createKibbleObject(gl, 1.0, 8, 10, 2),
        createKibbleObject(gl, 1.0, 8, 10, 3)
    ];

    
    
    //second light .. wall lamp loading
    await loadOBJ(modelPath_wallLamp);
    console.log("OBJ Wall Lamp loaded");
    var wallLampPoints = pointsArray.slice();
    var wallLampNormals = normalsArray.slice();
    var wallLampTex = texCoordsArray.slice();
    wallLampBuffers = createBuffers(wallLampPoints, wallLampNormals, wallLampTex);

    //moon loading
    await loadOBJ(modelPath_moon);
    console.log("OBJ Moon loaded");
    var moonPoints = pointsArray.slice();
    var moonNormals = normalsArray.slice();
    var moonTex = texCoordsArray.slice();
    moonBuffers = createBuffers(moonPoints, moonNormals, moonTex);


    //sun loading
    await loadOBJ(modelPath_sun);
    console.log("OBJ Sun loaded");
    var sunPoints = pointsArray.slice();
    var sunNormals = normalsArray.slice();
    var sunTex = texCoordsArray.slice();
    sunBuffers = createBuffers(sunPoints, sunNormals, sunTex);

    //loading bowl
    await loadOBJ(modelPath_bowl)
    console.log("OBJ bowl loaded");
    var bowlPoints = pointsArray.slice();
    var bowlNormals = normalsArray.slice();
    var bowlTex = texCoordsArray.slice();
    bowlBuffers = createBuffers(bowlPoints, bowlNormals, bowlTex);

    //loading curtain rod support
    curtainRodBuffers= createCurtainRodObject(gl);
    if(!curtainRodBuffers){
        console.log("ERRORE");
    }
    

    //heart loading
     await loadOBJ(modelPath_heart);
    console.log("OBJ Heart loaded");
    var heartPoints = pointsArray.slice();
    var heartNormals = normalsArray.slice();
    var heartTex = texCoordsArray.slice();
    heartBuffers = createBuffers(heartPoints, heartNormals, heartTex);
    if (!heartBuffers)  {
        console.log("Heart buffers not created successfully"); 
    }

    //loading musicNote
    await loadOBJ(modelPath_musicNote);
    console.log("OBJ Music Note loaded");
    var musicNotePoints = pointsArray.slice();
    var musicNoteNormals = normalsArray.slice();
    var musicNoteTex = texCoordsArray.slice();
    musicNoteBuffers = createBuffers(musicNotePoints, musicNoteNormals, musicNoteTex);
    if (!musicNoteBuffers)  {
        console.log("Music Note buffers not created successfully"); 
    }

    //teapot loading
    await loadOBJ(modelPath_teapot);
    console.log("OBJ  Teapot loaded");
        
    var teapotPoints = pointsArray.slice();
    var teapotNormals = normalsArray.slice();
    var teapotTex = texCoordsArray.slice();
    teapotBuffers = createBuffers(teapotPoints, teapotNormals, teapotTex);
    if (!teapotBuffers)  {
        console.log("Teapot buffers not created successfully");
    }

    //carico parte del tavolo 
    await loadOBJ(modelPath_table);
    console.log("OBJ  Table loaded");


    var tablePoints = pointsArray.slice();
    var tableNormals = normalsArray.slice();
    var tableTex = texCoordsArray.slice();
    tableBuffers = createBuffers(tablePoints, tableNormals, tableTex);

    

   

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

    //green block Loading
    await loadOBJ(modelPath_grassBlock);
    var grassBlockPoints = pointsArray.slice();
    var grassBlockNormals = normalsArray.slice();
    var grassBlockTex = texCoordsArray.slice();
    grassBlockBuffers = createBuffers(grassBlockPoints, grassBlockNormals, grassBlockTex);

    createParkGrassPatchInstances();

    //bench loading
    await loadOBJ(modelPath_bench);
    var benchPoints = pointsArray.slice();
    var benchNormals = normalsArray.slice();
    var benchTex = texCoordsArray.slice();
    benchBuffers = createBuffers(benchPoints, benchNormals, benchTex);

    //frisbee loading
    await loadOBJ(modelPath_frisbee);
    var frisbeePoints = pointsArray.slice();
    var frisbeeNormals = normalsArray.slice();
    var frisbeeTex = texCoordsArray.slice();
    frisbeeBuffers = createBuffers(frisbeePoints, frisbeeNormals, frisbeeTex);

    //leaf loading
    await loadOBJ(modelPath_leaf);
    var leafPoints = pointsArray.slice();
    var leafNormals = normalsArray.slice();
    var leafTex = texCoordsArray.slice();
    leafBuffers = createBuffers(leafPoints, leafNormals, leafTex);

    ///fireflies
    var fireflySphere = createSphere(1.0, 12, 12);
    fireflySphereBuffers = createBuffers(
        fireflySphere.points,
        fireflySphere.normals,
        fireflySphere.texCoords
    );

    setLoadingProgress(
        55,
        "Loading skyboxes..."
    );


    //   SKYBOXX    //////////////////
    // skybox buffers &  shader program
    skyboxProgram = initShaders(gl, "skybox-vertex-shader", "skybox-fragment-shader");
    console.log("skyboxProgram =", skyboxProgram);
    skyboxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);

    //skyboxTexture = LoadSkyboxTexture(gl);
    skyboxTexture = LoadSkyboxTextureFromCross(gl,path_img_skybox_day);
    parkSkyboxTexture = LoadSkyboxTexturePark(gl);
    
    nightSkyboxTexture = 
        LoadSkyboxTextureFromCross(gl,path_img_skybox_night);

    skyboxPosLoc = gl.getAttribLocation(skyboxProgram, "pos");
    skyboxMvpLoc = gl.getUniformLocation(skyboxProgram, "mvp");
    skyboxSamplerLoc = gl.getUniformLocation(skyboxProgram, "skybox");


    setLoadingProgress(
        60,
        "Loading dog arrays..."
    );



    // part for trying to visualize the rigged dog
    skinnedDogProgram = initShaders(
        gl,
        "skinned-dog-vertex-shader",
        "skinned-dog-fragment-shader"
    );

    skinnedDogAttribs.vPosition = gl.getAttribLocation(skinnedDogProgram, "vPosition");
    skinnedDogAttribs.vNormal   = gl.getAttribLocation(skinnedDogProgram, "vNormal");
    skinnedDogAttribs.vTexCoord = gl.getAttribLocation(skinnedDogProgram, "vTexCoord");
    skinnedDogAttribs.vJoints   = gl.getAttribLocation(skinnedDogProgram, "vJoints");
    skinnedDogAttribs.vWeights  = gl.getAttribLocation(skinnedDogProgram, "vWeights");

    skinnedDogUniforms.modelMatrix      = gl.getUniformLocation(skinnedDogProgram, "modelMatrix");
    skinnedDogUniforms.viewMatrix       = gl.getUniformLocation(skinnedDogProgram, "viewMatrix");
    skinnedDogUniforms.projectionMatrix = gl.getUniformLocation(skinnedDogProgram, "projectionMatrix");
    skinnedDogUniforms.normalMatrix     = gl.getUniformLocation(skinnedDogProgram, "normalMatrix");
    skinnedDogUniforms.boneMatrices     = gl.getUniformLocation(skinnedDogProgram, "boneMatrices");

    skinnedDogUniforms.uTexture         = gl.getUniformLocation(skinnedDogProgram, "uTexture");
    skinnedDogUniforms.useTexture       = gl.getUniformLocation(skinnedDogProgram, "useTexture");
    skinnedDogUniforms.uNormalMap =
        gl.getUniformLocation(skinnedDogProgram, "uNormalMap");

    skinnedDogUniforms.uMetallicRoughnessMap =
        gl.getUniformLocation(skinnedDogProgram, "uMetallicRoughnessMap");

    skinnedDogUniforms.uSpecularMap =
        gl.getUniformLocation(skinnedDogProgram, "uSpecularMap");

    skinnedDogUniforms.useNormalMap =
        gl.getUniformLocation(skinnedDogProgram, "useNormalMap");

    skinnedDogUniforms.useMetallicRoughnessMap =
        gl.getUniformLocation(skinnedDogProgram, "useMetallicRoughnessMap");

    skinnedDogUniforms.useSpecularMap =
        gl.getUniformLocation(skinnedDogProgram, "useSpecularMap");

    skinnedDogUniforms.uNormalScale =
        gl.getUniformLocation(skinnedDogProgram, "uNormalScale");


    skinnedDogUniforms.receiveShadow =
        gl.getUniformLocation(skinnedDogProgram, "receiveShadow");

    skinnedDogUniforms.usePointShadowMap =
        gl.getUniformLocation(skinnedDogProgram, "usePointShadowMap");

    skinnedDogUniforms.lightPosition =
        gl.getUniformLocation(skinnedDogProgram, "lightPosition");

    skinnedDogUniforms.pointShadowMap0 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap0");

    skinnedDogUniforms.pointShadowMap1 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap1");

    skinnedDogUniforms.pointShadowMap2 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap2");

    skinnedDogUniforms.pointShadowMap3 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap3");

    skinnedDogUniforms.pointShadowMap4 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap4");

    skinnedDogUniforms.pointShadowMap5 =
        gl.getUniformLocation(skinnedDogProgram, "pointShadowMap5");

    skinnedDogUniforms.pointLightViewMatrix0 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix0");

    skinnedDogUniforms.pointLightViewMatrix1 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix1");

    skinnedDogUniforms.pointLightViewMatrix2 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix2");

    skinnedDogUniforms.pointLightViewMatrix3 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix3");

    skinnedDogUniforms.pointLightViewMatrix4 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix4");

    skinnedDogUniforms.pointLightViewMatrix5 =
        gl.getUniformLocation(skinnedDogProgram, "pointLightViewMatrix5");

    skinnedDogUniforms.pointLightProjectionMatrix =
        gl.getUniformLocation(skinnedDogProgram, "pointLightProjectionMatrix");



    skinnedDogDepthProgram = initShaders(
        gl,
        "skinned-dog-depth-vertex-shader",
        "skinned-dog-depth-fragment-shader"
    );

    skinnedDogDepthAttribs.vPosition = gl.getAttribLocation(skinnedDogDepthProgram, "vPosition");
    skinnedDogDepthAttribs.vJoints   = gl.getAttribLocation(skinnedDogDepthProgram, "vJoints");
    skinnedDogDepthAttribs.vWeights  = gl.getAttribLocation(skinnedDogDepthProgram, "vWeights");

    skinnedDogDepthUniforms.modelMatrix = gl.getUniformLocation(skinnedDogDepthProgram, "modelMatrix");
    skinnedDogDepthUniforms.lightViewMatrix = gl.getUniformLocation(skinnedDogDepthProgram, "lightViewMatrix");
    skinnedDogDepthUniforms.lightProjectionMatrix = gl.getUniformLocation(skinnedDogDepthProgram, "lightProjectionMatrix");
    skinnedDogDepthUniforms.boneMatrices = gl.getUniformLocation(skinnedDogDepthProgram, "boneMatrices");

    skinnedDogDepthUniforms.lightPosition =
        gl.getUniformLocation(skinnedDogDepthProgram, "lightPosition");

    skinnedDogDepthUniforms.pointShadowFar =
        gl.getUniformLocation(skinnedDogDepthProgram, "pointShadowFar");

    skinnedDogDepthUniforms.pointShadowPass =
        gl.getUniformLocation(skinnedDogDepthProgram, "pointShadowPass");

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


    //new part for table 
    tableMaterialProgram = initShaders(
        gl,
        "table-material-vertex-shader",
        "table-material-fragment-shader"
    );

    tableMaterialAttribs.vPosition =
        gl.getAttribLocation(tableMaterialProgram, "vPosition");

    tableMaterialAttribs.vNormal =
        gl.getAttribLocation(tableMaterialProgram, "vNormal");

    tableMaterialAttribs.vTexCoord =
        gl.getAttribLocation(tableMaterialProgram, "vTexCoord");

    tableMaterialUniforms.modelMatrix =
        gl.getUniformLocation(tableMaterialProgram, "modelMatrix");

    tableMaterialUniforms.viewMatrix =
        gl.getUniformLocation(tableMaterialProgram, "viewMatrix");

    tableMaterialUniforms.projectionMatrix =
        gl.getUniformLocation(tableMaterialProgram, "projectionMatrix");

    tableMaterialUniforms.modelNormalMatrix =
        gl.getUniformLocation(tableMaterialProgram, "modelNormalMatrix");

    tableMaterialUniforms.lightPosition =
        gl.getUniformLocation(tableMaterialProgram, "lightPosition");

    tableMaterialUniforms.diffuseMap =
        gl.getUniformLocation(tableMaterialProgram, "diffuseMap");

    tableMaterialUniforms.specularMap =
        gl.getUniformLocation(tableMaterialProgram, "specularMap");

    tableMaterialUniforms.aoMap =
        gl.getUniformLocation(tableMaterialProgram, "aoMap");


    //new uniforms used for bench
    tableMaterialUniforms.normalMap =
        gl.getUniformLocation(tableMaterialProgram, "normalMap");

    tableMaterialUniforms.roughnessMap =
        gl.getUniformLocation(tableMaterialProgram, "roughnessMap");

    tableMaterialUniforms.metallicMap =
        gl.getUniformLocation(tableMaterialProgram, "metallicMap");

    tableMaterialUniforms.useNormalMap =
        gl.getUniformLocation(tableMaterialProgram, "useNormalMap");

    tableMaterialUniforms.usePBRMaps =
        gl.getUniformLocation(tableMaterialProgram, "usePBRMaps");

    ////////////////////


    tableMaterialUniforms.receiveShadow =
        gl.getUniformLocation(tableMaterialProgram, "receiveShadow");

    tableMaterialUniforms.usePointShadowMap =
        gl.getUniformLocation(tableMaterialProgram, "usePointShadowMap");

    tableMaterialUniforms.pointShadowMap0 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap0");

    tableMaterialUniforms.pointShadowMap1 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap1");

    tableMaterialUniforms.pointShadowMap2 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap2");

    tableMaterialUniforms.pointShadowMap3 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap3");

    tableMaterialUniforms.pointShadowMap4 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap4");

    tableMaterialUniforms.pointShadowMap5 =
        gl.getUniformLocation(tableMaterialProgram, "pointShadowMap5");

    tableMaterialUniforms.pointLightViewMatrix0 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix0");

    tableMaterialUniforms.pointLightViewMatrix1 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix1");

    tableMaterialUniforms.pointLightViewMatrix2 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix2");

    tableMaterialUniforms.pointLightViewMatrix3 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix3");

    tableMaterialUniforms.pointLightViewMatrix4 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix4");

    tableMaterialUniforms.pointLightViewMatrix5 =
        gl.getUniformLocation(tableMaterialProgram, "pointLightViewMatrix5");

    tableMaterialUniforms.pointLightProjectionMatrix =
        gl.getUniformLocation(tableMaterialProgram, "pointLightProjectionMatrix");

    // sooo important come back to main program after initShaders
    gl.useProgram(program);
    

    setLoadingProgress(
        70,
        "Loading physics..."
    );

    
    //physics initialization for mini-game and curtain
    initPhysics();
   
    //creation curtain
    curtain = new CannonCurtain(
        gl,
        physicsWorld,
        CURTAIN_ROWS,
        CURTAIN_COLS,
        CURTAIN_WIDTH,
        CURTAIN_HEIGHT,
        CURTAIN_ORIGIN_X,
        CURTAIN_ORIGIN_Y,
        CURTAIN_ORIGIN_Z
    );
    var windSlider = document.getElementById("windSlider");
    var windValue = document.getElementById("windValue");

    if (windSlider && windValue) {
        windSlider.addEventListener("input", function () {
            curtainWindStrength = parseFloat(this.value);
            parkWindStrength = parseFloat(this.value);
            windValue.textContent = curtainWindStrength.toFixed(3);
            updateWindSound(curtainWindStrength);
        });
    }


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);


    gl.useProgram(program);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");


    setLoadingProgress(
        88,
        "Preparing buttons & sounds..."
    );


    var cameraHelpButton =
        document.getElementById("CameraControlsHelpButton");

    if (cameraHelpButton) {
        cameraHelpButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            cameraControlsLegendClosedByUser = false;
            showCameraControlsLegend();
        };
    } 
    var closeCameraControlsButton =
        document.getElementById("CloseCameraControlsLegend");

    if (closeCameraControlsButton) {
        closeCameraControlsButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            closeCameraControlsLegend();
        };
    }

    // sound to ballthrowing
    ballThrowSound = document.getElementById("ballThrowSound");

    if (ballThrowSound) {
        ballThrowSound.preload = "auto";
        ballThrowSound.load();
    }

    //Sound to pet dog
    dogBreathSound = document.getElementById("dogBreathSound");
    dogBreathSound.loop = false;

    dogBreathSound.addEventListener("ended", function () {
        dogPetAudioPlayed = false;
    });

    //button for petting the dog
    var petDogButton = document.getElementById("ButtonPetDogMode");
    petDogButton.onclick = function () {
        petDogMode = !petDogMode;

        if (petDogMode) {
            callDogClickMode = false;
            //callDogButton.textContent = "Call Dog: OFF";
            var callDogLabel = callDogButton.querySelector(".dog-action-label");

            if (callDogLabel) {
                callDogLabel.textContent = "Call Dog";
            }

            dogPetAudioPlayed = false;
            dogIsBeingPetted = false;

            dogBreathSound.pause();
            dogBreathSound.currentTime = 0;
            dogBreathSound.loop = false;

        } else {
            dogPetHeadYaw = 0.0;
            dogPetHeadPitch = 0.0;

            dogPetAudioPlayed = false;
            dogIsBeingPetted = false;

            dogBreathSound.pause();
            dogBreathSound.currentTime = 0;
        }

        var petDogLabel = this.querySelector(".dog-action-label");
        var petDogIcon = this.querySelector(".pet-heart-icon");

        if (petDogLabel) {
            petDogLabel.textContent = petDogMode
                ? "Pet: ON"
                : "Pet: OFF";
        }

        if (petDogIcon) {
            petDogIcon.textContent = petDogMode
                ? "💗"
                : "🤍";
        }

        isDraggingCamera = false;
        updateCanvasCursor();
    };

    //button water dog
    waterButton = document.getElementById("ButtonWater");

    waterButton.addEventListener("click", function () {

         if (!waterVisible && miniGameActive) {
            showGameMessage(
                "Please stop the ball minigame before using water or food.",
                2800
            );

            return;
        }
        if (!waterVisible) {
            //if food is active, deactivate it
            if (kibbleVisible) {
                deactivateFood();
            }

            waterVisible = true;

            if (startGlobalAudioEnabled && waterSound && !waterSound.muted) {
                 waterSound.pause();
               

                try {
                    waterSound.currentTime = 0;
                } catch (error) {
                    console.log("Could not reset water sound:", error);
                }

                waterSound.play().catch(function(error) {
                    console.log("Water sound could not be played:", error);
                });
            }

            waterButton.classList.add("active");
            waterButton.title = "Remove water";

            startSkinnedDogGoToBowl("water");

        } else {
            deactivateWater();
            stopSkinnedDogGoToBowl();
        }
    });
    //sound for pouring the bowl with kibbles
    pouringFoodSound = document.getElementById("pouringFoodSound");
    pouringFoodSound.volume = 0.6;
    
    // button kibbles/food
    foodButton = document.getElementById("ButtonFood");

    foodButton.addEventListener("click", function () {
        if (!kibbleVisible && miniGameActive) {
            showGameMessage(
                "Please stop the ball minigame before using water or food.",
                2800
            );

            return;
        }

        if (!kibbleVisible) {
            //if water is active, deactivate it
            if (waterVisible) {
                deactivateWater();
            }

            startKibblePour();

            foodButton.classList.add("active");
            foodButton.title = "Remove Food";
            startSkinnedDogGoToBowl("food");

        } else {
            deactivateFood();
            stopSkinnedDogGoToBowl();
        }
    });

    
     
    // button for calling dog mode
    var callDogButton = document.getElementById("ButtonCallDogMode");

    callDogButton.onclick = function () {
        callDogClickMode = !callDogClickMode;

        // Block any remaining active dragging
        isDraggingCamera = false;

       var callDogLabel = this.querySelector(".dog-action-label");

        if (callDogLabel) {
            callDogLabel.textContent = callDogClickMode
                ? "Call: ON"
                : "Call Dog";
        }
        updateCanvasCursor();
    };



    //////////////////// MUSIC PART
    //ANCHOR - Music Part

    backgroundMusic =
        document.getElementById("backgroundMusic");

    var parkBackgroundMusic =
        document.getElementById("parkBackgroundMusic");

    musicVolumeSlider =
        document.getElementById("MusicVolume");

    musicVolumeValue =
        document.getElementById("MusicVolumeValue");

    musicButton =
        document.getElementById("ButtonMusic");

    musicIcon =
        document.getElementById("MusicIcon");


    function updateMusicSliderStyle() {
        if (!musicVolumeSlider) return;

        var volume = parseFloat(musicVolumeSlider.value);
        var percent = Math.round(volume * 100);

        musicVolumeSlider.style.setProperty(
            "--music-progress",
            percent + "%"
        );

        if (musicVolumeValue) {
            musicVolumeValue.textContent = percent + "%";
        }
    }


    function setAllBackgroundMusicVolume(volume) {
        if (backgroundMusic) {
            backgroundMusic.volume = volume;
        }

        if (parkBackgroundMusic) {
            parkBackgroundMusic.volume = volume;
        }
        if(parkNightBackgroundMusic){
            parkNightBackgroundMusic.volume = volume;
        }
    }


    // initial volume setup
    var initialMusicVolume = parseFloat(musicVolumeSlider.value);

    setAllBackgroundMusicVolume(initialMusicVolume);
    updateMusicSliderStyle();


    musicVolumeSlider.addEventListener("input", function () {
        var volume = parseFloat(this.value);

        setAllBackgroundMusicVolume(volume);
        updateMusicSliderStyle();
    });


    musicButton.onclick = function () {
            toggleBackgroundMusic();
    };

    
    //settings for global audio

    function hardStopWaterSound() {
        var oldWaterSound = document.getElementById("waterSound");

        if (!oldWaterSound) {
            return;
        }

        oldWaterSound.pause();
        oldWaterSound.muted = true;

        try {
            oldWaterSound.currentTime = 0;
        } catch (error) {
            console.log("Could not reset water sound:", error);
        }

        /*
            Fix forte:
            sostituisco proprio il tag audio con una copia.
            Così anche se il browser aveva una play() pendente,
            il suono vecchio viene eliminato.
        */
        var newWaterSound = oldWaterSound.cloneNode(true);
        newWaterSound.muted = true;

        oldWaterSound.parentNode.replaceChild(newWaterSound, oldWaterSound);

        /*
            Aggiorno anche la variabile globale creata dall'id HTML,
            così i click successivi usano il nuovo audio.
        */
        window.waterSound = newWaterSound;
    }

     var globalAudioButton = document.getElementById("ButtonGlobalAudio");

    if (globalAudioButton) {
        globalAudioButton.onclick = function () {
            startGlobalAudioEnabled = !startGlobalAudioEnabled;

            toggleGlobalAudioMute();
            updateGlobalAudioButton();
            updateStartSettingsPanel();

            

             if (!startGlobalAudioEnabled) {
                hardStopWaterSound();
            } else {
                var waterAudio = document.getElementById("waterSound");

                if (waterAudio) {
                    waterAudio.muted = false;
                }
            }
        };
    }

    updateGlobalAudioButton();


    


    //For automoving sun part

    autoSunButton =
        document.getElementById("ButtonAutoSun");

    autoSunButton.onclick = function () {
            autoSunEnabled = !autoSunEnabled;

            if (autoSunEnabled) {
                autoSunButton.classList.add("auto-sun-on");

                if (isNight) {
                    autoSunButton.title = "Auto Moon: ON";
                } else {
                    autoSunButton.title = "Auto Sun: ON";
                }
            } else {
                autoSunButton.classList.remove("auto-sun-on");

                if (isNight) {
                    autoSunButton.title = "Auto Moon: OFF";
                } else {
                    autoSunButton.title = "Auto Sun: OFF";
                }
            }
    };

    //wall lamp button
   var buttonWallLamp = document.getElementById("ButtonWallLamp");

    function updateWallLampButton() {
        if (!buttonWallLamp) {
            return;
        }

        var canShowWallLampButton =
            isNight &&
            currentScene === "home";

        if (!canShowWallLampButton) {
            buttonWallLamp.classList.add("hidden");
            buttonWallLamp.classList.remove("wall-lamp-on");

            wallLampEnabled = false;

            return;
        }

        buttonWallLamp.classList.remove("hidden");

        if (wallLampEnabled) {
            buttonWallLamp.title = "Wall Lamp: ON";
            buttonWallLamp.classList.add("wall-lamp-on");
        } else {
            buttonWallLamp.title = "Wall Lamp: OFF";
            buttonWallLamp.classList.remove("wall-lamp-on");
        }
    }
        if (buttonWallLamp) {
            buttonWallLamp.onclick = function () {
                if (!isNight) {
                    wallLampEnabled = false;
                    updateWallLampButton();

                    showGameMessage(
                        "The wall lamp can be turned on only at night :)",
                        2200
                    );

                    return;
                }

                wallLampEnabled = !wallLampEnabled;
                updateWallLampButton();
            };
    }

    if (buttonWallLamp) {
        buttonWallLamp.onclick = function () {
            if (!isNight || currentScene !== "home") {
                wallLampEnabled = false;
                updateWallLampButton();
                return;
            }

            wallLampEnabled = !wallLampEnabled;
            updateWallLampButton();
        };
    }

    //frisbee button

    var buttonFrisbee = document.getElementById("ButtonFrisbee");

   
    buttonFrisbee.onclick = function () {
                if (currentScene !== "park") {
                    return;
                }
                if (
                    frisbeeThrowMode &&
                    frisbeeAttachedToHand &&
                    !frisbeeFlying &&
                    !frisbeeLanded
                ) {
                    putAwayFrisbee(this);
                    return;
                }

                if (frisbeeReturnedAndWaiting) {

                    frisbeeReturnedAndWaiting = false;

                    dogHasFrisbee = false;
                    dogReturningWithFrisbee = false;
                    dogFetchObjectType = null;

                    frisbeeThrowMode = false;
                    frisbeeAttachedToHand = false;
                    frisbeeFlying = false;
                    frisbeeLanded = false;
                    frisbeeAlreadyTargeted = false;

                    dogFetchLoweringActive = false;
                    dogFetchLowerAmount = 0.0;

                    dogCrouchActive = false;
                    dogCrouchAmount = 0.0;

                    this.classList.remove("active");
                    this.title = "Take Frisbee";

                    updateCanvasCursor();

                    showGameMessage("Frisbee put away!", 1500);

                    return;
                }
                stopDogFrisbeeFetch();

                dogHasFrisbee = false;
                dogReturningWithFrisbee = false;
                dogFetchObjectType = null;

                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                frisbeePickupHoldTimer = 0.0;

                frisbeeReturnedAndWaiting = false;

                frisbeeThrowMode = true;
                frisbeeAttachedToHand = true;

                frisbeeFlying = false;
                frisbeeLanded = false;

                setFrisbeeHandCameraView();

               
                
                frisbeeHasMousePosition = false;

                updateCanvasCursor();
                
                this.classList.add("active");
                this.title = "Click on the park to throw";
    };
        
    //frisbee sound
    wooshFrisbeeSound = document.getElementById("wooshFrisbeeSound");

    if (wooshFrisbeeSound) {
        wooshFrisbeeSound.volume = 0.6;
    }
    


    document.getElementById("ButtonGoOut").onclick = function () {

            if (currentScene === "park") {
                showGameMessage(
                    "You are already at the park!",
                    2200
                );
                
                return;
            }

            switchSceneWithTransition(
                "park",
                "Going out...",
                "Loading the park...",
                function () {
                    // before going to park-> if the ball minigame is active, stop it
                    miniGameActive = false;

                    wallLampEnabled = false;
                    updateWallLampButton();


                    resetBallSettingsPanelState();

                    updateTeapotControlsLegend();


                    stopBallMiniGame();

                    resetSkinnedDogFetchState();
                    resetSkinnedDogBallInteraction();

                    resetDogHeartEffect();

                    dogHasBall = false;
                    skinnedDogAlreadyTargeted = false;

                    // visual reset of the ball minigame button and icon
                    var miniGameButton = document.getElementById("ButtonMiniGame");
                    var miniGameIcon = document.getElementById("MiniGameIcon");

                    if (miniGameButton) {
                        miniGameButton.classList.remove("active");
                        miniGameButton.title = "Start Ball";
                    }

                    if (miniGameIcon) {
                        miniGameIcon.src = path_icon_ball;
                        miniGameIcon.alt = "Start Ball";
                    }
                }
            );
        };

   

    document.getElementById("ButtonGoHome").onclick = function () {          
        if (currentScene === "home") {
            showGameMessage(
                    "You are already at home!",
                    2200
            );
            
            return;
        }

        if (
            currentScene === "park" &&
            isNight &&
            dogFireflyCatchActive &&
            dogFireflyCatchPhase !== "idle"
        ) {
            showGameMessage(
                "Wait for the fireflies animation to finish before going home!\nTry again :)",
                2800
            );
            return;
        }

        switchSceneWithTransition(
            "home",
            "Going home...",
            "Loading the room...",
            function () {
                    currentScene = "home";

                    updateWallLampButton();

                    miniGameActive = false;
                    resetBallSettingsPanelState();
                    

                    resetDogForHomeScene();
                    resetDogHeartEffect();

                    updateSceneButtonsVisibility();

                    setTimeout(function () {
                        resetBallSettingsPanelState();
                    }, 0);

                    if (musicButton && musicButton.classList.contains("music-on")) {
                        startBackgroundMusic();
                    }
                    clearOldShadowMaps();
                }
            );
    };


    document.getElementById("windSlider").oninput = function () {
        currentWind = parseFloat(this.value);

        updateWindSound(currentWind);
    };

    //minigame settings buttons
    document.getElementById("ButtonMiniGame").onclick = function () {

        //if I am not at home, I cannot throw the ball
        if(currentScene == "park") return;

        if (!miniGameActive && dogFollowTeapotMode) {
            showGameMessage(
                "Teapot Chase is active!\nStop it before starting the ball minigame.",
                2500
            );

            return;
        }

        miniGameActive = !miniGameActive;

        var miniGameIcon = document.getElementById("MiniGameIcon");

        if (miniGameActive) {
                this.title = "Stop Ball ";
                 this.classList.add("active");


                if (miniGameIcon) {
                    miniGameIcon.alt = "Stop Ball";
                }

                setTimeout(function () {
                    showDogHeart = false;
                    dogHeartTimer = 0.0;
                },2000);

                //to reset ball
                resetSkinnedDogFetchState();   


                ballOutsideHomeWarningShown = false;
                ballBlockedOutsideHome = false;

                playBallThrowSound();
                startBallMiniGame();
                

                

                // important: after reset, the ball must be free
                dogHasBall = false;
               
                skinnedDogAlreadyTargeted = false;
        } 
        else {
                this.title = "Start Ball ";
                this.classList.remove("active");

                if (miniGameIcon) {
                    miniGameIcon.alt = "Start Ball";
                }

                stopBallMiniGame();
                ballOutsideHomeWarningShown = false;
                ballBlockedOutsideHome = false;

                dogFetchObjectType = null;
                dogFetchBallMode = false;
                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                dogHasBall = false;
                skinnedDogAlreadyTargeted = false;

                dogPath = [];
                dogPathIndex = 0;
                dogFetchTarget = null;

                resetSkinnedDogBallInteraction();
                //resetSkinnedDogBallInteractionFull();
            }
        //updateBallSettingsOverlay();
        updateBallSettingsOverlay(miniGameActive);


    };

    // settings buttons + sliders

    var buttonResetCamera = document.getElementById("ButtonResetCamera");

    if (buttonResetCamera) {
        buttonResetCamera.onclick = function () {
            resetCameraView();
        };
    }
    var buttonFocusCurtain = document.getElementById("ButtonFocusCurtain");

    if (buttonFocusCurtain) {
        buttonFocusCurtain.onclick = function () {
            focusCurtainCamera();
        };
    }

    var buttonFocusDog = document.getElementById("ButtonFocusDog");

    if (buttonFocusDog) {
        buttonFocusDog.onclick = function () {
            focusDogCamera();
        };
    }

    var buttonDogCameraMode = document.getElementById("ButtonDogCameraMode");

    if (buttonDogCameraMode) {
        buttonDogCameraMode.onclick = function () {
            if (cameraDogMode === "static") {
                cameraDogMode = "follow";
                cameraDogAutoAngle = false;

                showGameMessage(
                    "Dog follow active!\nCamera follows the dog without auto angle.",
                    2400
                );
            } else if (cameraDogMode === "follow") {
                cameraDogMode = "autoAngle";
                cameraDogAutoAngle = true;

                showGameMessage(
                    "Dog auto angle active!\nCamera follows and rotates automatically.",
                    2400
                );
            } else {
                cameraDogMode = "static";
                cameraDogAutoAngle = false;

                cameraDogStaticTarget = vec3(
                    dogFetchX,
                    -0.6,
                    dogFetchZ
                );

                showGameMessage(
                    "Dog static focus active!\nCamera stays on this dog position.",
                    2400
                );
            }

            updateDogCameraModeButton();
            updateOrbitCameraFromSliders();
        };
    }

    var buttonCollision = document.getElementById("ButtonCollision");

    if (buttonCollision) {
        buttonCollision.onclick = function () {
            showCollisionDebug = !showCollisionDebug;

            if (showCollisionDebug) {
                buttonCollision.innerHTML = "Hide Collisions";
            } else {
                buttonCollision.innerHTML = "Show Collisions";
            }
        };
    }
    /* document.getElementById("ButtonLightDir").onclick = function () {
        showLightDirection = !showLightDirection;
        this.textContent = showLightDirection ? "Hide Light Direction" : "Show Light Direction";
    }; */
   

    


    var nightDayButton =
    document.getElementById("ButtonNightDay");

    var nightDayIcon =
        document.getElementById("NightDayIcon");

    nightDayButton.onclick = function () {
        requestDayNightToggle();
        //isNight = !isNight;

        if (isNight) {
            // night mode-> show the sun icon to switch to day mode
            nightDayIcon.src = path_icon_sun
            nightDayButton.title = "Switch to Day Mode";
        } else {
            // day mode-> show the moon icon to switch to night mode
            nightDayIcon.src = path_icon_moon
            nightDayButton.title = "Switch to Night Mode";

            wallLampEnabled = false;
        }
        updateWallLampButton();
    };

    //button for teapot minigame
    var buttonTeapotChase = document.getElementById("ButtonTeapotChase");

    if (buttonTeapotChase) {
        buttonTeapotChase.onclick = function () {

             /*
                Se sto cercando di ACCENDERE la teapot,
                ma la palla è attiva, blocco.
                Se invece la teapot è già ON, permetto di spegnerla.
            */
            if (!dogFollowTeapotMode && isBallMinigameBusyForTeapot()) {
                showGameMessage(
                    "Ball minigame is active!\nStop the ball before starting Teapot Chase.",
                    2500
                );

                return;
            }
            
            dogFollowTeapotMode = !dogFollowTeapotMode;

            console.log("Teapot chase mode:", dogFollowTeapotMode);

            if (dogFollowTeapotMode) {
                //at the beginning the teapot is on the table then 
                // when I click on the button it starts to rotate and the dog will follow it
                objPos[1] = TEAPOT_CHASE_Y;
                flag_rot_teapot = false;


                this.classList.add("active");
                this.title = "Stop Teapot Chase";

                dogFetchObjectType = "teapot";

                dogFollowTeapotLastX = 9999.0;
                dogFollowTeapotLastZ = 9999.0;
                dogFollowTeapotRepathTimer = 9999.0;

                dogTeapotStillTimer = 0.0;
                dogTeapotLastObservedX = objPos[0];
                dogTeapotLastObservedZ = objPos[2];

                dogFetchBallMode = false;
                dogPath = [];
                dogPathIndex = 0;

                dogFetchLoweringActive = false;
                dogFetchLowerAmount = 0.0;

                dogCrouchActive = false;
                dogCrouchAmount = 0.0;

                showDogMusicNote = false;

                showGameMessage(
                    "Teapot chase mode active!\nMove the teapot with the gamepad.",
                    2600
                );
            } else {
                this.classList.remove("active");
                this.title = "Teapot Chase";

                if (dogFetchObjectType === "teapot") {
                    dogFetchObjectType = null;
                    dogFetchBallMode = false;
                    dogPath = [];
                    dogPathIndex = 0;
                    showDogMusicNote = false;

                   
                }

                objPos[0] = TEAPOT_REST_X;
                objPos[1] = TEAPOT_REST_Y;
                objPos[2] = TEAPOT_REST_Z;
                theta[0] = 0.0;
                theta[1] = 0.0;
                theta[2] = 0.0;
                flag_rot_teapot = false;

                showGameMessage("Teapot chase mode off.", 1600);
            }

            updateTeapotControlsLegend();
        };
    } else {
        console.log("ButtonTeapotChase not found");
    }


    // to toggle side panel( left menu) visibility
    toggleSidePanelButton = document.getElementById("ButtonToggleSidePanel");

    toggleSidePanelButton.addEventListener("pointerdown", toggleSidePanel);
    toggleSidePanelButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
    });


    var buttonTeapotFocus = document.getElementById("ButtonTeapotFocus");

    if (buttonTeapotFocus) {
        buttonTeapotFocus.onclick = function () {
            focusTeapotCamera();
        };


    }
 
   /*  document.getElementById("ButtonDogMove").onclick = function () {
        moveDog = !moveDog;
        console.log("Dog walk:", moveDog);
    }; */
    document.getElementById("ButtonX").onclick = () => axis = 0;
    document.getElementById("ButtonY").onclick = () => axis = 1;
    document.getElementById("ButtonZ").onclick = () => axis = 2;


    var buttonTeapotRotation =
        document.getElementById("ButtonT");

    if (buttonTeapotRotation) {
        buttonTeapotRotation.onclick = function () {
            /* flag_rot_teapot = !flag_rot_teapot;
            updateRotationDemoButtons(); */
            setTeapotRotationDemoActive(!flag_rot_teapot);
        };
    }

    var buttonTableRotation =
        document.getElementById("ButtonTableRotation");

   
    if (buttonTableRotation) {
        buttonTableRotation.onclick = function () {
            flag_rot_table = !flag_rot_table;

            if (!flag_rot_table) {
                resetTableRotationToStart();
            }

            updateRotationDemoButtons();
        };
    }


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

    miniGameActive = false;
    ballSettingsPanelHasBeenOpened = false;
    ballSettingsPanelClosedByUser = false;
    updateBallSettingsOverlay();

    document.getElementById("ButtonBounceBall").onclick = function () {
        startBallBounceAnimation();
    };


    // initialize the close button for the ball settings panel

    var closeBallSettingsButton =
        document.getElementById("CloseBallSettingsPanel");

    if (closeBallSettingsButton) {
        closeBallSettingsButton.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            closeBallSettingsPanel();
        };
    }



     cameraAngleSlider = document.getElementById("CameraAngle");
    cameraHeightSlider = document.getElementById("CameraHeight");
    cameraDistanceSlider = document.getElementById("CameraDistance");

    cameraAngleValue = document.getElementById("CameraAngleValue");
    cameraHeightValue = document.getElementById("CameraHeightValue");
    cameraDistanceValue = document.getElementById("CameraDistanceValue");

    

    cameraAngleSlider.oninput = updateOrbitCameraFromSliders;
    cameraHeightSlider.oninput = updateOrbitCameraFromSliders;
    cameraDistanceSlider.oninput = updateOrbitCameraFromSliders;

    updateOrbitCameraFromSliders();


    canvas.addEventListener("click", function(event) {

        // 1) frisbee mode -> click to throw frisbee
        if (frisbeeThrowMode) {
            if (currentScene !== "park") {
                return;
            }

            updateFrisbeeHandPositionFromMouse(event);

              frisbeeStartPos = vec3(
                frisbeeHandPos[0],
                frisbeeHandPos[1],
                frisbeeHandPos[2]
            );

            /*
                Salvo il punto dove il cane dovrà riportare il frisbee.
                Uso il punto davanti alla camera nel momento del lancio.
            */
            var forward = normalize(subtract(at, eye));

            var returnX = eye[0] + forward[0] * 3.0;
            var returnZ = eye[2] + forward[2] * 3.0;

            returnX = Math.max(-6.0, Math.min(6.0, returnX));
            returnZ = Math.max(-6.0, Math.min(6.0, returnZ));

            frisbeeReturnTarget = {
                x: returnX,
                z: returnZ
            };

            

            frisbeeThrowMode = false;
            frisbeeAttachedToHand = false;
            //updateCanvasCursor();

            showFrisbeeReleaseCursor();

            playWooshFrisbeeSound();

            var buttonFrisbee = document.getElementById("ButtonFrisbee");

            if (buttonFrisbee) {
                buttonFrisbee.classList.remove("active");
                buttonFrisbee.title = "Throw Frisbee";
            }

            startFrisbeeThrowSequence();

            return;
        }

        // 2)call dog mode -> click to call the dog
        if (callDogClickMode) {
            playDogBarkSound();
            callSkinnedDogToCamera();

            // call dog mode -> the hand cursor remains visible
            updateCanvasCursor();

            return;
        }
});

    //REVIEW -  MODIFICA PER TELECAMERA
    canvas.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    });


    canvas.addEventListener("mousedown", function(event) {
        if (callDogClickMode) {
            return;
        }

        /*
            Evita selezioni, menu contestuale e comportamenti strani
            del browser mentre controlli la camera.
        */
        event.preventDefault();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        // if i am in frisbee throw mode
        //and I am holding the frisbee
        // I don't allow the camera to move with mouse drag
        if (isHoldingFrisbeeInHand() && event.button === 0) {
            isDraggingCamera = false;
            isPanningCamera = false;

            return;
        }

        // Tasto sinistro: orbit
        if (event.button === 0) {
            isDraggingCamera = true;
            isPanningCamera = false;
        }

        // Tasto destro: pan
        else if (event.button === 2) {
            isDraggingCamera = false;
            isPanningCamera = true;
        }

        // Altri tasti mouse: ignora
        else {
            isDraggingCamera = false;
            isPanningCamera = false;
            return;
        }

        updateCanvasCursor();
    });


    window.addEventListener("keydown", function (event) {
        /*
            Se sto usando uno slider/input, non intercetto la tastiera.
            Così non disturbo altri controlli.
        */
       
            var code = event.code;

            var tag = event.target && event.target.tagName
                ? event.target.tagName
                : "";


            var isRangeInput =
                tag === "INPUT" &&
                event.target.type === "range";

            var isInputElement =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT";

            var isTeapotKey =
                code === "KeyI" ||
                code === "KeyK" ||
                code === "KeyJ" ||
                code === "KeyL" ||
                code === "KeyQ" ||
                code === "KeyE" ||
                code === "KeyR" ||
                code === "ArrowUp" ||
                code === "ArrowDown" ||
                code === "ArrowLeft" ||
                code === "ArrowRight";


            var isCameraKey =
                code === "KeyW" ||
                code === "KeyA" ||
                code === "KeyS" ||
                code === "KeyD";

            /*
                Se sto usando uno slider/input, normalmente non intercetto la tastiera.
                Però se sono in modalità teapot e premo un tasto della teapot,
                allora lo gestisco comunque.
            */
             if (
                isInputElement &&
                !(isRangeInput && isCameraKey) &&
                !(isRangeInput && isTeapotKeyboardControlActive() && isTeapotKey)
            ) {
                return;
            }

            /*
                Tolgo il focus dallo slider, così le frecce non modificano più
                lo slider ma tornano a controllare la teapot.
            */
            if (
                isRangeInput &&
                (
                    isCameraKey ||
                    (isTeapotKeyboardControlActive() && isTeapotKey)
                )
            ) {
                event.target.blur();
            }
            /*
            1) Teapot keyboard controls
            Attivi solo quando sei in modalità teapot.
            Questi NON usano WASD, quindi non entrano in conflitto
            con la camera.
        */
             if (isTeapotKeyboardControlActive()) {

                if (isTeapotKey) {
                    event.preventDefault();

                    teapotKeyboardKeys[code] = true;

                    /*
                        R funziona come A del joystick:
                        toggle della rotazione automatica.
                    */
                    if (code === "KeyR" && !event.repeat) {
                        flag_rot_teapot = !flag_rot_teapot;
                        updateRotationDemoButtons();

                        console.log(
                            "Keyboard toggle teapot rotation:",
                            flag_rot_teapot
                        );
                    }

                    return;
            }
        }

        /*
            2) Camera keyboard pan
            Ora è attivo anche durante Teapot Chase.
            WASD muove sempre la camera.
        */
        

        if (isCameraKey) {

             if (
                currentScene === "park" &&
                frisbeeThrowMode &&
                frisbeeAttachedToHand &&
                !frisbeeFlying &&
                !frisbeeLanded
            ) {
                //if I am in frisbee throw mode
                // i don't allow the camera to move with WASD
                event.preventDefault();

                cameraKeyboardKeys["KeyW"] = false;
                cameraKeyboardKeys["KeyA"] = false;
                cameraKeyboardKeys["KeyS"] = false;
                cameraKeyboardKeys["KeyD"] = false;

                if (!event.repeat) {
                    showGameMessage(
                        "Throw the frisbee before moving the camera!",
                        2000
                    );
                }

                return;
            }

            event.preventDefault();
            cameraKeyboardKeys[code] = true;
        }
    });



    window.addEventListener("keyup", function (event) {
        teapotKeyboardKeys[event.code] = false;
        cameraKeyboardKeys[event.code] = false;
    });

    window.addEventListener("blur", function () {
        /*
            Safety: se cambio tab mentre tengo premuto un tasto,
            non resta bloccato.
        */
        teapotKeyboardKeys = {};

        isDraggingCamera = false;
        isPanningCamera = false;
        cameraKeyboardKeys = {};
        updateCanvasCursor();
    });

    window.addEventListener("mouseup", function() {
        isDraggingCamera = false;
        isPanningCamera = false;
        updateCanvasCursor();
    });

    window.addEventListener("mousemove", function(event) {
        
         if (callDogClickMode) {
             updateCanvasCursor();
            return;
        }
        if (!isDraggingCamera && !isPanningCamera) {
            return;
        }

        var dx = event.clientX - lastMouseX;
        var dy = event.clientY - lastMouseY;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;


        if (isPanningCamera) {
            panOrbitCamera(dx, dy);
            updateOrbitCameraFromSliders();
            return;
        }

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

        // if you drag up, dy is negative. With the minus, going up increases the height.
        currentHeight -= dy * mouseSensitivityY;

        var minHeight = parseFloat(cameraHeightSlider.min);
        var maxHeight = parseFloat(cameraHeightSlider.max);

        currentHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight));

        cameraHeightSlider.value = currentHeight;

        updateOrbitCameraFromSliders();
    });



    /* canvas.addEventListener("wheel", function(event) {
        event.preventDefault();

        cameraFov += event.deltaY * 0.015;

        // Limiti per evitare crash: FOV troppo piccolo = proiezione instabile
        if (cameraFov < 20.0) {
            cameraFov = 20.0;
        }

        if (cameraFov > 120.0) {
            cameraFov = 120.0;
        }
    }); */

    //REVIEW - MODIFICA PER TELECAMERA - ZOOM CON SLIDER

    canvas.addEventListener("wheel", function(event) {
        event.preventDefault();

        var zoomSpeed = 0.01;

        var currentDistance = parseFloat(cameraDistanceSlider.value);

        if (isNaN(currentDistance)) {
            currentDistance = cameraDistance;
        }

        currentDistance += event.deltaY * zoomSpeed;

        currentDistance = clampValue(
            currentDistance,
            CAMERA_MIN_DISTANCE,
            CAMERA_MAX_DISTANCE
        );

        cameraDistance = currentDistance;
        cameraDistanceSlider.value = currentDistance.toFixed(1);
        cameraDistanceValue.innerHTML = currentDistance.toFixed(1);

        /*
            Se sono in dog focus follow/autoAngle, NON rileggo lo slider
            dell'angolo, perché potrei perdere l'angolo smooth corrente.
        */
        if (
            cameraFocusMode === "dog" &&
            (cameraDogMode === "follow" || cameraDogMode === "autoAngle")
        ) {
            updateOrbitCameraFromCurrentValues();
        } else {
            updateOrbitCameraFromSliders();
        }

    }, { passive: false });

    canvas.addEventListener("mousemove", function(event) {


         // =========================
        // FRISBEE IN HAND MODE
        // =========================
        if (frisbeeThrowMode) {
            updateFrisbeeHandPositionFromMouse(event);

            // while aiming with the frisbee, do not pet the dog
                return;
         }

        // =========================
        // PET DOG MODE
        // =========================

        if (!petDogMode) {
            return;
        }

        var rect = canvas.getBoundingClientRect();

        var mouseXCanvas =
            (event.clientX - rect.left) * canvas.width / rect.width;

        var mouseYCanvas =
            (event.clientY - rect.top) * canvas.height / rect.height;

        // approximately the dog's head position in world space
        var rad = dogCurrentAngle * Math.PI / 180.0;

        var forwardX = Math.sin(rad);
        var forwardZ = Math.cos(rad);

        var headWorldPos = vec3(
            dogFetchX + forwardX * 0.75,
            -0.45,
            dogFetchZ + forwardZ * 0.75
        );

        var headScreenPos = worldToScreen(
            headWorldPos,
            viewMatrix,
            projectionMatrix,
            canvas
        );

        if (!headScreenPos) {
            return;
        }

        var dx = mouseXCanvas - headScreenPos.x;
        var dy = mouseYCanvas - headScreenPos.y;

        var distance = Math.sqrt(dx * dx + dy * dy);

        // radius within which the dog reacts to being petted
        var petRadius = 180.0;

        if (distance > petRadius) {
            dogPetHeadYaw = 0.0;
            dogPetHeadPitch = 0.0;

            dogIsBeingPetted = false;

            /*
                Do not stop the audio here.
                Otherwise, as soon as the hand leaves and re-enters the radius,
                the audio restarts from the beginning.
            */
            return;
        }

        // The hand is close to the head
        dogIsBeingPetted = true;

        if (!dogPetAudioPlayed) {
            dogPetAudioPlayed = true;

            dogBreathSound.currentTime = 0;
            dogBreathSound.loop = false;

            dogBreathSound.play().catch(function(error) {
                console.log("Dog breath error:", error);
            });
        }

        var localMouseX = dx / petRadius;
        var localMouseY = -dy / petRadius;

        dogPetHeadYaw = localMouseX * 30.0;
        dogPetHeadPitch = localMouseY * 12.0;

        showDogHeart = true;
        dogHeartTimer = 0.0;
    });


    canvas.addEventListener("mouseleave", function () {
        dogPetHeadYaw = 0.0;
        dogPetHeadPitch = 0.0;

        dogBreathSound.pause();
        dogBreathSound.currentTime = 0;
    });


    setLoadingProgress(
        94,
        "Almost ready..."
    );

    if (ENABLE_LOADING_SCREEN) {
        var elapsedLoadingTime = performance.now() - loadingStartTime;
        var remainingLoadingTime = Math.max(
            0,
            MIN_LOADING_SCREEN_TIME - elapsedLoadingTime
        );

        setTimeout(function () {
            finishInitialLoading();
        }, remainingLoadingTime);
    } else {
        finishInitialLoading();
    }

    
    updateSceneButtonsVisibility();

    resetBallSettingsPanelState();

    applyStartChoicesAfterLoading();

    render();
};

/////////////////////// MODIFICA ROTAZIONE TELECAMERA ZOOM // !REVIEW

function updateDogCameraModeButton() {
    var buttonDogCameraMode = document.getElementById("ButtonDogCameraMode");

    if (!buttonDogCameraMode) {
        return;
    }

    if (cameraFocusMode !== "dog") {
        buttonDogCameraMode.style.display = "none";
        return;
    }

    buttonDogCameraMode.style.display = "block";

    if (cameraDogMode === "static") {
        buttonDogCameraMode.textContent = "Dog Camera: Static";
        buttonDogCameraMode.title = "Camera stays on the current dog position";
    } else if (cameraDogMode === "follow") {
        buttonDogCameraMode.textContent = "Dog Camera: Follow";
        buttonDogCameraMode.title = "Camera follows the dog without rotating automatically";
    } else if (cameraDogMode === "autoAngle") {
        buttonDogCameraMode.textContent = "Dog Camera: Auto Angle";
        buttonDogCameraMode.title = "Camera follows the dog and rotates automatically";
    }
}

function clampValue(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}

function getCameraBaseTarget() {
    /*
        Target base della camera.
        In free mode guardo cameraTarget.
        In dog focus seguo il cane.
        In curtain focus guardo la tenda.
    */

    if (cameraFocusMode === "dog") {
        if (cameraDogMode === "follow" || cameraDogMode === "autoAngle") {
            return vec3(
                dogFetchX,
                -0.6,
                dogFetchZ
            );
        }

        return cameraDogStaticTarget;
    }

    if (cameraFocusMode === "curtain") {
        return vec3(
            CURTAIN_ORIGIN_X,
            CURTAIN_ORIGIN_Y - CURTAIN_HEIGHT / 2.0,
            CURTAIN_ORIGIN_Z
        );
    }

    if (cameraFocusMode === "teapot") {
        return getTeapotCameraTarget();
    }

    return cameraTarget;
}

function getCurrentCameraTarget() {
    var baseTarget = getCameraBaseTarget();

    return vec3(
        baseTarget[0] + cameraPanOffset[0],
        baseTarget[1] + cameraPanOffset[1],
        baseTarget[2] + cameraPanOffset[2]
    );
}

function updateOrbitCameraFromCurrentValues() {
    /*
        Aggiorna eye/at usando i valori già presenti:
        cameraAngle, cameraHeight, cameraDistance.

        Questa funzione NON rilegge gli slider.
        Serve per follow dog / auto angle, così la camera resta smooth.
    */

    if (isNaN(cameraAngle)) {
        cameraAngle = 35.0;
    }

    if (isNaN(cameraHeight)) {
        cameraHeight = 4.0;
    }

    if (isNaN(cameraDistance)) {
        cameraDistance = 10.0;
    }

    cameraDistance = clampValue(
        cameraDistance,
        CAMERA_MIN_DISTANCE,
        CAMERA_MAX_DISTANCE
    );

    var target = getCurrentCameraTarget();

    var rad = radians(cameraAngle);

    eye = vec3(
        target[0] + cameraDistance * Math.sin(rad),
        target[1] + cameraHeight,
        target[2] + cameraDistance * Math.cos(rad)
    );

    at = target;
    up = vec3(0.0, 1.0, 0.0);

    cameraAngleValue.innerHTML = cameraAngle.toFixed(1) + "°";
    cameraHeightValue.innerHTML = cameraHeight.toFixed(1);
    cameraDistanceValue.innerHTML = cameraDistance.toFixed(1);
}
function updateOrbitCameraFromSliders() {
    cameraAngle = parseFloat(cameraAngleSlider.value);
    cameraHeight = parseFloat(cameraHeightSlider.value);
    cameraDistance = parseFloat(cameraDistanceSlider.value);

    updateOrbitCameraFromCurrentValues();
}

function updateOrbitCameraFromSliders_old() {
    cameraAngle = parseFloat(cameraAngleSlider.value);
    cameraHeight = parseFloat(cameraHeightSlider.value);
    cameraDistance = parseFloat(cameraDistanceSlider.value);

    if (isNaN(cameraAngle)) {
        cameraAngle = 35.0;
    }

    if (isNaN(cameraHeight)) {
        cameraHeight = 4.0;
    }

    if (isNaN(cameraDistance)) {
        cameraDistance = 10.0;
    }

    cameraDistance = clampValue(
        cameraDistance,
        CAMERA_MIN_DISTANCE,
        CAMERA_MAX_DISTANCE
    );

    var target = getCurrentCameraTarget();
    var rad = radians(cameraAngle);

    eye = vec3(
        target[0] + cameraDistance * Math.sin(rad),
        target[1] + cameraHeight,
        target[2] + cameraDistance * Math.cos(rad)
    );

    at = target;
    up = vec3(0.0, 1.0, 0.0);

    cameraAngleSlider.value = cameraAngle.toFixed(0);
    cameraHeightSlider.value = cameraHeight.toFixed(1);
    cameraDistanceSlider.value = cameraDistance.toFixed(1);

    cameraAngleValue.innerHTML = cameraAngle.toFixed(0) + "°";
    cameraHeightValue.innerHTML = cameraHeight.toFixed(1);
    cameraDistanceValue.innerHTML = cameraDistance.toFixed(1);
}

function updateCameraKeyboardPan(deltaTime) {
    if (!cameraKeyboardKeys) return;

     if (
        currentScene === "park" &&
        frisbeeThrowMode &&
        frisbeeAttachedToHand &&
        !frisbeeFlying &&
        !frisbeeLanded
    ) {
        //if i am in frisbee throw mode, i don't allow the camera to move with WASD
        cameraKeyboardKeys["KeyW"] = false;
        cameraKeyboardKeys["KeyA"] = false;
        cameraKeyboardKeys["KeyS"] = false;
        cameraKeyboardKeys["KeyD"] = false;
        return;
    }

    var dt =
        typeof deltaTime === "number" && isFinite(deltaTime)
            ? deltaTime
            : 1.0 / 60.0;

    dt = Math.min(dt, 0.05);

    var moveForward = 0.0;
    var moveRight = 0.0;

    if (cameraKeyboardKeys["KeyW"]) moveForward -= 1.0;
    if (cameraKeyboardKeys["KeyS"]) moveForward += 1.0;
    if (cameraKeyboardKeys["KeyD"]) moveRight += 1.0;
    if (cameraKeyboardKeys["KeyA"]) moveRight -= 1.0;

    if (moveForward === 0.0 && moveRight === 0.0) {
        return;
    }

    var len = Math.sqrt(
        moveForward * moveForward +
        moveRight * moveRight
    );

    moveForward /= len;
    moveRight /= len;

    var rad = radians(cameraAngle);

    var rightX = Math.cos(rad);
    var rightZ = -Math.sin(rad);

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    /*
        Velocità proporzionale allo zoom:
        se sei lontana, il pan è un po' più veloce.
    */
    var speed = Math.max(1.8, cameraDistance * 0.65) * dt;

    cameraPanOffset[0] += rightX * moveRight * speed;
    cameraPanOffset[2] += rightZ * moveRight * speed;

    cameraPanOffset[0] += forwardX * moveForward * speed;
    cameraPanOffset[2] += forwardZ * moveForward * speed;

    updateOrbitCameraFromSliders();
}


function panOrbitCamera(dx, dy) {
    /*
        Pan = sposto il target della camera.
        Non cambio zoom, non cambio rotazione.
    */

    var rad = radians(cameraAngle);

    /*
        right = direzione laterale rispetto alla camera
        forward = direzione avanti/indietro sul piano XZ
    */
    var rightX = Math.cos(rad);
    var rightZ = -Math.sin(rad);

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    var panSpeed = Math.max(
        0.006,
        cameraDistance * mouseSensitivityPan
    );

    cameraPanOffset[0] -= rightX * dx * panSpeed;
    cameraPanOffset[2] -= rightZ * dx * panSpeed;

    cameraPanOffset[0] += forwardX * dy * panSpeed;
    cameraPanOffset[2] += forwardZ * dy * panSpeed;
}

///////////////////////////////////////////////////////
function updateOrbitCameraFromSliders_old() {
        cameraAngle = parseFloat(cameraAngleSlider.value);
        cameraHeight = parseFloat(cameraHeightSlider.value);
        cameraDistance = parseFloat(cameraDistanceSlider.value);

        var rad = radians(cameraAngle);

        /* eye = vec3(
            cameraDistance * Math.sin(rad),
            cameraHeight,
            cameraDistance * Math.cos(rad)
        ); */
        eye = vec3(
            cameraTarget[0] + cameraDistance * Math.sin(rad),
            cameraTarget[1] + cameraHeight,
            cameraTarget[2] + cameraDistance * Math.cos(rad)
        );

        at = cameraTarget;
        up = vec3(0.0, 1.0, 0.0);

        cameraAngleValue.innerHTML = cameraAngle.toFixed(0) + "°";
        cameraHeightValue.innerHTML = cameraHeight.toFixed(1);
        cameraDistanceValue.innerHTML = cameraDistance.toFixed(1);
    }




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

function updateTeapotKeyboardControls(deltaTime) {
    if (!isTeapotKeyboardControlActive()) {
        return;
    }

    var dt =
        typeof deltaTime === "number" && isFinite(deltaTime)
            ? deltaTime
            : 1.0 / 60.0;

    /*
        Evito salti enormi se il browser lagga per un frame.
    */
    dt = Math.min(dt, 0.05);

    /*
        Valori equivalenti circa al joystick:
        - movement joystick: 0.06 per frame * 60 = 3.6 unità/sec
        - rotation joystick: 2.0 per frame * 60 = 120 gradi/sec
        - height joystick: 0.045 per frame * 60 = 2.7 unità/sec
    */
    var moveSpeed = 3.6 * dt;
    var rotateSpeed = 120.0 * dt;
    var heightSpeed = 2.7 * dt;

    /*
        Frecce: rotazione teapot.
    */
    if (teapotKeyboardKeys["ArrowLeft"]) {
        theta[1] -= rotateSpeed;
    }

    if (teapotKeyboardKeys["ArrowRight"]) {
        theta[1] += rotateSpeed;
    }

    if (teapotKeyboardKeys["ArrowUp"]) {
        theta[0] -= rotateSpeed;
    }

    if (teapotKeyboardKeys["ArrowDown"]) {
        theta[0] += rotateSpeed;
    }

    /*
        Movimento rispetto alla camera, come nel joystick.
    */
    var forwardX = at[0] - eye[0];
    var forwardZ = at[2] - eye[2];

    var forwardLen = Math.sqrt(
        forwardX * forwardX +
        forwardZ * forwardZ
    );

    if (forwardLen < 0.001) {
        forwardX = 0.0;
        forwardZ = -1.0;
        forwardLen = 1.0;
    }

    forwardX /= forwardLen;
    forwardZ /= forwardLen;

    var rightX = -forwardZ;
    var rightZ = forwardX;

    /*
        I / K / J / L:
        I avanti
        K indietro
        J sinistra
        L destra
    */
    var moveForward = 0.0;
    var moveRight = 0.0;

    if (teapotKeyboardKeys["KeyI"]) {
        moveForward += 1.0;
    }

    if (teapotKeyboardKeys["KeyK"]) {
        moveForward -= 1.0;
    }

    if (teapotKeyboardKeys["KeyL"]) {
        moveRight += 1.0;
    }

    if (teapotKeyboardKeys["KeyJ"]) {
        moveRight -= 1.0;
    }

    /*
        Normalizzo la diagonale.
        Così I+L non va più veloce di I da solo.
    */
    var moveLen = Math.sqrt(
        moveForward * moveForward +
        moveRight * moveRight
    );

    if (moveLen > 0.001) {
        moveForward /= moveLen;
        moveRight /= moveLen;

        objPos[0] += moveRight * moveSpeed * rightX;
        objPos[2] += moveRight * moveSpeed * rightZ;

        objPos[0] += moveForward * moveSpeed * forwardX;
        objPos[2] += moveForward * moveSpeed * forwardZ;
    }

    /*
        Q / E: altezza.
    */
    if (teapotKeyboardKeys["KeyE"]) {
        objPos[1] += heightSpeed;
    }

    if (teapotKeyboardKeys["KeyQ"]) {
        objPos[1] -= heightSpeed;
    }

    /*
        Stessi limiti del gamepad.
    */
    if (dogFollowTeapotMode) {
        var minTeapotY =
            typeof TEAPOT_CHASE_MIN_Y !== "undefined"
                ? TEAPOT_CHASE_MIN_Y
                : -0.7;

        var maxTeapotY =
            typeof TEAPOT_CHASE_MAX_Y !== "undefined"
                ? TEAPOT_CHASE_MAX_Y
                : 1.8;

        objPos[1] = clampValue(
            objPos[1],
            minTeapotY,
            maxTeapotY
        );
    }

    objPos[0] = clampValue(objPos[0], -6.2, 6.2);
    objPos[2] = clampValue(objPos[2], -4.6, 7.4);
}


function readGamepad() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    var gp = null;

    for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                gp = gamepads[i];
                break;
            }
        }

    if (!gp) {
            return;
        }

    //console.log("GAMEPAD OK", gp.index, gp.id, gp.axes);

    /*
        La teapot viene controllata col gamepad solo quando:
        - è attivo Teapot Chase
        - oppure è attivo Focus Teapot
    */
    var teapotGamepadActive =
        dogFollowTeapotMode ||
        teapotFocus;
    //console.log("teapotGamepadActive:", teapotGamepadActive, "dogFollowTeapotMode:", dogFollowTeapotMode, "teapotFocus:", teapotFocus);

    if (!teapotGamepadActive) {
        lastButtonA = gp.buttons[0].pressed;
        return;
    }

    // -----------------------------
    // 1) Tasto A -> toggle rotazione automatica
    // -----------------------------
    var pressedA = gp.buttons[0].pressed;

    if (pressedA && !lastButtonA) {
        flag_rot_teapot = !flag_rot_teapot;
        updateRotationDemoButtons();

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

    theta[1] += lx * 2.0;   // rotazione Y
    theta[0] += ly * 2.0;   // rotazione X

    // -----------------------------
    // 3) Direzioni sul piano X/Z rispetto alla camera attuale
    // -----------------------------
    var forwardX = at[0] - eye[0];
    var forwardZ = at[2] - eye[2];

    var forwardLen = Math.sqrt(
        forwardX * forwardX +
        forwardZ * forwardZ
    );

    if (forwardLen < 0.001) {
        forwardX = 0.0;
        forwardZ = -1.0;
        forwardLen = 1.0;
    }

    forwardX /= forwardLen;
    forwardZ /= forwardLen;

    var rightX = -forwardZ;
    var rightZ = forwardX;

    // -----------------------------
    // 4) Stick destro -> movimento orizzontale teapot
    // -----------------------------
    var rx = gp.axes[2];
    var ry = gp.axes[3];

    if (Math.abs(rx) < 0.15) rx = 0.0;
    if (Math.abs(ry) < 0.15) ry = 0.0;

    var moveSpeed = 0.06;

    objPos[0] += rx * moveSpeed * rightX;
    objPos[2] += rx * moveSpeed * rightZ;

    objPos[0] += -ry * moveSpeed * forwardX;
    objPos[2] += -ry * moveSpeed * forwardZ;

    // -----------------------------
    // 5) LT / RT -> altezza teapot
    // -----------------------------
    var zOut = gp.buttons[6].value; // LT
    var zIn  = gp.buttons[7].value; // RT

    objPos[1] += (zIn - zOut) * 0.045;

    if (dogFollowTeapotMode) {
        var minTeapotY =
            typeof TEAPOT_CHASE_MIN_Y !== "undefined"
                ? TEAPOT_CHASE_MIN_Y
                : -0.7;

        var maxTeapotY =
            typeof TEAPOT_CHASE_MAX_Y !== "undefined"
                ? TEAPOT_CHASE_MAX_Y
                : 1.8;

        objPos[1] = clampValue(
            objPos[1],
            minTeapotY,
            maxTeapotY
        );
    }

    // Limiti stanza, così non scappa troppo fuori
    objPos[0] = clampValue(objPos[0], -6.2, 6.2);
    objPos[2] = clampValue(objPos[2], -4.6, 7.4);
}

function isTeapotKeyboardControlActive() {
    return dogFollowTeapotMode || teapotFocus;
}


function render() {
    resizeCanvasToDisplaySize();

    var now = performance.now();
    var deltaTime = (now - lastRenderTime) / 1000.0;
    lastRenderTime = now;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateFPSCounter();
    checkDogModelHealth(deltaTime);


    updateAutoSun(deltaTime);

    
    //controllo se è stato premuto il tasto A del gamepad per attivare/disattivare la rotazione
    readGamepad();
    updateTeapotKeyboardControls(deltaTime);
    clampTeapotToTable();

    updateCameraKeyboardPan(deltaTime);

    checkBallOutsideHome();

   if (cameraFocusMode === "dog") {
        if (cameraDogMode === "autoAngle") {
            updateDogFocusAutoAngle();
        }

        if (cameraDogMode === "follow" || cameraDogMode === "autoAngle") {
            //updateOrbitCameraFromSliders();
            updateOrbitCameraFromCurrentValues();
        }
    }

    if (cameraFocusMode === "teapot") {
        updateOrbitCameraFromCurrentValues();
    }
   

    viewMatrix = lookAt(eye, at, up);
    aspect = canvas.width / canvas.height;
    projectionMatrix = perspective(cameraFov, aspect, 0.1,50.0)

    // to avooid warnings whan switching directly to the park mode
    ensureLightMatricesExist();

    updateWallLampMatrices();

    if (
        currentScene === "home" &&
        isNight &&
        wallLampEnabled &&
        wallLampShadowEnabled
    ) {
        
        renderWallLampShadowMap();
    }



    if (currentScene === "home") {
        drawHomeScene(gl,viewMatrix, projectionMatrix);

    } else if (currentScene === "park") {
        drawParkScene(gl,viewMatrix, projectionMatrix,deltaTime);
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
    wallShadowMode=false,
    isSunHalo = false,
    globalAlpha = 1.0,
    isWallLampModel = false,
    isBowlMaterial = false
    ) {

    //to differentiate between day and night lighting
    var lightIntensity;
    var ambientStrength;
    var lightTint;


    gl.useProgram(program);   

    if (isNight) {
        if (currentScene === "park") {
            lightIntensity = lightIntensity_parkNight;
            ambientStrength = ambientStrength_parkNight;
            lightTint = lightTint_parkNight;
        } else {
            lightIntensity = lightIntensity_night;
            ambientStrength = ambientStrength_night;
            lightTint = lightTint_night; // blu lunare
        }
        
    } else {
        lightIntensity = lightIntensity_sun;
        ambientStrength = ambientStrength_sun;
        lightTint = lightTint_sun; // caldo sole
    }

    gl.uniform1f(
        gl.getUniformLocation(program, "uLightIntensity"),
        lightIntensity
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "uAmbientStrength"),
        ambientStrength
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "uLightTint"),
        flatten(lightTint)
    );

    var wallLampActive =
    isNight &&
    wallLampEnabled &&
    currentScene === "home";

    // part for wall lamp spotlight
    var wallLampDirection = normalize(
        subtract(wallLampTarget, wallLampPosition)
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "wallLampEnabled"),
        wallLampActive ? 1 : 0
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "wallLampPosition"),
        flatten(wallLampPosition)
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "wallLampDirection"),
        flatten(wallLampDirection)
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "wallLampColor"),
        flatten(wallLampColor)
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "wallLampIntensity"),
        wallLampIntensity
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "wallLampRange"),
        wallLampRange
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "wallLampCutoff"),
        wallLampCutoff
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "wallLampOuterCutoff"),
        wallLampOuterCutoff
    );

   
    // trying to display shadows
    var wallLampShadowActive =
        wallLampActive &&
        wallLampShadowEnabled &&
        wallLampShadowTexture !== null &&
        wallLampViewMatrix !== null &&
        wallLampProjectionMatrix !== null;


    if (!window.debugWallLampShadowUniformLogged) {
        console.log("wallLampActive =", wallLampActive);
        console.log("wallLampShadowActive =", wallLampShadowActive);
        console.log("wallLampShadowTexture =", wallLampShadowTexture);
        console.log("wallLampViewMatrix =", wallLampViewMatrix);
        console.log("wallLampProjectionMatrix =", wallLampProjectionMatrix);
        console.log(
            "MAX_TEXTURE_IMAGE_UNITS =",
            gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
        );

        window.debugWallLampShadowUniformLogged = true;
    }

    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, wallLampShadowTexture);

    gl.uniform1i(
        gl.getUniformLocation(program, "wallLampShadowMap"),
        8
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "wallLampViewMatrix"),
        false,
        flatten(wallLampViewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "wallLampProjectionMatrix"),
        false,
        flatten(wallLampProjectionMatrix)
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "useWallLampShadow"),
        wallLampShadowActive ? 1 : 0
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "wallLampShadowBias"),
        wallLampShadowBias
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "isWallLampModel"),
        isWallLampModel ? 1 : 0
    );

    ///////



    //  be sure to use the right shader program before setting uniforms and attributes
    

    if (wallShadowMode === undefined) {
        wallShadowMode = 0;
    }

    gl.uniform1i(
        gl.getUniformLocation(program, "isMoon"),
        isNight && isLightMarker ? 1 : 0
    );


    //for sun halo
    gl.uniform1i(
            gl.getUniformLocation(program, "isSunHalo"),
                isSunHalo ? 1 : 0
    );
    gl.uniform1f(
        gl.getUniformLocation(program, "uGlobalAlpha"),
        globalAlpha
    );

    gl.uniform1f(
        gl.getUniformLocation(program, "shadowMapSize"),
        POINT_SHADOW_SIZE
    );


    // bowl part 
    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, bowlNormalTexture);
    gl.uniform1i(
        gl.getUniformLocation(program, "bowlNormalMap"),
        9
    );

    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, bowlRoughnessTexture);
    gl.uniform1i(
        gl.getUniformLocation(program, "bowlRoughnessMap"),
        10
    );

    gl.uniform1i(
        gl.getUniformLocation(program, "isBowlMaterial"),
        isBowlMaterial ? 1 : 0
    );

    gl.uniform3fv(
        gl.getUniformLocation(program, "cameraWorldPosition"),
        flatten(eye)
    );

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

    //for night
    gl.uniform1i(
        gl.getUniformLocation(program, "isNightMode"),
        isNight ? 1 : 0
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



function clampTeapotToTable() {
    //if teapot goes under the table we set it back to the table height
    // altezza del tavolo + metà dell'altezza della teapot
    var minY = -2.0+0.6; 

    if (objPos[1] < minY) {
        objPos[1] = minY;
    }
}

function setCameraFocusButtonActive(activeButtonId) {
    var focusButtons = [
        "ButtonFocusDog",
        "ButtonFocusCurtain",
        "ButtonTeapotFocus"
    ];

    for (var i = 0; i < focusButtons.length; i++) {
        var button = document.getElementById(focusButtons[i]);

        if (!button) {
            continue;
        }

        if (focusButtons[i] === activeButtonId) {
            button.classList.add("camera-focus-active");
        } else {
            button.classList.remove("camera-focus-active");
        }
    }
}


function resetCameraView() {

    cameraFocusMode = "free";
    teapotFocus = false;

    var buttonTeapotFocus = document.getElementById("ButtonTeapotFocus");

    if (buttonTeapotFocus) {
        buttonTeapotFocus.textContent = "Focus Teapot";
    }
    cameraDogAutoAngle = false;
    updateDogCameraModeButton();

    cameraPanOffset = vec3(0.0, 0.0, 0.0);

    cameraTarget = vec3(0.0, 0.5, 0.0);

    cameraAngle = 35.0;
    cameraHeight = 4.0;
    cameraDistance = 10.0;
    cameraFov = 58.0;

    if (cameraAngleSlider) cameraAngleSlider.value = cameraAngle;
    if (cameraHeightSlider) cameraHeightSlider.value = cameraHeight;
    if (cameraDistanceSlider) cameraDistanceSlider.value = cameraDistance;

    updateOrbitCameraFromSliders();
    setCameraFocusButtonActive(null);
    showGameMessage("Camera reset.", 1400);
}


function focusCurtainCamera() {
    // central point of the curtain in world space

    cameraFocusMode = "curtain";
    cameraDogAutoAngle = false;
    updateDogCameraModeButton();
    cameraPanOffset = vec3(0.0, 0.0, 0.0);


    cameraTarget = vec3(
        CURTAIN_ORIGIN_X,
        CURTAIN_ORIGIN_Y - CURTAIN_HEIGHT / 2.0,
        CURTAIN_ORIGIN_Z
    );

    cameraAngle = -90.0;
    cameraHeight = 0.8;
    cameraDistance = 4.0;
    cameraFov = 45.0;

    // sliders update
    if (cameraAngleSlider) cameraAngleSlider.value = cameraAngle;
    if (cameraHeightSlider) cameraHeightSlider.value = cameraHeight;
    if (cameraDistanceSlider) cameraDistanceSlider.value = cameraDistance;

    updateOrbitCameraFromSliders();
    setCameraFocusButtonActive("ButtonFocusCurtain");
    showGameMessage(
        "Curtain focus active!\nClick Reset Camera to exit focus mode.",
        2600
    );
}

///////////////
function normalizeAngleDegrees(angle) {
    angle = angle % 360.0;

    if (angle < 0.0) {
        angle += 360.0;
    }

    return angle;
}

function lerpAngleDegrees(currentAngle, targetAngle, amount) {

    // I try to interpolate the angles in order to avoid the long path
    // ex instead of 350° to 10° I want to go through 0° and not through 180°

    var diff = ((targetAngle - currentAngle + 540.0) % 360.0) - 180.0;

    return normalizeAngleDegrees(currentAngle + diff * amount);
}
//////////////////////////////////////
function getTeapotCameraTarget() {
    return vec3(
        objPos[0],
        objPos[1] + 0.35,
        objPos[2]
    );
}

function focusTeapotCamera() {
    if (currentScene !== "home") {
        showGameMessage(
            "Teapot focus is available only at home!",
            2200
        );
        return;
    }

    teapotFocus = true;

    cameraFocusMode = "teapot";
    cameraDogAutoAngle = false;
    cameraDogMode = "static";

    updateDogCameraModeButton();

    cameraPanOffset = vec3(0.0, 0.0, 0.0);

    cameraTarget = getTeapotCameraTarget();

    cameraAngle = 35.0;
    cameraHeight = 1.0;
    cameraDistance = 3.2;
    cameraFov = 50.0;

    if (cameraAngleSlider) {
        cameraAngleSlider.value = cameraAngle;
    }

    if (cameraHeightSlider) {
        cameraHeightSlider.value = cameraHeight;
    }

    if (cameraDistanceSlider) {
        cameraDistanceSlider.value = cameraDistance;
    }

    updateOrbitCameraFromSliders();

    setCameraFocusButtonActive("ButtonTeapotFocus");

    var buttonTeapotFocus = document.getElementById("ButtonTeapotFocus");

    if (buttonTeapotFocus) {
        buttonTeapotFocus.textContent = "Focus Teapot";
    }

    showGameMessage(
        "Teapot focus active!\nClick Reset Camera to exit focus mode.",
        2600
    );
}

////////////////////////////

function getDogSafeCameraAngle() {
    /*
        In home voglio guardare il cane dal lato del centro stanza.
        Quindi calcolo la direzione dal cane verso il centro.
    */

    var roomCenterX = 0.0;
    var roomCenterZ = 0.0;

    var dirX = roomCenterX - dogFetchX;
    var dirZ = roomCenterZ - dogFetchZ;

    var length = Math.sqrt(dirX * dirX + dirZ * dirZ);

    if (length < 0.001) {
        return cameraAngle;
    }

    dirX /= length;
    dirZ /= length;

    var angleRad = Math.atan2(dirX, dirZ);
    var angleDeg = angleRad * 180.0 / Math.PI;

    return normalizeAngleDegrees(angleDeg);
}

function updateDogFocusAutoAngle() {
    if (cameraFocusMode !== "dog") {
        return;
    }

    if (!cameraDogAutoAngle) {
        return;
    }

    if (currentScene !== "home") {
        return;
    }

    var desiredAngle = getDogSafeCameraAngle();

    cameraAngle = lerpAngleDegrees(
        cameraAngle,
        desiredAngle,
        0.05
    );
}

///////////////
function getDogFrontCameraAngle() {
    /*
        La direzione forward del cane è:
        forwardX = sin(angle)
        forwardZ = cos(angle)

        Per mettere la camera davanti al cane, uso lo stesso angolo
        del cane. Così la camera guarda il muso, non il tavolo.
    */

    return normalizeAngleDegrees(dogCurrentAngle);
}

function getDogHeadCameraTarget() {
    /*
        Target un po' davanti al corpo, verso la testa.
        Così la camera centra il muso/cane, non il centro stanza.
    */

    var rad = dogCurrentAngle * Math.PI / 180.0;

    var forwardX = Math.sin(rad);
    var forwardZ = Math.cos(rad);

    return vec3(
        dogFetchX + forwardX * 0.65,
        -0.45,
        dogFetchZ + forwardZ * 0.65
    );
}

///////////////////////
function focusDogCamera() {
    /*
        Focus Dog iniziale = STATIC.
        La camera centra il cane nel punto attuale
        e lo guarda da davanti.
        
        Se poi voglio seguirlo o auto-ruotare, uso il bottone
        Dog Camera Mode.
    */

    // Spengo eventuale focus teapot
    teapotFocus = false;

    var teapotButton = document.getElementById("ButtonTeapotFocus");
    if (teapotButton) {
        teapotButton.textContent = "Focus Teapot";
    }

    cameraFocusMode = "dog";
    cameraDogMode = "static";
    cameraDogAutoAngle = false;

    cameraPanOffset = vec3(0.0, 0.0, 0.0);

    /*
        Target sul cane, leggermente verso la testa.
        Non uso il centro stanza.
    */
    cameraDogStaticTarget = getDogHeadCameraTarget();
    cameraTarget = cameraDogStaticTarget;

    if (currentScene === "home") {
        /*
            static view, seen from the front
            no auto- angle here 
        */
        cameraAngle = getDogFrontCameraAngle();
        cameraHeight = 0.75;
        cameraDistance = 2.8;
        cameraFov = 55.0;
    } else {
        cameraAngle = getDogFrontCameraAngle();
        cameraHeight = 1.2;
        cameraDistance = 4.0;
        cameraFov = 55.0;
    }

    if (cameraAngleSlider) {
        cameraAngleSlider.value = cameraAngle;
    }

    if (cameraHeightSlider) {
        cameraHeightSlider.value = cameraHeight;
    }

    if (cameraDistanceSlider) {
        cameraDistanceSlider.value = cameraDistance;
    }

    updateOrbitCameraFromSliders();

    setCameraFocusButtonActive("ButtonFocusDog");
    updateDogCameraModeButton();

    showGameMessage(
        "Dog focus active!\nClick Reset Camera to exit focus mode.",
        2600
    );
}

////////////////////////

function drawBenchMaterial(benchObj, modelMatrix, viewMatrix, projectionMatrix) {
    if (!tableMaterialProgram) {
        drawObject(
            benchObj,
            benchTexture,
            modelMatrix,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            true
        );
        return;
    }

    gl.useProgram(tableMaterialProgram);

    gl.uniform1i(tableMaterialUniforms.receiveShadow, true);
    gl.uniform1i(
        tableMaterialUniforms.usePointShadowMap,
        usePointShadowMap ? 1 : 0
    );

    gl.uniform1i(tableMaterialUniforms.useNormalMap, 1);
    gl.uniform1i(tableMaterialUniforms.usePBRMaps, 1);

    var modelNMat = normalMatrix(modelMatrix, true);

    gl.uniformMatrix4fv(
        tableMaterialUniforms.modelMatrix,
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        tableMaterialUniforms.viewMatrix,
        false,
        flatten(viewMatrix)
    );

    gl.uniformMatrix4fv(
        tableMaterialUniforms.projectionMatrix,
        false,
        flatten(projectionMatrix)
    );

    gl.uniformMatrix3fv(
        tableMaterialUniforms.modelNormalMatrix,
        false,
        flatten(modelNMat)
    );

    gl.uniform4fv(
        tableMaterialUniforms.lightPosition,
        flatten(lightPosition)
    );

    // Texture 0: Base Color
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(
        gl.TEXTURE_2D,
        benchBaseColorTexture || benchTexture
    );
    gl.uniform1i(tableMaterialUniforms.diffuseMap, 0);

    // Texture 1: Normal map
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(
        gl.TEXTURE_2D,
        benchNormalTexture || benchTexture
    );
    gl.uniform1i(tableMaterialUniforms.normalMap, 1);

    // Texture 2: Roughness map
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(
        gl.TEXTURE_2D,
        benchRoughnessTexture || benchTexture
    );
    gl.uniform1i(tableMaterialUniforms.roughnessMap, 2);

    // Texture 3: Metallic map
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(
        gl.TEXTURE_2D,
        benchMetallicTexture || benchTexture
    );
    gl.uniform1i(tableMaterialUniforms.metallicMap, 3);

    if (usePointShadowMap) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[0]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap0, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[1]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap1, 5);

        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[2]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap2, 6);

        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[3]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap3, 7);

        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[4]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap4, 8);

        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[5]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap5, 9);

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix0,
            false,
            flatten(pointLightViewMatrices[0])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix1,
            false,
            flatten(pointLightViewMatrices[1])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix2,
            false,
            flatten(pointLightViewMatrices[2])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix3,
            false,
            flatten(pointLightViewMatrices[3])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix4,
            false,
            flatten(pointLightViewMatrices[4])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightViewMatrix5,
            false,
            flatten(pointLightViewMatrices[5])
        );

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightProjectionMatrix,
            false,
            flatten(pointLightProjectionMatrix)
        );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, benchObj.vBuffer);
    gl.vertexAttribPointer(
        tableMaterialAttribs.vPosition,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(tableMaterialAttribs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, benchObj.nBuffer);
    gl.vertexAttribPointer(
        tableMaterialAttribs.vNormal,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(tableMaterialAttribs.vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, benchObj.tBuffer);
    gl.vertexAttribPointer(
        tableMaterialAttribs.vTexCoord,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(tableMaterialAttribs.vTexCoord);

    gl.drawArrays(gl.TRIANGLES, 0, benchObj.numVertices);

    gl.useProgram(program);
}

////////////////////////////


function drawTableMaterial(tableObj, modelMatrix, viewMatrix, projectionMatrix) {
    if (!tableMaterialProgram) return;

    gl.useProgram(tableMaterialProgram);

    gl.uniform1i(tableMaterialUniforms.receiveShadow, true);
    gl.uniform1i(tableMaterialUniforms.usePointShadowMap, usePointShadowMap ? 1 : 0);

    // I need that for the bench so I deactivate it
    gl.uniform1i(tableMaterialUniforms.useNormalMap, 0);
    gl.uniform1i(tableMaterialUniforms.usePBRMaps, 0);

    var modelNMat = normalMatrix(modelMatrix, true);

    gl.uniformMatrix4fv(tableMaterialUniforms.modelMatrix, false, flatten(modelMatrix));
    gl.uniformMatrix4fv(tableMaterialUniforms.viewMatrix, false, flatten(viewMatrix));
    gl.uniformMatrix4fv(tableMaterialUniforms.projectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(tableMaterialUniforms.modelNormalMatrix, false, flatten(modelNMat));
    gl.uniform4fv(tableMaterialUniforms.lightPosition, flatten(lightPosition));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tableColorTexture);
    gl.uniform1i(tableMaterialUniforms.diffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tableSpecularTexture);
    gl.uniform1i(tableMaterialUniforms.specularMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tableAOTexture);
    gl.uniform1i(tableMaterialUniforms.aoMap, 2);

    // SHADOW MAPS BEFORE DRAW
    if (usePointShadowMap) {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[0]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap0, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[1]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap1, 5);

        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[2]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap2, 6);

        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[3]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap3, 7);

        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[4]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap4, 8);

        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[5]);
        gl.uniform1i(tableMaterialUniforms.pointShadowMap5, 9);

        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix0, false, flatten(pointLightViewMatrices[0]));
        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix1, false, flatten(pointLightViewMatrices[1]));
        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix2, false, flatten(pointLightViewMatrices[2]));
        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix3, false, flatten(pointLightViewMatrices[3]));
        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix4, false, flatten(pointLightViewMatrices[4]));
        gl.uniformMatrix4fv(tableMaterialUniforms.pointLightViewMatrix5, false, flatten(pointLightViewMatrices[5]));

        gl.uniformMatrix4fv(
            tableMaterialUniforms.pointLightProjectionMatrix,
            false,
            flatten(pointLightProjectionMatrix)
        );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, tableObj.vBuffer);
    gl.vertexAttribPointer(tableMaterialAttribs.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(tableMaterialAttribs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, tableObj.nBuffer);
    gl.vertexAttribPointer(tableMaterialAttribs.vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(tableMaterialAttribs.vNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, tableObj.tBuffer);
    gl.vertexAttribPointer(tableMaterialAttribs.vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(tableMaterialAttribs.vTexCoord);

    // DRAW at the end
    gl.drawArrays(gl.TRIANGLES, 0, tableObj.numVertices);
}



function getBillboardHaloMatrix(scale, viewMatrix) {
    var haloMatrix = mat4();

    // direction of the sun relative to the camera
    var dx = eye[0] - lightPosition[0];
    var dy = eye[1] - lightPosition[1];
    var dz = eye[2] - lightPosition[2];

    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.0001) len = 1.0;

    dx /= len;
    dy /= len;
    dz /= len;

    // small offset towards the camera
    var haloOffset = 0.05;   

    var haloX = lightPosition[0] + dx * haloOffset;
    var haloY = lightPosition[1] + dy * haloOffset;
    var haloZ = lightPosition[2] + dz * haloOffset;

    haloMatrix = mult(
        haloMatrix,
        translate(haloX, haloY, haloZ)
    );

    // billboard towards camera
    haloMatrix[0][0] = viewMatrix[0][0];
    haloMatrix[0][1] = viewMatrix[1][0];
    haloMatrix[0][2] = viewMatrix[2][0];

    haloMatrix[1][0] = viewMatrix[0][1];
    haloMatrix[1][1] = viewMatrix[1][1];
    haloMatrix[1][2] = viewMatrix[2][1];

    haloMatrix[2][0] = viewMatrix[0][2];
    haloMatrix[2][1] = viewMatrix[1][2];
    haloMatrix[2][2] = viewMatrix[2][2];

    // more rounded
    haloMatrix = mult(
        haloMatrix,
        scalem(scale, scale, 1.0)
    );

    return haloMatrix;
}

function drawSunHalo(
    haloBuffers,
    haloTexture,
    viewMatrix,
    projectionMatrix,
    width,
    height,
    alpha
) {
    gl.useProgram(haloProgram);

    // quad position
    gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffers.vBuffer);

    var positionLoc =
        gl.getAttribLocation(haloProgram, "vPosition");

    gl.vertexAttribPointer(
        positionLoc,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(positionLoc);

    // Coordinate texture
    gl.bindBuffer(gl.ARRAY_BUFFER, haloBuffers.tBuffer);

    var texCoordLoc =
        gl.getAttribLocation(haloProgram, "vTexCoord");

    gl.vertexAttribPointer(
        texCoordLoc,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.enableVertexAttribArray(texCoordLoc);

    // matrices
    gl.uniformMatrix4fv(
        gl.getUniformLocation(haloProgram, "viewMatrix"),
        false,
        flatten(viewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(
            haloProgram,
            "projectionMatrix"
        ),
        false,
        flatten(projectionMatrix)
    );

    // sun position
    gl.uniform3f(
        gl.getUniformLocation(
            haloProgram,
            "haloWorldPosition"
        ),
        lightPosition[0],
        lightPosition[1] - 0.2,
        lightPosition[2]
    );

    // quad dim
    gl.uniform2f(
        gl.getUniformLocation(haloProgram, "haloSize"),
        width,
        height
    );

    gl.uniform1f(
        gl.getUniformLocation(
            haloProgram,
            "uGlobalAlpha"
        ),
        alpha
    );

    // Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(
        gl.TEXTURE_2D,
        haloTexture
    );

    gl.uniform1i(
        gl.getUniformLocation(
            haloProgram,
            "haloTexture"
        ),
        0
    );

    gl.drawArrays(
        gl.TRIANGLES,
        0,
        haloBuffers.numVertices
    );
}