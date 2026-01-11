const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');
const LicenseManager = require('./license-manager.cjs');

// In-memory storage instead of SQLite
const projectData = {
    collars: [],
    surveys: [],
    assays: []
};

let activeWorkers = new Map();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let licenseManager;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            webgl: true,
            enableWebGL: true
        },
        icon: path.join(__dirname, '../public/icon.png'),
        title: 'GeoX',
        backgroundColor: '#0d1117'
    });

    // Load the app based on license status
    const licenseCheck = licenseManager.verifyLicense();

    if (licenseCheck.then) {
        // Handle async if verifying became async (it is async in my implementation)
        licenseCheck.then(result => {
            if (result.valid) {
                console.log('License valid:', result.data.user);
                loadMainApp();
            } else {
                console.log('License invalid:', result.reason);
                loadActivationWindow();
            }
        });
    } else {
        // Fallback if sync
        // But my implementation is async
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create application menu
    createMenu();
}

function loadMainApp() {
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

function loadActivationWindow() {
    mainWindow.loadFile(path.join(__dirname, 'activation.html'));
    // mainWindow.webContents.openDevTools(); // Optional for debug
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Project...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-open-project');
                    }
                },
                {
                    label: 'Save Project',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-project');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Import Data...',
                    accelerator: 'CmdOrCtrl+I',
                    click: () => {
                        mainWindow.webContents.send('menu-import-data');
                    }
                },
                {
                    label: 'Export Report...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-report');
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        mainWindow.webContents.send('menu-documentation');
                    }
                },
                {
                    label: 'Deactivate License',
                    click: async () => {
                        const choice = dialog.showMessageBoxSync(mainWindow, {
                            type: 'question',
                            buttons: ['Cancel', 'Deactivate'],
                            title: 'Deactivate License',
                            message: 'Are you sure you want to remove the license? The application will require activation on next start.'
                        });

                        if (choice === 1) {
                            // Remove license file
                            const userDataPath = app.getPath('userData');
                            const licensePath = path.join(userDataPath, 'license.key');
                            try {
                                await fs.unlink(licensePath);
                                dialog.showMessageBoxSync(mainWindow, { message: 'License removed. Application will restart.' });
                                app.relaunch();
                                app.exit(0);
                            } catch (err) {
                                console.error('Failed to remove license', err);
                            }
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: async () => {
                        let licenseInfo = 'License Status: Unknown';
                        try {
                            if (licenseManager) {
                                const verify = await licenseManager.verifyLicense();
                                if (verify.valid) {
                                    const expDate = new Date(verify.data.expiration).toLocaleDateString();
                                    licenseInfo = `Registered to: ${verify.data.user}\nMachine ID: ${verify.data.machineId}\nExpires: ${expDate}`;
                                } else {
                                    licenseInfo = `License Status: Invalid (${verify.reason || 'Unknown'})`;
                                }
                            }
                        } catch (err) {
                            licenseInfo = 'License Status: Error checking license';
                        }

                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About GeoX',
                            message: 'GeoX',
                            detail: `Version: ${app.getVersion()}\n\n${licenseInfo}\n\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        await fs.writeFile(filePath, data, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-file-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.filePaths;
});

ipcMain.handle('save-file-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.filePath;
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// License IPC
ipcMain.handle('get-machine-id', () => {
    return licenseManager.getMachineId();
});

ipcMain.handle('activate-license', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'License File', extensions: ['key'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
    }

    const filePath = result.filePaths[0];
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const saveResult = licenseManager.saveLicense(content);

        if (!saveResult.success) {
            return { success: false, error: saveResult.error };
        }

        const verify = await licenseManager.verifyLicense();
        if (verify.valid) {
            // Hot-load the application instead of restarting
            loadMainApp();
            return { success: true };
        } else {
            return { success: false, error: verify.reason };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.on('restart-app', () => {
    app.relaunch();
    app.exit(0);
});

// App lifecycle
app.whenReady().then(() => {
    // No DB init needed
    console.log('App ready. Using in-memory storage.');
    licenseManager = new LicenseManager(app.getPath('userData'));
    createWindow();
});

// Helper function to create workers
function createWorker(workerFile, data) {
    return new Promise((resolve, reject) => {
        const workerPath = path.join(__dirname, 'workers', workerFile);
        const worker = new Worker(workerPath, { workerData: data });

        worker.on('message', (message) => {
            if (message.type === 'progress') {
                // Send progress to renderer
                if (mainWindow) {
                    mainWindow.webContents.send('import-progress', message);
                }
            } else if (message.type === 'complete') {
                resolve(message);
                // Worker is terminated by the caller or we can do it here if it's one-off
                // For this use case, we terminate after completion
                worker.terminate();
            } else if (message.type === 'error') {
                reject(new Error(message.error));
                worker.terminate();
            }
        });

        worker.on('error', (err) => {
            reject(err);
            worker.terminate();
        });

        // Use postMessage if we didn't pass data in constructor, but here we used workerData
        // worker.postMessage(data); 
    });
}

// Data Import IPC
ipcMain.handle('import-csv-files', async (event, files) => {
    const { collarFile, surveyFile, assayFile } = files;

    // Clear existing data before import (optional, or we can merge/update)
    // For this app, let's assume we want to clear previous project data on new import
    // db.clearAll(); 

    try {
        console.log('Starting parallel CSV import...');

        // We'll run workers in parallel
        // Note: The worker implementation provided earlier expects workerData in constructor or message
        // My simple worker implementation in 392 checks for workerData in constructor.

        const tasks = [
            createWorker('csv-parser.worker.cjs', { filePath: collarFile, fileType: 'collar' }),
            createWorker('csv-parser.worker.cjs', { filePath: surveyFile, fileType: 'survey' }),
            createWorker('csv-parser.worker.cjs', { filePath: assayFile, fileType: 'assay' })
        ];

        const results = await Promise.all(tasks);
        console.log('CSV Parsing complete. Inserting into DB...');

        // Clear existing data
        projectData.collars = [];
        projectData.surveys = [];
        projectData.assays = [];

        for (const res of results) {
            if (res.fileType === 'collar') {
                projectData.collars = res.data;
            } else if (res.fileType === 'survey') {
                projectData.surveys = res.data;
            } else if (res.fileType === 'assay') {
                projectData.assays = res.data;
            }
        }

        console.log(`Data imported in memory: ${projectData.collars.length} collars, ${projectData.surveys.length} surveys, ${projectData.assays.length} assays`);
        return { success: true, message: 'Data imported successfully' };
    } catch (error) {
        console.error('Import error:', error);
        return { success: false, error: error.message };
    }
});

// Data Query IPC
ipcMain.handle('get-drillholes', (event, limit, offset) => {
    try {
        // Return simple slice for now
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        return { success: true, data: projectData.collars.slice(start, end) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-drillhole-data', (event, holeId) => {
    try {
        const collar = projectData.collars.find(c => String(c.hole_id || c.HoleID || c.id) === String(holeId));
        const surveys = projectData.surveys.filter(s => String(s.hole_id || s.HoleID || s.id) === String(holeId));
        const assays = projectData.assays.filter(a => String(a.hole_id || a.HoleID || a.id) === String(holeId));
        return { success: true, data: { collar, surveys, assays } };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-stats', () => {
    try {
        return {
            success: true,
            data: {
                collars: projectData.collars.length,
                surveys: projectData.surveys.length,
                assays: projectData.assays.length
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-all-data', () => {
    try {
        console.log('Returning all in-memory data...');
        return { success: true, data: projectData };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// App cleanup
app.on('before-quit', () => {
    // Clean up if needed
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
