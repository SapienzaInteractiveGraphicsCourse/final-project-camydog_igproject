"use strict";

var gl;
var program;
var canvas;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var axis = 0;
var theta = [0, 0, 0];
var flag_rot_teapot = true;
var flag_rot_table = false;

var modelViewMatrixLoc;
var modelPath_teapot = "./Objects/teapot.obj";
var modelPath_table = "./Objects/table.obj";
var modelPath_cat= "./Cat/cat.obj";
var modelPath_dog = "./dog/dog.obj";


var lightPosition = vec4(3.0, 3.0, 5.0, 1.0);
var lightAmbient = vec4(0.3, 0.3, 0.3, 1.0);
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


var cameraAngle = 35.0;
var cameraHeight = 4.0;
var cameraDistance = 10.0;   // questo è lo zoom

var at = vec3(0.0, 0.5, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var eye = vec3(0.0, 4.0, 10.0);
var aspect;


//texture variables
var useTexture_teapot = false;
var useTexture_table = false;

var teapotTexture;
var teapotBuffers;  
var tableTexture;
var tableBuffers;
var catBuffers; 
var catTexture;
var wallTexture;
var floorTexture;
var dogBuffers;
var dogTexture;
var skyboxTexture;
var paintingTexture;
var corniceTexture;

//img paths
var path_img_teapot="./Textures/teapot_tex_1.png";
var path_img_table="./table_tex_512.jpg";
var path_img_cat="./Cat/cat_diffuse.jpg";
var path_img_wall="./Textures/wall_tex.jpg";
var path_img_floor="./Textures/parquet_tex.jpg";
var path_img_dog = "./dog/dog_diff.jpg";
var path_img_skybox = "./skybox/skybox.jpg";
var path_img_skybox_night = "./Cubemap/cubemap_sky_night.png";
var path_img_painting = "./Textures/london.jpg";
var path_img_cornice = "./Textures/blue_navy.jpg";



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

//skybox
var skyboxProgram;
var skyboxBuffer;

var skyboxPosLoc;
var skyboxMvpLoc;
var skyboxSamplerLoc;


var isNight = false;
var daySkyboxTexture;
var nightSkyboxTexture;


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

var POINT_SHADOW_SIZE = 1024;

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

    //   SKYBOXX    //////////////////
    // skybox buffers

     //skybox shader program
    skyboxProgram = initShaders(gl, "skybox-vertex-shader", "skybox-fragment-shader");
    console.log("skyboxProgram =", skyboxProgram);
    skyboxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);

    skyboxTexture = LoadSkyboxTexture(gl);
    
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
    
   


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

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

    canvas.addEventListener("wheel", function(event) {
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

    console.log("Loaded points:", pointsArray.length);
    console.log("Loaded normals:", normalsArray.length);
    console.log("Loaded texCoords:", texCoordsArray.length);
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

    //controllo se è stato premuto il tasto A del gamepad per attivare/disattivare la rotazione
    readGamepad();
    clampTeapotToTable();

    if (flag_rot_teapot) theta[axis] += rotationSpeed_teapot;
    if(flag_rot_table){
        tableTheta += rotationSpeed_table;
    } 
   
    var catZ = catBasePos[2];
    var catFacingAngle = 0.0;

    if (moveCat) {
        catWalkTime += catWalkSpeed;
        catZ = catBasePos[2] + Math.sin(catWalkTime) * catWalkRange;

        var direction = Math.cos(catWalkTime);

        if (direction < 0.0) {
            catFacingAngle = 180.0;
        } else {
            catFacingAngle = 0.0;
        }
    }

    var dogZ = dogBasePos[2];
    var dogFacingAngle = 0.0;

    if (moveDog) {
        dogWalkTime += dogWalkSpeed;
        dogZ = dogBasePos[2] + Math.sin(dogWalkTime) * dogWalkRange;

        var direction = Math.cos(dogWalkTime);

        if (direction < 0.0) {
            dogFacingAngle = 180.0;
        } else {
            dogFacingAngle = 0.0;
        }
    }

    // parte per cambiare colore della luce dinamicamente
    // 🔥 tempo aggiornato ad ogni frame
    /* var t = Date.now() * 0.001;

    var lightPosition = vec4(
        5.0 * Math.cos(t),
        2.0,
        5.0 * Math.sin(t),
        1.0
    );
    var lightDiffuse = vec4(
        Math.abs(Math.sin(t)),
        Math.abs(Math.sin(t + 2.0)),
        Math.abs(Math.sin(t + 4.0)),
        1.0
    ); */

   // var lightPosition = vec4(3.0, 6.0, 2.0, 1.0);
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);


    var diffuseProduct = mult(lightDiffuse, materialDiffuse);

    gl.useProgram(program);

    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );
    gl.uniform4fv(
        gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct)
    );

    /* var eye = vec3(
        camRadius * Math.sin(camAngle) * Math.cos(camPitch),
        camRadius * Math.sin(camPitch),
        camRadius * Math.cos(camAngle) * Math.cos(camPitch)
    ); */


   /*  var viewMatrix = lookAt(
        eye,
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
 */
    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(80.0, aspect, 0.1, 120.0);

    //model Light
    var modelMatrixLight = mat4();
    modelMatrixLight = mult(modelMatrixLight,translate(lightPosition[0], lightPosition[1], lightPosition[2]));
    //modelMatrixLight = mult(modelMatrixLight, translate(0.0, 1.5, 0.0));
    modelMatrixLight = mult(modelMatrixLight, scalem(0.5, 0.5, 0.5));

    //matrici teapot -- sopra il tavolo, ruota in base a theta e scalato per essere più piccolo
    var modelMatrix1 = mat4();
    modelMatrix1 = mult(modelMatrix1, translate(objPos[0], objPos[1], objPos[2]));
    modelMatrix1 = mult(modelMatrix1, scalem(0.5, 0.5, 0.5));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[0], [1, 0, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[1], [0, 1, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[2], [0, 0, 1]));

    //matrici tavolo -- lui non ruota, ma è scalato e traslato verso il basso per essere sotto il teapot
    var modelMatrix2 = mat4();
    modelMatrix2 = mult(modelMatrix2, translate(0.0, -1.9, 0.0));
    modelMatrix2 = mult(modelMatrix2, rotate(tableTheta, [0, 1, 0]));
    modelMatrix2 = mult(modelMatrix2, scalem(3.0, 1.5, 2.0));

    //matrici cat
    var modelMatrix3 = mat4();
    modelMatrix3 = mult(modelMatrix3, translate(catBasePos[0], catBasePos[1], catZ));
    modelMatrix3 = mult(modelMatrix3, rotate(catFacingAngle, [0, 1, 0]));
    modelMatrix3 = mult(modelMatrix3, rotate(-90, [1, 0, 0]));
    modelMatrix3 = mult(modelMatrix3, scalem(0.5, 0.5, 0.5));

    //matrici dog
    var modelMatrixDog = mat4();
    modelMatrixDog = mult(modelMatrixDog, translate(dogBasePos[0], dogBasePos[1], dogZ));
    modelMatrixDog = mult(modelMatrixDog, rotate(dogFacingAngle, [0, 1, 0]));
    modelMatrixDog = mult(modelMatrixDog, rotate(-90, [1, 0, 0]));
    modelMatrixDog = mult(modelMatrixDog, scalem(1.0, 1.0, 1.0));


    // ===== ROOM BOX =====

    // pavimento
    var modelMatrixFloor = mat4();
    modelMatrixFloor = mult(modelMatrixFloor, translate(0.0, -2.5, 0.0));
    modelMatrixFloor = mult(modelMatrixFloor, scalem(14.0, 0.1, 14.0));

    // parete dietro
    var modelMatrixBackWall = mat4();
    modelMatrixBackWall = mult(modelMatrixBackWall, translate(0.0, -0.5, -7.0));
    modelMatrixBackWall = mult(modelMatrixBackWall, scalem(14.0, 4.0, 0.15));

    // blocker per la parete dietro
    var modelMatrixBackWallBlocker = mat4();
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, translate(0.0, -0.5, -7.08));
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, scalem(14.6, 4.2, 0.15));

    // parete sinistra
    var modelMatrixLeftWall = mat4();
    modelMatrixLeftWall = mult(modelMatrixLeftWall, translate(-7.0, -0.5, 0.0));
    modelMatrixLeftWall = mult(modelMatrixLeftWall, scalem(0.15, 4.0, 14.4));

    //blocker per la parete sinistra
    var modelMatrixLeftWallBlocker = mat4();
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, translate(-7.08, -0.5, 0.0));
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, scalem(0.15, 4.2, 14.6));

    // parete destra
    var modelMatrixRightWall = mat4();
    modelMatrixRightWall = mult(modelMatrixRightWall, translate(7.0, -0.5, 0.0));
    modelMatrixRightWall = mult(modelMatrixRightWall, scalem(0.15, 4.0, 14.4));
    // blocker per la parete destra
    var modelMatrixRightWallBlocker = mat4();
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, translate(7.08, -0.5, 0.0));
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, scalem(0.15, 4.2, 14.6));

    // ===== PAINTING =====

    // pannello del quadro sulla parete dietro
    var modelMatrixPainting = mat4();
    modelMatrixPainting = mult(modelMatrixPainting, translate(0.0, 0.7, -6.93));
    modelMatrixPainting = mult(modelMatrixPainting, scalem(2.2, 1.3, 0.04));

    // cornice sopra
    var modelMatrixFrameTop = mat4();
    modelMatrixFrameTop = mult(modelMatrixFrameTop, translate(0.0, 1.4, -6.88));
    modelMatrixFrameTop = mult(modelMatrixFrameTop, scalem(2.45, 0.10, 0.10));

    // cornice sotto
    var modelMatrixFrameBottom = mat4();
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, translate(0.0, 0.0, -6.88));
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, scalem(2.45, 0.10, 0.10));

    // cornice sinistra
    var modelMatrixFrameLeft = mat4();
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, translate(-1.22, 0.7, -6.88));
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, scalem(0.10, 1.45, 0.10));

    // cornice destra
    var modelMatrixFrameRight = mat4();
    modelMatrixFrameRight = mult(modelMatrixFrameRight, translate(1.22, 0.7, -6.88));
    modelMatrixFrameRight = mult(modelMatrixFrameRight, scalem(0.10, 1.45, 0.10));

    // prima dello shadow pass
    var classicLightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );

    var classicLightProjectionMatrix = perspective(100.0, 1.0, 0.05, 40.0);

    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;

    /////////////////////
        
    // ===== SHADOW PASS =====
    lightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    lightProjectionMatrix = perspective(100.0, 1.0, 0.05, 40.0);


    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Nella shadow pass elimino le facce frontali.
    // Questo può aiutare a ridurre la shadow acne.
   // gl.cullFace(gl.FRONT);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(shadowProgram);

    
   /*  drawShadowObject(teapotBuffers, modelMatrix1);
    drawShadowObject(tableBuffers, modelMatrix2);
    drawShadowObject(catBuffers, modelMatrix3);
    drawShadowObject(dogBuffers, modelMatrixDog);
    drawShadowObject(roomBoxBuffers, modelMatrixFloor);
    drawShadowObject(roomBoxBuffers, modelMatrixBackWall);
    drawShadowObject(roomBoxBuffers, modelMatrixLeftWall);
    drawShadowObject(roomBoxBuffers, modelMatrixRightWall);
 */

    gl.disable(gl.CULL_FACE);

    //altra parte per shadow map point light
    isPointShadowPass = true;
    pointLightProjectionMatrix = perspective(90.0, 1.0, 0.1, POINT_SHADOW_FAR);
  
    var lightPos = vec3(
        lightPosition[0],
        lightPosition[1],
        lightPosition[2]
    );

    for (var i = 0; i < 6; i++) {
        var target = add(lightPos, pointShadowDirections[i]);

        pointLightViewMatrices[i] = lookAt(
            lightPos,
            target,
            pointShadowUps[i]
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadowFramebuffers[i]);
        gl.viewport(0, 0, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shadowProgram);

        // qui usiamo temporaneamente le matrici globali già usate da drawShadowObject
        lightViewMatrix = pointLightViewMatrices[i];
        lightProjectionMatrix = pointLightProjectionMatrix;

        drawShadowObject(teapotBuffers, modelMatrix1);
        drawShadowObject(tableBuffers, modelMatrix2);
        drawShadowObject(catBuffers, modelMatrix3);
        drawShadowObject(dogBuffers, modelMatrixDog);

         drawShadowObject(roomBoxBuffers, modelMatrixFloor);

        /*drawShadowObject(roomBoxBuffers, modelMatrixBackWall);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWall);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWall); */

        // uso i blockers
        drawShadowObject(roomBoxBuffers, modelMatrixBackWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWallBlocker);
    }
    

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Ripristino per il render normale
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    // Ripristino le matrici della shadow map classica,
    // perché per ora il fragment shader usa ancora shadowMap 2D.
    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

     // ===== NORMAL PASS =====
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // disegno prima la skybox
    DrawSkybox(gl, viewMatrix, projectionMatrix);

    //torno al programma normale
    gl.useProgram(program);

    // Nella render pass normale torno al culling classico:
    // elimino le facce posteriori.
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
   
    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );
    gl.uniform4fv(
        gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct)
    );

    drawObject(teapotBuffers,
         teapotTexture,
          modelMatrix1,
           viewMatrix,
            projectionMatrix,useTexture_teapot, 
            false,false,true);
    drawObject(tableBuffers, tableTexture, modelMatrix2, viewMatrix,
         projectionMatrix, useTexture_table, false,false,true);
    drawObject(catBuffers, catTexture, modelMatrix3, viewMatrix,
         projectionMatrix, true, false,false,true);
    drawObject(
        dogBuffers,
        dogTexture,
        modelMatrixDog,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        false,  // twoSided
        true    // receiveShadow
    );
    drawObject(
        lightSphereBuffers,
        null,
        modelMatrixLight,
        viewMatrix,
        projectionMatrix,
        false,
        true
    );

    //parte per disegnaare direzione luce (debug)
    DrawLightDirectionArrow(
        gl,
        lightPosition,
        vec3(0.0, 0.0, 0.0),
        viewMatrix,
        projectionMatrix
    );

gl.useProgram(program);

    /*
    // ROOM: disable culling because planes are single-sided
    // Floor: keep culling enabled, so we do not see its back side
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    drawObject(
        roomPlaneBuffers,
        wallTexture,
        modelMatrixFloor,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        true,true
    );

    // Walls: disable culling because they are single-sided planes
    gl.disable(gl.CULL_FACE);

    drawObject(roomPlaneBuffers, wallTexture, modelMatrixBackWall, viewMatrix, projectionMatrix, true, false, true,true);
    drawObject(roomPlaneBuffers, wallTexture, modelMatrixLeftWall, viewMatrix, projectionMatrix, true, false, true,false);
    drawObject(roomPlaneBuffers, wallTexture, modelMatrixRightWall, viewMatrix, projectionMatrix, true, false, true,false);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
 */

    drawObject(roomBoxBuffers, floorTexture, modelMatrixFloor,
    viewMatrix, projectionMatrix, true, false, false,  true);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixBackWall,
        viewMatrix, projectionMatrix, true, false, false,  true);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixLeftWall,
        viewMatrix, projectionMatrix, true, false, false,  true);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixRightWall,
        viewMatrix, projectionMatrix, true, false, false,  true);

    //painting part

    drawObject(roomBoxBuffers, paintingTexture, modelMatrixPainting,
    viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameTop,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameBottom,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameLeft,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameRight,
        viewMatrix, projectionMatrix, true, false, false, true);

    requestAnimFrame(render);
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

function drawObject(obj,
     texture,
      modelMatrix,
       viewMatrix,
        projectionMatrix,
    useTexture = true,
     isLightMarker=false,
     twoSided = false, 
     receiveShadow = true) {
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

// funzione per shadowmapping
function initShadowMap() {
    shadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);

    shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        SHADOW_SIZE,
        SHADOW_SIZE,
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
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_SIZE, SHADOW_SIZE);

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


