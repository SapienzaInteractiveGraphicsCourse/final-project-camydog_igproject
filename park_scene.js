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

    // ===== GRASS =====
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



    // ===== BENCH =====

    var modelMatrixBench = mat4();

    modelMatrixBench = mult(modelMatrixBench, translate(-5.0, -1.5, -2.8));

    
    modelMatrixBench = mult(modelMatrixBench, rotate(90, [0, 1, 0]));
    modelMatrixBench = mult(modelMatrixBench, scalem(2.0, 2.0, 2.0));

    drawObject(
        benchBuffers,
        benchTexture,  // benchTexture
        modelMatrixBench,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        false,  // twoSided
        true,   // receiveShadow
        0
    );

    //if collision debug is enabled, draw the bench collider box
    if (showCollisionDebug) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.depthMask(false);

        // così lo vedi bene anche se è dentro/vicino alla panchina
        gl.disable(gl.CULL_FACE);

        drawObject(
            roomBoxBuffers,
            null,
            getBenchColliderDebugMatrix(),
            viewMatrix,
            projectionMatrix,
            false,  // useTexture
            false,  // isLightMarker
            true,   // twoSided
            false,  // receiveShadow
            false,  // wallShadowMode
            false,  // isSunHalo
            0.35    // alpha
        );

        gl.enable(gl.CULL_FACE);

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }


    //====== FRISBEE =====

    var modelMatrixFrisbee = getFrisbeeModelMatrix();

    gl.disable(gl.CULL_FACE); // Disabilita il backface culling per il frisbee

    drawObject(
        frisbeeBuffers,
        frisbeeTexture,  // frisbeeTexture
        modelMatrixFrisbee,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        true,  // twoSided
        true,   // receiveShadow
        0
    );




    gl.enable(gl.CULL_FACE);

    drawParkGrassPatches(viewMatrix, projectionMatrix);

    /************DOG + FRISBEE FETCH*****************/
    var parkDeltaTime = 0.016;

    if (typeof deltaTime !== "undefined") {
        parkDeltaTime = deltaTime;
    }

    // check if frisbee has landed and send dog to fetch it
    checkFrisbeeLandedAndSendDog();

    // update dog animation and position
    updateSkinnedDogFetchBall(parkDeltaTime);

    /************DOG*****************/
   
    drawSkinnedDog(viewMatrix, projectionMatrix);




    //************************************* *
    //            SHADOW PASS              // 
    /************************************* */
    
}