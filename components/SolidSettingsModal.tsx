import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SolidSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentOpacity: number; // 0 to 1
    onOpacityChange: (value: number) => void;
    layerName?: string;
}

const SolidSettingsModal: React.FC<SolidSettingsModalProps> = ({
    isOpen,
    onClose,
    currentOpacity,
    onOpacityChange,
    layerName
}) => {
    // Local state for immediate slider feedback
    const [opacityPercent, setOpacityPercent] = useState(Math.round(currentOpacity * 100));

    useEffect(() => {
        setOpacityPercent(Math.round(currentOpacity * 100));
    }, [currentOpacity, isOpen]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setOpacityPercent(val);
        onOpacityChange(val / 100);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] bg-[#1e293b] border border-gray-700 rounded-lg shadow-2xl w-80">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                    <div>
                        <h2 className="text-sm font-semibold text-white">Configuración Sólido</h2>
                        {layerName && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{layerName}</p>}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    <div className="mb-1">
                        <label className="text-xs text-gray-300 font-medium mb-2 block">
                            Transparencia (Opacidad)
                        </label>

                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={opacityPercent}
                                onChange={handleSliderChange}
                                className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="relative w-12">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={opacityPercent}
                                    onChange={handleSliderChange}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs text-right text-white focus:outline-none focus:border-blue-500"
                                />
                                <span className="absolute right-7 top-1 text-xs text-transparent pointer-events-none">%</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                            <span>0% (Invisible)</span>
                            <span>100% (Sólido)</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 flex justify-end bg-gray-900/50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </>
    );
};

export default SolidSettingsModal;
