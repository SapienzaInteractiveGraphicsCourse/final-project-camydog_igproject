function drawParkScene(gl,viewMatrix, projectionMatrix) {
    console.log("[function drawParkScene]");

    // Skybox del parco
    DrawSkybox(gl, viewMatrix, projectionMatrix,flipSkyboxY = false);

    // Usa la stessa luce controllata dagli slider
    gl.useProgram(program);

    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );

    // ===== PRATO =====
    var modelMatrixGrass = mat4();
    modelMatrixGrass = mult(modelMatrixGrass, translate(0.0, -2.5, 0.0));
    modelMatrixGrass = mult(modelMatrixGrass, scalem(30.0, 0.08, 30.0));

    drawObject(
        roomBoxBuffers,
        floorTexture,        // oppure floorTexture temporaneamente
        modelMatrixGrass,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        false,
        true,
        0
    );

    // ===== CANE NEL PARCO =====
    var modelMatrixParkDog = mat4();
    modelMatrixParkDog = mult(modelMatrixParkDog, translate(0.0, -2.2, 2.0));
    modelMatrixParkDog = mult(modelMatrixParkDog, rotate(-90, [1, 0, 0]));
    modelMatrixParkDog = mult(modelMatrixParkDog, scalem(1.0, 1.0, 1.0));

    drawObject(
        dogBuffers,
        dogTexture,
        modelMatrixParkDog,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        false,
        true,
        0
    );
}