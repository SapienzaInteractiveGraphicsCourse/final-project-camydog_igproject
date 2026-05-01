"use strict";

var gl;
var program;
var canvas;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var axis = 0;
var theta = [0, 0, 0];
var flag = true;

var modelViewMatrixLoc;
var modelPath_teapot = "teapot.obj";
var modelPath_table = "table.obj";

var lightPosition = vec4(0.0, 0.0, 5.0, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(0.0, 0.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.5, 0.5, 1.0);
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

//texture variables
var useTexture_teapot = false;
var useTexture_table = false;

var teapotTexture;
var tableTexture;
var teapotBuffers;
var tableBuffers;

var path_img_teapot="maghina.jpg";
var path_img_table="table_tex_512.jpg";


//variabili per ombre dinamiche

var shadowFramebuffer;
var shadowTexture;
var shadowProgram;

var SHADOW_SIZE = 1024;

var lightViewMatrix;
var lightProjectionMatrix;



onload = async function init() {

    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
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

    //carico le texture per teapot e tavolo

    teapotTexture = loadTexture(path_img_teapot);
    tableTexture = loadTexture(path_img_table);
    

    
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

    await loadOBJ(modelPath_teapot);
    console.log("OBJ  Teapot loaded");
        
    var teapotPoints = pointsArray.slice();
    var teapotNormals = normalsArray.slice();
    var teapotTex = texCoordsArray.slice();
    teapotBuffers = createBuffers(teapotPoints, teapotNormals, teapotTex);


    //parte del tavolo 
    await loadOBJ(modelPath_table);
    console.log("OBJ  Table loaded");


    var tablePoints = pointsArray.slice();
    var tableNormals = normalsArray.slice();
    var tableTex = texCoordsArray.slice();
    tableBuffers = createBuffers(tablePoints, tableNormals, tableTex);



    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 100.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

    document.getElementById("ButtonX").onclick = () => axis = 0;
    document.getElementById("ButtonY").onclick = () => axis = 1;
    document.getElementById("ButtonZ").onclick = () => axis = 2;
    document.getElementById("ButtonT").onclick = () => flag = !flag;
    document.getElementById("ButtonTex").onclick = function() {
        useTexture_teapot = !useTexture_teapot;
        console.log("Texture teapot :", useTexture_teapot);
        useTexture_table = !useTexture_table;
        console.log("Texture table :", useTexture_table);
    };

    render();
};


function loadTexture(path) {
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

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };

    image.onerror = function() {
        console.log("texture failed:", path);
    };

    image.src = path;
    return tex;
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
        flag = !flag;
        console.log("Toggle rotation:", flag);
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

    if (flag) theta[axis] += 1.0;


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

    var lightPosition = vec4(3.0, 6.0, 2.0, 1.0);
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

    var eye = vec3(
        camRadius * Math.sin(camAngle) * Math.cos(camPitch),
        camRadius * Math.sin(camPitch),
        camRadius * Math.cos(camAngle) * Math.cos(camPitch)
    );

    var viewMatrix = lookAt(
        eye,
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );

    var projectionMatrix = perspective(45.0, 1.0, 1.0, 20.0);

    //matrici teapot -- sopra il tavolo, ruota in base a theta e scalato per essere più piccolo
    var modelMatrix1 = mat4();
    modelMatrix1 = mult(modelMatrix1, translate(objPos[0], objPos[1], objPos[2]));
    modelMatrix1 = mult(modelMatrix1, scalem(0.5, 0.5, 0.5));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[0], [1, 0, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[1], [0, 1, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[2], [0, 0, 1]));

    //matrici tavolo -- lui non ruota, ma è scalato e traslato verso il basso per essere sotto il teapot
    var modelMatrix2 = mat4();
    modelMatrix2 = mult(modelMatrix2, translate(0.0, -2.0, 0.0));
    modelMatrix2 = mult(modelMatrix2, scalem(3.0, 0.3, 3.0));


      // ===== SHADOW PASS =====
    lightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    lightProjectionMatrix = perspective(70.0, 1.0, 1.0, 30.0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shadowProgram);

    drawShadowObject(teapotBuffers, modelMatrix1);
    drawShadowObject(tableBuffers, modelMatrix2);



     // ===== NORMAL PASS =====
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );
    gl.uniform4fv(
        gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct)
    );

    drawObject(teapotBuffers, teapotTexture, modelMatrix1, viewMatrix, projectionMatrix);
    drawObject(tableBuffers, tableTexture, modelMatrix2, viewMatrix, projectionMatrix);

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

function drawObject(obj, texture, modelMatrix, viewMatrix, projectionMatrix) {
    var modelViewMatrix = mult(viewMatrix, modelMatrix);

    var normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

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

    gl.uniform1i(
    gl.getUniformLocation(program, "useTexture"),
        useTexture_teapot ? 1 : 0
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "viewMatrix"), false, flatten(viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(normalMatrix));

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
        flatten(modelNormalMatrix)
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

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}