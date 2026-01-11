import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SliceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void; // Used when canceling
    onApply: (width: number) => void;
    initialWidth?: number;
}

const SliceSettingsModal: React.FC<SliceSettingsModalProps> = ({ isOpen, onClose, onApply, initialWidth = 50 }) => {
    const [width, setWidth] = useState(initialWidth);

    useEffect(() => {
        if (isOpen) {
            setWidth(initialWidth);
        }
    }, [isOpen, initialWidth]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onApply(width);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-[#1e293b] rounded-lg shadow-xl w-80 border border-gray-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
                    <h3 className="text-white font-semibold text-sm">Definir Ancho de Sección</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 block uppercase tracking-wide">
                            Ancho / Halo (m)
                        </label>
                        <input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-full bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                            min="1"
                            step="1"
                        />
                        <p className="text-[10px] text-gray-500">
                            Espesor total del corte. La vista estará centrada en el medio de este valor.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-semibold"
                        >
                            Aplicar Corte
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SliceSettingsModal;
