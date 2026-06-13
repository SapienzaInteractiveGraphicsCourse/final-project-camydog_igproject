
////////////////////////////////////////////////////////////////////////////////////////

function updateCanvasCursor() {
    if (petDogMode) {
        canvas.style.cursor =
            "url('icons/wave.png') 16 6, pointer";
    } else if (callDogClickMode) {
        canvas.style.cursor =
            "url('icons/hand_1.png') 12 4, pointer";
    } else {
        canvas.style.cursor = "move";
    }
}
//////////////////////

// create sphere for light source
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

        //tolgo per texture tavolo 2000x2000
        //gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


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
    var n = vec4(-1.0, 0.0, 0.0, 0.0);

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
            url: "skybox/bluecloud_rt.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: "skybox/bluecloud_lf.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: "skybox/bluecloud_dn.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: "skybox/bluecloud_up.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: "skybox/bluecloud_bk.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: "skybox/bluecloud_ft.jpg",
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
            gl.texImage2D(
                target,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
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

function LoadSkyboxTexturePark(gl)
{
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: "skybox/Park2/negx.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: "skybox/Park2/posx.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: "skybox/Park2/posy.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: "skybox/Park2/negy.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: "skybox/Park2/posz.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: "skybox/Park2/negz.jpg",
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

           

            gl.texImage2D(
                target,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
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


function DrawSkybox(gl, viewMatrix, projectionMatrix,flipY=false)
{
    // La skybox deve fare solo da sfondo:
    // la disegno senza depth test e senza scrivere nel depth buffer
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(skyboxProgram);

    gl.uniform1i(
        gl.getUniformLocation(skyboxProgram, "flipSkyboxY"),
        flipY ? 1 : 0
    );

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

    // Copio la view matrix togliendo la traslazione
    let viewNoTranslation = mat4();

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            viewNoTranslation[i][j] = viewMatrix[i][j];
        }
    }

    viewNoTranslation[0][3] = 0.0;
    viewNoTranslation[1][3] = 0.0;
    viewNoTranslation[2][3] = 0.0;

    let mvp = mult(projectionMatrix, viewNoTranslation);

    gl.uniformMatrix4fv(
        skyboxMvpLoc,
        false,
        flatten(mvp)
    );

    gl.activeTexture(gl.TEXTURE0);

    //check if it's night or day and bind the correct texture
    if (isNight) {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, nightSkyboxTexture);
    } 
    else if (currentScene === "park") {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, parkSkyboxTexture);
    }
    else {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    }
    gl.uniform1i(skyboxSamplerLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Ripristino lo stato per la scena normale
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.depthFunc(gl.LESS);
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

        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, x: 1 * faceSize, y: 2 * faceSize,rot:0, flipX: false, flipY: false }, // up
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, x: 1 * faceSize, y: 0 * faceSize,rot:0, flipX: false, flipY: false }, // down

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