
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

    //console.log("Mesh node index:", meshNodeIndex, gltf.nodes[meshNodeIndex]);

    //part fo texture

    // Texture maps from the Kishu Inu GLB material
    var dogBaseColorTextureFromGLB = null;
    var dogNormalTextureFromGLB = null;
    var dogMetallicRoughnessTextureFromGLB = null;
    var dogSpecularTextureFromGLB = null;
    var dogNormalScale = 1.0;

    function getTextureFromTextureInfo(textureInfo, label) {
        if (!textureInfo || textureInfo.index === undefined) {
            console.warn("No " + label + " found in GLB material");
            return null;
        }

        var textureIndex = textureInfo.index;

        if (!gltf.textures || !gltf.textures[textureIndex]) {
            console.warn("Texture definition not found for " + label + ":", textureIndex);
            return null;
        }

        var textureDef = gltf.textures[textureIndex];

        if (textureDef.source === undefined) {
            console.warn("Texture source not found for " + label + ":", textureIndex);
            return null;
        }

        var imageIndex = textureDef.source;

        var texture = createTextureFromGLBImage(
            gl,
            gltf,
            binary,
            imageIndex
        );

        /* console.log(
            "Using GLB " + label + ":",
            "texture index:", textureIndex,
            "image index:", imageIndex
        ); */

        return texture;
    }

    var dogMaterial =
        gltf.materials && gltf.materials.length > 0
            ? gltf.materials[0]
            : null;

    if (dogMaterial) {
        var pbr =
            dogMaterial.pbrMetallicRoughness || {};

        dogBaseColorTextureFromGLB =
            getTextureFromTextureInfo(
                pbr.baseColorTexture,
                "baseColorTexture"
            );

        dogMetallicRoughnessTextureFromGLB =
            getTextureFromTextureInfo(
                pbr.metallicRoughnessTexture,
                "metallicRoughnessTexture"
            );

        dogNormalTextureFromGLB =
            getTextureFromTextureInfo(
                dogMaterial.normalTexture,
                "normalTexture"
            );

        if (
            dogMaterial.normalTexture &&
            dogMaterial.normalTexture.scale !== undefined
        ) {
            dogNormalScale = dogMaterial.normalTexture.scale;
        }

        var specularTextureInfo = null;

        if (
            dogMaterial.extensions &&
            dogMaterial.extensions.KHR_materials_specular &&
            dogMaterial.extensions.KHR_materials_specular.specularTexture
        ) {
            specularTextureInfo =
                dogMaterial.extensions.KHR_materials_specular.specularTexture;
        }

        dogSpecularTextureFromGLB =
            getTextureFromTextureInfo(
                specularTextureInfo,
                "specularTexture"
            );

       /*  console.log("Kishu Inu material textures extracted:", {
            baseColor: !!dogBaseColorTextureFromGLB,
            normal: !!dogNormalTextureFromGLB,
            metallicRoughness: !!dogMetallicRoughnessTextureFromGLB,
            specular: !!dogSpecularTextureFromGLB,
            normalScale: dogNormalScale
        }); */
    } else {
        console.warn("No material found for Kishu Inu GLB.");
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
        // Kept for compatibility with the current dog draw code
        texture: dogBaseColorTextureFromGLB,

        // Full Kishu Inu material maps
        baseColorTexture: dogBaseColorTextureFromGLB,
        normalTexture: dogNormalTextureFromGLB,
        metallicRoughnessTexture: dogMetallicRoughnessTextureFromGLB,
        specularTexture: dogSpecularTextureFromGLB,
        normalScale: dogNormalScale,

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

    /* console.log("GLB header:");
    console.log("magic:", magic.toString(16));
    console.log("version:", version);
    console.log("length:", length); */

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

    /* console.log("===== GLTF JSON =====");
    console.log(jsonChunk); */

    /* console.log("===== SUMMARY =====");
    console.log("Scenes:", jsonChunk.scenes ? jsonChunk.scenes.length : 0);
    console.log("Nodes:", jsonChunk.nodes ? jsonChunk.nodes.length : 0);
    console.log("Meshes:", jsonChunk.meshes ? jsonChunk.meshes.length : 0);
    console.log("Skins:", jsonChunk.skins ? jsonChunk.skins.length : 0);
    console.log("Animations:", jsonChunk.animations ? jsonChunk.animations.length : 0);
    console.log("Accessors:", jsonChunk.accessors ? jsonChunk.accessors.length : 0);
    console.log("BufferViews:", jsonChunk.bufferViews ? jsonChunk.bufferViews.length : 0);
    console.log("Buffers:", jsonChunk.buffers ? jsonChunk.buffers.length : 0);
    console.log("Has binary chunk:", binaryChunk !== null); */

    if (jsonChunk.skins) {
        //console.log("===== SKINS =====");

        jsonChunk.skins.forEach(function (skin, index) {
            //console.log("Skin", index, skin);

            if (skin.joints) {
                //console.log("Number of joints:", skin.joints.length);

                //console.log("Joint node names:");
                skin.joints.forEach(function (jointNodeIndex) {
                    const node = jsonChunk.nodes[jointNodeIndex];
                    //console.log(jointNodeIndex, node ? node.name : "(no name)");
                });
            }

            if (skin.inverseBindMatrices !== undefined) {
                //console.log("inverseBindMatrices accessor:", skin.inverseBindMatrices);
            } else {
                //console.warn("Skin has no inverseBindMatrices");
            }
        });
    } else {
        console.warn("No skins found. This GLB may not contain skeleton/skin data.");
    }

    if (jsonChunk.meshes) {
        //console.log("===== MESH ATTRIBUTES =====");

        jsonChunk.meshes.forEach(function (mesh, meshIndex) {
            //console.log("Mesh", meshIndex, mesh.name);

            mesh.primitives.forEach(function (primitive, primitiveIndex) {
                //console.log("Primitive", primitiveIndex, primitive.attributes);

                if (primitive.attributes.JOINTS_0 !== undefined) {
                    //console.log("Has JOINTS_0:", primitive.attributes.JOINTS_0);
                } else {
                    //console.warn("No JOINTS_0 on this primitive");
                }

                if (primitive.attributes.WEIGHTS_0 !== undefined) {
                    //console.log("Has WEIGHTS_0:", primitive.attributes.WEIGHTS_0);
                } else {
                    //console.warn("No WEIGHTS_0 on this primitive");
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

    var mainLightVisibility =
        computeMainLightVisibilityForHome();

    gl.uniform1f(
        gl.getUniformLocation(skinnedDogProgram, "mainLightVisibility"),
        mainLightVisibility
    );

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


    var dogWallLampActive =
        currentScene === "home" &&
        isNight &&
        wallLampEnabled;

    var dogWallLampDirection =
        normalize(
            subtract(
                wallLampTarget,
                wallLampPosition
            )
        );

    gl.uniform1i(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampEnabled"
        ),
        dogWallLampActive ? 1 : 0
    );

    gl.uniform3fv(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampPosition"
        ),
        flatten(wallLampPosition)
    );

    gl.uniform3fv(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampDirection"
        ),
        flatten(dogWallLampDirection)
    );

    gl.uniform3fv(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampColor"
        ),
        flatten(wallLampColor)
    );

    gl.uniform1f(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampIntensity"
        ),
        wallLampIntensity
    );

    gl.uniform1f(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampRange"
        ),
        wallLampRange
    );

    gl.uniform1f(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampCutoff"
        ),
        wallLampCutoff
    );

    gl.uniform1f(
        gl.getUniformLocation(
            skinnedDogProgram,
            "wallLampOuterCutoff"
        ),
        wallLampOuterCutoff
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

/* //texture part
if (skinnedDog.texture && skinnedDog.texture.loaded) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, skinnedDog.texture);

        gl.uniform1i(skinnedDogUniforms.uTexture, 0);
        gl.uniform1i(skinnedDogUniforms.useTexture, true);
} 
else {
        gl.uniform1i(skinnedDogUniforms.useTexture, false);
} */

  // Kishu Inu material texture maps

var hasBaseColor =
    skinnedDog.baseColorTexture &&
    skinnedDog.baseColorTexture.loaded;

var hasNormal =
    skinnedDog.normalTexture &&
    skinnedDog.normalTexture.loaded;

var hasMetallicRoughness =
    skinnedDog.metallicRoughnessTexture &&
    skinnedDog.metallicRoughnessTexture.loaded;

var hasSpecular =
    skinnedDog.specularTexture &&
    skinnedDog.specularTexture.loaded;


// Texture 0: base color
if (hasBaseColor) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skinnedDog.baseColorTexture);

    gl.uniform1i(skinnedDogUniforms.uTexture, 0);
    gl.uniform1i(skinnedDogUniforms.useTexture, 1);
} else {
    gl.uniform1i(skinnedDogUniforms.useTexture, 0);
}


// Texture 1: normal map
if (hasNormal) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, skinnedDog.normalTexture);

    gl.uniform1i(skinnedDogUniforms.uNormalMap, 1);
    gl.uniform1i(skinnedDogUniforms.useNormalMap, 1);
} else {
    gl.uniform1i(skinnedDogUniforms.useNormalMap, 0);
}


// Texture 2: metallic-roughness map
if (hasMetallicRoughness) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, skinnedDog.metallicRoughnessTexture);

    gl.uniform1i(skinnedDogUniforms.uMetallicRoughnessMap, 2);
    gl.uniform1i(skinnedDogUniforms.useMetallicRoughnessMap, 1);
} else {
    gl.uniform1i(skinnedDogUniforms.useMetallicRoughnessMap, 0);
}


// Texture 3: specular map
if (hasSpecular) {
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, skinnedDog.specularTexture);

    gl.uniform1i(skinnedDogUniforms.uSpecularMap, 3);
    gl.uniform1i(skinnedDogUniforms.useSpecularMap, 1);
} else {
    gl.uniform1i(skinnedDogUniforms.useSpecularMap, 0);
}


// Normal intensity from the glTF material.
// Nel GLB era 0.5.
gl.uniform1f(
    skinnedDogUniforms.uNormalScale,
    skinnedDog.normalScale !== undefined ? skinnedDog.normalScale : 1.0
);      



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

       JOINTS_0 is a Uint8Array -> float in 
    WebGL1, then in the shader we convert to int using int(vJoints.x)
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



function drawSkinnedDogDepthOnly(lightViewMatrix, lightProjectionMatrix) {
    if (!skinnedDog || !skinnedDogDepthProgram) return;

   

    gl.useProgram(skinnedDogDepthProgram);

    

    var modelMatrix = getSkinnedDogModelMatrix();


    var localOverrides = {};

    applySkinnedDogPoseOverrides(localOverrides);

    var boneData = computeBoneMatricesRaw(skinnedDog, localOverrides);


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

   
    //////////////////

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


function drawSkinnedDogWallLampShadow() {
    if (!skinnedDog || !skinnedDogDepthProgram) {
        return;
    }

    gl.useProgram(skinnedDogDepthProgram);

    var modelMatrix = getSkinnedDogModelMatrix();

    var localOverrides = {};
    applySkinnedDogPoseOverrides(localOverrides);

    var boneData = computeBoneMatricesRaw(
        skinnedDog,
        localOverrides
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.modelMatrix,
        false,
        flatten(modelMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.lightViewMatrix,
        false,
        flatten(wallLampViewMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.lightProjectionMatrix,
        false,
        flatten(wallLampProjectionMatrix)
    );

    gl.uniformMatrix4fv(
        skinnedDogDepthUniforms.boneMatrices,
        false,
        boneData
    );

    /*
        ATTENTION: for the wall lamp shadow pass, we are NOT using a point shadow cubemap.
        IT's a normal 2D shadow map.
        Since we don't want to use a point shadow cubemap,
        we need to set the light position and far plane for the shader
        to compute the correct depth values.
    */
    gl.uniform4fv(
        skinnedDogDepthUniforms.lightPosition,
        flatten(vec4(
            wallLampPosition[0],
            wallLampPosition[1],
            wallLampPosition[2],
            1.0
        ))
    );

    gl.uniform1f(
        skinnedDogDepthUniforms.pointShadowFar,
        wallLampFar
    );

    gl.uniform1i(
        skinnedDogDepthUniforms.pointShadowPass,
        0
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

        //console.log("GLB texture loaded:", imageIndex);
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

    // light and fast tongue movement, to make it more lively
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
    
                /* Gentle lowering for drinking/eating.
                Same pose for water and kibble bowls.
                Only neck/head, no strange leg positions.
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
                The disc is flatter and lower, so the dog lowers
                its neck and head more, but without assuming the lying pose of the ball.
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

    
    var dogIsCallWalking =
        typeof dogCallMode !== "undefined" &&
        dogCallMode;


    dogIsWalking =
        (
            (
                dogFetchBallMode ||
                dogGoingToBowl ||
                dogIsCallWalking ||
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
            walkSpeed = 3.0; // faster: looks like a little run
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


    // --- more visible walk when going to the bowl ---


    if (dogHasBall &&
        dogFetchObjectType !== "bowlWater" &&
        dogFetchObjectType !== "bowlFood") {
        //console.log("DOG CROUCH ACTIVE");

        // left hind leg
        localOverrides[41] = rotationXMat4Raw(18.0);   // hip
        localOverrides[40] = rotationXMat4Raw(-28.0);  // knee1
        localOverrides[39] = rotationXMat4Raw(18.0);   // knee2
        localOverrides[38] = rotationXMat4Raw(8.0);    // ankle

        // right hind leg
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
        // left
        localOverrides[4] = rotationXMat4Raw(-30.0 * c);
        localOverrides[3] = rotationXMat4Raw(100.0 * c);
        localOverrides[2] = rotationXMat4Raw(-8.0 * c);
        localOverrides[1] = rotationXMat4Raw(-50.0 * c);
        localOverrides[0] = rotationXMat4Raw(12.0 * c);

        // right
        localOverrides[11] = rotationXMat4Raw(-30.0 * c);
        localOverrides[10] = rotationXMat4Raw(100.0 * c);
        localOverrides[9]  = rotationXMat4Raw(-8.0 * c);
        localOverrides[8]  = rotationXMat4Raw(-50.0 * c);
        localOverrides[7]  = rotationXMat4Raw(12.0 * c);


        // ---- HIND LEGS ----
        // HIND LEGS
        // left
    
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
            back is slightly lowered but not too much,
            to avoid the dog looking like it's lying down.
        */
        /* localOverrides[35] = rotationXMat4Raw(-10.0 * bowlPose);
        localOverrides[34] = rotationXMat4Raw(-30.0 * bowlPose);
        localOverrides[33] = rotationXMat4Raw(-20.0 * bowlPose); */
        localOverrides[35] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[34] = rotationXMat4Raw(-20.0 * bowlPose);
        localOverrides[33] = rotationXMat4Raw(-14.0 * bowlPose);

        
        

        /*
            Front legs slightly bent.
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
            I don't change the values of the tongue.
            I only add a blend to make it retract earlier during the rise.
        */
        var tongueAmount = 1.0;

        if (
            typeof dogBowlRisingActive !== "undefined" &&
            dogBowlRisingActive
        ) {
            tongueAmount = dogFetchLowerAmount / 0.22;

            tongueAmount = Math.min(Math.max(tongueAmount, 0.0), 1.0);

            // smoothstep: soft retraction
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


        // --- LIGHT STRETCHING OF HIND LEGS ---

        localOverrides[41] = rotationXMat4Raw(-100.0 * bowlPose);

        localOverrides[40] = rotationXMat4Raw(30.0 * bowlPose);

        localOverrides[47] = rotationXMat4Raw(-100.0 * bowlPose);

        localOverrides[46] = rotationXMat4Raw(30.0 * bowlPose);


       // --- LOWER HINDQUARTERS / TAIL BASE ---

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
            Clamp: prevents the pose from becoming too extreme
            when dogFetchLowerAmount gets high.
        */
        /*
            Amplify the pickup pose:

            dogFetchLowerAmount may remain low, but visually I want
            a more readable pose when picking up the frisbee.
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
                SPINE
                Here we rotate the body better,
                not just the front legs.
            */
                  
            
            /*
                SPINE - rear pose
                Distribute the pose along the spine,
                so it doesn't look like the whole model is rotating as a single piece.
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
                FRONT LEGS
                More extended: lifts them, but without closing them too much.
            */

            var pawBend = rearAmount * rearAmount * (3.0 - 2.0 * rearAmount);
            var pawWave = 0.0;   // for now better stationary, so they don't move away

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
                HIND LEGS
                More extended: they need to support the body,
                not make it sit.
            */

            // hind left
        
            

            /*
                HIND LEGS - neutral
                Non forzo più i piedi posteriori.
            */

            // ---------- HIND LEFT ----------
            var rearHipBend = rearAmount * rearAmount * (3.0 - 2.0 * rearAmount);

            localOverrides[41] = rotationXMat4Raw(-24.0 * rearHipBend);
            localOverrides[47] = rotationXMat4Raw(-24.0 * rearHipBend);
            // hind left



            /*
                NECK / HEAD goeas a bit upwards, as if looking at the firefly.
            */
            localOverrides[30] = rotationXMat4Raw(18.0 * rearAmount);
            localOverrides[28] = rotationXMat4Raw(12.0 * rearAmount);
            localOverrides[27] = rotationXMat4Raw(8.0 * rearAmount);

            /*
                TAIL movement.
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
            Softer:
            less rotation, more lift.
        */
        fireflyHop = rearAmount * 0.10;
        fireflyPitch = -45.0 * rearAmount;

        /*
            extra vertical compensation to avoid sinking into the ground.
        */
        rearGroundLift = rearAmount * 0.42;

        /*
            Small forward shift to compensate for the rotation.
        */
        rearForwardOffset = rearAmount * 0.10;
    }

    // Bob only when the dog is going towards the ball
   
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
        // while walking, look at the waypoint
        lookX = dogFetchTarget.x;
        lookZ = dogFetchTarget.z;
    } 

    else if (dogFetchTarget) {
        // when arrived, keep the final target
        lookX = dogFetchTarget.x;
        lookZ = dogFetchTarget.z;
    } else {
        // fallback: look at the ball
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

        // if the target is too close, DO NOT return to 90:
        // keep the previous angle
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

    // to make it more horizontal
    // Raises the front part and makes the body more horizontal
    var lyingPitch = -18.0 * dogCrouchAmount  + fireflyPitch;



    if (
            dogFireflyCatchActive &&
            dogFireflyCatchPhase === "rear"
        ) {
            /*
                Pivot close to the hind legs:
                so the dog rises with the torso instead of rotating
                around the center of the body.
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