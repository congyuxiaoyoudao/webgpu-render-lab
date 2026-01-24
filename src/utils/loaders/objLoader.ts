interface Mesh {
  positions: Float32Array;
  uvs: Float32Array;
  normals: Float32Array;
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
    }
  }
}