import Papa from 'papaparse';
import { Drillhole, DrillholeSegment, TriangulationData, TriangulationLine, TriangulationPolyline, ColorConfiguration } from './types';
import * as THREE from 'three';

// --- Helper: Apply Color Rules ---
export const applyColorRules = (drillholes: Drillhole[], config: ColorConfiguration): Drillhole[] => {
  return drillholes.map(dh => {
    const newSegments = dh.segments.map(seg => {
      let color = '#888888'; // Default fallback
      let isTransparent = false;

      // Check for Null Value
      if (config.nullValue !== undefined && Math.abs(seg.grade - config.nullValue) < 0.0001) {
        if (config.nullColor) {
          color = config.nullColor;
        } else {
          isTransparent = true;
        }
      } else {
        // Apply Rules
        const rule = config.rules.find(r => seg.grade >= r.min && seg.grade < r.max);
        if (rule) {
          color = rule.color;
        } else {
          color = '#808080';
        }
      }

      if (isTransparent) {
        return null;
      }

      return {
        ...seg,
        color
      };
    }).filter(Boolean) as DrillholeSegment[];

    return {
      ...dh,
      segments: newSegments
    };
  });
};

export const getGradeColorFromConfig = (value: number, config?: ColorConfiguration): string => {
  if (!config) return '#888888';

  // Check for Null Value
  if (config.nullValue !== undefined && Math.abs(value - config.nullValue) < 0.0001) {
    return config.nullColor || 'transparent';
  }

  // Apply Rules
  const rule = config.rules.find(r => value >= r.min && value < r.max);
  if (rule) {
    return rule.color;
  }

  return '#808080';
};

// --- Types for CSV Parsing ---
interface CSVRow {
  [key: string]: string | number;
}

// --- Helper: Get color from grade ---
export const getGradeColor = (grade: number): string => {
  if (grade < 0.2) return '#22c55e'; // Low - Green
  if (grade < 1.0) return '#eab308'; // Med - Yellow
  if (grade < 2.5) return '#f97316'; // High - Orange
  return '#ef4444'; // Ultra - Red
};

// --- Helper: Desurveying Algorithm ---
// Combines Collar, Survey, and Assay data into 3D Drillhole objects
export const processDrillholeData = (
  collars: any[],
  surveys: any[],
  assays: any[]
): Drillhole[] => {

  const drillholes: Record<string, Drillhole> = {};

  // Helper to get value case-insensitively
  const getVal = (row: any, keys: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      if (row[k] !== undefined) return row[k];
      const foundKey = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
      if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    }
    return undefined;
  };

  // 1. Process Collars
  collars.forEach((row) => {
    const id = String(getVal(row, ['HoleID', 'HOLEID', 'id', 'ID', 'BHID']) || '').trim();

    // Geological coordinates from CSV
    const rawX = getVal(row, ['X', 'x', 'East', 'EAST', 'Este', 'ESTE']);
    const rawY = getVal(row, ['Y', 'y', 'North', 'NORTH', 'Norte', 'NORTE']);
    const rawZ = getVal(row, ['Z', 'z', 'Elev', 'RL', 'rl', 'ELEV', 'Cota', 'COTA', 'Elevacion']);

    // Strict validation function
    const parseCoord = (val: any) => {
      if (val === undefined || val === null || val === '' || String(val).toUpperCase().includes('ERROR')) return NaN;
      const num = Number(val);
      return isNaN(num) ? NaN : num;
    };

    const geoEast = parseCoord(rawX);
    const geoNorth = parseCoord(rawY);
    const geoElev = parseCoord(rawZ);
    const depth = Number(getVal(row, ['Depth', 'MaxDepth', 'DEPTH', 'TOTALDEPTH', 'Profundidad', 'PROFUNDIDAD', 'Largo']) || 100);

    // Extract filter-related fields - using exact column names from user's CSV
    const endDate = String(getVal(row, ['ENDDATE', 'EndDate', 'enddate', 'END_DATE', 'End_Date', 'FechaFin', 'FECHA_FIN']) || '').trim();
    const projectName = String(getVal(row, ['PROSPECTNAME_COLLAR_D', 'PROJECTNAME', 'ProjectName', 'projectname', 'PROJECT_NAME', 'PROSPECT', 'Prospect', 'Prospecto', 'PROSPECTO']) || '').trim();

    const isValid = id && !isNaN(geoEast) && !isNaN(geoNorth) && !isNaN(geoElev);

    if (isValid) {
      // Map geological coordinates to Three.js:
      // Geo East  -> Three.js X
      // Geo Elev  -> Three.js Y
      // Geo North -> Three.js -Z
      const threeX = geoEast;
      const threeY = geoElev;
      const threeZ = -geoNorth;

      const dh: Drillhole = {
        id,
        x: threeX,
        y: threeY,
        z: threeZ,
        depth,
        endDate: endDate || undefined,
        projectName: projectName || undefined,
        trace: [[threeX, threeY, threeZ]], // Start at collar with real coordinates
        segments: [],
      };

      drillholes[id] = dh;

      // Debug logging for first few drillholes
      if (Object.keys(drillholes).length <= 3) {
        console.log(`Drillhole ${id}: projectName="${projectName}", endDate="${endDate}"`);
      }
    }
  });

  console.log('=== DRILLHOLE DATA LOADED ===');
  console.log('Number of valid collars:', Object.keys(drillholes).length);

  // Debug: Check unique project names
  const uniqueProjects = new Set(Object.values(drillholes).map(dh => dh.projectName).filter(Boolean));
  console.log('Unique projects found:', Array.from(uniqueProjects));


  // 2. Process Surveys & Calculate Trace
  const surveyMap: Record<string, any[]> = {};
  surveys.forEach(row => {
    const id = String(getVal(row, ['HoleID', 'HOLEID', 'id', 'ID', 'BHID']) || '').trim();
    if (id) {
      if (!surveyMap[id]) surveyMap[id] = [];
      surveyMap[id].push({
        depth: Number(getVal(row, ['Depth', 'At', 'DEPTH', 'AT', 'dist']) || 0),
        azimuth: Number(getVal(row, ['Azimuth', 'Az', 'Brg', 'AZIMUTH', 'AZ', 'BRG', 'az']) || 0),
        dip: Number(getVal(row, ['Dip', 'Inc', 'DIP', 'INC', 'dip']) || -90),
      });
    }
  });

  Object.keys(drillholes).forEach(id => {
    const dh = drillholes[id];
    const holeSurveys = surveyMap[id] || [];

    holeSurveys.sort((a, b) => a.depth - b.depth);

    if (holeSurveys.length === 0 || holeSurveys[0].depth > 0) {
      holeSurveys.unshift({ depth: 0, azimuth: 0, dip: -90 });
    }

    // Ensure we have at least 2 survey points to generate a trace
    // If we only have the collar point, add an end-of-hole point
    if (holeSurveys.length === 1) {
      holeSurveys.push({
        depth: dh.depth,
        azimuth: holeSurveys[0].azimuth,
        dip: holeSurveys[0].dip
      });
    }

    // Tangential Desurveying
    // Start from the SHIFTED collar position, so the trace is generated in local space
    let currentPos = new THREE.Vector3(dh.x, dh.y, dh.z);

    // Trace already has start point
    const trace: [number, number, number][] = [[dh.x, dh.y, dh.z]];

    for (let i = 0; i < holeSurveys.length - 1; i++) {
      const s1 = holeSurveys[i];
      const s2 = holeSurveys[i + 1];
      const dist = s2.depth - s1.depth;

      const dipRad = (s1.dip * Math.PI) / 180;
      const azRad = (s1.azimuth * Math.PI) / 180;

      const horizDist = dist * Math.cos(dipRad);
      const vertDist = dist * Math.sin(dipRad);

      const dEast = horizDist * Math.sin(azRad);
      const dNorth = horizDist * Math.cos(azRad);

      currentPos.x += dEast;
      currentPos.y += vertDist;
      currentPos.z -= dNorth; // North is negative Z in ThreeJS

      trace.push([currentPos.x, currentPos.y, currentPos.z]);
    }

    dh.trace = trace;
  });

  // 3. Process Assays & Create Segments
  const assaysById: Record<string, any[]> = {};
  assays.forEach(row => {
    const id = String(getVal(row, ['HoleID', 'HOLEID', 'id', 'ID', 'BHID']) || '').trim();
    if (id) {
      if (!assaysById[id]) assaysById[id] = [];
      assaysById[id].push(row);
    }
  });

  Object.keys(assaysById).forEach(id => {
    const dh = drillholes[id];
    if (!dh) return;

    const holeAssays = assaysById[id];
    holeAssays.sort((a, b) => {
      const fromA = Number(getVal(a, ['From', 'from', 'FROM', 'SAMPFROM', 'SampFrom']) || 0);
      const fromB = Number(getVal(b, ['From', 'from', 'FROM', 'SAMPFROM', 'SampFrom']) || 0);
      return fromA - fromB;
    });

    let lastTraceIndex = 0;
    let accumulatedTraceLen = 0;

    holeAssays.forEach(row => {
      const from = Number(getVal(row, ['From', 'from', 'FROM', 'SAMPFROM', 'SampFrom', 'depth_from']) || 0);
      const to = Number(getVal(row, ['To', 'to', 'TO', 'SAMPTO', 'SampTo', 'depth_to']) || 0);
      const grade = Number(getVal(row, [
        'CuT_pct_BESTEL', // User's specific column name
        'Cu', 'CU', 'cu',
        'CU_PCT', 'Cu_pct', 'cu_pct', 'CU%', 'Cu%',
        'COPPER', 'Copper', 'copper',
        'CU_PPM', 'Cu_ppm',
        'Au', 'AU', 'au', 'GOLD', 'Gold', 'gold',
        'Value', 'VALUE', 'value',
        'Grade', 'GRADE', 'grade',
        'val', 'VAL',
        'RESULT', 'Result', 'result',
        'ASSAY', 'Assay', 'assay'
      ]) || 0);

      const resultFrom = findPositionOnTrace(dh.trace, from, lastTraceIndex, accumulatedTraceLen);
      const resultTo = findPositionOnTrace(dh.trace, to, resultFrom.index, resultFrom.accumulatedLen);

      lastTraceIndex = resultFrom.index;
      accumulatedTraceLen = resultFrom.accumulatedLen;

      dh.segments.push({
        from,
        to,
        grade,
        color: getGradeColor(grade),
        start: resultFrom.position,
        end: resultTo.position
      });
    });
  });

  return Object.values(drillholes);
};

// Optimized position finder that resumes search
const findPositionOnTrace = (
  trace: [number, number, number][],
  depth: number,
  startIndex: number,
  startAccumulatedLen: number
): { position: [number, number, number], index: number, accumulatedLen: number } => {

  let currentAcc = startAccumulatedLen;

  // Safety check
  if (startIndex >= trace.length - 1) {
    const last = trace[trace.length - 1];
    return { position: last, index: trace.length - 1, accumulatedLen: currentAcc };
  }

  for (let i = startIndex; i < trace.length - 1; i++) {
    const p1 = new THREE.Vector3(trace[i][0], trace[i][1], trace[i][2]);
    const p2 = new THREE.Vector3(trace[i + 1][0], trace[i + 1][1], trace[i + 1][2]);
    const segLen = p1.distanceTo(p2);

    if (depth >= currentAcc && depth <= currentAcc + segLen) {
      // Found it
      const alpha = (depth - currentAcc) / segLen;
      const res = new THREE.Vector3().lerpVectors(p1, p2, alpha);
      return {
        position: [res.x, res.y, res.z],
        index: i,
        accumulatedLen: currentAcc
      };
    }
    currentAcc += segLen;
  }

  // If we exceed trace, extrapolate or clamp? Clamp to last point.
  const last = trace[trace.length - 1];
  return { position: last, index: trace.length - 1, accumulatedLen: currentAcc };
}


// --- File Helper ---
export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
};

// --- DXF Parser for Triangulation/Topography ---
export const parseDXF = async (file: File): Promise<TriangulationData> => {
  const text = await file.text();
  const lines = text.split(/\r?\n/);

  const result: TriangulationData = {
    lines: [],
    polylines: []
  };

  let i = 0;
  let lineIdCounter = 0;
  let polylineIdCounter = 0;

  while (i < lines.length) {
    const code = lines[i]?.trim();
    const value = lines[i + 1]?.trim();

    // LINE entity
    if (code === '0' && value === 'LINE') {
      let x1 = 0, y1 = 0, z1 = 0;
      let x2 = 0, y2 = 0, z2 = 0;
      let color = '#ffffff';

      i += 2;
      while (i < lines.length) {
        const c = lines[i]?.trim();
        const v = lines[i + 1]?.trim();

        if (c === '10') x1 = parseFloat(v) || 0;
        else if (c === '20') y1 = parseFloat(v) || 0;
        else if (c === '30') z1 = parseFloat(v) || 0;
        else if (c === '11') x2 = parseFloat(v) || 0;
        else if (c === '21') y2 = parseFloat(v) || 0;
        else if (c === '31') z2 = parseFloat(v) || 0;
        else if (c === '62') {
          // Color index (basic mapping)
          const colorIdx = parseInt(v) || 7;
          color = getDXFColor(colorIdx);
        }
        else if (c === '0') {
          // Next entity, step back
          i -= 2;
          break;
        }

        i += 2;
      }

      // Convert DXF coordinates (Y-up) to Three.js (Y-up, but may need Z adjustment)
      // DXF: X=East, Y=North, Z=Elevation
      // Three.js: X=East, Y=Elevation, Z=-North
      result.lines.push({
        id: `line-${lineIdCounter++}`,
        start: [x1, z1, -y1],
        end: [x2, z2, -y2],
        color
      });
    }

    // POLYLINE or LWPOLYLINE
    else if (code === '0' && (value === 'POLYLINE' || value === 'LWPOLYLINE')) {
      const isLwPolyline = value === 'LWPOLYLINE';
      const points: [number, number, number][] = [];
      let closed = false;
      let color = '#ffffff';
      let elevation = 0;

      i += 2;
      while (i < lines.length) {
        const c = lines[i]?.trim();
        const v = lines[i + 1]?.trim();

        if (c === '70') {
          const flags = parseInt(v) || 0;
          closed = (flags & 1) !== 0; // Bit 0 = closed
        }
        else if (c === '30') elevation = parseFloat(v) || 0;
        else if (c === '62') {
          const colorIdx = parseInt(v) || 7;
          color = getDXFColor(colorIdx);
        }
        else if (c === '0' && v === 'VERTEX') {
          // Read vertex
          let x = 0, y = 0, z = elevation;
          i += 2;
          while (i < lines.length) {
            const vc = lines[i]?.trim();
            const vv = lines[i + 1]?.trim();

            if (vc === '10') x = parseFloat(vv) || 0;
            else if (vc === '20') y = parseFloat(vv) || 0;
            else if (vc === '30') z = parseFloat(vv) || 0;
            else if (vc === '0') {
              i -= 2;
              break;
            }

            i += 2;
          }
          // Convert to Three.js coordinates
          points.push([x, z, -y]);
        }
        else if (c === '0' && (v === 'SEQEND' || v === 'ENDSEC')) {
          break;
        }

        i += 2;
      }

      if (points.length > 0) {
        result.polylines.push({
          id: `polyline-${polylineIdCounter++}`,
          points,
          closed,
          color
        });
      }
    }

    i += 2;
  }

  return result;
};

// Basic DXF color index to hex color mapping
const getDXFColor = (index: number): string => {
  const colors: Record<number, string> = {
    0: '#000000', 1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
    5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0'
  };
  return colors[index] || '#ffffff';
};
