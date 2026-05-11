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