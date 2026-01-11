const { parentPort, workerData } = require('worker_threads');
const Papa = require('papaparse');
const fs = require('fs');

// Parse CSV file and send data in chunks
// Parse CSV file and send data in chunks
async function parseCSV(filePath, fileType) {
    try {
        const stats = await fs.promises.stat(filePath);
        const fileSize = stats.size;

        let processedBytes = 0;
        const allData = [];

        const fileStream = fs.createReadStream(filePath);

        Papa.parse(fileStream, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            chunk: (results) => {
                // Accumulate data
                allData.push(...results.data);

                // Update progress based on approximate cursor position or results
                // PapaParse stream doesn't give precise byte usage easily, but we can estimate
                // Or better: use a transform stream to count bytes?
                // Simplest: results.meta.cursor (if available in stream mode) or estimate.
                // Actually, let's just use the chunk size approximation if cursor isn't reliable.
                if (results.meta && results.meta.cursor) {
                    processedBytes = results.meta.cursor;
                } else {
                    // Fallback
                    processedBytes += results.data.length * 100; // Crude estimate
                }

                const progress = Math.min(99, (processedBytes / fileSize) * 100);

                parentPort.postMessage({
                    type: 'progress',
                    fileType,
                    progress: Math.round(progress),
                    rows: allData.length
                });
            },
            complete: () => {
                // Send final data
                parentPort.postMessage({
                    type: 'complete',
                    fileType,
                    data: allData,
                    totalRows: allData.length
                });
            },
            error: (error) => {
                parentPort.postMessage({
                    type: 'error',
                    fileType,
                    error: error.message
                });
            }
        });
    } catch (error) {
        parentPort.postMessage({
            type: 'error',
            fileType: workerData.fileType,
            error: error.message
        });
    }
}

// Start parsing when worker receives message
if (workerData) {
    parseCSV(workerData.filePath, workerData.fileType);
}
