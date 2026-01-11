import React, { useState, useEffect } from 'react';
import Scene3D from './components/Scene3D';
import TreeItem from './components/TreeItem';
import Toolbar from './components/Toolbar';
import ImportWizard from './components/ImportWizard';
import SettingsModal from './components/SettingsModal';
import SolidSettingsModal from './components/SolidSettingsModal';
import IntersectionReportModal from './components/IntersectionReportModal';
import ColorSettingsModal from './components/ColorSettingsModal';
import DrillholeFilterModal from './components/DrillholeFilterModal';
import SliceSettingsModal from './components/SliceSettingsModal';
import { INITIAL_LAYERS } from './constants';
import { Layer, SelectedElement, ColorConfiguration, Drillhole, DrillholeFilter, LayerType, SliceConfig } from './types';
import { Menu, Search, Filter, Settings, Database, Activity, PlusCircle } from 'lucide-react';
import { applyColorRules, getGradeColorFromConfig } from './utils';
import logo from './logo.jpg';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [zoomExtendTrigger, setZoomExtendTrigger] = useState(0);
  const [drillholeLineWidth, setDrillholeLineWidth] = useState(2);
  const [showDrillholeID, setShowDrillholeID] = useState(true);
  const [showDrillholeDepth, setShowDrillholeDepth] = useState(true);
  const [showDrillholeSegments, setShowDrillholeSegments] = useState(false);
  const [showDrillholeValues, setShowDrillholeValues] = useState(false);
  const [enableDamping, setEnableDamping] = useState(true);

  // Color Settings State
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [activeColorLayerId, setActiveColorLayerId] = useState<string | null>(null);

  // Filter State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [drillholeFilter, setDrillholeFilter] = useState<DrillholeFilter | undefined>(undefined);
  const [filterLayerId, setFilterLayerId] = useState<string | null>(null);

  // Solid Settings State
  const [showSolidSettings, setShowSolidSettings] = useState(false);
  const [activeSolidLayerId, setActiveSolidLayerId] = useState<string | null>(null);

  // Intersection Report State
  const [showReportModal, setShowReportModal] = useState(false);

  // Slice Tool State
  const [sliceConfig, setSliceConfig] = useState<SliceConfig>({
    active: false,
    p1: null,
    p2: null,
    width: 50,
    offset: 0
  });
  const [showSliceWidthModal, setShowSliceWidthModal] = useState(false);

  // Selected Element State
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  // Project Menu State
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Coordinate Picker State
  const [clickedPoint, setClickedPoint] = useState<{ x: number, y: number, z: number } | null>(null);

  // Slice Tool Handlers
  const handleToggleSliceMode = () => {
    // If active, deactivate
    if (sliceConfig.active) {
      setSliceConfig(prev => ({ ...prev, active: false, p1: null, p2: null, offset: 0 }));
    } else {
      // Activate "Wait for Line" mode (initially just toggle button, logic is in Scene3D)
      setSliceConfig(prev => ({ ...prev, active: true, p1: null, p2: null, offset: 0 }));
    }
  };

  const handleSlicePointsDefined = (p1: [number, number, number], p2: [number, number, number]) => {
    setSliceConfig(prev => ({ ...prev, p1, p2 }));
    setShowSliceWidthModal(true);
  };

  const handleSliceWidthConfirm = (width: number) => {
    setSliceConfig(prev => ({ ...prev, width }));
    setShowSliceWidthModal(false);
  };

  const handleSliceOffsetChange = (newOffset: number) => {
    setSliceConfig(prev => ({ ...prev, offset: newOffset }));
  };

  // Keyboard controls for Slice Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sliceConfig.active || !sliceConfig.p1 || !sliceConfig.p2) return;

      const step = e.shiftKey ? 10 : 2; // Move faster with shift

      if (e.key === 'ArrowLeft') {
        setSliceConfig(prev => ({ ...prev, offset: prev.offset - step }));
      } else if (e.key === 'ArrowRight') {
        setSliceConfig(prev => ({ ...prev, offset: prev.offset + step }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sliceConfig.active, sliceConfig.p1, sliceConfig.p2]);

  // Debug: Log when showSettings changes
  useEffect(() => {
    console.log('showSettings changed to:', showSettings);
  }, [showSettings]);

  const handleSettingsClick = (layerId: string) => {
    console.log('handleSettingsClick called in App with ID:', layerId);
    // This should open the general settings modal (line width, etc.)
    // Currently SettingsModal doesn't take a layer ID, it's global settings for now.
    // But we can keep the ID for future per-layer settings.
    setShowSettings(true);
  };

  const handleColorConfigClick = (layerId: string) => {
    console.log('handleColorConfigClick called in App with ID:', layerId);
    setActiveColorLayerId(layerId);
    setShowColorSettings(true);
  };

  const handleFilterClick = (layerId: string) => {
    console.log('handleFilterClick called for layer:', layerId);
    setFilterLayerId(layerId);
    setShowFilterModal(true);
  };

  const handleSolidSettingsClick = (layerId: string) => {
    console.log('handleSolidSettingsClick called for layer:', layerId);
    setActiveSolidLayerId(layerId);
    setShowSolidSettings(true);
  };

  const handleApplyFilter = (filter: DrillholeFilter | undefined) => {
    console.log('Applying filter:', filter);
    setDrillholeFilter(filter);
    // Clear selection when filter changes to avoid highlighting filtered-out segments
    setSelectedElement(null);
  };

  const handleSaveColorSettings = (config: ColorConfiguration) => {
    if (!activeColorLayerId) return;

    const updateLayerRecursive = (items: Layer[]): Layer[] => {
      return items.map(item => {
        if (item.id === activeColorLayerId) {
          // Ensure we have original data to work from
          const sourceData = item.originalData || item.data;

          // Apply new colors to data if it exists and is drillhole data
          let updatedData = item.data;
          if (sourceData && Array.isArray(sourceData)) {
            updatedData = applyColorRules(sourceData as Drillhole[], config);
          }

          return {
            ...item,
            colorConfiguration: config,
            data: updatedData,
            originalData: sourceData // Persist original data
          };
        }
        if (item.children) {
          return { ...item, children: updateLayerRecursive(item.children) };
        }
        return item;
      });
    };

    setLayers(updateLayerRecursive(layers));
  };

  // Deep clone and toggle logic for immutable state update
  const toggleLayerVisibility = (id: string) => {
    const toggleRecursive = (items: Layer[]): Layer[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, visible: !item.visible };
        }
        if (item.children) {
          return { ...item, children: toggleRecursive(item.children) };
        }
        return item;
      });
    };
    setLayers(toggleRecursive(layers));
  };

  const handleImport = (newLayer: Layer) => {
    console.log('App.handleImport called with layer:', newLayer);

    // Initialize originalData for the new layer and its children
    const initLayer = (l: Layer): Layer => {
      if (l.children) {
        return { ...l, children: l.children.map(initLayer) };
      }
      // If it's a data layer, set originalData
      if (l.data) {
        return { ...l, originalData: l.data };
      }
      return l;
    };

    const processedLayer = initLayer(newLayer);

    setLayers(prev => {
      const updated = [...prev, processedLayer];
      console.log('Updated layers:', updated);
      return updated;
    });
  };

  const handleOpacityChange = (opacity: number) => {
    if (!activeSolidLayerId) return;

    setLayers(prevLayers => {
      const updateOpacityRecursive = (items: Layer[]): Layer[] => {
        return items.map(item => {
          if (item.id === activeSolidLayerId) {
            return { ...item, opacity: opacity };
          }
          if (item.children) {
            return { ...item, children: updateOpacityRecursive(item.children) };
          }
          return item;
        });
      };
      return updateOpacityRecursive(prevLayers);
    });
  };

  const handleColorChange = (id: string, color: string) => {
    const updateColorRecursive = (items: Layer[]): Layer[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, color: color };
        }
        if (item.children) {
          return { ...item, children: updateColorRecursive(item.children) };
        }
        return item;
      });
    };
    setLayers(updateColorRecursive(layers));
  };

  const handleSelectElement = (element: SelectedElement | null) => {
    console.log('Selected Element:', element);
    setSelectedElement(element);
  };

  // Helper to find layer name and config
  const getLayerInfo = (id: string | null, items: Layer[]): { name: string, config?: ColorConfiguration } | null => {
    if (!id) return null;
    for (const item of items) {
      if (item.id === id) return { name: item.name, config: item.colorConfiguration };
      if (item.children) {
        const found = getLayerInfo(id, item.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to find the active assay layer (for legend default)
  const findAssayLayer = (items: Layer[]): Layer | undefined => {
    for (const item of items) {
      if (item.name === 'Assay Values' || item.type === 'DRILLHOLE_TRACE') return item;
      if (item.children) {
        const found = findAssayLayer(item.children);
        if (found) return found;
      }
    }
  };

  const activeLayerInfo = getLayerInfo(activeColorLayerId, layers);
  const defaultAssayLayer = findAssayLayer(layers);
  const legendConfig = activeLayerInfo?.config || defaultAssayLayer?.colorConfiguration;

  const handleSaveProject = () => {
    const projectState = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: {
        drillholeLineWidth,
        showDrillholeID,
        showDrillholeDepth,
        showDrillholeSegments,
        showDrillholeValues,
        enableDamping
      },
      filter: drillholeFilter,
      layers: layers.map(layer => {
        // Recursively clean layer data for serialization
        const processLayer = (l: Layer): any => {
          const newL = { ...l };
          if (newL.type === LayerType.SOLID && newL.data) {
            // Convert Float32Array to regular array for JSON
            const solidData = newL.data as any;
            if (solidData.vertices && solidData.vertices instanceof Float32Array) {
              newL.data = {
                ...solidData,
                vertices: Array.from(solidData.vertices)
              };
            }
          }
          if (newL.children) {
            newL.children = newL.children.map(processLayer);
          }
          return newL;
        };
        return processLayer(layer);
      })
    };

    const blob = new Blob([JSON.stringify(projectState)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowProjectMenu(false);
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        // Restore settings
        if (json.settings) {
          setDrillholeLineWidth(json.settings.drillholeLineWidth ?? 2);
          setShowDrillholeID(json.settings.showDrillholeID ?? true);
          setShowDrillholeDepth(json.settings.showDrillholeDepth ?? true);
          setShowDrillholeSegments(json.settings.showDrillholeSegments ?? false);
          setShowDrillholeValues(json.settings.showDrillholeValues ?? false);
          setEnableDamping(json.settings.enableDamping ?? true);
        }

        // Restore filter
        if (json.filter) {
          setDrillholeFilter(json.filter);
        }

        // Restore layers (convert arrays back to Float32Array for solids)
        if (json.layers) {
          const restoreLayer = (l: any): Layer => {
            const newL = { ...l };
            if (newL.type === LayerType.SOLID && newL.data) {
              if (Array.isArray(newL.data.vertices)) {
                newL.data.vertices = new Float32Array(newL.data.vertices);
              }
            }
            if (newL.children) {
              newL.children = newL.children.map(restoreLayer);
            }
            return newL;
          };
          setLayers(json.layers.map(restoreLayer));
        }

        console.log('Project loaded successfully');
      } catch (error) {
        console.error('Error loading project:', error);
        alert('Error loading project file');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowProjectMenu(false);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const drillholes = getActiveDrillholes();
    if (drillholes.length === 0) {
      alert('No drillholes to export.');
      return;
    }

    const headers = ['HoleID', 'Project', 'Date', 'X', 'Y', 'Z', 'Depth', 'NumSegments'];
    const rows = drillholes.map(dh => [
      dh.id,
      dh.projectName || '',
      dh.endDate || '',
      dh.x.toFixed(2),
      dh.y.toFixed(2),
      dh.z.toFixed(2),
      dh.depth.toFixed(2),
      dh.segments.length
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_sondajes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 text-white">
      {/* Top Menu Bar */}
      <div className="h-8 bg-gray-900 border-b border-gray-800 flex items-center px-3 text-xs select-none relative">
        <span className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer font-semibold text-blue-400" onClick={() => setShowImport(true)}>+ Import</span>

        <div className="relative mr-4">
          <span
            className={`px-2 py-1 rounded cursor-pointer ${showProjectMenu ? 'bg-gray-700 text-white' : 'hover:bg-gray-700'}`}
            onClick={() => setShowProjectMenu(!showProjectMenu)}
          >
            Project
          </span>
          {showProjectMenu && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-[#1e293b] border border-gray-700 rounded shadow-xl z-50 flex flex-col py-1">
              <button
                className="text-left px-3 py-2 hover:bg-gray-700 text-gray-200"
                onClick={handleSaveProject}
              >
                Save Project
              </button>
              <button
                className="text-left px-3 py-2 hover:bg-gray-700 text-gray-200"
                onClick={() => fileInputRef.current?.click()}
              >
                Load Project
              </button>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleLoadProject}
        />
        <span
          className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer text-green-400 font-semibold"
          onClick={handleExportCSV}
          title="Export Filtered Drillholes to CSV"
        >
          Reporte CSV
        </span>
        <span className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer">Edit</span>
        <span className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer">View</span>
        <span className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer">Models</span>
        <span className="mr-4 hover:bg-gray-700 px-2 py-1 rounded cursor-pointer">Help</span>
        <div className="flex-1" />
        <button
          onClick={() => setEnableDamping(!enableDamping)}
          className={`mr-4 px-2 py-1 rounded text-xs font-semibold transition-colors ${enableDamping ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
        >
          Inercia: {enableDamping ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Project Tree) */}
        <div className="w-80 flex flex-col bg-[#111827] border-r border-gray-800 z-20 shadow-xl">
          {/* Sidebar Header */}
          <div className="h-10 border-b border-gray-800 flex items-center justify-between px-3 bg-gray-900">
            <span className="font-semibold text-sm tracking-wide text-gray-200">Project Tree</span>
            <div className="flex space-x-1">
              <button className="p-1 hover:bg-gray-700 rounded" title="Import Data" onClick={() => setShowImport(true)}>
                <PlusCircle size={14} className="text-blue-400" />
              </button>
              <button className="p-1 hover:bg-gray-700 rounded"><Filter size={14} className="text-gray-400" /></button>
              <button className="p-1 hover:bg-gray-700 rounded"><Settings size={14} className="text-gray-400" /></button>
            </div>
          </div>

          {/* Project Info Summary */}
          <div className="p-3 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center text-blue-400 mb-1">
              <img src={logo} alt="JVCMineData Logo" className="h-8 object-contain" />
            </div>
            <div className="text-gray-500 text-[10px]">Last modified: Today, 14:32</div>
          </div>

          {/* Tree Content */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {layers.map(layer => (
              <TreeItem
                key={layer.id}
                layer={layer}
                level={0}
                onToggleVisibility={toggleLayerVisibility}
                onSettingsClick={handleSettingsClick}
                onColorConfigClick={handleColorConfigClick}
                onColorChange={handleColorChange}
                onFilterClick={handleFilterClick}
                onSolidSettingsClick={handleSolidSettingsClick}
                activeFilter={drillholeFilter}
              />
            ))}
          </div>

          {/* Sidebar Footer / Properties Panel */}
          <div className="h-1/3 border-t border-gray-700 bg-[#0d1117] flex flex-col">
            <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-3 text-xs font-semibold">
              Properties
            </div>

            {selectedElement ? (
              <div className="p-4 text-xs space-y-3 overflow-y-auto">
                <div className="flex items-center text-blue-400 mb-2">
                  <Activity size={14} className="mr-2" />
                  <span className="font-bold uppercase tracking-wider">Drillhole Segment</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Hole ID:</div>
                  <div className="text-white font-mono font-semibold">{selectedElement.holeId}</div>

                  <div className="text-gray-500">From:</div>
                  <div className="text-white font-mono">{selectedElement.from.toFixed(2)} m</div>

                  <div className="text-gray-500">To:</div>
                  <div className="text-white font-mono">{selectedElement.to.toFixed(2)} m</div>

                  <div className="text-gray-500">Length:</div>
                  <div className="text-white font-mono">{(selectedElement.to - selectedElement.from).toFixed(2)} m</div>

                  <div className="text-gray-500">Grade:</div>
                  <div
                    className="font-mono font-bold"
                    style={{
                      color: selectedElement.color // Use the actual segment color
                    }}
                  >
                    {selectedElement.value.toFixed(3)} %
                  </div>

                  {selectedElement.depth && (
                    <>
                      <div className="text-gray-500">Depth (Approx):</div>
                      <div className="text-white font-mono">{selectedElement.depth.toFixed(2)} m</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-xs mt-4">
                <Activity size={32} className="mx-auto mb-2 opacity-20" />
                Double-click an object to view properties
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-black">
          <Toolbar
            onZoomExtend={() => setZoomExtendTrigger(t => t + 1)}
            onSettings={() => setShowSettings(true)}
            onOpenReport={() => setShowReportModal(true)}
            onToggleSliceMode={handleToggleSliceMode}
            isSliceModeActive={sliceConfig.active}
            clickedPoint={clickedPoint}
          />

          <div className="flex-1 relative">
            <Scene3D
              layers={layers}
              zoomExtendTrigger={zoomExtendTrigger}
              drillholeLineWidth={drillholeLineWidth}
              showDrillholeID={showDrillholeID}
              showDrillholeDepth={showDrillholeDepth}
              showDrillholeSegments={showDrillholeSegments}
              showDrillholeValues={showDrillholeValues}
              enableDamping={enableDamping}
              onSelectElement={handleSelectElement}
              selectedElement={selectedElement}
              drillholeFilter={drillholeFilter}
              sliceConfig={sliceConfig}
              onSlicePointsDefined={handleSlicePointsDefined}
              onPointClick={(p) => setClickedPoint({ x: p.x, y: p.y, z: p.z })}
            />

            {/* Overlay UI elements (Legend, Scale) */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-3 rounded border border-gray-700 pointer-events-none">
              <div className="text-[10px] font-bold text-gray-300 mb-2 uppercase tracking-wider">Cu Grade (%)</div>
              {legendConfig ? (
                <>
                  {legendConfig.rules.map(rule => (
                    <div key={rule.id} className="flex items-center space-x-2 text-[10px]">
                      <div className="w-3 h-3" style={{ backgroundColor: rule.color }}></div>
                      <span>{rule.min} - {rule.max}</span>
                    </div>
                  ))}
                  {/* Show Null Value in Legend if configured */}
                  {legendConfig.nullValue !== undefined && (
                    <div className="flex items-center space-x-2 text-[10px] mt-1 pt-1 border-t border-gray-600">
                      <div className="w-3 h-3 border border-gray-500" style={{
                        backgroundColor: legendConfig.nullColor || 'transparent',
                        backgroundImage: !legendConfig.nullColor ? 'linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444), linear-gradient(45deg, #444 25%, transparent 25%, transparent 75%, #444 75%, #444)' : 'none',
                        backgroundSize: '4px 4px',
                        backgroundPosition: '0 0, 2px 2px'
                      }}></div>
                      <span>{legendConfig.nullValue} (Null)</span>
                    </div>
                  )}
                </>
              ) : (
                // Default Legend Fallback
                <>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="w-3 h-3 bg-[#22c55e]"></div> <span>0.0 - 0.2</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="w-3 h-3 bg-[#eab308]"></div> <span>0.2 - 1.0</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="w-3 h-3 bg-[#f97316]"></div> <span>1.0 - 2.5</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <div className="w-3 h-3 bg-[#ef4444]"></div> <span>&gt; 2.5</span>
                  </div>
                </>
              )}
            </div>

            <div className="absolute bottom-4 left-4 text-[10px] text-gray-500 font-mono pointer-events-none">
              x: 1240.50 y: 400.22 z: -120.00
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-6 bg-gray-900 border-t border-gray-800 flex items-center justify-center text-[10px] text-gray-500 select-none">
        © 2025 JVCMineData SpA. Todos los derechos reservados.
      </div>

      {showImport && <ImportWizard onClose={() => setShowImport(false)} onImport={handleImport} />}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        drillholeLineWidth={drillholeLineWidth}
        setDrillholeLineWidth={setDrillholeLineWidth}
        showDrillholeID={showDrillholeID}
        setShowDrillholeID={setShowDrillholeID}
        showDrillholeDepth={showDrillholeDepth}
        setShowDrillholeDepth={setShowDrillholeDepth}
        showDrillholeSegments={showDrillholeSegments}
        setShowDrillholeSegments={setShowDrillholeSegments}
        showDrillholeValues={showDrillholeValues}
        setShowDrillholeValues={setShowDrillholeValues}
      />

      <ColorSettingsModal
        isOpen={showColorSettings}
        onClose={() => setShowColorSettings(false)}
        onSave={handleSaveColorSettings}
        layerName={activeLayerInfo?.name || ''}
        initialConfig={activeLayerInfo?.config}
      />

      <SolidSettingsModal
        isOpen={showSolidSettings}
        onClose={() => setShowSolidSettings(false)}
        currentOpacity={(() => {
          const findLayer = (items: Layer[]): Layer | null => {
            for (const item of items) {
              if (item.id === activeSolidLayerId) return item;
              if (item.children) {
                const found = findLayer(item.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findLayer(layers)?.opacity ?? 0.8;
        })()}
        onOpacityChange={handleOpacityChange}
        layerName={(() => {
          const findLayer = (items: Layer[]): Layer | null => {
            for (const item of items) {
              if (item.id === activeSolidLayerId) return item;
              if (item.children) {
                const found = findLayer(item.children);
                if (found) return found;
              }
            }
            return null;
          };
          return findLayer(layers)?.name;
        })()}
      />

      <IntersectionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        drillholes={getActiveDrillholes()}
        solids={(() => {
          const solids: Layer[] = [];
          const findSolids = (items: Layer[]) => {
            items.forEach(item => {
              if (item.type === LayerType.SOLID) solids.push(item);
              if (item.children) findSolids(item.children);
            });
          };
          findSolids(layers);
          return solids;
        })()}
      />

      <DrillholeFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        drillholes={getAllDrillholes()}
        currentFilter={drillholeFilter}
        onApplyFilter={handleApplyFilter}
      />

      <SliceSettingsModal
        isOpen={showSliceWidthModal}
        onClose={() => setShowSliceWidthModal(false)}
        onApply={handleSliceWidthConfirm}
        initialWidth={sliceConfig.width}
      />
    </div>
  );

  // Helper to get all drillholes from layers (recursive)
  function getAllDrillholes(): Drillhole[] {
    console.log('getAllDrillholes called, layers.length:', layers.length);
    const drillholes: Drillhole[] = [];

    const searchLayer = (layer: Layer) => {
      // Check if this layer has drillhole data
      if (layer.type === LayerType.DRILLHOLE_TRACE && layer.data && Array.isArray(layer.data)) {
        drillholes.push(...(layer.data as Drillhole[]));
      }

      // Recursively search children
      if (layer.children && layer.children.length > 0) {
        layer.children.forEach(child => searchLayer(child));
      }
    };

    layers.forEach(layer => searchLayer(layer));

    console.log('getAllDrillholes: returning', drillholes.length, 'drillholes');
    if (drillholes.length > 0) {
      console.log('First drillhole projectName:', drillholes[0].projectName);
    }
    return drillholes;
  }

  // Helper to get only filtered/active drillholes
  function getActiveDrillholes(): Drillhole[] {
    const allDrillholes = getAllDrillholes();
    if (!drillholeFilter) return allDrillholes;

    return allDrillholes.filter(dh => {
      // Date range filter
      if (drillholeFilter.dateRange) {
        if (!dh.endDate) return false;
        const dhDate = new Date(dh.endDate);
        if (drillholeFilter.dateRange.start && dhDate < new Date(drillholeFilter.dateRange.start)) return false;
        if (drillholeFilter.dateRange.end && dhDate > new Date(drillholeFilter.dateRange.end)) return false;
      }

      // Project name filter
      if (drillholeFilter.projectNames && drillholeFilter.projectNames.length > 0) {
        if (!dh.projectName) return false;
        if (!drillholeFilter.projectNames.includes(dh.projectName)) return false;
      }

      // Drillhole ID filter
      if (drillholeFilter.drillholeIds && drillholeFilter.drillholeIds.length > 0) {
        if (!drillholeFilter.drillholeIds.includes(dh.id)) return false;
      }

      return true;
    });
  }
};

export default App;