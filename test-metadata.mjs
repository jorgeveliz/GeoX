import Papa from 'papaparse';
import fs from 'fs';
import { validateCollar, validateSurvey, validateAssay } from './utils/DrillholeValidator.js';

// Leer los archivos CSV
const collarContent = fs.readFileSync('BD_ANT_HIST_COLLAR.csv', 'utf-8');
const surveyContent = fs.readFileSync('BD_ANT_HIST_SURVEY.csv', 'utf-8');
const assayContent = fs.readFileSync('BD_ANT_HIST_ASSAY.csv', 'utf-8');

// Parsear los CSVs
const collars = Papa.parse(collarContent, { header: true, skipEmptyLines: true }).data;
const surveys = Papa.parse(surveyContent, { header: true, skipEmptyLines: true }).data;
const assays = Papa.parse(assayContent, { header: true, skipEmptyLines: true }).data;

console.log('=== PRUEBA DE VALIDACIÓN CON METADATA ===\n');
console.log(`Collars cargados: ${collars.length}`);
console.log(`Surveys cargados: ${surveys.length}`);
console.log(`Assays cargados: ${assays.length}\n`);

// Validar Collar
const collarVal = validateCollar(collars);
console.log('=== VALIDACIÓN COLLAR ===');
console.log(`Mensajes de validación: ${collarVal.result.messages.length}`);
console.log(`Errores: ${collarVal.result.messages.filter(m => m.severity === 'ERROR').length}`);
console.log(`Warnings: ${collarVal.result.messages.filter(m => m.severity === 'WARNING').length}`);
console.log(`Sondajes en collarMap: ${collarVal.collarMap.size}`);
console.log(`Sondajes en collarMetadata: ${collarVal.collarMetadata.size}\n`);

// Mostrar algunos ejemplos de metadata
console.log('=== EJEMPLOS DE METADATA CAPTURADA ===');
let count = 0;
for (const [holeId, metadata] of collarVal.collarMetadata) {
    if (count < 5) {
        console.log(`HoleID: ${holeId}`);
        console.log(`  Depth: ${metadata.depth}`);
        console.log(`  EndDate: ${metadata.endDate || 'N/A'}`);
        console.log(`  ProspectName: ${metadata.prospectName || 'N/A'}`);
        console.log('');
        count++;
    } else {
        break;
    }
}

// Validar Survey
const surveyVal = validateSurvey(surveys, collarVal.collarMap, collarVal.collarMetadata);
console.log('=== VALIDACIÓN SURVEY ===');
console.log(`Mensajes de validación: ${surveyVal.messages.length}`);
console.log(`Errores: ${surveyVal.messages.filter(m => m.severity === 'ERROR').length}`);
console.log(`Warnings: ${surveyVal.messages.filter(m => m.severity === 'WARNING').length}\n`);

// Mostrar algunos mensajes con metadata
if (surveyVal.messages.length > 0) {
    console.log('=== EJEMPLOS DE MENSAJES CON METADATA (SURVEY) ===');
    surveyVal.messages.slice(0, 3).forEach((msg, idx) => {
        console.log(`Mensaje ${idx + 1}:`);
        console.log(`  HoleID: ${msg.holeId}`);
        console.log(`  Severity: ${msg.severity}`);
        console.log(`  Message: ${msg.message}`);
        console.log(`  EndDate: ${msg.endDate || 'N/A'}`);
        console.log(`  ProspectName: ${msg.prospectName || 'N/A'}`);
        console.log('');
    });
}

// Validar Assay
const assayVal = validateAssay(assays, collarVal.collarMap, collarVal.collarMetadata);
console.log('=== VALIDACIÓN ASSAY ===');
console.log(`Mensajes de validación: ${assayVal.messages.length}`);
console.log(`Errores: ${assayVal.messages.filter(m => m.severity === 'ERROR').length}`);
console.log(`Warnings: ${assayVal.messages.filter(m => m.severity === 'WARNING').length}\n`);

// Mostrar algunos mensajes con metadata
if (assayVal.messages.length > 0) {
    console.log('=== EJEMPLOS DE MENSAJES CON METADATA (ASSAY) ===');
    assayVal.messages.slice(0, 3).forEach((msg, idx) => {
        console.log(`Mensaje ${idx + 1}:`);
        console.log(`  HoleID: ${msg.holeId}`);
        console.log(`  Severity: ${msg.severity}`);
        console.log(`  Message: ${msg.message}`);
        console.log(`  EndDate: ${msg.endDate || 'N/A'}`);
        console.log(`  ProspectName: ${msg.prospectName || 'N/A'}`);
        console.log('');
    });
}

// Resumen final
console.log('=== RESUMEN FINAL ===');
const allMessages = [
    ...collarVal.result.messages,
    ...surveyVal.messages,
    ...assayVal.messages
];
console.log(`Total de mensajes: ${allMessages.length}`);
console.log(`Mensajes con EndDate: ${allMessages.filter(m => m.endDate).length}`);
console.log(`Mensajes con ProspectName: ${allMessages.filter(m => m.prospectName).length}`);
console.log(`\n✓ Prueba completada exitosamente!`);
