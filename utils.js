// create sphere for light source

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