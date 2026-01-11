import { Layer, LayerType, Drillhole, BlockModelBlock } from './types';
import * as THREE from 'three';

// Updated Mock Generator using pre-calculated segments logic simulation
const generateDrillholes = (count: number): Drillhole[] => {
  const holes: Drillhole[] = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 400;
    const z = (Math.random() - 0.5) * 400;
    const y = 50 + (Math.random() * 20); // Collar elevation (Y-up in ThreeJS)

    const depth = 150 + Math.random() * 200;

    // Simulate a slightly curved trace
    const trace: [number, number, number][] = [];
    const segments = [];

    let currentX = x;
    let currentY = y;
    let currentZ = z;

    trace.push([currentX, currentY, currentZ]);

    // Generate trace points
    const step = 10;
    const deviationX = (Math.random() - 0.5) * 0.5;
    const deviationZ = (Math.random() - 0.5) * 0.5;

    for (let d = 0; d < depth; d += step) {
      currentY -= step; // Down
      currentX += deviationX * step;
      currentZ += deviationZ * step;
      trace.push([currentX, currentY, currentZ]);
    }

    // Generate Segments along that trace
    let currentDepth = 0;
    while (currentDepth < depth) {
      const interval = 2 + Math.random() * 8;
      const to = Math.min(currentDepth + interval, depth);

      const grade = Math.random() * 3.5;
      let color = '#22c55e';
      if (grade > 0.5) color = '#eab308';
      if (grade > 1.5) color = '#ef4444';
      if (grade > 2.5) color = '#a855f7';

      // Interpolate positions for segment
      const startIdx = Math.floor(currentDepth / step);
      const endIdx = Math.floor(to / step);

      // Simple lookup (safe enough for mock)
      const safeStart = Math.min(startIdx, trace.length - 1);
      const safeEnd = Math.min(endIdx, trace.length - 1);

      segments.push({
        from: currentDepth,
        to,
        grade,
        color,
        start: trace[safeStart],
        end: trace[safeEnd]
      });
      currentDepth = to;
    }

    holes.push({
      id: `DH-${i}`,
      x,
      y,
      z,
      depth,
      trace,
      segments
    });
  }
  return holes;
};

const generateBlockModel = (): BlockModelBlock[] => {
  const blocks: BlockModelBlock[] = [];
  // Generate a simplified ore body shape (ellipsoid)
  for (let x = -100; x <= 100; x += 20) {
    for (let y = -100; y <= 50; y += 20) {
      for (let z = -100; z <= 100; z += 20) {
        const dist = Math.sqrt(x * x + (y * 2) * 2 + z * z);
        if (dist < 120 && Math.random() > 0.3) {
          const grade = (120 - dist) / 40;
          let color = '#3b82f6';
          if (grade > 1) color = '#eab308';
          if (grade > 2) color = '#ef4444';

          blocks.push({
            position: [x, y, z],
            grade,
            color
          });
        }
      }
    }
  }
  return blocks;
};

export const MOCK_DRILLHOLES = generateDrillholes(40);
export const MOCK_BLOCKS = generateBlockModel();

export const INITIAL_LAYERS: Layer[] = [
  {
    id: 'root-dh',
    name: 'Drillholes',
    type: LayerType.FOLDER,
    visible: true,
    children: []
  },
  {
    id: 'root-tri',
    name: 'Triangulation',
    type: LayerType.FOLDER,
    visible: true,
    children: []
  },
  {
    id: 'root-bm',
    name: 'Block Models',
    type: LayerType.FOLDER,
    visible: true,
    children: []
  }
];