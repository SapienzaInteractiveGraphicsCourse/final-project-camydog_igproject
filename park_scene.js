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
    var modelMatrixFloor = mat4();
    modelMatrixFloor = mult(modelMatrixFloor, translate(0.0, -2.5, 0.0));
    modelMatrixFloor = mult(modelMatrixFloor, scalem(14.0, 0.1, 14.0));

    drawObject(
        roomBoxBuffers,
        grassTexture,        // oppure floorTexture temporaneamente
        modelMatrixFloor,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        false,
        true,
        0
    );

    /* // ===== CANE NEL PARCO =====
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
    ); */
}