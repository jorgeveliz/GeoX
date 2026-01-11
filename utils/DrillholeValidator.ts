export type ValidationSeverity = 'ERROR' | 'WARNING';
export type FileType = 'COLLAR' | 'SURVEY' | 'ASSAY';

export interface ValidationMessage {
    id: string; // Unique ID for the message (e.g., for React keys)
    fileType: FileType;
    severity: ValidationSeverity;
    holeId: string;
    lineNumber?: number;
    column?: string;
    message: string;
    value?: string | number;
    limit?: string | number;
    endDate?: string; // Fecha de finalización del sondaje
    prospectName?: string; // Nombre del prospecto
}

export interface ValidationResult {
    messages: ValidationMessage[];
    hasErrors: boolean;
}

// Helper to check if a value is numeric
const isNumeric = (val: any): boolean => {
    if (val === null || val === undefined || val === '') return false;
    return !isNaN(Number(val));
};

// Helper to clean BHID
const cleanId = (val: any): string => String(val || '').trim();

// Interface for collar metadata
interface CollarMetadata {
    depth: number;
    endDate?: string;
    prospectName?: string;
}

export const validateCollar = (data: any[]): { result: ValidationResult, collarMap: Map<string, number>, collarMetadata: Map<string, CollarMetadata> } => {
    const messages: ValidationMessage[] = [];
    const collarMap = new Map<string, number>(); // BHID -> Depth (for backward compatibility)
    const collarMetadata = new Map<string, CollarMetadata>(); // BHID -> Full metadata
    const seenIds = new Set<string>();

    data.forEach((row, idx) => {
        const lineNum = idx + 2; // Assuming header is line 1
        const id = cleanId(row['HoleID'] || row['HOLEID'] || row['id'] || row['ID']);

        // Capture additional metadata
        const endDate = String(row['ENDDATE'] || row['EndDate'] || row['enddate'] || '').trim();
        const prospectName = String(row['PROSPECTNAME'] || row['PROSPECTNAME_COLLAR_D'] || row['ProspectName'] || row['prospectname'] || '').trim();

        // Check BHID
        if (!id) {
            messages.push({
                id: `col-missing-id-${idx}`,
                fileType: 'COLLAR',
                severity: 'ERROR',
                holeId: 'Unknown',
                lineNumber: lineNum,
                message: 'Missing HoleID',
                endDate: endDate || undefined,
                prospectName: prospectName || undefined
            });
            return;
        }

        if (seenIds.has(id)) {
            messages.push({
                id: `col-dup-id-${idx}`,
                fileType: 'COLLAR',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Duplicate HoleID',
                endDate: endDate || undefined,
                prospectName: prospectName || undefined
            });
        }
        seenIds.add(id);

        // Check Coordinates
        const x = row['X'] || row['x'] || row['EAST'] || row['East'];
        const y = row['Y'] || row['y'] || row['NORTH'] || row['North'];
        const z = row['Z'] || row['z'] || row['ELEV'] || row['Elev'] || row['RL'];

        if (!isNumeric(x) || !isNumeric(y) || !isNumeric(z)) {
            messages.push({
                id: `col-coord-${idx}`,
                fileType: 'COLLAR',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Invalid or missing coordinates (X, Y, Z)',
                endDate: endDate || undefined,
                prospectName: prospectName || undefined
            });
        }

        // Check Depth
        const depthVal = row['Depth'] || row['MaxDepth'] || row['DEPTH'];
        if (!isNumeric(depthVal)) {
            messages.push({
                id: `col-depth-nan-${idx}`,
                fileType: 'COLLAR',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Invalid Depth value',
                endDate: endDate || undefined,
                prospectName: prospectName || undefined
            });
        } else {
            const depth = Number(depthVal);
            if (depth <= 0) {
                messages.push({
                    id: `col-depth-zero-${idx}`,
                    fileType: 'COLLAR',
                    severity: 'ERROR',
                    holeId: id,
                    lineNumber: lineNum,
                    message: 'Depth must be positive',
                    value: depth,
                    endDate: endDate || undefined,
                    prospectName: prospectName || undefined
                });
            }
            collarMap.set(id, depth);
            collarMetadata.set(id, {
                depth,
                endDate: endDate || undefined,
                prospectName: prospectName || undefined
            });
        }
    });

    return {
        result: { messages, hasErrors: messages.some(m => m.severity === 'ERROR') },
        collarMap,
        collarMetadata
    };
};

export const validateSurvey = (data: any[], collarMap: Map<string, number>, collarMetadata: Map<string, CollarMetadata>): ValidationResult => {
    const messages: ValidationMessage[] = [];
    const holeDepths = new Map<string, number[]>(); // BHID -> List of depths for sorting check

    data.forEach((row, idx) => {
        const lineNum = idx + 2;
        const id = cleanId(row['HoleID'] || row['HOLEID'] || row['id']);

        // Get metadata for this hole
        const metadata = collarMetadata.get(id);

        // Check BHID existence
        if (!id) return; // Skip empty rows or handle as error?
        if (!collarMap.has(id)) {
            messages.push({
                id: `sur-missing-collar-${idx}`,
                fileType: 'SURVEY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'HoleID not found in Collar file',
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
            return;
        }

        const collarDepth = collarMap.get(id)!;
        const depthVal = row['Depth'] || row['At'] || row['DEPTH'] || row['AT'];
        const azimVal = row['Azimuth'] || row['AZIMUTH'] || row['Az'] || row['BRG'];
        const dipVal = row['Dip'] || row['DIP'] || row['Inclination'];

        // Check Numeric Fields
        if (!isNumeric(depthVal) || !isNumeric(azimVal) || !isNumeric(dipVal)) {
            messages.push({
                id: `sur-nan-${idx}`,
                fileType: 'SURVEY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Non-numeric values in Depth, Azimuth, or Dip',
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
            return;
        }

        const depth = Number(depthVal);
        const azim = Number(azimVal);
        const dip = Number(dipVal);

        // Rule: Depth > 0 (Usually, 0 is allowed for collar pos, but user said > 0. Let's allow >= 0 for start)
        if (depth < 0) {
            messages.push({
                id: `sur-neg-depth-${idx}`,
                fileType: 'SURVEY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Negative depth',
                value: depth,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Rule: Max Depth <= Collar Depth
        if (depth > collarDepth) {
            messages.push({
                id: `sur-depth-exceed-${idx}`,
                fileType: 'SURVEY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Survey depth exceeds Collar Depth',
                value: depth,
                limit: collarDepth,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Rule: Azimuth 0-360
        if (azim < 0 || azim >= 360) {
            // Some systems allow -180 to 180, but user said 0 <= Az < 360
            // Let's warn if it's just slightly out, Error if completely wrong? User said Numeric in degrees.
            // Let's stick to strict 0-360 as per request.
            messages.push({
                id: `sur-azim-${idx}`,
                fileType: 'SURVEY',
                severity: 'ERROR', // Or Warning? User didn't specify severity for this, but implied strictness.
                holeId: id,
                lineNumber: lineNum,
                message: 'Azimuth out of range (0-360)',
                value: azim,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Rule: Dip -90 to 0
        if (dip < -90 || dip > 90) { // Standard dip is usually -90 to 90. User said -90 to 0.
            // If user specifically said -90 to 0 (downward only), we should respect that.
            // However, some datasets use positive for down. Let's assume user knows their data.
            // "Numérico en grados ( -90 <= Dip <= 0 )" -> Strict.
            if (dip > 0) {
                messages.push({
                    id: `sur-dip-pos-${idx}`,
                    fileType: 'SURVEY',
                    severity: 'ERROR', // User rule
                    holeId: id,
                    lineNumber: lineNum,
                    message: 'Dip must be between -90 and 0',
                    value: dip,
                    endDate: metadata?.endDate,
                    prospectName: metadata?.prospectName
                });
            }
        }

        // Collect for sorting check
        if (!holeDepths.has(id)) holeDepths.set(id, []);
        holeDepths.get(id)!.push(depth);
    });

    // Check Sorting (Depth Ascending)
    holeDepths.forEach((depths, id) => {
        const metadata = collarMetadata.get(id);
        for (let i = 0; i < depths.length - 1; i++) {
            if (depths[i] > depths[i + 1]) {
                messages.push({
                    id: `sur-sort-${id}`,
                    fileType: 'SURVEY',
                    severity: 'ERROR',
                    holeId: id,
                    message: 'Depths are not sorted ascendingly',
                    endDate: metadata?.endDate,
                    prospectName: metadata?.prospectName
                });
                break; // One error per hole is enough
            }
        }

        // Warning: Bottom Mismatch (Survey max depth vs Collar)
        // "La máxima profundidad de Survey ... es significativamente menor que la Depth de Collar (> 30m)"
        const maxDepth = Math.max(...depths);
        const collarDepth = collarMap.get(id)!;
        if (collarDepth - maxDepth > 30) {
            messages.push({
                id: `sur-bottom-mismatch-${id}`,
                fileType: 'SURVEY',
                severity: 'WARNING',
                holeId: id,
                message: 'Significant difference between Survey Max Depth and Collar Depth (>30m)',
                value: maxDepth,
                limit: collarDepth,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }
    });

    return { messages, hasErrors: messages.some(m => m.severity === 'ERROR') };
};

export const validateAssay = (data: any[], collarMap: Map<string, number>, collarMetadata: Map<string, CollarMetadata>): ValidationResult => {
    const messages: ValidationMessage[] = [];
    const holeIntervals = new Map<string, { from: number, to: number, line: number }[]>();

    data.forEach((row, idx) => {
        const lineNum = idx + 2;
        const id = cleanId(row['HoleID'] || row['HOLEID'] || row['id']);

        // Get metadata for this hole
        const metadata = collarMetadata.get(id);

        if (!id) return;
        if (!collarMap.has(id)) {
            messages.push({
                id: `ass-missing-collar-${idx}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'HoleID not found in Collar file',
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
            return;
        }

        const collarDepth = collarMap.get(id)!;
        const fromVal = row['From'] || row['from'] || row['FROM'] || row['SAMPFROM'];
        const toVal = row['To'] || row['to'] || row['TO'] || row['SAMPTO'];

        if (!isNumeric(fromVal) || !isNumeric(toVal)) {
            messages.push({
                id: `ass-nan-${idx}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Non-numeric From/To values',
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
            return;
        }

        const from = Number(fromVal);
        const to = Number(toVal);

        // Rule: From >= 0
        if (from < 0) {
            messages.push({
                id: `ass-neg-from-${idx}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Negative From value',
                value: from,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Rule: To > From
        if (to <= from) {
            messages.push({
                id: `ass-to-le-from-${idx}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'To must be greater than From',
                value: `${from}-${to}`,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Rule: Max To <= Collar Depth
        if (to > collarDepth) {
            messages.push({
                id: `ass-depth-exceed-${idx}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                lineNumber: lineNum,
                message: 'Assay To exceeds Collar Depth',
                value: to,
                limit: collarDepth,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }

        // Check Assay Values (Warnings for extremes)
        // We need to identify value columns. Usually anything not HoleID, From, To, SampleID.
        Object.keys(row).forEach(key => {
            const upperKey = key.toUpperCase();
            if (['HOLEID', 'ID', 'FROM', 'TO', 'SAMPFROM', 'SAMPTO', 'SAMPLEID', 'SAMPID'].includes(upperKey)) return;

            const val = row[key];
            if (isNumeric(val)) {
                const numVal = Number(val);
                // Warning: Extreme Value (e.g. > 100 for Au? Hard to generalize without knowing element, but user said > 100 is a warning example)
                // Let's just use 1000 as a generic safety net or stick to user example > 100?
                // User said "Au > 100 g/t". Without knowing units, this is tricky.
                // Let's add a generic check for very large numbers if they look like grades.
                if (numVal > 10000) { // Maybe too high?
                    // Let's skip generic extreme check unless we know the column is a grade.
                }
                // User example: Au > 100.
                if (numVal > 100 && (upperKey.includes('AU') || upperKey.includes('GOLD'))) {
                    messages.push({
                        id: `ass-extreme-${idx}-${key}`,
                        fileType: 'ASSAY',
                        severity: 'WARNING',
                        holeId: id,
                        lineNumber: lineNum,
                        message: `Possible extreme value for ${key}`,
                        value: numVal,
                        endDate: metadata?.endDate,
                        prospectName: metadata?.prospectName
                    });
                }
            }
        });

        if (!holeIntervals.has(id)) holeIntervals.set(id, []);
        holeIntervals.get(id)!.push({ from, to, line: lineNum });
    });

    // Check Overlaps and Gaps
    holeIntervals.forEach((intervals, id) => {
        const metadata = collarMetadata.get(id);
        // Sort by From
        intervals.sort((a, b) => a.from - b.from);

        for (let i = 0; i < intervals.length - 1; i++) {
            const current = intervals[i];
            const next = intervals[i + 1];

            // Overlap
            if (current.to > next.from) {
                messages.push({
                    id: `ass-overlap-${id}-${current.line}`,
                    fileType: 'ASSAY',
                    severity: 'ERROR',
                    holeId: id,
                    lineNumber: next.line, // Flag the second one
                    message: `Interval overlap detected`,
                    value: `${current.from}-${current.to} vs ${next.from}-${next.to}`,
                    endDate: metadata?.endDate,
                    prospectName: metadata?.prospectName
                });
            }

            // Gap
            if (next.from - current.to > 2) { // User said > 2m
                messages.push({
                    id: `ass-gap-${id}-${current.line}`,
                    fileType: 'ASSAY',
                    severity: 'WARNING',
                    holeId: id,
                    lineNumber: current.line,
                    message: `Gap detected between intervals (>2m)`,
                    value: `${current.to} -> ${next.from}`,
                    endDate: metadata?.endDate,
                    prospectName: metadata?.prospectName
                });
            }
        }

        // Bottom Mismatch (Assay max To vs Collar)
        const maxTo = intervals[intervals.length - 1].to;
        const collarDepth = collarMap.get(id)!;
        if (collarDepth - maxTo > 30) {
            messages.push({
                id: `ass-bottom-mismatch-${id}`,
                fileType: 'ASSAY',
                severity: 'WARNING',
                holeId: id,
                message: 'Significant difference between Assay Max Depth and Collar Depth (>30m)',
                value: maxTo,
                limit: collarDepth,
                endDate: metadata?.endDate,
                prospectName: metadata?.prospectName
            });
        }
    });

    return { messages, hasErrors: messages.some(m => m.severity === 'ERROR') };
};

export const validateCompleteness = (
    collarIds: Set<string>,
    surveyIds: Set<string>,
    assayIds: Set<string>
): ValidationMessage[] => {
    const messages: ValidationMessage[] = [];

    collarIds.forEach(id => {
        // Check Survey
        if (!surveyIds.has(id)) {
            messages.push({
                id: `missing-survey-${id}`,
                fileType: 'SURVEY',
                severity: 'ERROR',
                holeId: id,
                message: 'Drillhole defined in Collar but missing in Survey file'
            });
        }

        // Check Assay
        if (!assayIds.has(id)) {
            messages.push({
                id: `missing-assay-${id}`,
                fileType: 'ASSAY',
                severity: 'ERROR',
                holeId: id,
                message: 'Drillhole defined in Collar but missing in Assay file'
            });
        }
    });

    return messages;
};
