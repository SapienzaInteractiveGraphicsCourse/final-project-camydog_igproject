function createParkGrassPatchInstances() {
    grassPatchInstances = [];

    var count = 200;   // prova 50 / 70 / 100
    var minX = -6.0;
    var maxX =  6.0;
    var minZ = -5.5;
    var maxZ =  7.0;

    for (var i = 0; i < count; i++) {
        var x = minX + Math.random() * (maxX - minX);
        var z = minZ + Math.random() * (maxZ - minZ);

        /*
            Scala random: meglio piccoli ciuffi,
            non tutti uguali.
        */
        var s = 0.3 + Math.random() * 0.30;

        grassPatchInstances.push({
            x: x,
            y: -2.2,
            z: z,
            scale: s,
            rotY: Math.random() * 360.0
        });
    }
}


function drawParkGrassPatches(viewMatrix, projectionMatrix) {
    if (!grassBlockBuffers) return;

    gl.disable(gl.CULL_FACE);

    for (var i = 0; i < grassPatchInstances.length; i++) {
        var g = grassPatchInstances[i];

        var m = mat4();

        m = mult(m, translate(g.x, g.y, g.z));
        m = mult(m, rotate(g.rotY, [0, 1, 0]));
        m = mult(m, scalem(g.scale, g.scale, g.scale));

        drawObject(
            grassBlockBuffers,
            grassBlockTexture,   // oppure grassTexture se vuoi usare quella
            m,
            viewMatrix,
            projectionMatrix,
            true,    // useTexture
            false,   // isLightMarker
            true,    // twoSided
            false,   // receiveShadow, per ora meglio false sui fili d'erba
            0
        );
    }

    gl.enable(gl.CULL_FACE);
}