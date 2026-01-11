import { Vector3 } from 'three';

export enum LayerType {
  FOLDER = 'FOLDER',
  DRILLHOLE_GROUP = 'DRILLHOLE_GROUP',
  DRILLHOLE_TRACE = 'DRILLHOLE_TRACE',
  SURFACE = 'SURFACE',
  BLOCK_MODEL = 'BLOCK_MODEL',
  POINTS = 'POINTS',
  SOLID = 'SOLID'
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  color?: string;
  opacity?: number;
  children?: Layer[];
  parentId?: string;
  data?: any; // Holds specific geometry data references
  originalData?: any; // Holds original data for resetting filters/colors
  colorConfiguration?: ColorConfiguration;
}

export interface ColorRule {
  id: string;
  min: number;
  max: number;
  color: string;
  label?: string;
}

export interface ColorConfiguration {
  rules: ColorRule[];
  nullValue?: number; // Value to treat as "no data" or specific marker (e.g. -99)
  nullColor?: string; // Color for null values, or undefined for transparent
  useGradient?: boolean; // Future use
}

export interface DrillholeSegment {
  id?: string;
  from: number;
  to: number;
  grade: number;
  color: string;
  // Calculated 3D world coordinates for the segment cylinder
  start: [number, number, number];
  end: [number, number, number];
}

export interface Drillhole {
  id: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  endDate?: string; // From COLLAR ENDDATE column
  projectName?: string; // From COLLAR PROJECTNAME column
  // A trace is a line strip of [x,y,z] points
  trace: [number, number, number][];
  segments: DrillholeSegment[];
}

export interface BlockModelBlock {
  position: [number, number, number];
  grade: number;
  color: string;
}

export interface Point3D {
  id: string;
  position: [number, number, number];
  label?: string;
  color?: string;
}

export interface TriangulationLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}

export interface TriangulationPolyline {
  id: string;
  points: [number, number, number][];
  closed?: boolean;
  color?: string;
}

export interface TriangulationData {
  lines: TriangulationLine[];
  polylines: TriangulationPolyline[];
}

export interface SolidData {
  name: string;
  vertices: Float32Array;
  faceCount: number;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}


// Icon mapping types
export type IconName = 'folder' | 'file' | 'cube' | 'activity' | 'layers' | 'map' | 'settings' | 'eye' | 'eye-off';

export interface SelectedElement {
  type: 'DRILLHOLE_SEGMENT' | 'BLOCK_MODEL_BLOCK';
  id: string;
  holeId?: string;
  from?: number;
  to?: number;
  value: number;
  depth?: number;
  color?: string; // Color of the selected segment
  x?: number;
  y?: number;
  z?: number;
}

export interface DrillholeFilter {
  dateRange?: { start: string; end: string };
  projectNames?: string[];
  drillholeIds?: string[];
}

export interface SliceConfig {
  active: boolean;
  p1: [number, number, number] | null; // Start point of the cut line
  p2: [number, number, number] | null; // End point of the cut line
  width: number; // Halo/Width of the section
  offset: number; // Current offset from the center
}
