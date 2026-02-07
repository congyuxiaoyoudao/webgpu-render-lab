import { vec2, vec3, vec4 } from "wgpu-matrix" 
import { getVec2FromArray, getVec3FromArray } from "../math/array.js"


interface Mesh {
  positions: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
  tangents?: Float32Array;
  biTangents?: Float32Array;
  indices: Uint32Array;
}


type CachePosition = number
type CacheFace = string
type CacheNormal = number
type CacheUv = number
type CacheArray<T> = T[][]

/**
 * ObjLoader to load in .obj files. This has only been tested on Blender .obj exports that have been UV unwrapped
 * and you may need to throw out certain returned fields if the .OBJ is missing them (ie. uvs or normals)
 */
export class ObjLoader {
  constructor() {}
  /**
   * Fetch the contents of a file, located at a filePath.
   */
  async load(url: string): Promise<string> {
    const responce = await fetch(url)
    if (!responce.ok) {
      throw new Error(
        `ObjLoader could not fine file at ${url}. Please check your path.`
      )
    }
    const file = await responce.text()

    if (file.length === 0) {
      throw new Error(`${url} File is empty.`)
    }

    return file
  }


  /**
   * Parse a given obj file into a Mesh
   */
  parse(file: string): Mesh {
    const lines = file?.split("\n")

    // Store what's in the object file here
    const cachedPositions: CacheArray<CachePosition> = []
    const cachedFaces: CacheArray<CacheFace> = []
    const cachedNormals: CacheArray<CacheNormal> = []
    const cachedUvs: CacheArray<CacheUv> = []

    // Read out data from file and store into appropriate source buckets
    {
      for (const untrimmedLine of lines) {
        const line = untrimmedLine.trim() // remove whitespace
        const [dataLineType, ...data] = line.split(" ")
        switch (dataLineType) {
          case "v":
            cachedPositions.push(data.map(parseFloat))
            break
          case "vt":
            cachedUvs.push(data.map(Number))
            break
          case "vn":
            cachedNormals.push(data.map(parseFloat))
            break
          case "f":
            cachedFaces.push(data)
            break
        }
      }
    }

    // Use these intermediate arrays to leverage Array API (.push)
    const finalPositions: number[] = []
    const finalNormals: number[] = []
    const finalUvs: number[] = []
    const finalIndices: number[] = []

    // Loop through faces, and return the buffers that will be sent to GPU for rendering
    {
      const cache: Record<string, number> = {}
      let i = 0
      for (const faces of cachedFaces) {
        for (const faceString of faces) {
          // If we already saw this, add to indices list.
          if (cache[faceString] !== undefined) {
            finalIndices.push(cache[faceString])
            continue
          }

          cache[faceString] = i
          finalIndices.push(i)

          // Need to convert strings to integers, and subtract by 1 to get to zero index.
          const [vI, uvI, nI] = faceString
            .split("/")
            .map((s: string) => Number(s) - 1)

          vI > -1 && finalPositions.push(...cachedPositions[vI])
          uvI > -1 && finalUvs.push(...cachedUvs[uvI])
          nI > -1 && finalNormals.push(...cachedNormals[nI])

          i += 1
        }
      }
    }

    return {
      positions: new Float32Array(finalPositions),
      uvs: new Float32Array(finalUvs),
      normals: new Float32Array(finalNormals),
      indices: new Uint32Array(finalIndices),
      tangents: this.computeTangents(
        new Float32Array(finalPositions),
        new Float32Array(finalUvs),
        new Float32Array(finalNormals),
        new Uint32Array(finalIndices)
      ),
    }
  }

  /**
   * Compute tangents for the mesh
   */
  computeTangents(
    positions: Float32Array,
    uvs: Float32Array,
    normals: Float32Array,
    indices: Uint32Array
  ) {
    const vertexCount = positions.length / 3;
    const tangents = new Float32Array(vertexCount * 4); // xyz + w: handedness

    const tan1 = new Float32Array(vertexCount * 3);
    const tan2 = new Float32Array(vertexCount * 3);

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i]; // A
      const i1 = indices[i + 1]; // B
      const i2 = indices[i + 2]; // C

      const p0 = getVec3FromArray(positions, i0);
      const p1 = getVec3FromArray(positions, i1);
      const p2 = getVec3FromArray(positions, i2);

      const uv0 = getVec2FromArray(uvs, i0);
      const uv1 = getVec2FromArray(uvs, i1);
      const uv2 = getVec2FromArray(uvs, i2);

      const dp1 = vec3.sub(p1, p0);
      const dp2 = vec3.sub(p2, p0);

      const duv1 = vec2.sub(uv1, uv0);
      const duv2 = vec2.sub(uv2, uv0);

      const r = 1.0 / (duv1[0] * duv2[1] - duv1[1] * duv2[0]);

      const tangent = vec4.fromValues(
        ...vec3.sub(
          vec3.fromValues(...dp1, duv2[1]),
          vec3.fromValues(...dp2, duv1[1])
        ),
        r
      );

      const bitangent = vec4.fromValues(
        ...vec3.sub(
          vec3.fromValues(...dp2, duv1[0]),
          vec3.fromValues(...dp1, duv2[0])
        ),
        r
      );

      const t0 = tan1.subarray(i0 * 3, i0 * 3 + 3);
      vec3.add(t0, tangent, t0);
      const t1 = tan1.subarray(i1 * 3, i1 * 3 + 3);
      vec3.add(t1, tangent, t1);
      const t2 = tan1.subarray(i2 * 3, i2 * 3 + 3);
      vec3.add(t2, tangent, t2);

      const bt0 = tan2.subarray(i0 * 3, i0 * 3 + 3);
      vec3.add(bt0, bitangent, bt0);
      const bt1 = tan2.subarray(i1 * 3, i1 * 3 + 3);
      vec3.add(bt1, bitangent, bt1);
      const bt2 = tan2.subarray(i2 * 3, i2 * 3 + 3);
      vec3.add(bt2, bitangent, bt2);
    }

    // Gram-Schmidt orthogonal + handedness
    for (let i = 0; i < vertexCount; i++) {
      const n = getVec3FromArray(normals, i);
      const t = getVec3FromArray(tan1, i);

      // T = normalize(T - N * dot(N, T))
      const tangent = vec3.normalize(
        vec3.sub(t, vec3.scale(n, vec3.dot(n, t)))
      );

      // handedness
      const b = getVec3FromArray(tan2, i);
      const w = vec3.dot(vec3.cross(n, t), b) < 0 ? -1 : 1;

      tangents[i * 4 + 0] = tangent[0];
      tangents[i * 4 + 1] = tangent[1];
      tangents[i * 4 + 2] = tangent[2];
      tangents[i * 4 + 3] = w;
    }

    return tangents;
  }
}