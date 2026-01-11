import React from 'react';
import { MousePointer2, Move, Ruler, ScanLine, Info, Camera, Image as ImageIcon, Slice, RotateCcw, Eye, Settings, ClipboardList, Scissors } from 'lucide-react';

interface ToolbarProps {
  onZoomExtend: () => void;
  onSettings: () => void;
  onOpenReport: () => void;
  onToggleSliceMode: () => void;
  isSliceModeActive: boolean;
  clickedPoint: { x: number, y: number, z: number } | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ onZoomExtend, onSettings, onOpenReport, onToggleSliceMode, isSliceModeActive, clickedPoint }) => {
  const tools: { icon: React.ReactNode; label: string; action?: () => void; active?: boolean }[] = [
    { icon: <ClipboardList size={18} />, label: 'Report', action: onOpenReport },
    { icon: <Eye size={18} />, label: 'View', action: onZoomExtend },
    { icon: <Settings size={18} />, label: 'Settings', action: onSettings },
    { icon: <Move size={20} />, label: "Pan/Orbit" },
    { icon: <Ruler size={20} />, label: "Measure" },
    { icon: <Scissors size={20} />, label: "Section", action: onToggleSliceMode, active: isSliceModeActive },
    { icon: <RotateCcw size={20} />, label: "Reset View", action: onZoomExtend },
  ];

  return (
    <div className="h-12 bg-geo-panel border-b border-gray-700 flex items-center px-4 space-x-2 shadow-md z-10 relative">
      {tools.map((tool, idx) => (
        <button
          key={idx}
          title={tool.label}
          onClick={tool.action}
          className={`p-2 rounded hover:bg-gray-700 text-gray-300 transition-colors ${tool.active ? 'bg-blue-600 text-white' : ''}`}
        >
          {tool.icon}
        </button>
      ))}
      <div className="w-px h-6 bg-gray-700 mx-2"></div>

      {/* Coordinate Display */}
      {clickedPoint ? (
        <div className="flex items-center space-x-4 text-xs font-mono text-cyan-400 bg-black/20 px-3 py-1 rounded">
          <span>Este: {clickedPoint.x.toFixed(2)}</span>
          <span>Norte: {(-clickedPoint.z).toFixed(2)}</span>
          <span>Cota: {clickedPoint.y.toFixed(2)}</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-xs text-gray-500 italic">
          <span>Click to pick coordinates</span>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
