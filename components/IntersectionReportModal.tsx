import React, { useState, useRef } from 'react';
import { X, FileDown, Play, AlertCircle } from 'lucide-react';
import * as THREE from 'three';
import { Layer, Drillhole, SolidData } from '../types';

interface IntersectionReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    solids: Layer[];
    drillholes: Drillhole[];
}

interface IntersectionResult {
    holeId: string;
    from: number;
    to: number;
    length: number;
    type: 'CROSS' | 'INSIDE';
    grade: number;
}

const IntersectionReportModal: React.FC<IntersectionReportModalProps> = ({
    isOpen,
    onClose,
    solids,
    drillholes
}) => {
    const [selectedSolidId, setSelectedSolidId] = useState<string>('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [results, setResults] = useState<IntersectionResult[]>([]);
    const [progress, setProgress] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleCalculate = async () => {
        if (!selectedSolidId) return;

        const solidLayer = solids.find(s => s.id === selectedSolidId);
        if (!solidLayer || !solidLayer.data) return;

        setIsCalculating(true);
        setResults([]);
        setProgress(0);

        // Cancel previous calculation if any (though usually disabled button prevents this)
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setTimeout(async () => {
            try {
                const solidData = solidLayer.data as SolidData;
                const newResults: IntersectionResult[] = [];

                // 1. Create Mesh for Raycasting
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(solidData.vertices, 3));
                // Use DoubleSide to ensure rays hit from inside or outside
                const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geometry, material);

                // CRITICAL: Apply the same rotation as in Scene3D to match visual alignment
                // Visual Layer is rotated -Math.PI / 2 on X. We must do the same here.
                mesh.rotation.x = -Math.PI / 2;
                mesh.updateMatrixWorld();

                const raycaster = new THREE.Raycaster();

                const BATCH_SIZE = 20; // Process 20 drillholes per frame
                let processedCount = 0;
                const totalDrillholes = drillholes.length;

                // Process in chunks function
                const processBatch = (startIndex: number) => {
                    if (abortController.signal.aborted) return;

                    const endIndex = Math.min(startIndex + BATCH_SIZE, totalDrillholes);

                    for (let i = startIndex; i < endIndex; i++) {
                        const dh = drillholes[i];

                        // Iterate Segments
                        for (const seg of dh.segments) {
                            const start = new THREE.Vector3(...seg.start);
                            const end = new THREE.Vector3(...seg.end);
                            const direction = new THREE.Vector3().subVectors(end, start).normalize();
                            const distance = start.distanceTo(end);

                            // Set Ray from start to direction
                            raycaster.set(start, direction);
                            raycaster.far = distance;

                            const intersects = raycaster.intersectObject(mesh, false);

                            if (intersects.length > 0) {
                                newResults.push({
                                    holeId: dh.id,
                                    from: seg.from,
                                    to: seg.to,
                                    length: seg.to - seg.from,
                                    type: 'CROSS',
                                    grade: seg.grade
                                });
                            } else {
                                // Optimization: Only do 'INSIDE' check if explicitly needed or maybe for every Nth segment?
                                // Check for Inside
                                const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                                raycaster.set(midpoint, new THREE.Vector3(0, 0, 1));
                                raycaster.far = Infinity;
                                const insideIntersects = raycaster.intersectObject(mesh, false);

                                if (insideIntersects.length % 2 === 1) {
                                    newResults.push({
                                        holeId: dh.id,
                                        from: seg.from,
                                        to: seg.to,
                                        length: seg.to - seg.from,
                                        type: 'INSIDE',
                                        grade: seg.grade
                                    });
                                }
                            }
                        }
                    }

                    processedCount = endIndex;
                    setProgress(Math.round((processedCount / totalDrillholes) * 100));

                    if (processedCount < totalDrillholes) {
                        // Schedule next batch
                        setTimeout(() => processBatch(processedCount), 0);
                    } else {
                        // Finished
                        setResults(newResults);
                        setIsCalculating(false);
                    }
                };

                // Start first batch
                processBatch(0);

            } catch (error) {
                console.error("Error calculating intersections:", error);
                setIsCalculating(false);
            }
        }, 100);
    };

    const handleDownloadCSV = () => {
        if (results.length === 0) return;

        const headers = ['HoleID', 'From', 'To', 'Length', 'Type', 'Grade'];
        const csvContent = [
            headers.join(','),
            ...results.map(r =>
                `${r.holeId},${r.from.toFixed(2)},${r.to.toFixed(2)},${r.length.toFixed(2)},${r.type},${r.grade.toFixed(3)}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'intersections_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Close handler ensuring we cleanup
    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900 rounded-t-lg">
                    <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue-600/20 rounded border border-blue-500/30">
                            <FileDown size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Reporte de Intersecciones</h2>
                            <p className="text-xs text-gray-400">Analizar sondajes que intersectan sólidos</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 bg-gray-800/50 border-b border-gray-700">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                            Seleccionar Sólido Objetivo
                        </label>
                        <select
                            value={selectedSolidId}
                            onChange={(e) => setSelectedSolidId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="">-- Seleccione un sólido --</option>
                            {solids.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {solids.length === 0 && (
                            <p className="text-[10px] text-orange-400 mt-1 flex items-center">
                                <AlertCircle size={10} className="mr-1" />
                                No hay sólidos cargados en la escena.
                            </p>
                        )}
                    </div>

                    <div className="flex items-end flex-col justify-end space-y-1">
                        {isCalculating && (
                            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1 w-32">
                                <div
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        )}
                        <button
                            onClick={handleCalculate}
                            disabled={!selectedSolidId || isCalculating}
                            className={`flex items-center px-6 py-2 rounded font-semibold text-sm transition-all ${!selectedSolidId || isCalculating
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                }`}
                        >
                            {isCalculating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2"></div>
                                    {progress}%
                                </>
                            ) : (
                                <>
                                    <Play size={16} className="mr-2 fill-current" />
                                    Generar Reporte
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Table */}
                <div className="flex-1 overflow-auto bg-[#0f172a] p-4 min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1e293b] sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">Hole ID</th>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-right">From</th>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-right">To</th>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-right">Length</th>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-center">Type</th>
                                <th className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 text-right">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {results.length > 0 ? (
                                results.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="p-2.5 text-xs text-white font-mono">{r.holeId}</td>
                                        <td className="p-2.5 text-xs text-gray-300 font-mono text-right">{r.from.toFixed(2)}</td>
                                        <td className="p-2.5 text-xs text-gray-300 font-mono text-right">{r.to.toFixed(2)}</td>
                                        <td className="p-2.5 text-xs text-gray-300 font-mono text-right">{r.length.toFixed(2)}</td>
                                        <td className="p-2.5 text-xs text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.type === 'INSIDE'
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                }`}>
                                                {r.type}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-xs text-gray-300 font-mono text-right">{r.grade.toFixed(3)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        {isCalculating ? (
                                            <div className="flex flex-col items-center text-gray-400 animate-pulse">
                                                <div className="h-2 w-48 bg-gray-700 rounded mb-2"></div>
                                                <div className="h-2 w-32 bg-gray-700 rounded"></div>
                                                <p className="mt-4 text-xs">Analizando {progress}% completado...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-500">
                                                <AlertCircle size={32} className="mb-2 opacity-50" />
                                                <p className="text-sm">No hay resultados para mostrar.</p>
                                                <p className="text-xs mt-1">Seleccione un sólido y haga clic en "Generar Reporte".</p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                        Total encontrados: <span className="text-white font-bold">{results.length}</span> tramos
                    </div>
                    <button
                        onClick={handleDownloadCSV}
                        disabled={results.length === 0}
                        className={`flex items-center px-4 py-2 rounded text-xs font-semibold transition-colors ${results.length === 0
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                    >
                        <FileDown size={14} className="mr-2" />
                        Descargar CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntersectionReportModal;
