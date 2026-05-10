function drawHomeScene(gl,viewMatrix, projectionMatrix) {
    console.log("[function drawHomeScene]");
 //ball mini-game update
    if (miniGameActive && physicsWorld) {
       var now = performance.now();
        var deltaTime = (now - lastPhysicsTime) / 1000.0;
        lastPhysicsTime = now;

        // evita salti enormi se la tab/browser lagga
        deltaTime = Math.min(deltaTime, 0.05);

        physicsWorld.step(fixedTimeStep, deltaTime, 5);
        updateBallBounceAnimation();
    }
    
    if (flag_rot_teapot) theta[axis] += rotationSpeed_teapot;
    if(flag_rot_table){
        tableTheta += rotationSpeed_table;
    } 
   
    var catZ = catBasePos[2];
    var catFacingAngle = 0.0;

    if (moveCat) {
        catWalkTime += catWalkSpeed;
        catZ = catBasePos[2] + Math.sin(catWalkTime) * catWalkRange;

        var direction = Math.cos(catWalkTime);

        if (direction < 0.0) {
            catFacingAngle = 180.0;
        } else {
            catFacingAngle = 0.0;
        }
    }

    var dogZ = dogBasePos[2];
    var dogFacingAngle = 0.0;

    if (moveDog) {
        dogWalkTime += dogWalkSpeed;
        dogZ = dogBasePos[2] + Math.sin(dogWalkTime) * dogWalkRange;

        var direction = Math.cos(dogWalkTime);

        if (direction < 0.0) {
            dogFacingAngle = 180.0;
        } else {
            dogFacingAngle = 0.0;
        }
    }

    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);


    var diffuseProduct = mult(lightDiffuse, materialDiffuse);

    gl.useProgram(program);

    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );
    gl.uniform4fv(
        gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct)
    );

   ;

    //model Light
    var modelMatrixLight = mat4();
    modelMatrixLight = mult(modelMatrixLight,translate(lightPosition[0], lightPosition[1], lightPosition[2]));
    //modelMatrixLight = mult(modelMatrixLight, translate(0.0, 1.5, 0.0));
    modelMatrixLight = mult(modelMatrixLight, scalem(0.5, 0.5, 0.5));

    //matrici teapot -- sopra il tavolo, ruota in base a theta e scalato per essere più piccolo
    var modelMatrix1 = mat4();
    modelMatrix1 = mult(modelMatrix1, translate(objPos[0], objPos[1], objPos[2]));
    modelMatrix1 = mult(modelMatrix1, scalem(0.5, 0.5, 0.5));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[0], [1, 0, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[1], [0, 1, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[2], [0, 0, 1]));

    //matrici tavolo -- lui non ruota, ma è scalato e traslato verso il basso per essere sotto il teapot
    var modelMatrix2 = mat4();
    modelMatrix2 = mult(modelMatrix2, translate(0.0, -1.9, 0.0));
    modelMatrix2 = mult(modelMatrix2, rotate(tableTheta, [0, 1, 0]));
    modelMatrix2 = mult(modelMatrix2, scalem(3.0, 1.5, 2.0));

    //matrici collider del tavolo (invisibili, usati solo per collisioni)
    var modelMatrixTableCollider = mat4();

    modelMatrixTableCollider = mult(
        modelMatrixTableCollider,
        translate(tableColliderX, tableColliderY, tableColliderZ)
    );

    modelMatrixTableCollider = mult(
        modelMatrixTableCollider,
        scalem(tableColliderSX, tableColliderSY, tableColliderSZ)
    );

  
    //matrici cat
    var modelMatrix3 = mat4();
    modelMatrix3 = mult(modelMatrix3, translate(catBasePos[0], catBasePos[1], catZ));
    modelMatrix3 = mult(modelMatrix3, rotate(catFacingAngle, [0, 1, 0]));
    modelMatrix3 = mult(modelMatrix3, rotate(-90, [1, 0, 0]));
    modelMatrix3 = mult(modelMatrix3, scalem(0.5, 0.5, 0.5));

    //matrici dog
    var modelMatrixDog = mat4();
    modelMatrixDog = mult(modelMatrixDog, translate(dogBasePos[0], dogBasePos[1], dogZ));
    modelMatrixDog = mult(modelMatrixDog, rotate(dogFacingAngle, [0, 1, 0]));
    modelMatrixDog = mult(modelMatrixDog, rotate(-90, [1, 0, 0]));
    modelMatrixDog = mult(modelMatrixDog, scalem(1.0, 1.0, 1.0));


    // ===== ROOM BOX =====

    // pavimento
    var modelMatrixFloor = mat4();
    modelMatrixFloor = mult(modelMatrixFloor, translate(0.0, -2.5, 0.0));
    modelMatrixFloor = mult(modelMatrixFloor, scalem(14.0, 0.1, 14.0));

    // parete dietro
    var modelMatrixBackWall = mat4();
    modelMatrixBackWall = mult(modelMatrixBackWall, translate(0.0, -0.5, -7.0));
    modelMatrixBackWall = mult(modelMatrixBackWall, scalem(14.0, 4.0, 0.15));

    // blocker per la parete dietro
    var modelMatrixBackWallBlocker = mat4();
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, translate(0.0, -0.5, -7.08));
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, scalem(14.6, 4.2, 0.15));

    // parete sinistra
    var modelMatrixLeftWall = mat4();
    modelMatrixLeftWall = mult(modelMatrixLeftWall, translate(-7.0, -0.5, 0.0));
    modelMatrixLeftWall = mult(modelMatrixLeftWall, scalem(0.15, 4.0, 14.4));

    //blocker per la parete sinistra
    var modelMatrixLeftWallBlocker = mat4();
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, translate(-7.08, -0.5, 0.0));
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, scalem(0.15, 4.2, 14.6));

    // parete destra
    var modelMatrixRightWall = mat4();
    modelMatrixRightWall = mult(modelMatrixRightWall, translate(7.0, -0.5, 0.0));
    modelMatrixRightWall = mult(modelMatrixRightWall, scalem(0.15, 4.0, 14.4));
    // blocker per la parete destra
    var modelMatrixRightWallBlocker = mat4();
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, translate(7.08, -0.5, 0.0));
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, scalem(0.15, 4.2, 14.6));

    // ===== PAINTING =====

    // pannello del quadro sulla parete dietro
    var modelMatrixPainting = mat4();
    modelMatrixPainting = mult(modelMatrixPainting, translate(0.0, 0.7, -6.93));
    modelMatrixPainting = mult(modelMatrixPainting, scalem(2.2, 1.3, 0.04));

    // cornice sopra
    var modelMatrixFrameTop = mat4();
    modelMatrixFrameTop = mult(modelMatrixFrameTop, translate(0.0, 1.4, -6.88));
    modelMatrixFrameTop = mult(modelMatrixFrameTop, scalem(2.45, 0.10, 0.10));

    // cornice sotto
    var modelMatrixFrameBottom = mat4();
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, translate(0.0, 0.0, -6.88));
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, scalem(2.45, 0.10, 0.10));

    // cornice sinistra
    var modelMatrixFrameLeft = mat4();
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, translate(-1.22, 0.7, -6.88));
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, scalem(0.10, 1.45, 0.10));

    // cornice destra
    var modelMatrixFrameRight = mat4();
    modelMatrixFrameRight = mult(modelMatrixFrameRight, translate(1.22, 0.7, -6.88));
    modelMatrixFrameRight = mult(modelMatrixFrameRight, scalem(0.10, 1.45, 0.10));

    // prima dello shadow pass
    var classicLightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );

    var classicLightProjectionMatrix = perspective(100.0, 1.0, 0.05, 40.0);

    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;


    /////////////////////
        
    // ===== SHADOW PASS =====
    lightViewMatrix = lookAt(
        vec3(lightPosition[0], lightPosition[1], lightPosition[2]),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 1.0, 0.0)
    );
    lightProjectionMatrix = perspective(100.0, 1.0, 0.05, 40.0);


    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Nella shadow pass elimino le facce frontali.
    // Questo può aiutare a ridurre la shadow acne.
   // gl.cullFace(gl.FRONT);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(shadowProgram);


    gl.disable(gl.CULL_FACE);

    //altra parte per shadow map point light
    isPointShadowPass = true;
    pointLightProjectionMatrix = perspective(90.0, 1.0, 0.1, POINT_SHADOW_FAR);
  
    var lightPos = vec3(
        lightPosition[0],
        lightPosition[1],
        lightPosition[2]
    );

    for (var i = 0; i < 6; i++) {
        var target = add(lightPos, pointShadowDirections[i]);

        pointLightViewMatrices[i] = lookAt(
            lightPos,
            target,
            pointShadowUps[i]
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadowFramebuffers[i]);
        gl.viewport(0, 0, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);

        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shadowProgram);

        // qui usiamo temporaneamente le matrici globali già usate da drawShadowObject
        lightViewMatrix = pointLightViewMatrices[i];
        lightProjectionMatrix = pointLightProjectionMatrix;

        drawShadowObject(teapotBuffers, modelMatrix1);
        drawShadowObject(tableBuffers, modelMatrix2);
        drawShadowObject(catBuffers, modelMatrix3);
        drawShadowObject(dogBuffers, modelMatrixDog);

         drawShadowObject(roomBoxBuffers, modelMatrixFloor);

        /*drawShadowObject(roomBoxBuffers, modelMatrixBackWall);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWall);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWall); */

        // uso i blockers
        drawShadowObject(roomBoxBuffers, modelMatrixBackWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWallBlocker);

        //ball mini-game shadow
        if (ballVisible && ballBody) {
            var modelMatrixBallShadow = mat4();

            modelMatrixBallShadow = mult(
                modelMatrixBallShadow,
                translate(
                    ballBody.position.x,
                    ballBody.position.y - BALL_RENDER_Y_OFFSET,
                    ballBody.position.z
                )
            );

            modelMatrixBallShadow = mult(
                modelMatrixBallShadow,
                scalem(ballRadius, ballRadius, ballRadius)
            );

            drawShadowObject(ballBuffers, modelMatrixBallShadow);
        }
    }
    

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Ripristino per il render normale
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    // Ripristino le matrici della shadow map classica,
    // perché per ora il fragment shader usa ancora shadowMap 2D.
    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

     // ===== NORMAL PASS =====
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // disegno prima la skybox
    DrawSkybox(gl, viewMatrix, projectionMatrix);

    //torno al programma normale
    gl.useProgram(program);

    // Nella render pass normale torno al culling classico:
    // elimino le facce posteriori.
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
   
    gl.uniform4fv(
        gl.getUniformLocation(program, "lightPosition"),
        flatten(lightPosition)
    );
    gl.uniform4fv(
        gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct)
    );

    drawObject(teapotBuffers,
         teapotTexture,
          modelMatrix1,
           viewMatrix,
            projectionMatrix,useTexture_teapot, 
            false,false,true);

    drawObject(tableBuffers, tableTexture, modelMatrix2, viewMatrix,
         projectionMatrix, useTexture_table, false,false,true);

    drawObject(catBuffers, catTexture, modelMatrix3, viewMatrix,
         projectionMatrix, true, false,false,true);

    drawObject(
        dogBuffers,
        dogTexture,
        modelMatrixDog,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        false,  // twoSided
        true    // receiveShadow
    );
    drawObject(
        lightSphereBuffers,
        null,
        modelMatrixLight,
        viewMatrix,
        projectionMatrix,
        false,
        true
    );

     //ball mini-game render
   if (ballVisible && ballBody) {
        var modelMatrixBall = mat4();

        modelMatrixBall = mult(
            modelMatrixBall,
            translate(
                ballBody.position.x,
                ballBody.position.y - BALL_RENDER_Y_OFFSET,
                ballBody.position.z
            )
        );

        modelMatrixBall = mult(
            modelMatrixBall,
            scalem(ballRadius, ballRadius, ballRadius)
        );

        drawObject(
            ballBuffers,   // usa il buffer della sfera che già hai
            ballTexture,
            modelMatrixBall,
            viewMatrix,
            projectionMatrix,
            true,  
            false,  
            false,   
            true, 
            0       // wallShadowMode
        );
    }
    //parte per disegnaare direzione luce (debug)
    DrawLightDirectionArrow(
        gl,
        lightPosition,
        vec3(0.0, 0.0, 0.0),
        viewMatrix,
        projectionMatrix
    );

    gl.useProgram(program);


    drawObject(roomBoxBuffers, floorTexture, modelMatrixFloor,
    viewMatrix, projectionMatrix, true, false, false,  true,0);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixBackWall,
        viewMatrix, projectionMatrix, true, false, false,  true,1);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixLeftWall,
        viewMatrix, projectionMatrix, true, false, false,  true,2);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixRightWall,
        viewMatrix, projectionMatrix, true, false, false,  true,3);

    
   /*  //parte per collisione tavolo
     drawObject(
        roomBoxBuffers,
        null,
        modelMatrixTableCollider,
        viewMatrix,
        projectionMatrix,
        false,  // useTexture
        false,  // isLightMarker
        false,  // twoSided
        false   // receiveShadow
    );  */


    //painting part

    drawObject(roomBoxBuffers, paintingTexture, modelMatrixPainting,
    viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameTop,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameBottom,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameLeft,
        viewMatrix, projectionMatrix, true, false, false, true);

    drawObject(roomBoxBuffers, corniceTexture, modelMatrixFrameRight,
        viewMatrix, projectionMatrix, true, false, false, true);


}
