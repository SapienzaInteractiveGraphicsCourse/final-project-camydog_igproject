function drawParkScene(gl,viewMatrix, projectionMatrix,deltaTIme) {
    //console.log("[function drawParkScene]");

    var parkDeltaTime =
        typeof deltaTime === "number" && isFinite(deltaTime)
            ? deltaTime
            : 1.0 / 60.0;

    /*
        Evita salti enormi se il browser si blocca un attimo,
        ma permette comunque di adattarsi a FPS bassi.
    */
    parkDeltaTime = Math.min(parkDeltaTime, 0.05);

    // Skybox del parco
    DrawSkybox(gl, viewMatrix, projectionMatrix,flipSkyboxY = false);

    // Usa la stessa luce controllata dagli slider
    gl.useProgram(program);

    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );

    /******************MATRIX LIGHT ************/
    //model Light
    var modelMatrixLight = mat4();
    modelMatrixLight = mult(modelMatrixLight,translate(lightPosition[0], lightPosition[1], lightPosition[2]));
    //modelMatrixLight = mult(modelMatrixLight, translate(0.0, 1.5, 0.0));
    modelMatrixLight = mult(modelMatrixLight, scalem(1.0, 1.0, 1.0));



    if (!isNight) { // it' day time
        updateFallingLeaves(parkDeltaTime);
        drawFallingLeaves(viewMatrix, projectionMatrix);
        drawFireflies(viewMatrix, projectionMatrix);

    }
    else{ // it's night baby
       updateFireflies(parkDeltaTime);
       drawFireflies(viewMatrix, projectionMatrix);
       updateDogFireflyCatch(parkDeltaTime);
    }

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

    /* drawObject(
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
    ); */

    drawBenchMaterial(
        benchBuffers,
        modelMatrixBench,
        viewMatrix,
        projectionMatrix
    );

    //if collision debug is enabled, draw the bench collider box
    if (showCollisionDebug) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.depthMask(false);

        
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
    
    if (shouldDrawFrisbee()) {

        gl.disable(gl.CULL_FACE); 
        
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
    }

    if (showDogMusicNote && musicNoteBuffers) {
       
        var noteMatrix1 = getDogNoteModelMatrix(0);
        drawObject(
            musicNoteBuffers,
            musicNoteTexture,
            noteMatrix1,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            false
        );

        var noteMatrix2 = getDogNoteModelMatrix(1);
        drawObject(
            musicNoteBuffers,
            musicNoteTexture,
            noteMatrix2,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            false
        );

        var noteMatrix3 = getDogNoteModelMatrix(2);
        drawObject(
            musicNoteBuffers,
            musicNoteTexture,
            noteMatrix3,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            false
        );
    }


    // ===== GRASS PATCHES =====
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

     if (showDogHeart) {
            dogHeartTimer += parkDeltaTime;

            if (dogHeartTimer >= dogHeartDuration) {
                showDogHeart = false;
            }
    } 
    if (hideDogHeartPending) {
        hideDogHeartTimer += parkDeltaTime;

        if (hideDogHeartTimer >= hideDogHeartDelay) {
            showDogHeart = false;
            dogHeartTimer = 0.0;

            hideDogHeartPending = false;
            hideDogHeartTimer = 0.0;
        }
    }
    updateSkinnedDogCall(parkDeltaTime);



    /************DOG*****************/
   
    drawSkinnedDog(viewMatrix, projectionMatrix);


    // Heart if i am calling the dog
    if (showDogHeart && heartBuffers) {
        var heartMatrix = getDogHeartModelMatrix();

        drawObject(
            heartBuffers,
            heartTexture, // temporaneamente, solo per vedere il modello
            heartMatrix,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            false
        );
    }


    /***********MOON /SUN + halo*****************/

    if (isNight) {
        //moon and no NO HALO

        var modelMatrixMoon = mat4();

        modelMatrixMoon = mult(
            modelMatrixMoon,
            translate(
                lightPosition[0],
                lightPosition[1],
                lightPosition[2]
            )
        );

        var moonScale = 1.0;

        modelMatrixMoon = mult(
            modelMatrixMoon,
            scalem(
                moonScale,
                moonScale,
                moonScale
            )
        );

         drawObject(
            moonBuffers,
            moonTexture,
            modelMatrixMoon, // non modelMatrixLight
            viewMatrix,
            projectionMatrix,
            true,
            true,
            false,
            false
        );
        /* drawObject(
            lightSphereBuffers,
            moonTexture,
            modelMatrixLight,
            viewMatrix,
            projectionMatrix,
            true,   // usa texture
            true,   // è il light marker
            false,
            false
        ); */
    } else {

        //halo

        var t = performance.now() * 0.001;

        var pulse =
            1.0 + 0.025 * Math.sin(t * 1.7);

        var haloWidth = 8.3 * pulse;
        var haloHeight = 5.0 * pulse;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);

        drawSunHalo(
            haloBuffers,
            haloTexture,
            viewMatrix,
            projectionMatrix,
            haloWidth,
            haloHeight,
            1.0
        );

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.depthMask(true);
        gl.disable(gl.BLEND);

        // Ripristina il programma principale
        gl.useProgram(program);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        // Sole
        drawObject(
            sunBuffers,
            sunTexture,
            modelMatrixLight,
            viewMatrix,
            projectionMatrix,
            true,
            true,
            false,
            false
        );


       
    }


 

    //************************************* *
    //            SHADOW PASS              // 
    /************************************* */

    // just before the shadow pass, set the light view and projection matrices to the classic ones
    var classicLightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );

    var classicLightProjectionMatrix = perspective(100.0, 1.0, 0.05, 40.0);

    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;


    isPointShadowPass = true;

    pointLightProjectionMatrix = perspective(
        90.0,
        1.0,
        0.1,
        POINT_SHADOW_FAR
    );

    var lightPos = vec3(
        lightPosition[0],
        lightPosition[1],
        lightPosition[2]
    );

    gl.disable(gl.CULL_FACE);
    gl.useProgram(shadowProgram);

    for (var i = 0; i < 6; i++) {
        var target = add(
            lightPos,
            pointShadowDirections[i]
        );

        pointLightViewMatrices[i] = lookAt(
            lightPos,
            target,
            pointShadowUps[i]
        );

        gl.bindFramebuffer(
            gl.FRAMEBUFFER,
            pointShadowFramebuffers[i]
        );

        gl.viewport(
            0,
            0,
            POINT_SHADOW_SIZE,
            POINT_SHADOW_SIZE
        );

        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        gl.useProgram(shadowProgram);

        lightViewMatrix =
            pointLightViewMatrices[i];

        lightProjectionMatrix =
            pointLightProjectionMatrix;

        // ===== PARK SHADOW CASTERS =====

        drawShadowObject(
            benchBuffers,
            modelMatrixBench
        );

        drawShadowObject(
            frisbeeBuffers,
            modelMatrixFrisbee
        );

        // ===== GRASS PATCHES CAST SHADOW =====
        if (grassBlockBuffers && grassPatchInstances) {
            gl.disable(gl.CULL_FACE);

            for (var j = 0; j < grassPatchInstances.length; j+=4) {
                var g = grassPatchInstances[j];

                var mGrassShadow = mat4();

                mGrassShadow = mult(
                    mGrassShadow,
                    translate(g.x, g.y, g.z)
                );

                mGrassShadow = mult(
                    mGrassShadow,
                    rotate(g.rotY, [0, 1, 0])
                );

                mGrassShadow = mult(
                    mGrassShadow,
                    scalem(g.scale, g.scale, g.scale)
                );

                drawShadowObject(
                    grassBlockBuffers,
                    mGrassShadow
                );
            }

            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        }

        if (ENABLE_SKINNED_DOG_SHADOW) {
            drawSkinnedDogDepthOnly(
                lightViewMatrix,
                lightProjectionMatrix
            );
        }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    lightViewMatrix =
        classicLightViewMatrix;

    lightProjectionMatrix =
        classicLightProjectionMatrix;

    gl.viewport(
        0,
        0,
        canvas.width,
        canvas.height
    );

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

}
