var skinnedDog = null;

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