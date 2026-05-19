
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
                    console.log(jointNodeIndex, node ? node.name : "(no name)");
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

function getNumComponents(type) {
    if (type === "SCALAR") return 1;
    if (type === "VEC2") return 2;
    if (type === "VEC3") return 3;
    if (type === "VEC4") return 4;
    if (type === "MAT4") return 16;

    throw new Error("Unsupported accessor type: " + type);
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

    var modelMatrix = mat4();
    
    var t = performance.now() * 0.001;
    var walkMove = Math.sin(t * 1.2) * 0.35;

    modelMatrix = mult(modelMatrix, translate(-3.2 + walkMove, -2.4, 1.2));
    modelMatrix = mult(modelMatrix, rotate(90.0, [0, 1, 0]));
    modelMatrix = mult(modelMatrix, scalem(1.5, 1.5, 1.5));

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

    var localOverrides = {};


    // nodeIndex della coda, non jointIndex
    var tailNodeIndex = 51;
    var tailSpeed = 7.0;
    var baseAngle = Math.sin(t * tailSpeed);

   // Scodinzolio progressivo: la punta si muove di più
    localOverrides[51] = rotationYMat4Raw(baseAngle * 8.0);
    localOverrides[50] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.25) * 15.0);
    localOverrides[49] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.50) * 18.0);
    localOverrides[48] = rotationYMat4Raw(Math.sin(t * tailSpeed + 0.75) * 20.0);

    /* Legs */
    
    var walkSpeed = 3.0;
    var walkPhase = t * walkSpeed;

    // movimento avanti/indietro
    var legA = Math.sin(walkPhase);
    var legB = Math.sin(walkPhase + Math.PI);

    // ampiezze sobrie
    var frontHipAmount = 10.0;
    var hindHipAmount  = 8.0;

    var frontKneeAmount  = 22.0;
    var frontAnkleAmount = 26.0;
    var frontBallAmount  = 18.0;

    var hindKneeAmount = 7.0;

    // diagonali insieme
    localOverrides[FRONT_LEFT_HIP]  = rotationXMat4Raw(legA * frontHipAmount);
    localOverrides[HIND_RIGHT_HIP]  = rotationXMat4Raw(legA * hindHipAmount);

    localOverrides[FRONT_RIGHT_HIP] = rotationXMat4Raw(legB * frontHipAmount);
    localOverrides[HIND_LEFT_HIP]   = rotationXMat4Raw(legB * hindHipAmount);

    // piega ginocchio: solo quando la zampa "torna avanti"
    var frontKneeA = Math.max(0.0, -legA) * frontKneeAmount;
    var frontKneeB = Math.max(0.0, -legB) * frontKneeAmount;

    var frontAnkleA = Math.max(0.0, -legA) * frontAnkleAmount;
    var frontAnkleB = Math.max(0.0, -legB) * frontAnkleAmount;


    var frontBallA  = Math.max(0.0, -legA) * frontBallAmount;
    var frontBallB  = Math.max(0.0, -legB) * frontBallAmount;

    // front legs più morbide
   /*  localOverrides[FRONT_LEFT_KNEE]  = rotationXMat4Raw(-frontKneeA);
    localOverrides[FRONT_LEFT_ANKLE] = rotationXMat4Raw(frontAnkleA);
    localOverrides[FRONT_LEFT_BALL]  = rotationXMat4Raw(frontBallA);

    localOverrides[FRONT_RIGHT_KNEE]  = rotationXMat4Raw(-frontKneeB);
    localOverrides[FRONT_RIGHT_ANKLE] = rotationXMat4Raw(frontAnkleB);
    localOverrides[FRONT_RIGHT_BALL]  = rotationXMat4Raw(frontBallB); */
     
    // front legs più morbide
    // knee su X, parte bassa su Z per renderla più visibile
    localOverrides[FRONT_LEFT_KNEE]  = rotationXMat4Raw(-frontKneeA);
    localOverrides[FRONT_LEFT_ANKLE] = rotationXMat4Raw(frontAnkleA *1.8);
    localOverrides[FRONT_LEFT_BALL]  = rotationXMat4Raw(-frontBallA*1.2);

    localOverrides[FRONT_RIGHT_KNEE]  = rotationXMat4Raw(-frontKneeB);
    localOverrides[FRONT_RIGHT_ANKLE] = rotationXMat4Raw(frontAnkleB *1.8);
    localOverrides[FRONT_RIGHT_BALL]  = rotationXMat4Raw(-frontBallB*1.2);


    // hind legs più leggere
    var hindKneeA = Math.max(0.0, -legA) * hindKneeAmount;
    var hindKneeB = Math.max(0.0, -legB) * hindKneeAmount;

    localOverrides[HIND_RIGHT_KNEE1] = rotationXMat4Raw(-hindKneeA);
    localOverrides[HIND_RIGHT_KNEE2] = rotationXMat4Raw(hindKneeA * 0.4);

    localOverrides[HIND_LEFT_KNEE1] = rotationXMat4Raw(-hindKneeB);
    localOverrides[HIND_LEFT_KNEE2] = rotationXMat4Raw(hindKneeB * 0.4);

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

function quatToMat4(x, y, z, w) {
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;

    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;

    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;

    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;

    return mat4(
        1.0 - (yy + zz), xy + wz,        xz - wy,        0.0,
        xy - wz,         1.0 - (xx + zz), yz + wx,       0.0,
        xz + wy,         yz - wx,        1.0 - (xx + yy), 0.0,
        0.0,             0.0,            0.0,             1.0
    );
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



function mat4FromArray(array, offset) {
    return mat4(
        array[offset + 0],  array[offset + 1],  array[offset + 2],  array[offset + 3],
        array[offset + 4],  array[offset + 5],  array[offset + 6],  array[offset + 7],
        array[offset + 8],  array[offset + 9],  array[offset + 10], array[offset + 11],
        array[offset + 12], array[offset + 13], array[offset + 14], array[offset + 15]
    );
}

function copyMat4ToFloat32Array(m, array, offset) {
    var flat = flatten(m);

    for (var i = 0; i < 16; i++) {
        array[offset + i] = flat[i];
    }
}


function mat4IdentityRaw() {
    var m = new Float32Array(16);
    m[0] = 1;
    m[5] = 1;
    m[10] = 1;
    m[15] = 1;
    return m;
}

function mat4MultiplyRaw(a, b) {
    var out = new Float32Array(16);

    for (var col = 0; col < 4; col++) {
        for (var row = 0; row < 4; row++) {
            out[col * 4 + row] =
                a[0 * 4 + row] * b[col * 4 + 0] +
                a[1 * 4 + row] * b[col * 4 + 1] +
                a[2 * 4 + row] * b[col * 4 + 2] +
                a[3 * 4 + row] * b[col * 4 + 3];
        }
    }

    return out;
}

function quatToMat4Raw(x, y, z, w) {
    var out = mat4IdentityRaw();

    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;

    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;

    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;

    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);

    return out;
}

function translationMat4Raw(x, y, z) {
    var m = mat4IdentityRaw();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
}

function scaleMat4Raw(x, y, z) {
    var m = mat4IdentityRaw();
    m[0] = x;
    m[5] = y;
    m[10] = z;
    return m;
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

function mat4InvertRaw(a) {
    var out = new Float32Array(16);

    var a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
    var a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
    var a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;

    var det =
        b00 * b11 -
        b01 * b10 +
        b02 * b09 +
        b03 * b08 -
        b04 * b07 +
        b05 * b06;

    if (!det) {
        console.warn("mat4InvertRaw: matrix not invertible");
        return mat4IdentityRaw();
    }

    det = 1.0 / det;

    out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;

    out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;

    out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;

    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
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


function rotationYMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;

    return m;
}
function rotationXMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;

    return m;
}
function rotationZMat4Raw(angleDeg) {
    var a = angleDeg * Math.PI / 180.0;
    var c = Math.cos(a);
    var s = Math.sin(a);

    var m = mat4IdentityRaw();

    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;

    return m;
}



function getMimeTypeFromImage(gltf, imageIndex) {
    var image = gltf.images[imageIndex];

    if (image.mimeType) {
        return image.mimeType;
    }

    return "image/png";
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