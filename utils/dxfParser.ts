import DxfParser from 'dxf-parser';
import { SolidData } from '../types';

function calculateBounds(vertices: number[]): SolidData['bounds'] {
    if (vertices.length === 0) {
        return {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 0, y: 0, z: 0 }
        };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
    }

    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ }
    };
}

export async function parseDXFFile(file: File): Promise<SolidData> {
    const text = await file.text();
    const parser = new DxfParser();

    let dxf;
    try {
        dxf = parser.parseSync(text);
    } catch (error) {
        throw new Error(`Failed to parse DXF file: ${error}`);
    }

    if (!dxf.entities || dxf.entities.length === 0) {
        throw new Error('No entities found in DXF file');
    }

    // Extract 3DFACE entities
    const faces = dxf.entities.filter((e: any) => e.type === '3DFACE');

    if (faces.length === 0) {
        throw new Error('No 3DFACE entities found in DXF file');
    }

    console.log(`Found ${faces.length} 3DFACE entities in DXF file`);

    // Convert to flat vertex array
    const vertices: number[] = [];

    faces.forEach((face: any) => {
        const v = face.vertices;

        if (!v || v.length < 3) {
            console.warn('Invalid 3DFACE entity (less than 3 vertices), skipping');
            return;
        }

        // Triangle 1: v0, v1, v2
        vertices.push(v[0].x, v[0].y, v[0].z);
        vertices.push(v[1].x, v[1].y, v[1].z);
        vertices.push(v[2].x, v[2].y, v[2].z);

        // If it's a quad (4th vertex different from 3rd), create second triangle
        if (v.length >= 4 && v[3]) {
            const isDifferent =
                Math.abs(v[3].x - v[2].x) > 0.001 ||
                Math.abs(v[3].y - v[2].y) > 0.001 ||
                Math.abs(v[3].z - v[2].z) > 0.001;

            if (isDifferent) {
                // Triangle 2: v0, v2, v3
                vertices.push(v[0].x, v[0].y, v[0].z);
                vertices.push(v[2].x, v[2].y, v[2].z);
                vertices.push(v[3].x, v[3].y, v[3].z);
            }
        }
    });

    if (vertices.length === 0) {
        throw new Error('No valid vertices extracted from 3DFACE entities');
    }

    const bounds = calculateBounds(vertices);

    console.log('DXF parsing complete:', {
        faceCount: faces.length,
        vertexCount: vertices.length / 3,
        bounds
    });

    return {
        name: file.name.replace('.dxf', '').replace('.DXF', ''),
        vertices: new Float32Array(vertices),
        faceCount: faces.length,
        bounds
    };
}
