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