import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { ColorConfiguration, ColorRule } from '../types';
import { getGradeColor } from '../utils';

interface ColorSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialConfig?: ColorConfiguration;
    onSave: (config: ColorConfiguration) => void;
    layerName: string;
}

const DEFAULT_RULES: ColorRule[] = [
    { id: '1', min: 0.0, max: 0.2, color: '#22c55e', label: 'Low' },
    { id: '2', min: 0.2, max: 1.0, color: '#eab308', label: 'Medium' },
    { id: '3', min: 1.0, max: 2.5, color: '#f97316', label: 'High' },
    { id: '4', min: 2.5, max: 100, color: '#ef4444', label: 'Ultra' },
];

const ColorSettingsModal: React.FC<ColorSettingsModalProps> = ({
    isOpen,
    onClose,
    initialConfig,
    onSave,
    layerName
}) => {
    const [rules, setRules] = useState<ColorRule[]>(DEFAULT_RULES);
    const [nullValue, setNullValue] = useState<number>(-99);
    const [isNullTransparent, setIsNullTransparent] = useState<boolean>(true);
    const [nullColor, setNullColor] = useState<string>('#808080');

    useEffect(() => {
        if (isOpen) {
            if (initialConfig) {
                setRules(initialConfig.rules.length > 0 ? initialConfig.rules : DEFAULT_RULES);
                setNullValue(initialConfig.nullValue !== undefined ? initialConfig.nullValue : -99);
                setIsNullTransparent(initialConfig.nullColor === undefined);
                setNullColor(initialConfig.nullColor || '#808080');
            } else {
                // Reset to defaults if no config provided
                setRules(DEFAULT_RULES);
                setNullValue(-99);
                setIsNullTransparent(true);
            }
        }
    }, [isOpen, initialConfig]);

    const handleAddRule = () => {
        const newId = Date.now().toString();
        // Smart default: start where the last one ended
        const lastRule = rules[rules.length - 1];
        const start = lastRule ? lastRule.max : 0;

        setRules([
            ...rules,
            { id: newId, min: start, max: start + 1, color: '#ffffff', label: 'New Range' }
        ]);
    };

    const handleRemoveRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const handleUpdateRule = (id: string, field: keyof ColorRule, value: any) => {
        setRules(rules.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    const handleSave = () => {
        const config: ColorConfiguration = {
            rules,
            nullValue,
            nullColor: isNullTransparent ? undefined : nullColor
        };
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#111827] w-[500px] rounded-lg shadow-2xl border border-gray-700 flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 className="text-white font-semibold flex items-center">
                        <RefreshCw size={18} className="mr-2 text-blue-500" />
                        Color Configuration: <span className="ml-2 text-gray-400 font-normal text-sm">{layerName}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6">

                    {/* Null Value Settings */}
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Special Values</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Value to Ignore</label>
                                <input
                                    type="number"
                                    value={nullValue}
                                    onChange={(e) => setNullValue(Number(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center pt-5">
                                <input
                                    type="checkbox"
                                    id="transparentCheck"
                                    checked={isNullTransparent}
                                    onChange={(e) => setIsNullTransparent(e.target.checked)}
                                    className="mr-2 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0"
                                />
                                <label htmlFor="transparentCheck" className="text-sm text-gray-300 cursor-pointer">Make Transparent</label>
                            </div>
                            {!isNullTransparent && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                                    <input
                                        type="color"
                                        value={nullColor}
                                        onChange={(e) => setNullColor(e.target.value)}
                                        className="h-8 w-12 rounded cursor-pointer border-0 p-0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Color Rules */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase">Grade Ranges</h3>
                            <button
                                onClick={handleAddRule}
                                className="text-xs flex items-center bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/40 transition-colors"
                            >
                                <Plus size={12} className="mr-1" /> Add Range
                            </button>
                        </div>

                        <div className="space-y-2">
                            {rules.map((rule) => (
                                <div key={rule.id} className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700">
                                    <div className="w-8 h-8 flex-shrink-0 overflow-hidden rounded border border-gray-600">
                                        <input
                                            type="color"
                                            value={rule.color}
                                            onChange={(e) => handleUpdateRule(rule.id, 'color', e.target.value)}
                                            className="w-12 h-12 -m-2 cursor-pointer"
                                            title="Change Color"
                                        />
                                    </div>

                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 block">Min</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={rule.min}
                                                onChange={(e) => handleUpdateRule(rule.id, 'min', Number(e.target.value))}
                                                className="w-full bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 block">Max</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={rule.max}
                                                onChange={(e) => handleUpdateRule(rule.id, 'max', Number(e.target.value))}
                                                className="w-full bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveRule(rule.id)}
                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                        title="Remove Rule"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {rules.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-xs italic">
                                    No rules defined. All values will use default coloring.
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center shadow-lg shadow-blue-900/20 transition-all"
                    >
                        <Save size={16} className="mr-2" /> Save Configuration
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ColorSettingsModal;
