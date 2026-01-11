import React, { useState, useEffect } from 'react';
import { Upload, X, Check, FileSpreadsheet, AlertCircle, Download, FileText, AlertTriangle, Box } from 'lucide-react';
import { parseCSV, processDrillholeData, parseDXF } from '../utils';
import { parseDXFFile } from '../utils/dxfParser';
import { Layer, LayerType } from '../types';
import { validateCollar, validateSurvey, validateAssay, validateCompleteness, ValidationMessage } from '../utils/DrillholeValidator';

interface ImportWizardProps {
  onClose: () => void;
  onImport: (newLayer: Layer) => void;
}

type ImportType = 'DRILLHOLE' | 'BLOCKMODEL' | 'POINTS' | 'TRIANGULATION' | 'SOLIDOS';

const ImportWizard: React.FC<ImportWizardProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<ImportType>('DRILLHOLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);

  // Confirmation State
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState<'WARNING' | 'ERROR' | null>(null);

  // Drillhole Files
  const [collarFile, setCollarFile] = useState<File | null>(null);
  const [surveyFile, setSurveyFile] = useState<File | null>(null);
  const [assayFile, setAssayFile] = useState<File | null>(null);

  // Triangulation File
  const [dxfFile, setDxfFile] = useState<File | null>(null);

  // Solid File
  const [solidDxfFile, setSolidDxfFile] = useState<File | null>(null);

  // Reset confirmation when files change
  useEffect(() => {
    setShowConfirmation(false);
    setConfirmationType(null);
    setValidationMessages([]);
    setError(null);
  }, [collarFile, surveyFile, assayFile, dxfFile, solidDxfFile]);

  // Helper function to escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadValidationReport = () => {
    if (validationMessages.length === 0) return;

    console.log('Exportando reporte de validación...', validationMessages.length, 'mensajes');

    const headers = ['ID_Mensaje', 'Archivo', 'Severidad', 'Sondaje', 'Linea', 'Mensaje', 'Valor', 'Limite', 'FechaFin', 'Prospecto'];
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...validationMessages.map(m => {
        const valStr = m.value !== undefined ? m.value : '';
        const limitStr = m.limit !== undefined ? m.limit : '';
        const endDateStr = m.endDate || '';
        const prospectNameStr = m.prospectName || '';
        return [
          escapeCSV(m.id),
          escapeCSV(m.fileType),
          escapeCSV(m.severity),
          escapeCSV(m.holeId),
          escapeCSV(m.lineNumber || ''),
          escapeCSV(m.message),
          escapeCSV(valStr),
          escapeCSV(limitStr),
          escapeCSV(endDateStr),
          escapeCSV(prospectNameStr)
        ].join(',');
      })
    ].join('\n');

    console.log('CSV generado, tamaño:', csvContent.length, 'caracteres');
    console.log('Primeras 500 caracteres:', csvContent.substring(0, 500));

    try {
      // Agregar BOM para UTF-8 (ayuda con Excel)
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Método alternativo usando data URI (más compatible)
      const encodedUri = encodeURIComponent(csvWithBOM);
      const dataUri = `data:text/csv;charset=utf-8,${encodedUri}`;

      const link = document.createElement('a');
      link.href = dataUri;
      link.download = 'validation_report.csv';
      link.style.display = 'none';

      document.body.appendChild(link);

      console.log('Iniciando descarga con data URI...');
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        console.log('Descarga completada');
        alert('Reporte exportado exitosamente: validation_report.csv\nRevisa tu carpeta de descargas.');
      }, 100);
    } catch (error) {
      console.error('Error al exportar el reporte:', error);
      alert('Error al exportar el reporte. Revisa la consola para más detalles.');
    }
  };

  const handleDrillholeImport = async () => {
    if (!collarFile || !surveyFile || !assayFile) {
      setError("Please select all three files (Collar, Survey, Assay).");
      return;
    }
    setLoading(true);
    setError(null);

    // Don't clear messages immediately if we are in confirmation mode
    setValidationMessages([]);

    try {
      const collars = await parseCSV(collarFile);
      const surveys = await parseCSV(surveyFile);
      const assays = await parseCSV(assayFile);

      // --- Validation Step ---
      const collarVal = validateCollar(collars);
      const surveyVal = validateSurvey(surveys, collarVal.collarMap, collarVal.collarMetadata);
      const assayVal = validateAssay(assays, collarVal.collarMap, collarVal.collarMetadata);

      // Extract IDs for completeness check
      const surveyIds = new Set(surveys.map(r => String(r['HoleID'] || r['HOLEID'] || r['id']).trim()).filter(Boolean));
      const assayIds = new Set(assays.map(r => String(r['HoleID'] || r['HOLEID'] || r['id']).trim()).filter(Boolean));

      const completenessMsgs = validateCompleteness(new Set(collarVal.collarMap.keys()), surveyIds, assayIds);

      const allMessages = [
        ...collarVal.result.messages,
        ...surveyVal.messages,
        ...assayVal.messages,
        ...completenessMsgs
      ];

      setValidationMessages(allMessages);

      const hasErrors = allMessages.some(m => m.severity === 'ERROR');
      const hasWarnings = allMessages.some(m => m.severity === 'WARNING');

      // If we have messages and haven't confirmed yet
      if (allMessages.length > 0 && !showConfirmation) {
        setShowConfirmation(true);
        setConfirmationType(hasErrors ? 'ERROR' : 'WARNING');

        if (hasErrors) {
          // We don't set 'error' state here because that hides the confirmation box in the current UI logic.
          // Instead we just rely on the confirmation box to show the message.
        }

        setLoading(false);
        return; // PAUSE FOR USER REVIEW (Errors OR Warnings)
      }

      // Proceed if no messages, OR if confirmed (regardless of errors/warnings)
      console.log('=== IMPORT DEBUG ===');
      console.log('Collars:', collars.length);
      console.log('Surveys:', surveys.length);
      console.log('Assays:', assays.length);

      const drillholes = processDrillholeData(collars, surveys, assays);

      if (drillholes.length === 0) {
        setError("No valid drillholes found after processing.");
        setLoading(false);
        return;
      }

      const newLayer: Layer = {
        id: `import-dh-${Date.now()}`,
        name: `Imported Drillholes (${drillholes.length})`,
        type: LayerType.FOLDER,
        visible: true,
        children: [
          {
            id: `import-dh-trace-${Date.now()}`,
            name: 'Assay Values',
            type: LayerType.DRILLHOLE_TRACE,
            visible: true,
            data: drillholes
          }
        ]
      };

      onImport(newLayer);
      onClose();

    } catch (e: any) {
      setError("Error parsing files: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriangulationImport = async () => {
    if (!dxfFile) {
      setError("Please select a DXF file.");
      return;
    }
    setLoading(true);
    setError(null);
    setValidationMessages([]);

    try {
      const triangulationData = await parseDXF(dxfFile);

      if (triangulationData.lines.length === 0 && triangulationData.polylines.length === 0) {
        setError("No lines or polylines found in DXF file.");
        setLoading(false);
        return;
      }

      const newLayer: Layer = {
        id: `import-tri-${Date.now()}`,
        name: `Topografía (${triangulationData.lines.length + triangulationData.polylines.length} elements)`,
        type: LayerType.SURFACE,
        visible: true,
        data: triangulationData
      };

      onImport(newLayer);
      onClose();

    } catch (e: any) {
      setError("Error parsing DXF file: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSolidImport = async () => {
    if (!solidDxfFile) {
      setError("Please select a DXF file.");
      return;
    }
    setLoading(true);
    setError(null);
    setValidationMessages([]);

    try {
      const solidData = await parseDXFFile(solidDxfFile);

      if (solidData.faceCount === 0) {
        setError("No 3DFACE entities found in DXF file.");
        setLoading(false);
        return;
      }

      const newLayer: Layer = {
        id: `import-solid-${Date.now()}`,
        name: solidData.name || `Solid (${solidData.faceCount} faces)`,
        type: LayerType.SOLID,
        visible: true,
        data: solidData,
        color: '#ff8800'
      };

      onImport(newLayer);
      onClose();

    } catch (e: any) {
      setError("Error parsing DXF file: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const FileInput = ({ label, file, setFile, accept, icon: Icon = FileSpreadsheet }: {
    label: string,
    file: File | null,
    setFile: (f: File | null) => void,
    accept?: string,
    icon?: React.ComponentType<{ size?: number; className?: string }>
  }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
      <div className={`border border-dashed border-gray-600 rounded p-2 flex items-center justify-between ${file ? 'bg-gray-800' : 'hover:bg-gray-800'} transition-colors`}>
        <div className="flex items-center truncate flex-1 mr-2">
          <Icon size={16} className="text-green-500 mr-2 flex-shrink-0" />
          <span className="text-xs text-gray-300 truncate" title={file?.name}>{file ? file.name : "Select file..."}</span>
        </div>
        <div className="relative flex-shrink-0">
          <input
            type="file"
            accept={accept || ".csv"}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button className="text-blue-400 text-xs font-medium hover:underline">
            {file ? 'Change' : 'Browse'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#111827] w-[900px] h-[600px] rounded-lg shadow-2xl border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg flex-shrink-0">
          <h2 className="text-white font-semibold flex items-center">
            <Upload size={18} className="mr-2 text-blue-500" /> Import Data
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800 flex-shrink-0">
          {['DRILLHOLE', 'BLOCKMODEL', 'POINTS', 'TRIANGULATION', 'SOLIDOS'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as ImportType)}
              className={`flex-1 py-3 text-xs font-medium tracking-wide transition-colors ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Panel: Inputs */}
          <div className="w-1/3 p-5 border-r border-gray-700 overflow-y-auto bg-gray-900/50">
            {activeTab === 'DRILLHOLE' && (
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-800/50 p-3 rounded text-xs text-blue-200">
                  <p className="font-semibold mb-1">Required Files:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>Collar (HoleID, X, Y, Z)</li>
                    <li>Survey (HoleID, Depth, Dip, Azimuth)</li>
                    <li>Assay (HoleID, From, To, Value)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <FileInput label="1. Collar Data" file={collarFile} setFile={setCollarFile} />
                  <FileInput label="2. Survey Data" file={surveyFile} setFile={setSurveyFile} />
                  <FileInput label="3. Assay Data" file={assayFile} setFile={setAssayFile} />
                </div>
              </div>
            )}

            {activeTab === 'TRIANGULATION' && (
              <div>
                <p className="text-gray-400 text-xs mb-4">Upload a DXF file containing topographical lines and curves.</p>
                <FileInput
                  label="DXF File (Topografía)"
                  file={dxfFile}
                  setFile={setDxfFile}
                  accept=".dxf"
                  icon={FileText}
                />
              </div>
            )}

            {activeTab === 'SOLIDOS' && (
              <div>
                <p className="text-gray-400 text-xs mb-4">Upload a DXF file containing 3D solids (3DFACE entities).</p>
                <FileInput
                  label="DXF File (Sólido)"
                  file={solidDxfFile}
                  setFile={setSolidDxfFile}
                  accept=".dxf"
                  icon={Box}
                />
              </div>
            )}

            {activeTab !== 'DRILLHOLE' && activeTab !== 'TRIANGULATION' && activeTab !== 'SOLIDOS' && (
              <div className="text-center py-10 text-gray-500">
                <Upload size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Coming soon.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-800 text-red-200 p-3 rounded text-xs flex items-start">
                <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {showConfirmation && !error && (
              <div className={`mt-4 border p-3 rounded text-xs flex items-start ${confirmationType === 'ERROR' ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-yellow-900/30 border-yellow-800 text-yellow-200'}`}>
                <AlertTriangle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  {confirmationType === 'ERROR'
                    ? 'Blocking errors detected. You may proceed, but data may be incomplete or incorrect.'
                    : 'Warnings detected. Please review the details.'}
                  <br />Click "Proceed" to continue.
                </span>
              </div>
            )}
          </div>

          {/* Right Panel: Validation Results */}
          <div className="flex-1 flex flex-col bg-[#0d1117]">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center">
                <AlertTriangle size={16} className="mr-2 text-yellow-500" />
                Details Warning and Error
              </h3>
              {validationMessages.length > 0 && (
                <button
                  onClick={downloadValidationReport}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded flex items-center transition-colors border border-gray-600"
                >
                  <Download size={12} className="mr-1.5" /> Export Report
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {validationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600">
                  <Check size={48} className="mb-2 opacity-20" />
                  <p className="text-sm">No validation issues found yet.</p>
                  <p className="text-xs opacity-60">Upload files and click Import to validate.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-800 sticky top-0 text-xs uppercase text-gray-400 font-semibold">
                    <tr>
                      <th className="p-2 border-b border-gray-700 w-20">Type</th>
                      <th className="p-2 border-b border-gray-700 w-20">File</th>
                      <th className="p-2 border-b border-gray-700 w-24">HoleID</th>
                      <th className="p-2 border-b border-gray-700">Message</th>
                      <th className="p-2 border-b border-gray-700 w-16 text-right">Line</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {validationMessages.map((msg) => (
                      <tr key={msg.id} className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${msg.severity === 'ERROR' ? 'bg-red-900/10 text-red-200' : 'bg-yellow-900/10 text-yellow-200'}`}>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${msg.severity === 'ERROR' ? 'bg-red-900 text-red-100' : 'bg-yellow-900 text-yellow-100'}`}>
                            {msg.severity}
                          </span>
                        </td>
                        <td className="p-2 opacity-70">{msg.fileType}</td>
                        <td className="p-2 font-semibold">{msg.holeId}</td>
                        <td className="p-2">{msg.message} {msg.value !== undefined && <span className="opacity-60">({msg.value})</span>}</td>
                        <td className="p-2 text-right opacity-60">{msg.lineNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-lg flex justify-end space-x-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded transition-colors">Cancel</button>
          <button
            onClick={
              activeTab === 'DRILLHOLE' ? handleDrillholeImport :
                activeTab === 'TRIANGULATION' ? handleTriangulationImport :
                  activeTab === 'SOLIDOS' ? handleSolidImport :
                    undefined
            }
            disabled={
              loading ||
              (activeTab === 'DRILLHOLE' && (!collarFile || !surveyFile || !assayFile)) ||
              (activeTab === 'TRIANGULATION' && !dxfFile) ||
              (activeTab === 'SOLIDOS' && !solidDxfFile)
            }
            className={`px-6 py-2 text-sm text-white rounded font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all ${showConfirmation
              ? (confirmationType === 'ERROR' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20')
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
              }`}
          >
            {loading ? 'Processing...' : showConfirmation ? (confirmationType === 'ERROR' ? 'Proceed with Errors' : 'Proceed with Warnings') : 'Import Data'}
            {!loading && <Check size={16} className="ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;