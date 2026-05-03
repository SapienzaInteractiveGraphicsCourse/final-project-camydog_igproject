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