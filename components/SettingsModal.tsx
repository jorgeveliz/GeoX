import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    drillholeLineWidth: number;
    setDrillholeLineWidth: (value: number) => void;
    showDrillholeID: boolean;
    setShowDrillholeID: (value: boolean) => void;
    showDrillholeDepth: boolean;
    setShowDrillholeDepth: (value: boolean) => void;
    showDrillholeSegments: boolean;
    setShowDrillholeSegments: (value: boolean) => void;
    showDrillholeValues: boolean;
    setShowDrillholeValues: (value: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    drillholeLineWidth,
    setDrillholeLineWidth,
    showDrillholeID,
    setShowDrillholeID,
    showDrillholeDepth,
    setShowDrillholeDepth,
    showDrillholeSegments,
    setShowDrillholeSegments,
    showDrillholeValues,
    setShowDrillholeValues,
}) => {
    useEffect(() => {
        console.log('SettingsModal isOpen:', isOpen);
    }, [isOpen]);

    if (!isOpen) {
        console.log('SettingsModal: not rendering because isOpen is false');
        return null;
    }

    console.log('SettingsModal: rendering modal');

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] bg-[#1e293b] border border-gray-700 rounded-lg shadow-2xl w-96">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Configuración de Sondajes</h2>
                        <p className="text-xs text-gray-400 mt-1">Ajustes para drillholes importados</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-4">Configuración de Sondajes</h3>

                        {/* Line Width Control */}
                        <div className="mb-6">
                            <label className="text-xs text-gray-400 block mb-2">
                                Ancho de Trazas: {drillholeLineWidth}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={drillholeLineWidth}
                                onChange={(e) => setDrillholeLineWidth(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                <span>0</span>
                                <span>50</span>
                            </div>
                        </div>

                        {/* Show ID Toggle */}
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs text-gray-400">
                                Mostrar ID de Sondaje
                            </label>
                            <button
                                onClick={() => setShowDrillholeID(!showDrillholeID)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showDrillholeID
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {showDrillholeID ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Show Depth Toggle */}
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs text-gray-400">
                                Mostrar Profundidad en Collar
                            </label>
                            <button
                                onClick={() => setShowDrillholeDepth(!showDrillholeDepth)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showDrillholeDepth
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {showDrillholeDepth ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Show Segments Toggle */}
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs text-gray-400">
                                Mostrar tramos
                            </label>
                            <button
                                onClick={() => setShowDrillholeSegments(!showDrillholeSegments)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showDrillholeSegments
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {showDrillholeSegments ? 'ON' : 'OFF'}
                            </button>
                        </div>

                        {/* Show Values Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-400">
                                Mostrar variable
                            </label>
                            <button
                                onClick={() => setShowDrillholeValues(!showDrillholeValues)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${showDrillholeValues
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {showDrillholeValues ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default SettingsModal;
