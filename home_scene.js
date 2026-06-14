function drawHomeScene(gl, viewMatrix, projectionMatrix) {
    //console.log("[function drawHomeScene]");
    

    //curtain always present in the scene
    // & also update physics for mini-game if active

    //startBackgroundMusic();

    if (showDogHeart) {
            dogHeartTimer += deltaTime;

            if (dogHeartTimer >= dogHeartDuration) {
                showDogHeart = false;
            }
    } 
    if (hideDogHeartPending) {
    hideDogHeartTimer += deltaTime;

    if (hideDogHeartTimer >= hideDogHeartDelay) {
        showDogHeart = false;
        dogHeartTimer = 0.0;

        hideDogHeartPending = false;
        hideDogHeartTimer = 0.0;
    }
    }

    if (flag_rot_teapot) {
        theta[axis] += rotationSpeed_teapot;
    }
    if(flag_rot_table){
        tableTheta += rotationSpeed_table;
    } 

    //collision cannon table
    if (tableBody) {
        tableBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            tableTheta * Math.PI / 180.0
        );
    }
   
    if (physicsWorld) {
        var now = performance.now();
        var deltaTime = (now - lastPhysicsTime) / 1000.0;
        lastPhysicsTime = now;

        deltaTime = Math.min(deltaTime, 0.05);

        if (curtain) {
            curtain.applyWind(now);
        }

        physicsWorld.step(fixedTimeStep, deltaTime, 5);
        

        if (miniGameActive) {
            
            updateBallBounceAnimation();
            
            //temporarly disable dog chasing ball to test ball bounce animation
            //checkBallStoppedAndSendDog(deltaTime);
            //updateDogMovementToBall(deltaTime);


            
            checkBallStoppedAndSendSkinnedDog();
            updateSkinnedDogFetchBall(deltaTime);
        }

        

        

        updateSkinnedDogCall(deltaTime);
        updateDogPetAnimation(deltaTime);


        

        if (curtain) {
            curtain.updateMesh();
        }
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


   initDogPositionIfNeeded();

    var dogX = dogCurrentX;
    var dogZ = dogCurrentZ;
    var dogFacingAngle = 0.0;

    if (dogMovingToBall) {
        dogX = dogCurrentX;
        dogZ = dogCurrentZ;
        dogFacingAngle = dogAngleToBall;
    } else if (moveDog) {
        dogWalkTime += dogWalkSpeed;

        dogX = dogBasePos[0];
        dogZ = dogBasePos[2] + Math.sin(dogWalkTime) * dogWalkRange;

        dogCurrentX = dogX;
        dogCurrentZ = dogZ;

        var direction = Math.cos(dogWalkTime);

        if (direction < 0.0) {
            dogFacingAngle = 180.0;
        } else {
            dogFacingAngle = 0.0;
        }
    } else {
        dogX = dogCurrentX;
        dogZ = dogCurrentZ;
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
        translate(
            TABLE_X,
            TABLE_Y + TABLE_TOP_OFFSET_Y,
            TABLE_Z
        )
    );

    modelMatrixTableCollider = mult(
        modelMatrixTableCollider,
        rotate(tableTheta, [0, 1, 0])
    );

    modelMatrixTableCollider = mult(
        modelMatrixTableCollider,
        scalem(
            TABLE_TOP_WIDTH,
            TABLE_TOP_HEIGHT,
            TABLE_TOP_DEPTH
        )
    );

  
    //matrici cat
    var modelMatrix3 = mat4();
    modelMatrix3 = mult(modelMatrix3, translate(catBasePos[0], catBasePos[1], catZ));
    modelMatrix3 = mult(modelMatrix3, rotate(catFacingAngle, [0, 1, 0]));
    modelMatrix3 = mult(modelMatrix3, rotate(-90, [1, 0, 0]));
    modelMatrix3 = mult(modelMatrix3, scalem(0.5, 0.5, 0.5));

    //matrici dog
    var modelMatrixDog = mat4();
    modelMatrixDog = mult(modelMatrixDog, translate(dogX, dogBasePos[1], dogZ));
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

    //parete modificata per la parte con finestra // blocker invisibili attorno alla finestra
    // La parete destra è lungo Z, quindi X rimane quasi fisso.

    
    var blockerX = 7.20;
    var blockerThickness = 0.03;

    // Limiti della parete
    var wallYMin = -2.5;
    var wallYMax =  1.5;

    var wallZMin = -7.2;
    var wallZMax =  7.2;

    // Limiti reali della finestra
    var windowY0 = -1.10;
    var windowY1 =  0.90;

    var windowZ0 = -2.52;
    var windowZ1 = -0.36;

    // Piccola sovrapposizione dei blocker dentro il foro
    var overlap = 0.10;

    var blockerWindowY0 = windowY0 + overlap;
    var blockerWindowY1 = windowY1 - overlap;

    var blockerWindowZ0 = windowZ0 + overlap;
    var blockerWindowZ1 = windowZ1 - overlap;

    // Bottom
    var bottomCenterY =
        (wallYMin + blockerWindowY0) * 0.5;

    var bottomSizeY =
        blockerWindowY0 - wallYMin;

    // Top
    var topCenterY =
        (blockerWindowY1 + wallYMax) * 0.5;

    var topSizeY =
        wallYMax - blockerWindowY1;

    // Lati: coprono tutta l’altezza della finestra
    var sideCenterY =
        (windowY0 + windowY1) * 0.5;

    var sideSizeY =
        windowY1 - windowY0 + overlap * 2.0;

    // Left
    var leftCenterZ =
        (wallZMin + blockerWindowZ0) * 0.5;

    var leftSizeZ =
        blockerWindowZ0 - wallZMin;

    // Right
    var rightCenterZ =
        (blockerWindowZ1 + wallZMax) * 0.5;

    var rightSizeZ =
        wallZMax - blockerWindowZ1;

    var modelMatrixRightBlockerLeft = mat4();

    modelMatrixRightBlockerLeft = mult(
        modelMatrixRightBlockerLeft,
        translate(
            blockerX,
            sideCenterY,
            leftCenterZ
        )
    );

    var modelMatrixRightBlockerLeft = mult(
        modelMatrixRightBlockerLeft,
        scalem(
            blockerThickness,
            sideSizeY,
            leftSizeZ
        )
    );

    var modelMatrixRightBlockerRight = mat4();

    modelMatrixRightBlockerRight = mult(
        modelMatrixRightBlockerRight,
        translate(
            blockerX,
            sideCenterY,
            rightCenterZ
        )
    );

    var modelMatrixRightBlockerRight = mult(
        modelMatrixRightBlockerRight,
        scalem(
            blockerThickness,
            sideSizeY,
            rightSizeZ
        )
    );

    var modelMatrixRightBlockerBottom = mat4(); 
    modelMatrixRightBlockerBottom = mult( modelMatrixRightBlockerBottom, translate( blockerX, bottomCenterY, 0.0 ) );
     modelMatrixRightBlockerBottom = mult( modelMatrixRightBlockerBottom, scalem( blockerThickness, bottomSizeY, wallZMax - wallZMin ) );

    var modelMatrixRightBlockerTop = mat4(); 
    modelMatrixRightBlockerTop = mult( modelMatrixRightBlockerTop, translate( blockerX, topCenterY, 0.0 ) );
     modelMatrixRightBlockerTop = mult( modelMatrixRightBlockerTop, scalem( blockerThickness, topSizeY, wallZMax - wallZMin ) );

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
        //drawShadowObject(dogBuffers, modelMatrixDog);


        

        drawShadowObject(roomBoxBuffers, modelMatrixFloor);

        /*drawShadowObject(roomBoxBuffers, modelMatrixBackWall);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWall);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWall); */

         // uso i blockers

       
        drawShadowObject(roomBoxBuffers, modelMatrixBackWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWallBlocker);

        // parete destra bucata reale
        //gl.disable(gl.CULL_FACE);

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerBottom
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerTop
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerLeft
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerRight
        );

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK); 

        //perparete destra con finestra bucata
        //drawShadowObject(roomBoxBuffers, modelMatrixRightWallBlocker);
       gl.disable(gl.CULL_FACE);
        //drawShadowObject(rightWallWindowBuffers, modelMatrixRightWallBlocker);
        /* drawShadowObject(rightWallWindowBuffers, modelMatrixRightWall);

                
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK); */

        //blocker parete con finestra???????

        /* gl.disable(gl.CULL_FACE);

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerTop
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerBottom
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerFront
        );

        drawShadowObject(
            roomBoxBuffers,
            modelMatrixRightBlockerBack
        );

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK); */



        if ((ballVisible || dogHasBall) && ballBody) {
            var modelMatrixBall = getBallModelMatrix();

            drawShadowObject(ballBuffers, modelMatrixBall);
        }


        if (curtain) {
            gl.disable(gl.CULL_FACE);
            drawShadowObject(curtain, mat4());
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        }

        //drawSkinnedDogShadow(lightViewMatrix, lightProjectionMatrix, true)

        if (ENABLE_SKINNED_DOG_SHADOW) {
            console.log("Drawing skinned dog depth-only shadow pass");
            drawSkinnedDogDepthOnly(lightViewMatrix, lightProjectionMatrix);
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

    /* drawObject(tableBuffers, tableTexture, modelMatrix2, viewMatrix,
         projectionMatrix, useTexture_table, false,false,true); */
    
    drawTableMaterial(
        tableBuffers,
        modelMatrix2,
        viewMatrix,
        projectionMatrix
    );
    drawObject(catBuffers, catTexture, modelMatrix3, viewMatrix,
         projectionMatrix, true, false,false,true);

    /* drawObject(
        dogBuffers,
        dogTexture,
        modelMatrixDog,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        false,  // twoSided
        true    // receiveShadow
    ); */

    // prova disegno rigged dog parts
    //drawSeparatedDog(viewMatrix, projectionMatrix, performance.now());
    drawObject(
        lightSphereBuffers,
        null,
        modelMatrixLight,
        viewMatrix,
        projectionMatrix,
        false,
        true
    );

    drawSkinnedDog(viewMatrix, projectionMatrix);


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



    
    
    if ((ballVisible || dogHasBall) && ballBody) {
        var modelMatrixBall = getBallModelMatrix();
        /* if (dogHasBall) {
            var rad = dogCurrentAngle * Math.PI / 180.0;

            var forwardX = Math.sin(rad);
            var forwardZ = Math.cos(rad);

            
            var mouthX = dogFetchX + forwardX * 1.10;
           var mouthY = -1.50;
            var mouthZ = dogFetchZ + forwardZ * 1.10;

            modelMatrixBall = mult(modelMatrixBall, translate(mouthX, mouthY, mouthZ));
            modelMatrixBall = mult(modelMatrixBall, scalem(ballRadius, ballRadius, ballRadius));
        } else {
            modelMatrixBall = mult(
                modelMatrixBall,
                translate(
                    ballBody.position.x,
                    ballBody.position.y,
                    ballBody.position.z
                )
            );

            modelMatrixBall = mult(modelMatrixBall, scalem(0.25, 0.25, 0.25));
        } */

        drawObject(
            ballBuffers,
            ballTexture,
            modelMatrixBall,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            false,
            true
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

    gl.disable(gl.CULL_FACE);
    drawObject(roomBoxBuffers, wallTexture, modelMatrixLeftWall,
        viewMatrix, projectionMatrix, true, false, false,  true,2);

    //draw parete destra (bucata da finestra)
    drawObject(rightWallWindowBuffers, wallTexture, modelMatrixRightWall,
    viewMatrix, projectionMatrix, true, false, false, true, 3);

    


    //curtain part
    if (curtain) {
        drawObject(
            curtain,
            curtainTexture,
            mat4(),
            viewMatrix,
            projectionMatrix,
            true,   // useTexture
            false,  // isLightMarker
            true,   // twoSided: importante per vedere entrambi i lati della stoffa
            true,   // receiveShadow
            0
        );
    }
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    if (showCollisionDebug) {
        
        //parte per collisione tavolo
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
        );  

        //debug collider gambe del tavolo
        var legOffsetX = TABLE_TOP_WIDTH / 2.0 - TABLE_LEG_MARGIN_X;
        var legOffsetZ = TABLE_TOP_DEPTH / 2.0 - TABLE_LEG_MARGIN_Z;

        drawObject(roomBoxBuffers, null,
            getTableLegDebugMatrix(-legOffsetX, -legOffsetZ),
            viewMatrix, projectionMatrix,
            false, false, false, false, 0
        );

        drawObject(roomBoxBuffers, null,
            getTableLegDebugMatrix(legOffsetX, -legOffsetZ),
            viewMatrix, projectionMatrix,
            false, false, false, false, 0
        );

        drawObject(roomBoxBuffers, null,
            getTableLegDebugMatrix(-legOffsetX, legOffsetZ),
            viewMatrix, projectionMatrix,
            false, false, false, false, 0
        );

        drawObject(roomBoxBuffers, null,
            getTableLegDebugMatrix(legOffsetX, legOffsetZ),
            viewMatrix, projectionMatrix,
            false, false, false, false, 0
        );
    }

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


function rotateOffsetY(x, z, angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    return {
        x: x * c - z * s,
        z: x * s + z * c
    };
}

function getTableLegDebugMatrix(offsetX, offsetZ) {
    var r = rotateOffsetY(offsetX, offsetZ, tableTheta);

    var m = mat4();

    m = mult(m, translate(
        TABLE_X + r.x,
        TABLE_Y + TABLE_LEG_OFFSET_Y,
        TABLE_Z + r.z
    ));

    m = mult(m, rotate(tableTheta, [0, 1, 0]));

    m = mult(m, scalem(
        TABLE_LEG_WIDTH,
        TABLE_LEG_HEIGHT,
        TABLE_LEG_DEPTH
    ));

    return m;
}