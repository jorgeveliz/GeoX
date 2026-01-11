import React, { useState, useEffect } from 'react';
import { X, Calendar, FolderTree, Search } from 'lucide-react';
import { Drillhole, DrillholeFilter } from '../types';

interface DrillholeFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    drillholes: Drillhole[];
    currentFilter?: DrillholeFilter;
    onApplyFilter: (filter: DrillholeFilter | undefined) => void;
}

const DrillholeFilterModal: React.FC<DrillholeFilterModalProps> = ({
    isOpen,
    onClose,
    drillholes,
    currentFilter,
    onApplyFilter
}) => {
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [searchIds, setSearchIds] = useState('');

    // Extract unique project names
    const uniqueProjects = Array.from(
        new Set(drillholes.map(dh => dh.projectName).filter(Boolean))
    ).sort() as string[];

    // Initialize from current filter
    useEffect(() => {
        if (currentFilter) {
            setDateStart(currentFilter.dateRange?.start || '');
            setDateEnd(currentFilter.dateRange?.end || '');
            setSelectedProjects(currentFilter.projectNames || []);
            setSearchIds(currentFilter.drillholeIds?.join(', ') || '');
        }
    }, [currentFilter, isOpen]);

    const handleApply = () => {
        const filter: DrillholeFilter = {};

        if (dateStart || dateEnd) {
            filter.dateRange = { start: dateStart, end: dateEnd };
        }

        if (selectedProjects.length > 0) {
            filter.projectNames = selectedProjects;
        }

        if (searchIds.trim()) {
            filter.drillholeIds = searchIds.split(',').map(id => id.trim()).filter(Boolean);
        }

        // If no filters, pass undefined
        const hasFilters = filter.dateRange || filter.projectNames || filter.drillholeIds;
        onApplyFilter(hasFilters ? filter : undefined);
        onClose();
    };

    const handleClear = () => {
        setDateStart('');
        setDateEnd('');
        setSelectedProjects([]);
        setSearchIds('');
        onApplyFilter(undefined);
        onClose();
    };

    const toggleProject = (project: string) => {
        setSelectedProjects(prev =>
            prev.includes(project)
                ? prev.filter(p => p !== project)
                : [...prev, project]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#111827] w-[600px] max-h-[80vh] rounded-lg shadow-2xl border border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 className="text-white font-semibold flex items-center">
                        <Search size={18} className="mr-2 text-blue-500" />
                        Filtrar Sondajes
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center">
                            <Calendar size={16} className="mr-2 text-blue-400" />
                            Rango de Fechas (ENDDATE)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={dateStart}
                                    onChange={(e) => setDateStart(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={dateEnd}
                                    onChange={(e) => setDateEnd(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Project Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center">
                            <FolderTree size={16} className="mr-2 text-green-400" />
                            Proyectos ({selectedProjects.length}/{uniqueProjects.length})
                        </label>
                        <div className="bg-gray-800 border border-gray-600 rounded p-3 max-h-48 overflow-y-auto">
                            {uniqueProjects.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No hay proyectos disponibles</p>
                            ) : (
                                <div className="space-y-2">
                                    {uniqueProjects.map(project => (
                                        <label key={project} className="flex items-center cursor-pointer hover:bg-gray-700 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={selectedProjects.includes(project)}
                                                onChange={() => toggleProject(project)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-200">{project}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drillhole ID Search */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center">
                            <Search size={16} className="mr-2 text-yellow-400" />
                            Buscar por ID de Sondaje
                        </label>
                        <input
                            type="text"
                            value={searchIds}
                            onChange={(e) => setSearchIds(e.target.value)}
                            placeholder="Ej: ANR-1, ANR-2, ANR-3 (separados por coma)"
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Ingrese IDs separados por comas</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg flex justify-end space-x-3">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors"
                    >
                        Limpiar Filtros
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors shadow-lg"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DrillholeFilterModal;
