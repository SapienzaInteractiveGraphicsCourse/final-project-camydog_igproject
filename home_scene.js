function drawHomeScene(gl, viewMatrix, projectionMatrix) {
   
    

    //curtain always present in the scene
    // & also update physics for mini-game if active

    

    resizeCanvasToDisplaySize();

   
            
    if (showDogHeart) {
        var heartDeltaTime =
            typeof deltaTime === "number" && isFinite(deltaTime)
                ? deltaTime
                : 1.0 / 60.0;

        dogHeartTimer += heartDeltaTime;

        if (dogHeartTimer >= dogHeartDuration) {
            resetDogHeartEffect();
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
        updateKibbleSpawner(deltaTime);
        updateKibbles(deltaTime);
        

        if (miniGameActive) {
            
            updateBallBounceAnimation();
            
            //temporarly disable dog chasing ball to test ball bounce animation
            //checkBallStoppedAndSendDog(deltaTime);
            //updateDogMovementToBall(deltaTime);


            checkBallTeapotCollision();
            
            checkBallStoppedAndSendSkinnedDog();
            
        }
        updateTeapotFragments(deltaTime);
        
        //checking if dog is in follow teapot mode, if so update dog position and animation
        if (dogFollowTeapotMode) {
            updateDogFollowTeapot(deltaTime);
            updateSkinnedDogFetchBall(deltaTime);
        }

        
        updateSkinnedDogFetchBall(deltaTime);

        

        updateSkinnedDogCall(deltaTime);
        updateDogPetAnimation(deltaTime);
        updateWater(deltaTime);


        

        if (curtain) {
            curtain.updateMesh();
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
    modelMatrixLight = mult(modelMatrixLight, scalem(1.0, 1.0, 1.0));

    //matrici teapot -- on the table , rotates with theta , scaled by 0.5
    var modelMatrix1 = mat4();
    modelMatrix1 = mult(modelMatrix1, translate(objPos[0], objPos[1], objPos[2]));
    modelMatrix1 = mult(modelMatrix1, scalem(0.5, 0.5, 0.5));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[0], [1, 0, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[1], [0, 1, 0]));
    modelMatrix1 = mult(modelMatrix1, rotate(theta[2], [0, 0, 1]));

    //table matrix -- 
    var modelMatrix2 = mat4();
    modelMatrix2 = mult(modelMatrix2, translate(0.0, -1.9, 0.0));
    modelMatrix2 = mult(modelMatrix2, rotate(tableTheta, [0, 1, 0]));
    modelMatrix2 = mult(modelMatrix2, scalem(3.0, 1.5, 2.0));

    //table collider matrices (invisible, used only for collisions)
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

  
   

    //dog matrices
    var modelMatrixDog = mat4();
    modelMatrixDog = mult(modelMatrixDog, translate(dogX, dogBasePos[1], dogZ));
    modelMatrixDog = mult(modelMatrixDog, rotate(dogFacingAngle, [0, 1, 0]));
    modelMatrixDog = mult(modelMatrixDog, rotate(-90, [1, 0, 0]));
    modelMatrixDog = mult(modelMatrixDog, scalem(1.0, 1.0, 1.0));

    //bowl matrix
    var modelMatrixBowl= mat4();
    modelMatrixBowl= mult(modelMatrixBowl,translate(5.0,-2.25,5.0));
    modelMatrixBowl = mult(modelMatrixBowl, scalem(0.5, 0.5, 0.5));

    //bowl collider matrix
    var modelMatrixBowlCollider = mat4();

    modelMatrixBowlCollider = mult(
        modelMatrixBowlCollider,
        translate(bowlX, bowlY, bowlZ)
    );

    
    modelMatrixBowlCollider = mult(
        modelMatrixBowlCollider,
        rotate(90, [1, 0, 0])
    );

    modelMatrixBowlCollider = mult(
        modelMatrixBowlCollider,
        scalem(
            bowlColliderRadius,  // radius X
            bowlColliderRadius,  // radius Z after rotation
            bowlColliderHeight   // height of the cylinder
        )
    );

    //water disk matrix

    var modelMatrixWaterDisk = mat4();

    modelMatrixWaterDisk = mult(
        modelMatrixWaterDisk,
        translate(bowlX, bowlY + 0.07, bowlZ)
    );

    modelMatrixWaterDisk = mult(
        modelMatrixWaterDisk,
        scalem(
            0.3 * waterFillAmount,
            0.3,
            0.3 * waterFillAmount
        )
    );






    //curtain rod
    var modelMatrixCurtainRod= mat4();
     modelMatrixCurtainRod = mult(modelMatrixCurtainRod, translate(6.9, 1.258, -1.28));
    modelMatrixCurtainRod = mult(modelMatrixCurtainRod, rotate(90, [0, 1, 0]));
    modelMatrixCurtainRod = mult(modelMatrixCurtainRod, scalem(1.5, 0.1, 0.1));


    // ===== ROOM BOX =====

    // floor
    var modelMatrixFloor = mat4();
    modelMatrixFloor = mult(modelMatrixFloor, translate(0.0, -2.5, 0.0));
    modelMatrixFloor = mult(modelMatrixFloor, scalem(14.0, 0.1, 14.0));

    // back wall
    var modelMatrixBackWall = mat4();
    modelMatrixBackWall = mult(modelMatrixBackWall, translate(0.0, -0.5, -7.0));
    modelMatrixBackWall = mult(modelMatrixBackWall, scalem(14.0, 4.0, 0.15));

    // blocker for the back wall
    var modelMatrixBackWallBlocker = mat4();
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, translate(0.0, -0.5, -7.08));
    modelMatrixBackWallBlocker = mult(modelMatrixBackWallBlocker, scalem(14.6, 4.2, 0.15));

    // left wall
    var modelMatrixLeftWall = mat4();
    modelMatrixLeftWall = mult(modelMatrixLeftWall, translate(-7.0, -0.5, 0.0));
    modelMatrixLeftWall = mult(modelMatrixLeftWall, scalem(0.15, 4.0, 14.4));

    //blockerfor the left wall
    var modelMatrixLeftWallBlocker = mat4();
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, translate(-7.08, -0.5, 0.0));
    modelMatrixLeftWallBlocker = mult(modelMatrixLeftWallBlocker, scalem(0.15, 4.2, 14.6));

    // right wall
    var modelMatrixRightWall = mat4();
    modelMatrixRightWall = mult(modelMatrixRightWall, translate(6.75, -0.5, 0.0));
    modelMatrixRightWall = mult(modelMatrixRightWall, scalem(0.5, 4.0, 14.4));
    // blocker for the right wall
    var modelMatrixRightWallBlocker = mat4();
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, translate(6.8, -0.5, 0.0));
    modelMatrixRightWallBlocker = mult(modelMatrixRightWallBlocker, scalem(0.5, 4.2, 14.6));

    //modified wall with window
    // there are invisible blockers that cover the window area, so that the shadow map is correct
    // The right wall is along Z, so X remains almost fixed.

    
    var blockerX = 7.20;
    var blockerThickness = 0.03;

    // Wall limits
    var wallYMin = -2.5;
    var wallYMax =  1.5;

    var wallZMin = -7.2;
    var wallZMax =  7.2;

    // Real window limits
    var windowY0 = -1.10;
    var windowY1 =  0.90;

    var windowZ0 = -2.52;
    var windowZ1 = -0.36;

    // Small overlap of the blockers inside the hole
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

    // Sides: cover the entire height of the window
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

    // panel of the painting on the back wall
    var modelMatrixPainting = mat4();
    modelMatrixPainting = mult(modelMatrixPainting, translate(0.0, 0.7, -6.93));
    modelMatrixPainting = mult(modelMatrixPainting, scalem(2.2, 1.3, 0.04));

    // top frame
    var modelMatrixFrameTop = mat4();
    modelMatrixFrameTop = mult(modelMatrixFrameTop, translate(0.0, 1.4, -6.88));
    modelMatrixFrameTop = mult(modelMatrixFrameTop, scalem(2.45, 0.10, 0.10));

    // bottom frame
    var modelMatrixFrameBottom = mat4();
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, translate(0.0, 0.0, -6.88));
    modelMatrixFrameBottom = mult(modelMatrixFrameBottom, scalem(2.45, 0.10, 0.10));

    // left frame
    var modelMatrixFrameLeft = mat4();
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, translate(-1.22, 0.7, -6.88));
    modelMatrixFrameLeft = mult(modelMatrixFrameLeft, scalem(0.10, 1.45, 0.10));

    // right frame
    var modelMatrixFrameRight = mat4();
    modelMatrixFrameRight = mult(modelMatrixFrameRight, translate(1.22, 0.7, -6.88));
    modelMatrixFrameRight = mult(modelMatrixFrameRight, scalem(0.10, 1.45, 0.10));

    // before the shadow pass
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
    gl.viewport(0, 0, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // In the shadow pass, I eliminate the front faces.
    // This can help reduce shadow acne.
   // gl.cullFace(gl.FRONT);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(shadowProgram);


    gl.disable(gl.CULL_FACE);

    //another part for shadow map point light
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

        // here we temporarily use the global matrices already used by drawShadowObject
        lightViewMatrix = pointLightViewMatrices[i];
        lightProjectionMatrix = pointLightProjectionMatrix;

        
        drawShadowObject(teapotBuffers, modelMatrix1);
        drawShadowObject(tableBuffers, modelMatrix2);

        drawShadowObject(bowlBuffers,modelMatrixBowl);

        
        //drawShadowObject(dogBuffers, modelMatrixDog);


        

        //drawShadowObject(roomBoxBuffers, modelMatrixFloor);

        /*drawShadowObject(roomBoxBuffers, modelMatrixBackWall);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWall);
        drawShadowObject(roomBoxBuffers, modelMatrixRightWall); */

         // use the blockers

       gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        

        drawShadowObject(roomBoxBuffers, modelMatrixBackWallBlocker);
        drawShadowObject(roomBoxBuffers, modelMatrixLeftWallBlocker);

        // real right wall with hole
        

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

        
         //gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // prepare right wall with hole
        //drawShadowObject(roomBoxBuffers, modelMatrixRightWallBlocker);
       gl.disable(gl.CULL_FACE);
        



        if ((ballVisible || dogHasBall) && ballBody) {
            var modelMatrixBall = getBallModelMatrix();

            drawShadowObject(ballBuffers, modelMatrixBall);
        }


        if (curtain) {
            gl.disable(gl.CULL_FACE);
            drawShadowObject(curtain, mat4());
            //drawShadowObject()
           

            drawShadowObject(curtainRodBuffers,modelMatrixCurtainRod);

             gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
        }

        //drawSkinnedDogShadow(lightViewMatrix, lightProjectionMatrix, true)

        if (ENABLE_SKINNED_DOG_SHADOW) {
            //console.log("Drawing skinned dog depth-only shadow pass");
            drawSkinnedDogDepthOnly(lightViewMatrix, lightProjectionMatrix);
        }
        
    }
    

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Restore for the normal render
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);

    // Restore the classic shadow map matrices,
    // because for now the fragment shader still uses 2D shadowMap.
    lightViewMatrix = classicLightViewMatrix;
    lightProjectionMatrix = classicLightProjectionMatrix;

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

     // ===== NORMAL PASS =====
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // draw the skybox first
    DrawSkybox(gl, viewMatrix, projectionMatrix);

    // return to the normal program
    gl.useProgram(program);

    // In the normal render pass, return to classic culling:
    // eliminate the back faces.
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


    drawObject(
        bowlBuffers,
        bowlTexture,
        modelMatrixBowl,
        viewMatrix,
        projectionMatrix,
        true,   // useTexture
        false,  // isLightMarker
        false,  // twoSided
        true,   // receiveShadow
        0,      // wallShadowMode
        false,  // isSunHalo
        1.0,    // globalAlpha
        false,  // isWallLampModel
        true    // isBowlMaterial
    );


    //drawKibbleParticles(viewMatrix, projectionMatrix);
    drawKibbleParticles(viewMatrix, projectionMatrix);


    if (waterFillAmount > 0.001) {

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);

    

          drawObject(
            waterDiskBuffers,
            waterDiskTexture,
            modelMatrixWaterDisk,
            viewMatrix,
            projectionMatrix,
            true,
            false,
            true,
            false,
            false,
            false,
            0.40 * waterFillAmount
        );




        gl.depthMask(true);
        gl.disable(gl.BLEND);

    }


    gl.disable(gl.CULL_FACE);

    if (!teapotBroken) {
        drawObject(
            teapotBuffers,
            teapotTexture,
            modelMatrix1,
            viewMatrix,
            projectionMatrix,
            useTexture_teapot,
            false,
            false,
            true,
            8
        );
    } else {
        drawTeapotFragments(viewMatrix, projectionMatrix);
    }


    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
        
    
    drawTableMaterial(
        tableBuffers,
        modelMatrix2,
        viewMatrix,
        projectionMatrix
    );



    drawSkinnedDog(viewMatrix, projectionMatrix);


    if (showDogHeart && heartBuffers) {
        var heartMatrix = getDogHeartModelMatrix();

        drawObject(
            heartBuffers,
            heartTexture, 
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

    //part for debug light direction (not showed in the final version)
    DrawLightDirectionArrow(
        gl,
        lightPosition,
        vec3(0.0, 0.0, 0.0),
        viewMatrix,
        projectionMatrix
    );

    gl.useProgram(program);


    drawObject(roomBoxBuffers, floorTexture, modelMatrixFloor,
    viewMatrix, projectionMatrix, true, false, false,  true,5);

    drawObject(roomBoxBuffers, wallTexture, modelMatrixBackWall,
        viewMatrix, projectionMatrix, true, false, false,  true,1);

    
    drawObject(roomBoxBuffers, wallTexture, modelMatrixLeftWall,
        viewMatrix, projectionMatrix, true, false, false,  true,2);

    gl.disable(gl.CULL_FACE);
    
    //draw right wall (with window hole)
    drawObject(rightWallWindowBuffers, wallTexture, modelMatrixRightWall,
    viewMatrix, projectionMatrix, true, false, false, true, 3);


    // wall lamp part
    var modelMatrixWallLamp = getWallLampModelMatrix();

    if (
        currentScene === "home" &&
        isNight &&
        wallLampEnabled
    ) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);

       

        drawWallLampGlow(viewMatrix, projectionMatrix, 0.45, 0.8);

        drawWallLampGlow(
            viewMatrix,
            projectionMatrix,
            0.24,
            0.95
        );

        gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.BLEND);
    }

    drawObject(
        wallLampBuffers,
        wallLampTexture,
        modelMatrixWallLamp,
        viewMatrix,
        projectionMatrix,
        true,
        false,
        false,
        false,
        0,
        false,
        1.0,
        true,
        false
    );

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
            true,   // twoSided: important so to see the curtain from both sides
            true,   // receiveShadow
            4
        );

        drawObject(curtainRodBuffers,moonTexture,modelMatrixCurtainRod,viewMatrix,projectionMatrix,
            true,
            false,
            true,
            true);
        
    }
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    if (showCollisionDebug) {
        
        //part for table collision
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

        //debug collider table legs
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

        //bowl debug collider
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);

        // optional: for debug, you can see it even if a face is flipped
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        

        drawObject(
            curtainRodBuffers,              
            null,       // red/green/blue texture
            modelMatrixBowlCollider,
            viewMatrix,
            projectionMatrix,
            true,   // useTexture
            false,  // isLightMarker
            true,   // twoSided
            false,  // receiveShadow
            false,  // wallShadowMode
            false,  // isSunHalo
            0.35    // transparent alpha
        );

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.depthMask(true);
        gl.disable(gl.BLEND);

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

    //bowl



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
            modelMatrixMoon,
            viewMatrix,
            projectionMatrix,
            true,   // useTexture
            true,   // isLightMarker
            false,  // twoSided
            false,  // receiveShadow
            0,      // wallShadowMode
            false,  // isSunHalo
            1.0,    // globalAlpha
            false,  // isWallLampModel
            false,  // isBowlMaterial
            true    // isMoonMarker
        );
        
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

        // reset to the normal program
        gl.useProgram(program);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);

        // sun marker (the sun itself, not the halo)
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

function getTableLegDebugMatrix_old(offsetX, offsetZ) {
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

function getTableLegDebugMatrix(offsetX, offsetZ) {
    var m = mat4();

    /*
        Same logic as the compound collider in Cannon:
        1. position of the table body
        2. rotation of the table body
        3. local offset of the individual leg
        4. scale of the leg
    */

    m = mult(m, translate(
        TABLE_X,
        TABLE_Y,
        TABLE_Z
    ));

    m = mult(m, rotate(tableTheta, [0, 1, 0]));

    m = mult(m, translate(
        offsetX,
        TABLE_LEG_OFFSET_Y,
        offsetZ
    ));

    m = mult(m, scalem(
        TABLE_LEG_WIDTH,
        TABLE_LEG_HEIGHT,
        TABLE_LEG_DEPTH
    ));

    return m;
}