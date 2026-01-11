import React, { useState, useEffect } from 'react';
import { X, Filter, Calendar } from 'lucide-react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterConfig) => void;
    availableProspects?: string[];
    currentFilters?: FilterConfig;
}

export interface FilterConfig {
    prospects?: string[]; // Changed from singular to plural array
    startDate?: string;
    endDate?: string;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, availableProspects = [], currentFilters }) => {
    const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (isOpen && currentFilters) {
            setSelectedProspects(currentFilters.prospects || []);
            setStartDate(currentFilters.startDate || '');
            setEndDate(currentFilters.endDate || '');
        } else if (isOpen) {
            // Reset if opening fresh
            setSelectedProspects([]);
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen, currentFilters]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onApply({
            prospects: selectedProspects.length > 0 ? selectedProspects : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-96 max-w-[90vw]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Filter className="text-blue-500" size={20} />
                        <h3 className="font-semibold text-white">Filtrar Sondajes</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* Prospect Filter with Checkboxes */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Prospect / Area</label>
                        {availableProspects.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded p-2 space-y-1">
                                {availableProspects.map(p => (
                                    <label
                                        key={p}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedProspects.includes(p)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProspects([...selectedProspects, p]);
                                                } else {
                                                    setSelectedProspects(selectedProspects.filter(item => item !== p));
                                                }
                                            }}
                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-sm text-white">{p}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 p-2 bg-gray-800 border border-gray-700 rounded">
                                No prospects available
                            </div>
                        )}
                        {selectedProspects.length > 0 && (
                            <div className="mt-1 text-xs text-blue-400">
                                {selectedProspects.length} seleccionado{selectedProspects.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Fecha Inicio</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Fecha Fin</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={() => { setSelectedProspects([]); setStartDate(''); setEndDate(''); }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Limpiar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded shadow-lg transition-colors"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FilterModal;
