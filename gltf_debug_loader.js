
// function to prepare buffers for rendering the skinned dog
function createSkinnedDogBuffers(gl, gltf, binary) {
    const mesh = gltf.meshes[0];
    const primitive = mesh.primitives[0];

    const positions = readAccessor(gltf, binary, primitive.attributes.POSITION);
    const normals   = readAccessor(gltf, binary, primitive.attributes.NORMAL);
    const uvs       = readAccessor(gltf, binary, primitive.attributes.TEXCOORD_0);
    const joints    = readAccessor(gltf, binary, primitive.attributes.JOINTS_0);
    const weights   = readAccessor(gltf, binary, primitive.attributes.WEIGHTS_0);
    const indices   = readAccessor(gltf, binary, primitive.indices);

    function makeBuffer(data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.array, gl.STATIC_DRAW);

    var nodeParents = new Array(gltf.nodes.length).fill(-1);

    for (var i = 0; i < gltf.nodes.length; i++) {
        var node = gltf.nodes[i];

        if (node.children) {
            for (var c = 0; c < node.children.length; c++) {
                nodeParents[node.children[c]] = i;
            }
        }
    }

    var meshNodeIndex = -1;

    for (var i = 0; i < gltf.nodes.length; i++) {
        if (gltf.nodes[i].mesh === 0) {
            meshNodeIndex = i;
            break;
        }
    }

    console.log("Mesh node index:", meshNodeIndex, gltf.nodes[meshNodeIndex]);

    //part fo texture
    var dogTextureFromGLB = null;

    if (
        gltf.materials &&
        gltf.materials.length > 0 &&
        gltf.materials[0].pbrMetallicRoughness &&
        gltf.materials[0].pbrMetallicRoughness.baseColorTexture
    ) {
        var textureIndex = gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index;
        var imageIndex = gltf.textures[textureIndex].source;

        dogTextureFromGLB = createTextureFromGLBImage(
            gl,
            gltf,
            binary,
            imageIndex
        );

        console.log("Using GLB baseColorTexture:", textureIndex, "image:", imageIndex);
    } else {
        console.warn("No baseColorTexture found in GLB material");
    }

    return {
        positionBuffer: makeBuffer(positions.array),
        normalBuffer: makeBuffer(normals.array),
        uvBuffer: makeBuffer(uvs.array),
        jointBuffer: makeBuffer(joints.array),
        weightBuffer: makeBuffer(weights.array),

        indexBuffer: indexBuffer,
        indexCount: indices.count,
        indexComponentType: indices.componentType,

        skin: gltf.skins[0],
        nodes: gltf.nodes,
        nodeParents: nodeParents,
        meshNodeIndex: meshNodeIndex,
        texture: dogTextureFromGLB,

        inverseBindMatrices: readAccessor(
            gltf,
            binary,
            gltf.skins[0].inverseBindMatrices
        ).array
    };
}

function printDogSkinJoints(gltf) {
    if (!gltf || !gltf.nodes || !gltf.skins || gltf.skins.length === 0) {
        console.warn("No glTF skin data found.");
        return;
    }

    var skin = gltf.skins[0];

    console.log("===== DOG JOINT NAMES =====");

    for (var i = 0; i < skin.joints.length; i++) {
        var nodeIndex = skin.joints[i];
        var node = gltf.nodes[nodeIndex];

        console.log(
            i,
            nodeIndex,
            node && node.name ? node.name : "(unnamed)"
        );
    }
}


function printDogParentRelationships(gltf) {
    if (!gltf || !gltf.nodes) {
        console.warn("No glTF nodes found.");
        return;
    }

    var nodes = gltf.nodes;
    var parentOf = {};

    for (var parentIndex = 0; parentIndex < nodes.length; parentIndex++) {
        var parentNode = nodes[parentIndex];

        if (!parentNode.children) {
            continue;
        }

        for (var i = 0; i < parentNode.children.length; i++) {
            var childIndex = parentNode.children[i];
            parentOf[childIndex] = parentIndex;
        }
    }

    console.log("===== DOG PARENT RELATIONSHIPS =====");

    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        var node = nodes[nodeIndex];
        var nodeName = node.name || "(unnamed)";

        if (
            nodeName.indexOf("Wolf_") === -1 &&
            nodeName.indexOf("Kishu") === -1
        ) {
            continue;
        }

        var parentIndexFound = parentOf[nodeIndex];

        if (parentIndexFound === undefined) {
            console.log(
                nodeIndex,
                nodeName,
                "parent: NONE"
            );
        } else {
            var parentName =
                nodes[parentIndexFound].name || "(unnamed)";

            console.log(
                nodeIndex,
                nodeName,
                "parent:",
                parentIndexFound,
                parentName
            );
        }
    }
}


function generateDogMermaidTxtFromGltf(gltf) {
    if (!gltf || !gltf.nodes) {
        console.warn("No glTF nodes found.");
        return;
    }

    var nodes = gltf.nodes;

    var lines = [];

    lines.push("flowchart TD");
    lines.push("");

    for (var parentIndex = 0; parentIndex < nodes.length; parentIndex++) {
        var parentNode = nodes[parentIndex];

        if (!parentNode.children) {
            continue;
        }

        var parentName = parentNode.name || "unnamed";

        if (parentName.indexOf("Wolf_") === -1) {
            continue;
        }

        for (var i = 0; i < parentNode.children.length; i++) {
            var childIndex = parentNode.children[i];
            var childNode = nodes[childIndex];
            var childName = childNode.name || "unnamed";

            if (childName.indexOf("Wolf_") === -1) {
                continue;
            }

            var parentId = "N" + parentIndex;
            var childId = "N" + childIndex;

            var cleanParentName = parentName
                .replaceAll("_", " ")
                .replaceAll(".", " ");

            var cleanChildName = childName
                .replaceAll("_", " ")
                .replaceAll(".", " ");

            lines.push(
                parentId +
                '["' +
                parentIndex +
                " " +
                cleanParentName +
                '"] --> ' +
                childId +
                '["' +
                childIndex +
                " " +
                cleanChildName +
                '"]'
            );
        }
    }

    var mermaidCode = lines.join("\n");

    console.log("===== DOG MERMAID TXT =====");
    console.log(mermaidCode);

    var blob = new Blob(
        [mermaidCode],
        { type: "text/plain" }
    );

    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "dog_skeleton_mermaid.txt";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}



function printDogMermaidFromGltf(gltf) {
    if (!gltf || !gltf.nodes) {
        console.warn("No glTF nodes found.");
        return;
    }

    var nodes = gltf.nodes;

    console.log("===== DOG MERMAID GRAPH =====");
    console.log("flowchart TD");

    for (var parentIndex = 0; parentIndex < nodes.length; parentIndex++) {
        var parentNode = nodes[parentIndex];

        if (!parentNode.children) {
            continue;
        }

        var parentName = parentNode.name || "unnamed";

        if (parentName.indexOf("Wolf_") === -1) {
            continue;
        }

        for (var i = 0; i < parentNode.children.length; i++) {
            var childIndex = parentNode.children[i];
            var childNode = nodes[childIndex];
            var childName = childNode.name || "unnamed";

            if (childName.indexOf("Wolf_") === -1) {
                continue;
            }

            var parentId = "N" + parentIndex;
            var childId = "N" + childIndex;

            var cleanParentName = parentName
                .replaceAll("_", " ")
                .replaceAll(".", " ");

            var cleanChildName = childName
                .replaceAll("_", " ")
                .replaceAll(".", " ");

            console.log(
                parentId +
                '["' +
                parentIndex +
                " " +
                cleanParentName +
                '"] --> ' +
                childId +
                '["' +
                childIndex +
                " " +
                cleanChildName +
                '"]'
            );
        }
    }
}


async function loadGLBDebug(url) {
    console.log("Loading GLB:", url);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Failed to load GLB: " + url);
    }

    const arrayBuffer = await response.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Header GLB
    const magic = dataView.getUint32(0, true);
    const version = dataView.getUint32(4, true);
    const length = dataView.getUint32(8, true);

    console.log("GLB header:");
    console.log("magic:", magic.toString(16));
    console.log("version:", version);
    console.log("length:", length);

    if (magic !== 0x46546C67) {
        throw new Error("This is not a valid GLB file");
    }

    let offset = 12;

    let jsonChunk = null;
    let binaryChunk = null;

    while (offset < length) {
        const chunkLength = dataView.getUint32(offset, true);
        offset += 4;

        const chunkType = dataView.getUint32(offset, true);
        offset += 4;

        const chunkDataStart = offset;
        const chunkDataEnd = offset + chunkLength;

        if (chunkType === 0x4E4F534A) {
            // JSON chunk
            const jsonBytes = new Uint8Array(arrayBuffer, chunkDataStart, chunkLength);
            const jsonText = new TextDecoder("utf-8").decode(jsonBytes);
            jsonChunk = JSON.parse(jsonText);
        } else if (chunkType === 0x004E4942) {
            // BIN chunk
            binaryChunk = arrayBuffer.slice(chunkDataStart, chunkDataEnd);
        } else {
            console.warn("Unknown GLB chunk type:", chunkType.toString(16));
        }

        offset += chunkLength;
    }

    if (!jsonChunk) {
        throw new Error("GLB has no JSON chunk");
    }

    console.log("===== GLTF JSON =====");
    console.log(jsonChunk);

    console.log("===== SUMMARY =====");
    console.log("Scenes:", jsonChunk.scenes ? jsonChunk.scenes.length : 0);
    console.log("Nodes:", jsonChunk.nodes ? jsonChunk.nodes.length : 0);
    console.log("Meshes:", jsonChunk.meshes ? jsonChunk.meshes.length : 0);
    console.log("Skins:", jsonChunk.skins ? jsonChunk.skins.length : 0);
    console.log("Animations:", jsonChunk.animations ? jsonChunk.animations.length : 0);
    console.log("Accessors:", jsonChunk.accessors ? jsonChunk.accessors.length : 0);
    console.log("BufferViews:", jsonChunk.bufferViews ? jsonChunk.bufferViews.length : 0);
    console.log("Buffers:", jsonChunk.buffers ? jsonChunk.buffers.length : 0);
    console.log("Has binary chunk:", binaryChunk !== null);

    if (jsonChunk.skins) {
        console.log("===== SKINS =====");

        jsonChunk.skins.forEach(function (skin, index) {
            console.log("Skin", index, skin);

            if (skin.joints) {
                console.log("Number of joints:", skin.joints.length);

                console.log("Joint node names:");
                skin.joints.forEach(function (jointNodeIndex) {
                    const node = jsonChunk.nodes[jointNodeIndex];
                    //console.log(jointNodeIndex, node ? node.name : "(no name)");
                });
            }

            if (skin.inverseBindMatrices !== undefined) {
                console.log("inverseBindMatrices accessor:", skin.inverseBindMatrices);
            } else {
                console.warn("Skin has no inverseBindMatrices");
            }
        });
    } else {
        console.warn("No skins found. This GLB may not contain skeleton/skin data.");
    }

    if (jsonChunk.meshes) {
        console.log("===== MESH ATTRIBUTES =====");

        jsonChunk.meshes.forEach(function (mesh, meshIndex) {
            console.log("Mesh", meshIndex, mesh.name);

            mesh.primitives.forEach(function (primitive, primitiveIndex) {
                console.log("Primitive", primitiveIndex, primitive.attributes);

                if (primitive.attributes.JOINTS_0 !== undefined) {
                    console.log("Has JOINTS_0:", primitive.attributes.JOINTS_0);
                } else {
                    console.warn("No JOINTS_0 on this primitive");
                }

                if (primitive.attributes.WEIGHTS_0 !== undefined) {
                    console.log("Has WEIGHTS_0:", primitive.attributes.WEIGHTS_0);
                } else {
                    console.warn("No WEIGHTS_0 on this primitive");
                }
            });
        });
    }

    return {
        gltf: jsonChunk,
        binary: binaryChunk
    };
}


function getComponentInfo(componentType) {
    // WebGL / glTF component types
    if (componentType === 5120) return { ArrayType: Int8Array, bytes: 1 };
    if (componentType === 5121) return { ArrayType: Uint8Array, bytes: 1 };
    if (componentType === 5122) return { ArrayType: Int16Array, bytes: 2 };
    if (componentType === 5123) return { ArrayType: Uint16Array, bytes: 2 };
    if (componentType === 5125) return { ArrayType: Uint32Array, bytes: 4 };
    if (componentType === 5126) return { ArrayType: Float32Array, bytes: 4 };

    throw new Error("Unsupported componentType: " + componentType);
}

function readAccessor(gltf, binary, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];

    const componentInfo = getComponentInfo(accessor.componentType);
    const numComponents = getNumComponents(accessor.type);

    const byteOffset =
        (bufferView.byteOffset || 0) +
        (accessor.byteOffset || 0);

    const length = accessor.count * numComponents;

    const array = new componentInfo.ArrayType(
        binary,
        byteOffset,
        length
    );

    return {
        accessor: accessor,
        array: array,
        count: accessor.count,
        numComponents: numComponents,
        componentType: accessor.componentType,
        type: accessor.type
    };
}

// to read main data
function debugReadSkinnedMeshData(gltf, binary) {
    const mesh = gltf.meshes[0];
    const primitive = mesh.primitives[0];

    console.log("===== READING SKINNED MESH DATA =====");

    const posAccessor = primitive.attributes.POSITION;
    const normalAccessor = primitive.attributes.NORMAL;
    const uvAccessor = primitive.attributes.TEXCOORD_0;
    const jointsAccessor = primitive.attributes.JOINTS_0;
    const weightsAccessor = primitive.attributes.WEIGHTS_0;

    const positions = readAccessor(gltf, binary, posAccessor);
    const normals = readAccessor(gltf, binary, normalAccessor);
    const uvs = readAccessor(gltf, binary, uvAccessor);
    const joints = readAccessor(gltf, binary, jointsAccessor);
    const weights = readAccessor(gltf, binary, weightsAccessor);

    console.log("positions:", positions.count, positions.type, positions.array.slice(0, 12));
    console.log("normals:", normals.count, normals.type, normals.array.slice(0, 12));
    console.log("uvs:", uvs.count, uvs.type, uvs.array.slice(0, 8));
    console.log("joints:", joints.count, joints.type, joints.componentType, joints.array.slice(0, 16));
    console.log("weights:", weights.count, weights.type, weights.array.slice(0, 16));

    if (primitive.indices !== undefined) {
        const indices = readAccessor(gltf, binary, primitive.indices);
        console.log("indices:", indices.count, indices.componentType, indices.array.slice(0, 24));
    } else {
        console.warn("No indices found");
    }

    const skin = gltf.skins[0];

    if (skin.inverseBindMatrices !== undefined) {
        const inverseBindMatrices = readAccessor(
            gltf,
            binary,
            skin.inverseBindMatrices
        );

        console.log(
            "inverseBindMatrices:",
            inverseBindMatrices.count,
            inverseBindMatrices.type,
            inverseBindMatrices.array.slice(0, 16)
        );
    } else {
        console.warn("No inverseBindMatrices accessor found");
    }
}


function createIdentityBoneMatrices(numBones) {
    var data = new Float32Array(numBones * 16);

    for (var i = 0; i < numBones; i++) {
        var offset = i * 16;

        data[offset + 0]  = 1.0;
        data[offset + 5]  = 1.0;
        data[offset + 10] = 1.0;
        data[offset + 15] = 1.0;
    }

    return data;
}


function drawSkinnedDog(viewMatrix, projectionMatrix) {
    if (!skinnedDog || !skinnedDogProgram) return;

    gl.useProgram(skinnedDogProgram);

    //part for chaning light day/night
    var dogLightIntensity;
    var dogAmbientStrength;
    var dogLightTint;

    if (isNight) {
        dogLightIntensity = 0.45;
        dogAmbientStrength = 0.22;
        dogLightTint = vec3(0.60, 0.70, 1.0);
    } else {
        dogLightIntensity = 1.0;
        dogAmbientStrength = 0.35;
        dogLightTint = vec3(1.0, 0.92, 0.78);
    }

    gl.uniform1f(
        gl.getUniformLocation(skinnedDogProgram, "uLightIntensity"),
        dogLightIntensity
    );

    gl.uniform1f(
        gl.getUniformLocation(skinnedDogProgram, "uAmbientStrength"),
        dogAmbientStrength
    );

    gl.uniform3fv(
        gl.getUniformLocation(skinnedDogProgram, "uLightTint"),
        flatten(dogLightTint)
    );

    var t = performance.now() * 0.001;
    var walkMove = Math.sin(t * 1.2) * 0.35;

    var modelMatrix = getSkinnedDogModelMatrix();

    var mv = mult(viewMatrix, modelMatrix);
    var nMat = normalMatrix(mv, true);

    gl.uniformMatrix4fv(
        skinnedDogUniforms.modelMatrix,
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.viewMatrix,
        false,
        flatten(viewMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.projectionMatrix,
        false,
        flatten(projectionMatrix)
    );

    gl.uniformMatrix3fv(
        skinnedDogUniforms.normalMatrix,
        false,
        flatten(nMat)
    );

    gl.uniform1i(skinnedDogUniforms.receiveShadow, true);
    gl.uniform1i(skinnedDogUniforms.usePointShadowMap, usePointShadowMap ? 1 : 0);

    gl.uniform4fv(
        skinnedDogUniforms.lightPosition,
        flatten(lightPosition)
);

if (usePointShadowMap) {
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[0]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap0, 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[1]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap1, 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[2]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap2, 6);

    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[3]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap3, 7);

    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[4]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap4, 8);

    gl.activeTexture(gl.TEXTURE9);
    gl.bindTexture(gl.TEXTURE_2D, pointShadowTextures[5]);
    gl.uniform1i(skinnedDogUniforms.pointShadowMap5, 9);

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix0,
        false,
        flatten(pointLightViewMatrices[0])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix1,
        false,
        flatten(pointLightViewMatrices[1])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix2,
        false,
        flatten(pointLightViewMatrices[2])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix3,
        false,
        flatten(pointLightViewMatrices[3])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix4,
        false,
        flatten(pointLightViewMatrices[4])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightViewMatrix5,
        false,
        flatten(pointLightViewMatrices[5])
    );

    gl.uniformMatrix4fv(
        skinnedDogUniforms.pointLightProjectionMatrix,
        false,
        flatten(pointLightProjectionMatrix)
    );
}



var localOverrides = {};

applySkinnedDogPoseOverrides(localOverrides);

var boneData = computeBoneMatricesRaw(skinnedDog, localOverrides);

gl.uniformMatrix4fv(
        skinnedDogUniforms.boneMatrices,
        false,
        boneData
);

//texture part
if (skinnedDog.texture && skinnedDog.texture.loaded) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, skinnedDog.texture);

        gl.uniform1i(skinnedDogUniforms.uTexture, 0);
        gl.uniform1i(skinnedDogUniforms.useTexture, true);
} 
else {
        gl.uniform1i(skinnedDogUniforms.useTexture, false);
    }

gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.positionBuffer);
gl.vertexAttribPointer(skinnedDogAttribs.vPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(skinnedDogAttribs.vPosition);

gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.normalBuffer);
gl.vertexAttribPointer(skinnedDogAttribs.vNormal, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(skinnedDogAttribs.vNormal);

gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.uvBuffer);
gl.vertexAttribPointer(skinnedDogAttribs.vTexCoord, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(skinnedDogAttribs.vTexCoord);
gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.jointBuffer);

    /*
       JOINTS_0 nel tuo caso è Uint8Array.
       In WebGL1 lo passiamo come attributo float,
       poi nello shader facciamo int(vJoints.x).
    */
gl.vertexAttribPointer(skinnedDogAttribs.vJoints, 4, gl.UNSIGNED_BYTE, false, 0, 0);
gl.enableVertexAttribArray(skinnedDogAttribs.vJoints);

gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.weightBuffer);
gl.vertexAttribPointer(skinnedDogAttribs.vWeights, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(skinnedDogAttribs.vWeights);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinnedDog.indexBuffer);

gl.drawElements(
        gl.TRIANGLES,
        skinnedDog.indexCount,
        gl.UNSIGNED_SHORT,
        0
);

}

function drawSkinnedDogShadow(lightViewMatrix, lightProjectionMatrix, pointShadowPass) {
    if (!skinnedDog || !skinnedDogShadowProgram) return;

    gl.useProgram(skinnedDogShadowProgram);

    var modelMatrix = getSkinnedDogModelMatrix();
    var boneData = getSkinnedDogBoneData();

    gl.uniformMatrix4fv(
        skinnedDogShadowUniforms.modelMatrix,
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogShadowUniforms.lightViewMatrix,
        false,
        flatten(lightViewMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogShadowUniforms.lightProjectionMatrix,
        false,
        flatten(lightProjectionMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogShadowUniforms.boneMatrices,
        false,
        boneData
    );

    gl.uniform4fv(
        skinnedDogShadowUniforms.lightPosition,
        flatten(lightPosition)
    );

    gl.uniform1f(skinnedDogShadowUniforms.pointShadowFar, 40.0);

    gl.uniform1i(
        skinnedDogShadowUniforms.pointShadowPass,
        pointShadowPass ? 1 : 0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.positionBuffer);
    gl.vertexAttribPointer(skinnedDogShadowAttribs.vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skinnedDogShadowAttribs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.jointBuffer);
    gl.vertexAttribPointer(skinnedDogShadowAttribs.vJoints, 4, gl.UNSIGNED_BYTE, false, 0, 0);
    gl.enableVertexAttribArray(skinnedDogShadowAttribs.vJoints);

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.weightBuffer);
    gl.vertexAttribPointer(skinnedDogShadowAttribs.vWeights, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skinnedDogShadowAttribs.vWeights);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinnedDog.indexBuffer);

    gl.drawElements(
        gl.TRIANGLES,
        skinnedDog.indexCount,
        gl.UNSIGNED_SHORT,
        0
    );
}


function drawSkinnedDogDepthOnly(lightViewMatrix, lightProjectionMatrix) {
    if (!skinnedDog || !skinnedDogDepthProgram) return;

    gl.useProgram(skinnedDogDepthProgram);

    var modelMatrix = getSkinnedDogModelMatrix();


    var localOverrides = {};

    applySkinnedDogPoseOverrides(localOverrides);

    var boneData = computeBoneMatricesRaw(skinnedDog, localOverrides);

    //var boneData = computeBoneMatricesRaw(skinnedDog, {}); 
    // prima test senza animazione nello shadow pass

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.modelMatrix,
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.lightViewMatrix,
        false,
        flatten(lightViewMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.lightProjectionMatrix,
        false,
        flatten(lightProjectionMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.boneMatrices,
        false,
        boneData
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.positionBuffer);
    gl.vertexAttribPointer(
        skinnedDogDepthAttribs.vPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(skinnedDogDepthAttribs.vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.jointBuffer);
    gl.vertexAttribPointer(
        skinnedDogDepthAttribs.vJoints,
        4,
        gl.UNSIGNED_BYTE,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(skinnedDogDepthAttribs.vJoints);

    gl.bindBuffer(gl.ARRAY_BUFFER, skinnedDog.weightBuffer);
    gl.vertexAttribPointer(
        skinnedDogDepthAttribs.vWeights,
        4,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(skinnedDogDepthAttribs.vWeights);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinnedDog.indexBuffer);

    gl.drawElements(
        gl.TRIANGLES,
        skinnedDog.indexCount,
        gl.UNSIGNED_SHORT,
        0
    );

    gl.uniform4fv(
        skinnedDogDepthUniforms.lightPosition,
        flatten(lightPosition)
    );

    gl.uniform1f(
        skinnedDogDepthUniforms.pointShadowFar,
        40.0
    );

    gl.uniform1i(
        skinnedDogDepthUniforms.pointShadowPass,
        true
    );
}



function printDogJointNames() {
    if (!skinnedDog || !skinnedDog.skin || !skinnedDog.nodes) return;

    console.log("===== DOG JOINT NAMES =====");

    skinnedDog.skin.joints.forEach(function(nodeIndex, jointIndex) {
        var node = skinnedDog.nodes[nodeIndex];
        console.log(jointIndex, nodeIndex, node.name);
    });
}


function nodeLocalMatrix(node) {
    if (node.matrix) {
        return mat4(
            node.matrix[0], node.matrix[1], node.matrix[2], node.matrix[3],
            node.matrix[4], node.matrix[5], node.matrix[6], node.matrix[7],
            node.matrix[8], node.matrix[9], node.matrix[10], node.matrix[11],
            node.matrix[12], node.matrix[13], node.matrix[14], node.matrix[15]
        );
    }

    var m = mat4();

    if (node.translation) {
        m = mult(m, translate(
            node.translation[0],
            node.translation[1],
            node.translation[2]
        ));
    }

    if (node.rotation) {
        var q = node.rotation;
        m = mult(m, quatToMat4(q[0], q[1], q[2], q[3]));
    }

    if (node.scale) {
        m = mult(m, scalem(
            node.scale[0],
            node.scale[1],
            node.scale[2]
        ));
    }

    return m;
}



function computeNodeWorldMatrix(skinnedDog, nodeIndex, localOverrides) {
    var node = skinnedDog.nodes[nodeIndex];

    var local = nodeLocalMatrix(node);

    if (localOverrides && localOverrides[nodeIndex]) {
        local = mult(local, localOverrides[nodeIndex]);
    }

    var parentIndex = skinnedDog.nodeParents[nodeIndex];

    if (parentIndex < 0) {
        return local;
    }

    var parentWorld = computeNodeWorldMatrix(
        skinnedDog,
        parentIndex,
        localOverrides
    );

    return mult(parentWorld, local);
}
function computeBoneMatricesRaw(skinnedDog, localOverrides) {
    var skin = skinnedDog.skin;
    var joints = skin.joints;

    var boneData = new Float32Array(64 * 16);

    var cache = {};

    var meshWorld = computeNodeWorldMatrixRaw(
        skinnedDog,
        skinnedDog.meshNodeIndex,
        cache,
        localOverrides
    );

    var inverseMeshWorld = mat4InvertRaw(meshWorld);

    for (var i = 0; i < joints.length; i++) {
        var jointNodeIndex = joints[i];

        var jointWorld = computeNodeWorldMatrixRaw(
            skinnedDog,
            jointNodeIndex,
            cache,
            localOverrides
        );

        var invBind = new Float32Array(
            skinnedDog.inverseBindMatrices.buffer,
            skinnedDog.inverseBindMatrices.byteOffset + i * 16 * 4,
            16
        );

        var finalMatrix = mat4MultiplyRaw(
            mat4MultiplyRaw(inverseMeshWorld, jointWorld),
            invBind
        );

        for (var k = 0; k < 16; k++) {
            boneData[i * 16 + k] = finalMatrix[k];
        }
    }

    for (var j = joints.length; j < 64; j++) {
        var identity = mat4IdentityRaw();

        for (var k2 = 0; k2 < 16; k2++) {
            boneData[j * 16 + k2] = identity[k2];
        }
    }

    return boneData;
}




function nodeLocalMatrixRaw(node, localOverrides, nodeIndex) {
    var m;

    if (node.matrix) {
        m = new Float32Array(node.matrix);
    } else {
        m = mat4IdentityRaw();

        if (node.translation) {
            m = mat4MultiplyRaw(m, translationMat4Raw(
                node.translation[0],
                node.translation[1],
                node.translation[2]
            ));
        }

        if (node.rotation) {
            var q = node.rotation;
            m = mat4MultiplyRaw(m, quatToMat4Raw(q[0], q[1], q[2], q[3]));
        }

        if (node.scale) {
            m = mat4MultiplyRaw(m, scaleMat4Raw(
                node.scale[0],
                node.scale[1],
                node.scale[2]
            ));
        }
    }

    if (localOverrides && localOverrides[nodeIndex]) {
        m = mat4MultiplyRaw(m, localOverrides[nodeIndex]);
    }

    return m;
}


function computeNodeWorldMatrixRaw(skinnedDog, nodeIndex, cache, localOverrides) {
    if (cache[nodeIndex]) {
        return cache[nodeIndex];
    }

    var node = skinnedDog.nodes[nodeIndex];
    var local = nodeLocalMatrixRaw(node, localOverrides, nodeIndex);

    var parentIndex = skinnedDog.nodeParents[nodeIndex];

    if (parentIndex < 0) {
        cache[nodeIndex] = local;
        return local;
    }

    var parentWorld = computeNodeWorldMatrixRaw(
        skinnedDog,
        parentIndex,
        cache,
        localOverrides
    );

    var world = mat4MultiplyRaw(parentWorld, local);
    cache[nodeIndex] = world;

    return world;
}



function createTextureFromGLBImage(gl, gltf, binary, imageIndex) {
    var imageDef = gltf.images[imageIndex];

    if (!imageDef) {
        console.warn("Image not found:", imageIndex);
        return null;
    }

    if (imageDef.bufferView === undefined) {
        console.warn("Only embedded GLB images are supported for now");
        return null;
    }

    var bufferView = gltf.bufferViews[imageDef.bufferView];

    var byteOffset = bufferView.byteOffset || 0;
    var byteLength = bufferView.byteLength;

    var imageBytes = new Uint8Array(binary, byteOffset, byteLength);

    var mimeType = getMimeTypeFromImage(gltf, imageIndex);
    var blob = new Blob([imageBytes], { type: mimeType });
    var imageUrl = URL.createObjectURL(blob);

    var texture = gl.createTexture();
    var img = new Image();

    texture.loaded = false;

    img.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        gl.generateMipmap(gl.TEXTURE_2D);

        texture.loaded = true;

        URL.revokeObjectURL(imageUrl);

        console.log("GLB texture loaded:", imageIndex);
    };

    img.onerror = function () {
        console.error("Failed to load GLB embedded image:", imageIndex);
    };

    img.src = imageUrl;

    return texture;
}


function applySkinnedDogPoseOverrides(localOverrides) {
    var t = performance.now() * 0.001;

    /* Tongue animation */
    var tongueSpeed = 6.0;
    var tonguePhase = t * tongueSpeed;

    var tongueMove = Math.sin(tonguePhase);

    // movimento leggero e morbido
    localOverrides[17] = rotationXMat4Raw(tongueMove * 8.0);
    localOverrides[16] = rotationXMat4Raw(Math.sin(tonguePhase + 0.25) * 12.0);
    localOverrides[15] = rotationXMat4Raw(Math.sin(tonguePhase + 0.50) * 16.0);


    // Walk to reach ball/frisbee, based on distance to target
    var isBowlPoseObject =
        dogFetchObjectType === "bowlWater" ||
        dogFetchObjectType === "bowlFood";

    var lowerPoseThreshold = isBowlPoseObject
        ? 0.0001
        : 0.01;

    if (dogFetchLowerAmount > lowerPoseThreshold && !dogFetchBallMode) {
        var lower = dogFetchLowerAmount;

            if (
                isBowlPoseObject &&
                dogFetchLowerAmount > 0.0001 &&
                !dogFetchBallMode
            ) {
    
                /*Abbassamento più delicato per bere/mangiare.
                Stessa posa per acqua e croccantini.
                Solo collo/testa, niente zampe strane.
                */

                //console.log("BOWL POSE BLOCK ACTIVE");
                var bowlLower = Math.min(lower, 0.68);


                
                localOverrides[30] = rotationXMat4Raw(100.0 * bowlLower);
                localOverrides[28] = rotationXMat4Raw(45.0 * bowlLower);
                localOverrides[27] = rotationXMat4Raw(-20.0 * bowlLower);
            }


        else if (dogFetchObjectType === "frisbee") {
            /*
                Frisbee pickup:
                il disco è più piatto e basso, quindi il cane abbassa di più
                collo e testa, ma senza fare la posa sdraiata della palla.
            */

            lower = Math.min(Math.max(lower, 0.0), 1.0);

             var rawLower = Math.min(Math.max(lower, 0.0), 1.0);
            var softLower = rawLower * rawLower * (3.0 - 2.0 * rawLower);

            localOverrides[30] = rotationXMat4Raw(75.0 * softLower); // Neck 01
            localOverrides[28] = rotationXMat4Raw(50.0 * softLower); // Neck 02
            localOverrides[27] = rotationXMat4Raw(22.0 * softLower); // Neck top

            var frontBend = softLower;

            
            // front left
            localOverrides[4] = rotationXMat4Raw(-70.0 * frontBend); // shoulder
            localOverrides[3] = rotationZMat4Raw(-60.0 * frontBend); // elbow
            localOverrides[2] = rotationXMat4Raw(22.0 * frontBend);  // wrist / paw

            // front right
            localOverrides[11] = rotationXMat4Raw(-70.0 * frontBend); // shoulder
            localOverrides[10] = rotationZMat4Raw(-60.0 * frontBend); // elbow
            localOverrides[9]  = rotationXMat4Raw(22.0 * frontBend);  // wrist / paw

            // zam localOverrides[27] = rotationXMat4Raw(14.0 * lower);

           /*  // zampe anteriori appena piegate
            localOverrides[4]  = rotationXMat4Raw(-8.0 * lower);
            localOverrides[3]  = rotationXMat4Raw(14.0 * lower);

            localOverrides[11] = rotationXMat4Raw(-8.0 * lower);
            localOverrides[10] = rotationXMat4Raw(14.0 * lower); */
            } else {
            /*
                Vecchio comportamento per la palla.
            */
            localOverrides[30] = rotationXMat4Raw(28.0 * lower);
            localOverrides[28] = rotationXMat4Raw(18.0 * lower);
            localOverrides[27] = rotationXMat4Raw(10.0 * lower);
        }
    } 

    /* Tail */
    var tailSpeed = 5.0;
    var baseAngle = Math.sin(t * tailSpeed);

    localOverrides[51] = rotationYMat4Raw(baseAngle * 8.0);
    localOverrides[50] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.25) * 12.0);
    localOverrides[49] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.50) * 16.0);
    localOverrides[48] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.75) * 20.0);

    /* Legs */


    /* var dogGoingToBowl =
        typeof dogFetchObjectType !== "undefined" &&
        (
            dogFetchObjectType === "bowlWater" ||
            dogFetchObjectType === "bowlFood"
        ) &&
        dogFetchLowerAmount <= 0.01 &&
        dogPath &&
        dogPath.length > 0;
 */
    
    //REVIEW - MODIFICA  PER scattino cane

    var isBowlObjectForWalk =
        typeof dogFetchObjectType !== "undefined" &&
        (
            dogFetchObjectType === "bowlWater" ||
            dogFetchObjectType === "bowlFood"
        );

    var dogIsInBowlPoseOrRecovery =
        isBowlObjectForWalk &&
        (
            dogFetchLoweringActive ||
            dogBowlRisingActive ||
            dogBowlWaitingForEmpty ||
            dogFetchLowerAmount > 0.0001
        );

    var dogGoingToBowl =
        isBowlObjectForWalk &&
        dogFetchBallMode &&
        !dogIsInBowlPoseOrRecovery &&
        dogFetchLowerAmount <= 0.01 &&
        dogPath &&
        dogPath.length > 0;

    
    /* dogIsWalking =
        (
            dogFetchBallMode ||  dogGoingToBowl ||
            (
                dogFireflyCatchActive &&
                dogFireflyCatchPhase === "chase"
            )
        )
        &&
        dogCrouchAmount < 0.1; */

    dogIsWalking =
        (
            (
                dogFetchBallMode ||
                dogGoingToBowl ||
                (
                    dogFireflyCatchActive &&
                    dogFireflyCatchPhase === "chase"
                )
            )
            &&
            !dogIsInBowlPoseOrRecovery
        )
        &&
        dogCrouchAmount < 0.1;

    if (
        dogFetchObjectType === "bowlWater" ||
        dogFetchObjectType === "bowlFood"
    ) {
        //console.log(
        //    "BOWL WALK DEBUG",
        //    "dogFetchBallMode:", dogFetchBallMode,
        //    "dogGoingToBowl:", dogGoingToBowl,
        //    "dogFetchLowerAmount:", dogFetchLowerAmount,
        //    "dogPath length:", dogPath ? dogPath.length : null,
        //    "dogIsWalking:", dogIsWalking
        //);
    }

    var legA = 0.0;
    var legB = 0.0;


    if (dogIsWalking) {
        var walkSpeed = 6.0;

        if (
            dogFireflyCatchActive &&
            dogFireflyCatchPhase === "chase"
        ) {
            walkSpeed = 3.0; // più veloce: sembra una corsetta
        }

        var walkPhase = t * walkSpeed;

        legA = Math.sin(walkPhase);
        legB = Math.sin(walkPhase + Math.PI);
    }

    var frontHipAmount = 7.0;
    var hindHipAmount  = 8.0;

    var frontKneeAmount  = 10.0;
    var frontAnkleAmount = 10.0;
    var frontBallAmount  = 6.0;

    var hindKneeAmount = 7.0;

    var FRONT_LEFT_HIP   = 4;
    var FRONT_LEFT_KNEE  = 3;
    var FRONT_LEFT_ANKLE = 2;
    var FRONT_LEFT_BALL  = 1;

    var FRONT_RIGHT_HIP   = 11;
    var FRONT_RIGHT_KNEE  = 10;
    var FRONT_RIGHT_ANKLE = 9;
    var FRONT_RIGHT_BALL  = 8;

    var HIND_LEFT_HIP    = 41;
    var HIND_LEFT_KNEE1  = 40;
    var HIND_LEFT_KNEE2  = 39;

    var HIND_RIGHT_HIP   = 47;
    var HIND_RIGHT_KNEE1 = 46;
    var HIND_RIGHT_KNEE2 = 45;

    localOverrides[FRONT_LEFT_HIP]  = rotationXMat4Raw(legA * frontHipAmount);
    localOverrides[HIND_RIGHT_HIP]  = rotationXMat4Raw(legA * hindHipAmount);

    localOverrides[FRONT_RIGHT_HIP] = rotationXMat4Raw(legB * frontHipAmount);
    localOverrides[HIND_LEFT_HIP]   = rotationXMat4Raw(legB * hindHipAmount);

    var frontKneeA  = Math.max(0.0, -legA) * frontKneeAmount;
    var frontKneeB  = Math.max(0.0, -legB) * frontKneeAmount;

    var frontAnkleA = Math.max(0.0, -legA) * frontAnkleAmount;
    var frontAnkleB = Math.max(0.0, -legB) * frontAnkleAmount;

    var frontBallA  = Math.max(0.0, -legA) * frontBallAmount;
    var frontBallB  = Math.max(0.0, -legB) * frontBallAmount;

    localOverrides[FRONT_LEFT_KNEE]  = rotationXMat4Raw(-frontKneeA);
    localOverrides[FRONT_LEFT_ANKLE] = rotationXMat4Raw(frontAnkleA * 1.6);
    localOverrides[FRONT_LEFT_BALL]  = rotationXMat4Raw(-frontBallA * 1.2);

    localOverrides[FRONT_RIGHT_KNEE]  = rotationXMat4Raw(-frontKneeB);
    localOverrides[FRONT_RIGHT_ANKLE] = rotationXMat4Raw(frontAnkleB * 1.6);
    localOverrides[FRONT_RIGHT_BALL]  = rotationXMat4Raw(-frontBallB * 1.2);

    var hindKneeA = Math.max(0.0, -legA) * hindKneeAmount;
    var hindKneeB = Math.max(0.0, -legB) * hindKneeAmount;

    localOverrides[HIND_RIGHT_KNEE1] = rotationXMat4Raw(-hindKneeA);
    localOverrides[HIND_RIGHT_KNEE2] = rotationXMat4Raw(hindKneeA * 0.4);

    localOverrides[HIND_LEFT_KNEE1] = rotationXMat4Raw(-hindKneeB);
    localOverrides[HIND_LEFT_KNEE2] = rotationXMat4Raw(hindKneeB * 0.4);


    // --- camminata più visibile quando va alla bowl ---


    if (dogHasBall &&
        dogFetchObjectType !== "bowlWater" &&
        dogFetchObjectType !== "bowlFood") {
        //console.log("DOG CROUCH ACTIVE");

        // zampa posteriore sinistra
        localOverrides[41] = rotationXMat4Raw(18.0);   // hip
        localOverrides[40] = rotationXMat4Raw(-28.0);  // knee1
        localOverrides[39] = rotationXMat4Raw(18.0);   // knee2
        localOverrides[38] = rotationXMat4Raw(8.0);    // ankle

        // zampa posteriore destra
        localOverrides[47] = rotationXMat4Raw(18.0);   // hip
        localOverrides[46] = rotationXMat4Raw(-28.0);  // knee1
        localOverrides[45] = rotationXMat4Raw(18.0);   // knee2
        localOverrides[44] = rotationXMat4Raw(8.0);    // ankle
        
        localOverrides[4]  = rotationXMat4Raw(-8.0);   // Wolf_l_FrontLeg_HipSHJnt
        localOverrides[3]  = rotationXMat4Raw(12.0);   // Wolf_l_FrontLeg_KneeSHJnt

        localOverrides[11] = rotationXMat4Raw(-8.0);   // Wolf_r_FrontLeg_HipSHJnt
        localOverrides[10] = rotationXMat4Raw(12.0);   // Wolf_r_FrontLeg_KneeSHJnt


    }



    if (dogCrouchAmount > 0.001) {
        var c = dogCrouchAmount;


        

        //front legs
        // sinistra
        localOverrides[4] = rotationXMat4Raw(-30.0 * c);
        localOverrides[3] = rotationXMat4Raw(100.0 * c);
        localOverrides[2] = rotationXMat4Raw(-8.0 * c);
        localOverrides[1] = rotationXMat4Raw(-50.0 * c);
        localOverrides[0] = rotationXMat4Raw(12.0 * c);

        // destra
        localOverrides[11] = rotationXMat4Raw(-30.0 * c);
        localOverrides[10] = rotationXMat4Raw(100.0 * c);
        localOverrides[9]  = rotationXMat4Raw(-8.0 * c);
        localOverrides[8]  = rotationXMat4Raw(-50.0 * c);
        localOverrides[7]  = rotationXMat4Raw(12.0 * c);


        // ---- HIND LEGS ----
        // HIND LEGS
        // sinistra
    
        localOverrides[41] = rotationXMat4Raw(-100.0 * c);
        localOverrides[40] = rotationXMat4Raw(0.0 * c);
        localOverrides[39] = rotationXMat4Raw(0.0 * c);
        localOverrides[38] = rotationXMat4Raw(-2.0 * c);

        localOverrides[47] = rotationXMat4Raw(-100.0 * c);
        localOverrides[46] = rotationXMat4Raw(0.0 * c);
        localOverrides[45] = rotationXMat4Raw(0.0 * c);
        localOverrides[44] = rotationXMat4Raw(-2.0 * c);


            //spline
            // SPINE
        localOverrides[35] = rotationXMat4Raw(-16.0 * c);
        localOverrides[34] = rotationXMat4Raw(-14.0 * c);
        localOverrides[33] = rotationXMat4Raw(-12.0 * c); 
        
        localOverrides[32] = rotationXMat4Raw(-8.0 * c);
        localOverrides[31] = rotationXMat4Raw(-5.0 * c);

    }


    if (
        isBowlPoseObject &&
        !dogFetchBallMode &&
        dogFetchLowerAmount > 0.0001
        ) {
        var bowlLower = Math.min(dogFetchLowerAmount, 0.50);

        var bowlPose = bowlLower / 0.68;
        bowlPose = Math.min(Math.max(bowlPose, 0.0), 1.0);
        bowlPose = bowlPose * bowlPose * (3.0 - 2.0 * bowlPose);

        /*
            Schiena appena giù.
            Non troppo, altrimenti sembra che collassi.
        */
        /* localOverrides[35] = rotationXMat4Raw(-10.0 * bowlPose);
        localOverrides[34] = rotationXMat4Raw(-30.0 * bowlPose);
        localOverrides[33] = rotationXMat4Raw(-20.0 * bowlPose); */
        localOverrides[35] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[34] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[33] = rotationXMat4Raw(-14.0 * bowlPose);

        
        

        /*
            Zampe davanti leggermente piegate.
        */
        /* localOverrides[4] = rotationXMat4Raw(-10.0 * bowlPose);
        localOverrides[3] = rotationXMat4Raw(-60.0 * bowlPose);
        localOverrides[2] = rotationXMat4Raw(90.0 * bowlPose);

        localOverrides[11] = rotationXMat4Raw(-10.0 * bowlPose);
        localOverrides[10] = rotationXMat4Raw(-60.0 * bowlPose);
        localOverrides[9]  = rotationXMat4Raw(90.0 * bowlPose); */
        localOverrides[4] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[3] = rotationXMat4Raw(-48.0 * bowlPose);
        localOverrides[2] = rotationXMat4Raw(48.0 * bowlPose);

        localOverrides[11] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[10] = rotationXMat4Raw(-48.0 * bowlPose);
        localOverrides[9]  = rotationXMat4Raw(48.0 * bowlPose);

       var lick = 0.5 + 0.5 * Math.sin(t * 12.0);

        /*
            Non cambio i valori della lingua.
            Aggiungo solo un blend per farla rientrare prima durante il rialzo.
        */
        var tongueAmount = 1.0;

        if (
            typeof dogBowlRisingActive !== "undefined" &&
            dogBowlRisingActive
        ) {
            tongueAmount = dogFetchLowerAmount / 0.22;

            tongueAmount = Math.min(Math.max(tongueAmount, 0.0), 1.0);

            // smoothstep: rientro morbido
            tongueAmount =
                tongueAmount * tongueAmount * (3.0 - 2.0 * tongueAmount);
        }

        localOverrides[17] = rotationXMat4Raw(
            (18.0 + 8.0 * lick) * tongueAmount
        );

        localOverrides[16] = mat4MultiplyRaw(
            rotationXMat4Raw((28.0 + 12.0 * lick) * tongueAmount),
            translationMat4Raw(0.0, 0.0, -0.15 * tongueAmount)
        );

        localOverrides[15] = mat4MultiplyRaw(
            rotationXMat4Raw((50.0 + 18.0 * lick) * tongueAmount),
            translationMat4Raw(0.0, 0.0, -0.15 * tongueAmount)
        );


        // --- ALLUNGAMENTO LEGGERO ZAMPE DIETRO ---

        localOverrides[41] = rotationXMat4Raw(-100.0 * bowlPose);

        localOverrides[40] = rotationXMat4Raw(30.0 * bowlPose);

        localOverrides[47] = rotationXMat4Raw(-100.0 * bowlPose);

        localOverrides[46] = rotationXMat4Raw(30.0 * bowlPose);


       // --- abbassa zona groppa / attaccatura coda ---

        //localOverrides[48] = rotationXMat4Raw(-100.0 * bowlPose);

        //localOverrides[49] = rotationXMat4Raw(-100.0 * bowlPose);
        localOverrides[38]= rotationXMat4Raw(50.0 * bowlPose);
        localOverrides[44]= rotationXMat4Raw(50.0 * bowlPose);
        localOverrides[55]= rotationXMat4Raw(-25.0 * bowlPose);
       

    }

    /*
        Frisbee pickup front legs override.
        This must stay AFTER the normal walk legs animation,
        otherwise the walk block overwrites these bones.
    */
    if (
        typeof dogFetchObjectType !== "undefined" &&
        dogFetchObjectType === "frisbee" &&
        dogFetchLowerAmount > 0.01 &&
        !dogFetchBallMode
    ) {
        var rawLower = Math.min(Math.max(dogFetchLowerAmount, 0.0), 1.0);
        var softLower = rawLower * rawLower * (3.0 - 2.0 * rawLower);

        

        /*
            Clamp: evita che la posa diventi troppo estrema
            quando dogFetchLowerAmount arriva alto.
        */
        /*
            Amplifico la posa di pickup:
            dogFetchLowerAmount resta magari basso, ma visivamente voglio
            una posa più leggibile quando prende il frisbee.
        */
        var pickupPose = Math.min(softLower * 2.2, 0.4);

        var frontBend = Math.min(pickupPose, 0.85);

         localOverrides[4] = rotationXMat4Raw(150.0 * frontBend);
        localOverrides[3] = rotationXMat4Raw(60.0 * frontBend);
        //localOverrides[2] = rotationXMat4Raw(-20.0 * frontBend);

        localOverrides[11] = rotationXMat4Raw(150.0 * frontBend);
        
        localOverrides[10] = rotationXMat4Raw(60.0 * frontBend);
        //localOverrides[9]  = rotationXMat4Raw(-20.0 * frontBend); 
        

        var spineBend = Math.min(pickupPose, 0.5);

        localOverrides[35] = rotationXMat4Raw(-50.0 * spineBend);
        localOverrides[34] = rotationXMat4Raw(-50.0 * spineBend);
        localOverrides[33] = rotationXMat4Raw(-50.0 * spineBend);
    }
       
    if (petDogMode) {
      
       
    localOverrides[30] =
        rotationZMat4Raw(-dogPetHeadYaw * 0.60);

    localOverrides[28] =
        rotationZMat4Raw(-dogPetHeadYaw * 0.40);

    localOverrides[27] =
        rotationZMat4Raw(-dogPetHeadYaw * 0.25);

    }

    if (
    dogFireflyCatchActive &&
    dogFireflyCatchPhase === "rear"
        ) {
            var p =
                dogFireflyCatchTimer /
                dogFireflyRearDuration;

            p = Math.min(Math.max(p, 0.0), 1.0);

            var rearAmount = 0.0;

            if (p < 0.40) {
                var q = p / 0.40;
                rearAmount = q * q * (3.0 - 2.0 * q);
            }
            else if (p < 0.78) {
                rearAmount = 1.0;
            }
            else {
                var q2 = (p - 0.78) / 0.22;
                q2 = q2 * q2 * (3.0 - 2.0 * q2);
                rearAmount = 1.0 - q2;
            }

            var pawWave =
                Math.sin(t * 9.0) * 5.0 * rearAmount;

            /*
                SPINA / SCHIENA
                Qui facciamo ruotare meglio il corpo,
                non solo le zampe davanti.
            */
                  
            
            /*
                SPINE - rear pose
                Distribuisco la posa sulla schiena,
                così non sembra che ruoti tutto il modello come un pezzo unico.
            */

            var spineBend =
                rearAmount * rearAmount * (3.0 - 2.0 * rearAmount);

            localOverrides[35] =
                rotationXMat4Raw(-10.0 * spineBend);

            localOverrides[34] =
                rotationXMat4Raw(-8.0 * spineBend);

            localOverrides[33] =
                rotationXMat4Raw(-6.0 * spineBend);

            localOverrides[32] =
                rotationXMat4Raw(-4.0 * spineBend);

            localOverrides[31] =
                rotationXMat4Raw(-2.0 * spineBend);
                        
           /*
                ZAMPE ANTERIORI
                Più distese: le alza, ma senza chiuderle troppo.
            */

            var pawBend = rearAmount * rearAmount * (3.0 - 2.0 * rearAmount);
            var pawWave = 0.0;   // per ora meglio fermo, così non si allontanano

            // ---------- FRONT LEFT ----------
            localOverrides[4] =
                rotationZMat4Raw(10.0 * rearAmount);

            localOverrides[3] =
                rotationXMat4Raw(+25.0 * pawBend);   // gomito

            localOverrides[2] =
                rotationXMat4Raw(-42.0 * pawBend);  // avambraccio / parte bassa

            localOverrides[1] =
                rotationXMat4Raw(-10.0 * pawBend);  // zampa finale

            localOverrides[0] =
                rotationXMat4Raw(2.0 * pawBend);


            // ---------- FRONT RIGHT ----------
            localOverrides[11] =
                rotationZMat4Raw(-10.0 * rearAmount);

            localOverrides[10] =
                rotationXMat4Raw(+25.0 * pawBend);   // gomito

            localOverrides[9] =
                rotationXMat4Raw(-42.0 * pawBend);  // avambraccio / parte bassa

            localOverrides[8] =
                rotationXMat4Raw(-10.0 * pawBend);

            localOverrides[7] =
                rotationXMat4Raw(2.0 * pawBend);
            /*
                ZAMPE POSTERIORI
                Più distese: devono reggere il corpo,
                non farlo sedere.
            */

            // posteriore sinistra
        
            
        /*
    HIND LEGS
    Le gambe restano abbastanza stabili.
    Correggo soprattutto ankle/ball/toe per far puntare i piedi verso terra.
*/

// sinistra
/*
    HIND LEGS - cleaned rear pose
    Obiettivo: non arricciare i piedi, ma tenerli abbastanza naturali.
*/

// sinistra
/*
    HIND LEGS - neutral
    Non forzo più i piedi posteriori.
*/

// ---------- HIND LEFT ----------
var rearHipBend = rearAmount * rearAmount * (3.0 - 2.0 * rearAmount);

localOverrides[41] = rotationXMat4Raw(-24.0 * rearHipBend);
localOverrides[47] = rotationXMat4Raw(-24.0 * rearHipBend);
// posteriore sinistra



            /*
                COLLO / TESTA
                Un po' verso l'alto, come se guardasse la lucciola.
            */
            localOverrides[30] = rotationXMat4Raw(18.0 * rearAmount);
            localOverrides[28] = rotationXMat4Raw(12.0 * rearAmount);
            localOverrides[27] = rotationXMat4Raw(8.0 * rearAmount);

            /*
                Coda viva.
            */
            localOverrides[51] =
                rotationYMat4Raw(Math.sin(t * 10.0) * 14.0 * rearAmount);

            localOverrides[50] =
                rotationYMat4Raw(Math.sin(t * 10.0 + 0.3) * 20.0 * rearAmount);

            localOverrides[49] =
                rotationYMat4Raw(Math.sin(t * 10.0 + 0.6) * 24.0 * rearAmount);
        }
}



function getSkinnedDogModelMatrix() {
    var modelMatrix = mat4();

    var t = performance.now() * 0.001;

    var bodyBob = 0.0;

    var fireflyHop = 0.0;
    var fireflyPitch = 0.0;
    var rearForwardOffset = 0.0;
    var rearGroundLift = 0.0;


    if (
        dogFireflyCatchActive &&
        dogFireflyCatchPhase === "chase"
    ) {
        bodyBob =
            Math.abs(Math.sin(t * 10.0)) * 0.04;
    }

    if (
        dogFireflyCatchActive &&
        dogFireflyCatchPhase === "rear"
    ) {
         var p =
            dogFireflyCatchTimer /
            dogFireflyRearDuration;

        p = Math.min(Math.max(p, 0.0), 1.0);

        var rearAmount = 0.0;

        if (p < 0.35) {
            var q = p / 0.35;
            rearAmount = q * q * (3.0 - 2.0 * q);
        }
        else if (p < 0.85) {
            rearAmount = 1.0;
        }
        else {
            var q2 = (p - 0.85) / 0.15;
            q2 = q2 * q2 * (3.0 - 2.0 * q2);
            rearAmount = 1.0 - q2;
        }

        /*
            Più morbido:
            meno rotazione, più lift.
        */
        fireflyHop = rearAmount * 0.10;
        fireflyPitch = -45.0 * rearAmount;

        /*
            Questo è il fix importante:
            compensazione verticale extra per non entrare nel terreno.
        */
        rearGroundLift = rearAmount * 0.42;

        /*
            Piccolo spostamento in avanti per compensare la rotazione.
        */
        rearForwardOffset = rearAmount * 0.10;
    }

    // Bob solo quando il cane sta andando verso la palla
    /* if (dogFetchBallMode) {
        bodyBob = Math.abs(Math.sin(t * 6.0)) * 0.025;
    } */
    var dogModelIsWalking =
        (
            dogFetchBallMode ||
            (typeof dogCallMode !== "undefined" && dogCallMode)
        ) &&
        dogCrouchAmount < 0.1 &&
        !dogHasBall;

    if (dogModelIsWalking) {
        bodyBob =
            Math.abs(Math.sin(t * 12.4)) * 0.01;
    }

    var angle =
        typeof dogCurrentAngle === "number" && isFinite(dogCurrentAngle)
            ? dogCurrentAngle
            : 90.0;

    var lookX = dogFetchX;
    var lookZ = dogFetchZ;

    if ((dogFetchBallMode || dogCallMode) && dogFetchTarget) {
        // mentre cammina guarda il waypoint
        lookX = dogFetchTarget.x;
        lookZ = dogFetchTarget.z;
    } 

    else if (dogFetchTarget) {
        // quando è arrivato, conserva il target finale
        lookX = dogFetchTarget.x;
        lookZ = dogFetchTarget.z;
    } else {
        // fallback: guarda la palla
        lookX = dogLookAtBallX;
        lookZ = dogLookAtBallZ;
    }

    if (
        typeof dogBowlRiseAngleLocked !== "undefined" &&
        dogBowlRiseAngleLocked
    ) {
        dogCurrentAngle = dogBowlRiseLockedAngle;
    } else {
        var dxLook = lookX - dogFetchX;
        var dzLook = lookZ - dogFetchZ;

        var lookDist = Math.sqrt(dxLook * dxLook + dzLook * dzLook);

        // se il target è troppo vicino, NON torno a 90:
        // mantengo l'angolo precedente
        if (lookDist > 0.001) {
            angle = Math.atan2(dxLook, dzLook) * 180.0 / Math.PI;
        }

        dogCurrentAngle = angle;
    }


    var dogScale = 2.0;

    var holdBallBodyDown = 0.0;

    if (dogHasBall) {
        holdBallBodyDown = 0.08;
    }


    var crouchBodyDown = 0.55 * dogCrouchAmount;

    var frisbeePickupBodyDown = 0.0;


    var rearOffsetX = 0.0;
    var rearOffsetZ = 0.0;

    if (
        dogFireflyCatchActive &&
        dogFireflyCatchPhase === "rear"
    ) {
        var rearRad = dogCurrentAngle * Math.PI / 180.0;

        rearOffsetX = Math.sin(rearRad) * rearForwardOffset;
        rearOffsetZ = Math.cos(rearRad) * rearForwardOffset;
    }

   
    modelMatrix = mult(
        modelMatrix,
        translate(dogFetchX + rearOffsetX,
            -2.48 + bodyBob + fireflyHop  + rearGroundLift 
            - crouchBodyDown
            - frisbeePickupBodyDown, 
            dogFetchZ + rearOffsetZ)
    );
    modelMatrix = mult(modelMatrix, rotate(dogCurrentAngle, [0, 1, 0]));

    // per farlo più orizzontale/horizontal 
    // Solleva la parte anteriore e rende il corpo più orizzontale
    var lyingPitch = -18.0 * dogCrouchAmount  + fireflyPitch;

    /* modelMatrix = mult(
        modelMatrix,
        rotate(lyingPitch, [1, 0, 0])
    ); */


    if (
            dogFireflyCatchActive &&
            dogFireflyCatchPhase === "rear"
        ) {
            /*
                Pivot finto vicino alle zampe posteriori:
                così il cane si alza col busto invece di ruotare
                tutto attorno al centro del corpo.
            */

            var pivotY = -0.25;
            var pivotZ = -0.55;

            modelMatrix = mult(
                modelMatrix,
                translate(0.0, pivotY, pivotZ)
            );

            modelMatrix = mult(
                modelMatrix,
                rotate(lyingPitch, [1, 0, 0])
            );

            modelMatrix = mult(
                modelMatrix,
                translate(0.0, -pivotY, -pivotZ)
            );
        }
    else {
            modelMatrix = mult(
                modelMatrix,
                rotate(lyingPitch, [1, 0, 0])
            );
    }
    modelMatrix = mult(modelMatrix, scalem(dogScale, dogScale, dogScale));

    

    return modelMatrix;
}