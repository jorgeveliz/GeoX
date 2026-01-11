import React, { useState } from 'react';
import { Layer, LayerType, DrillholeFilter, Drillhole } from '../types';
import { ChevronRight, ChevronDown, Folder, FileText, Hexagon, Layers, Eye, EyeOff, Settings, Box, Filter } from 'lucide-react';

interface TreeItemProps {
  layer: Layer;
  level: number;
  onToggleVisibility: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onSettingsClick?: (id: string) => void;
  onColorConfigClick?: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onFilterClick?: (id: string) => void;
  onSolidSettingsClick?: (id: string) => void;
  activeFilter?: DrillholeFilter | undefined;
}

const TreeItem: React.FC<TreeItemProps> = ({ layer, level, onToggleVisibility, onSettingsClick, onColorConfigClick, onColorChange, onFilterClick, onSolidSettingsClick, activeFilter }) => {
  const [expanded, setExpanded] = useState(true);

  const getIcon = (type: LayerType) => {
    switch (type) {
      case LayerType.FOLDER: return <Folder size={14} className="text-yellow-500" />;
      case LayerType.DRILLHOLE_TRACE: return <FileText size={14} className="text-cyan-400" />;
      case LayerType.SURFACE: return <Layers size={14} className="text-purple-400" />;
      case LayerType.BLOCK_MODEL: return <Box size={14} className="text-red-400" />;
      case LayerType.SOLID: return <Box size={14} className="text-orange-400" />;
      default: return <Hexagon size={14} className="text-gray-400" />;
    }
  };

  const hasChildren = layer.children && layer.children.length > 0;

  // Calculate drillhole counts if this layer has drillhole data
  const getCounts = () => {
    if (layer.type !== LayerType.DRILLHOLE_TRACE || !layer.data) return null;

    const total = (layer.data as Drillhole[]).length;
    if (!activeFilter) return null;

    const filtered = (layer.data as Drillhole[]).filter(dh => {
      // Date range filter
      if (activeFilter.dateRange) {
        if (!dh.endDate) return false;
        const dhDate = new Date(dh.endDate);
        if (activeFilter.dateRange.start && dhDate < new Date(activeFilter.dateRange.start)) return false;
        if (activeFilter.dateRange.end && dhDate > new Date(activeFilter.dateRange.end)) return false;
      }

      // Project name filter
      if (activeFilter.projectNames && activeFilter.projectNames.length > 0) {
        if (!dh.projectName) return false;
        if (!activeFilter.projectNames.includes(dh.projectName)) return false;
      }

      // Drillhole ID filter
      if (activeFilter.drillholeIds && activeFilter.drillholeIds.length > 0) {
        if (!activeFilter.drillholeIds.includes(dh.id)) return false;
      }

      return true;
    }).length;

    return { total, filtered };
  };

  const counts = getCounts();

  return (
    <div>
      <div
        className={`flex items-center group py-1 pr-2 hover:bg-gray-750 transition-colors cursor-pointer select-none text-sm relative`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse Chevron */}
        <div
          className="mr-1 w-4 h-4 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded(!expanded);
          }}
        >
          {hasChildren && (
            expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
          )}
        </div>

        {/* Icon */}
        <div className="mr-2">
          {getIcon(layer.type)}
        </div>

        {/* Name */}
        <div className="flex-1 truncate text-gray-200 text-xs font-medium flex items-center">
          <span className="truncate">{layer.name}</span>
          {counts && activeFilter && (
            <div className="ml-2 flex-shrink-0 flex items-center space-x-0.5 text-[9px] bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded-full shadow-sm">
              <span className="text-blue-400 font-bold">{counts.filtered}</span>
              <span className="text-gray-500 mx-0.5">/</span>
              <span className="text-gray-400">{counts.total}</span>
            </div>
          )}
        </div>

        {/* Actions (Visible on hover or if active) */}
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {/* Filter button for drillhole traces */}
          {layer.type === LayerType.DRILLHOLE_TRACE && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onFilterClick) {
                  onFilterClick(layer.id);
                }
              }}
              className="p-1.5 bg-gray-600/20 hover:bg-gray-600/40 active:bg-gray-600/60 rounded transition-all relative flex items-center justify-center border border-gray-500/30 hover:border-gray-400/50"
              title="Filtrar Sondajes"
              style={{
                pointerEvents: 'auto',
                zIndex: 100,
                cursor: 'pointer'
              }}
            >
              <Filter
                size={14}
                className="text-gray-300 hover:text-gray-100 active:text-white"
                style={{ pointerEvents: 'none' }}
              />
              {/* Active filter indicator */}
              {activeFilter && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-gray-900"></div>
              )}
            </button>
          )}

          {/* Settings button only for drillhole traces */}
          {layer.type === LayerType.DRILLHOLE_TRACE && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Settings button clicked for layer:', layer.name, layer.id);
                if (onSettingsClick) {
                  console.log('Calling onSettingsClick');
                  onSettingsClick(layer.id);
                } else {
                  console.warn('onSettingsClick is not defined');
                }
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 active:bg-blue-600/60 rounded transition-all relative flex items-center justify-center border border-blue-500/30 hover:border-blue-400/50"
              title="Configuración de Sondajes"
              style={{
                pointerEvents: 'auto',
                zIndex: 100,
                cursor: 'pointer'
              }}
            >
              <Settings
                size={14}
                className="text-blue-400 hover:text-blue-300 active:text-blue-200"
                style={{ pointerEvents: 'none' }}
              />
            </button>
          )}

          {/* Settings button for SOLID layers (Transparency) */}
          {layer.type === LayerType.SOLID && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onSolidSettingsClick) {
                  onSolidSettingsClick(layer.id);
                }
              }}
              className="p-1.5 bg-orange-600/20 hover:bg-orange-600/40 active:bg-orange-600/60 rounded transition-all relative flex items-center justify-center border border-orange-500/30 hover:border-orange-400/50"
              title="Configuración de Sólido"
            >
              <Settings
                size={14}
                className="text-orange-400 hover:text-orange-300 active:text-orange-200"
              />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(layer.id);
            }}
            className="p-1 hover:bg-gray-600 rounded focus:outline-none"
          >
            {layer.visible ?
              <Eye size={14} className="text-gray-200" /> :
              <EyeOff size={14} className="text-gray-500" />
            }
          </button>

          {/* Color Picker for Surface and Solid Layers */}
          {(layer.type === LayerType.SURFACE || layer.type === LayerType.SOLID) && (
            <div className="relative w-4 h-4 overflow-hidden rounded border border-gray-600 hover:border-gray-400">
              <input
                type="color"
                value={layer.color || '#888888'}
                onChange={(e) => onColorChange && onColorChange(layer.id, e.target.value)}
                className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer p-0 border-0"
                title="Change Color"
              />
            </div>
          )}

          {/* Static color preview for other layers if they have color but are not surface/solid (fallback) */}
          {layer.color && layer.type !== LayerType.SURFACE && layer.type !== LayerType.SOLID && (
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.color }}></div>
          )}

          {/* Gradient preview for assay - Now Clickable for Color Config */}
          {layer.type === LayerType.DRILLHOLE_TRACE && !layer.color && (
            <div
              className="w-5 h-5 rounded hover:bg-gray-700 flex items-center justify-center cursor-pointer transition-colors border border-transparent hover:border-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                if (onColorConfigClick) {
                  onColorConfigClick(layer.id);
                }
              }}
              title="Configure Colors"
            >
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {
        hasChildren && expanded && (
          <div>
            {layer.children!.map(child => (
              <TreeItem
                key={child.id}
                layer={child}
                level={level + 1}
                onToggleVisibility={onToggleVisibility}
                onSettingsClick={onSettingsClick}
                onColorConfigClick={onColorConfigClick}
                onColorChange={onColorChange}
                onFilterClick={onFilterClick}
                onSolidSettingsClick={onSolidSettingsClick}
                activeFilter={activeFilter}
              />
            ))}
          </div>
        )
      }
    </div >
  );
};

export default TreeItem;
