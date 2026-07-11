function initPointShadowMaps()
{
    pointShadowFramebuffers = [];
    pointShadowTextures = [];

    for (var i = 0; i < 6; i++) {
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            POINT_SHADOW_SIZE,
            POINT_SHADOW_SIZE,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        var depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(
            gl.RENDERBUFFER,
            gl.DEPTH_COMPONENT16,
            POINT_SHADOW_SIZE,
            POINT_SHADOW_SIZE
        );

        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );

        gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER,
            depthBuffer
        );

        pointShadowFramebuffers.push(framebuffer);
        pointShadowTextures.push(texture);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function clearOldShadowMaps() {
    /*
        white -> depth far = no shadow
    */

    var oldViewport = gl.getParameter(gl.VIEWPORT);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // ===== clear point shadow maps =====
    if (pointShadowFramebuffers && pointShadowFramebuffers.length > 0) {
        gl.viewport(0, 0, POINT_SHADOW_SIZE, POINT_SHADOW_SIZE);

        for (var i = 0; i < pointShadowFramebuffers.length; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, pointShadowFramebuffers[i]);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
    }

    // ===== clear old directional shadow map =====
    if (shadowFramebuffer) {
        var directionalShadowSize = POINT_SHADOW_SIZE; 

        gl.viewport(0, 0, directionalShadowSize, directionalShadowSize);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // back to normal framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // reset viewport canvas
    gl.viewport(
        oldViewport[0],
        oldViewport[1],
        oldViewport[2],
        oldViewport[3]
    );

    // reset clear color
    gl.clearColor(0.7, 0.9, 0.7, 1.0);
}


function drawShadowObject(obj, modelMatrix) {
    // be sure to use the right shader program before setting uniforms and attributes
    gl.useProgram(shadowProgram);
    var lightModelViewMatrix = mult(lightViewMatrix, modelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);
    var vPosition = gl.getAttribLocation(shadowProgram, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "lightModelViewMatrix"),
        false,
        flatten(lightModelViewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "lightProjectionMatrix"),
        false,
        flatten(lightProjectionMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(shadowProgram, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniform4fv(
        gl.getUniformLocation(shadowProgram, "lightPosition"),
        flatten(lightPosition)
    );

    gl.uniform1i(
        gl.getUniformLocation(shadowProgram, "pointShadowPass"),
        isPointShadowPass ? 1 : 0
    );

    gl.uniform1i(
        gl.getUniformLocation(shadowProgram, "pointShadowPass"),
        isPointShadowPass ? 1 : 0
    );

    gl.uniform1f(
        gl.getUniformLocation(shadowProgram, "pointShadowFar"),
        POINT_SHADOW_FAR
    );

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}



/****************************** ********************************/
//        WALL LAMP SHADOW MAP                                  //
//         PART OF THE PROJECT                                  //
/*************************************************************** */
function initWallLampShadowMap() {
    wallLampShadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, wallLampShadowFramebuffer);

    wallLampShadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, wallLampShadowTexture);

    var emptyPixels = new Uint8Array(
        WALL_LAMP_SHADOW_SIZE *
        WALL_LAMP_SHADOW_SIZE *
        4
    );

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        WALL_LAMP_SHADOW_SIZE,
        WALL_LAMP_SHADOW_SIZE,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        emptyPixels
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        WALL_LAMP_SHADOW_SIZE,
        WALL_LAMP_SHADOW_SIZE
    );

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        wallLampShadowTexture,
        0
    );

    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depthBuffer
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawWallLampShadowObject(obj, modelMatrix) {
    if (!obj || !wallLampShadowProgram) {
        return;
    }

    gl.useProgram(wallLampShadowProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vBuffer);

    var vPosition =
        gl.getAttribLocation(wallLampShadowProgram, "vPosition");

    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampShadowProgram, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampShadowProgram, "wallLampViewMatrix"),
        false,
        flatten(wallLampViewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampShadowProgram, "wallLampProjectionMatrix"),
        false,
        flatten(wallLampProjectionMatrix)
    );

    gl.drawArrays(gl.TRIANGLES, 0, obj.numVertices);
}


function updateWallLampMatrices() {
    wallLampViewMatrix = lookAt(
        wallLampPosition,
        wallLampTarget,
        vec3(0.0, 1.0, 0.0)
    );

    wallLampProjectionMatrix = perspective(
        wallLampFov,
        1.0,
        wallLampNear,
        wallLampFar
    );
}


function renderWallLampShadowMap() {
    if (
        !wallLampEnabled ||
        !wallLampShadowEnabled ||
        !wallLampShadowFramebuffer ||
        currentScene !== "home" ||
        !isNight
    ) {
        return;
    }

    updateWallLampMatrices();

    var oldViewport = gl.getParameter(gl.VIEWPORT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, wallLampShadowFramebuffer);
    gl.viewport(
        0,
        0,
        WALL_LAMP_SHADOW_SIZE,
        WALL_LAMP_SHADOW_SIZE
    );

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.CULL_FACE);

    drawWallLampShadowCasters();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(
        oldViewport[0],
        oldViewport[1],
        oldViewport[2],
        oldViewport[3]
    );

    gl.clearColor(0.7, 0.9, 0.7, 1.0);
}


function drawWallLampShadowCasters() {
   // here i want the ombject that can cast shadow from the wall lamp
   // so ball +dog+ teapot
    var modelMatrixBall= getBallModelMatrix();
    drawWallLampShadowObject(ballBuffers, modelMatrixBall);

    if (teapotBuffers) {
        drawWallLampShadowObject(
            teapotBuffers,
            getTeapotModelMatrix()
        );
    }

    if (skinnedDog && skinnedDogDepthProgram) {
        drawSkinnedDogWallLampShadow();
    }


}




function getWallLampBulbModelMatrix(scale) {
    var modelMatrix = mat4();

    modelMatrix = mult(
        modelMatrix,
        translate(
            -6.30,
            0.89,
            -2.00
        )
    );

    modelMatrix = mult(
        modelMatrix,
        scalem(
            scale,
            scale,
            scale
        )
    );

    return modelMatrix;
}


function initWallLampGlowQuad() {
    wallLampGlowBuffers = {};

    var positions = [
        vec4(0.0, -1.0, -1.0, 1.0),
        vec4(0.0,  1.0, -1.0, 1.0),
        vec4(0.0,  1.0,  1.0, 1.0),

        vec4(0.0, -1.0, -1.0, 1.0),
        vec4(0.0,  1.0,  1.0, 1.0),
        vec4(0.0, -1.0,  1.0, 1.0)
    ];

    var texCoords = [
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),

        vec2(0.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0)
    ];

    wallLampGlowBuffers.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallLampGlowBuffers.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    wallLampGlowBuffers.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallLampGlowBuffers.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    wallLampGlowBuffers.numVertices = 6;
}


function drawWallLampGlow(viewMatrix, projectionMatrix, scale, alpha) {
    if (!wallLampGlowProgram || !wallLampGlowBuffers) {
        return;
    }

    var modelMatrix = mat4();

    //var glowOffsetFromWall = 0.16;

    modelMatrix = mult(
        modelMatrix,
        translate(
            -6.30 ,
            0.65,
            -2.00
        )
    );

    modelMatrix = mult(
        modelMatrix,
        scalem(
            scale,
            scale,
            scale
        )
    );

    gl.useProgram(wallLampGlowProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, wallLampGlowBuffers.vBuffer);

    var vPosition =
        gl.getAttribLocation(wallLampGlowProgram, "vPosition");

    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, wallLampGlowBuffers.tBuffer);

    var vTexCoord =
        gl.getAttribLocation(wallLampGlowProgram, "vTexCoord");

    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampGlowProgram, "modelMatrix"),
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampGlowProgram, "viewMatrix"),
        false,
        flatten(viewMatrix)
    );

    gl.uniformMatrix4fv(
        gl.getUniformLocation(wallLampGlowProgram, "projectionMatrix"),
        false,
        flatten(projectionMatrix)
    );

    gl.uniform3fv(
        gl.getUniformLocation(wallLampGlowProgram, "glowColor"),
        flatten(vec3(1.0, 0.55, 0.16))
    );

    gl.uniform1f(
        gl.getUniformLocation(wallLampGlowProgram, "glowAlpha"),
        alpha
    );

    gl.drawArrays(
        gl.TRIANGLES,
        0,
        wallLampGlowBuffers.numVertices
    );
}