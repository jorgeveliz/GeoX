const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

    // Dialog operations
    openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
    saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => process.platform,

    // Licensing
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    activateLicense: () => ipcRenderer.invoke('activate-license'),
    restartApp: () => ipcRenderer.send('restart-app'),

    // Data import
    importCSVFiles: (files) => ipcRenderer.invoke('import-csv-files', files),
    getDrillholes: (limit, offset) => ipcRenderer.invoke('get-drillholes', limit, offset),
    getDrillholeData: (holeId) => ipcRenderer.invoke('get-drillhole-data', holeId),
    getStats: () => ipcRenderer.invoke('get-stats'),
    getAllData: () => ipcRenderer.invoke('get-all-data'),

    // Progress events
    onImportProgress: (callback) => {
        const subscription = (event, message) => callback(message);
        ipcRenderer.on('import-progress', subscription);
        return () => ipcRenderer.removeListener('import-progress', subscription);
    },

    // Menu events
    onMenuOpenProject: (callback) => ipcRenderer.on('menu-open-project', callback),
    onMenuSaveProject: (callback) => ipcRenderer.on('menu-save-project', callback),
    onMenuImportData: (callback) => ipcRenderer.on('menu-import-data', callback),
    onMenuExportReport: (callback) => ipcRenderer.on('menu-export-report', callback),
    onMenuDocumentation: (callback) => ipcRenderer.on('menu-documentation', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose a flag to detect if running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
