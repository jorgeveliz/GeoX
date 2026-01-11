import Papa from 'papaparse';
import fs from 'fs';

// Función isNumeric del validador
const isNumeric = (val) => {
    if (val === null || val === undefined || val === '') return false;
    return !isNaN(Number(val));
};

// Leer el archivo CSV
const csvContent = fs.readFileSync('BD_ANT_HIST_ASSAY.csv', 'utf-8');

// Parsear SIN dynamicTyping (como lo hace actualmente la app)
const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
});

console.log('=== ANÁLISIS DEL CSV BD_ANT_HIST_ASSAY.csv ===\n');
console.log('Total de filas:', result.data.length);
console.log('Columnas detectadas:', result.meta.fields.join(', '));
console.log('\n');

// Analizar las primeras 10 filas
let errorsOld = 0;
let errorsNew = 0;

console.log('=== VALIDACIÓN DE LAS PRIMERAS 10 FILAS ===\n');

result.data.slice(0, 10).forEach((row, idx) => {
    // Validación ANTIGUA (sin SAMPFROM/SAMPTO)
    const fromValOld = row['From'] || row['from'] || row['FROM'];
    const toValOld = row['To'] || row['to'] || row['TO'];
    const isValidOld = isNumeric(fromValOld) && isNumeric(toValOld);

    // Validación NUEVA (con SAMPFROM/SAMPTO)
    const fromValNew = row['From'] || row['from'] || row['FROM'] || row['SAMPFROM'];
    const toValNew = row['To'] || row['to'] || row['TO'] || row['SAMPTO'];
    const isValidNew = isNumeric(fromValNew) && isNumeric(toValNew);

    if (!isValidOld) errorsOld++;
    if (!isValidNew) errorsNew++;

    console.log(`Fila ${idx + 2}:`);
    console.log(`  HOLEID: ${row.HOLEID}`);
    console.log(`  SAMPFROM: "${row.SAMPFROM}" (tipo: ${typeof row.SAMPFROM})`);
    console.log(`  SAMPTO: "${row.SAMPTO}" (tipo: ${typeof row.SAMPTO})`);
    console.log(`  Validación ANTIGUA: fromVal="${fromValOld}", toVal="${toValOld}" -> ${isValidOld ? '✓ VÁLIDO' : '✗ ERROR'}`);
    console.log(`  Validación NUEVA: fromVal="${fromValNew}", toVal="${toValNew}" -> ${isValidNew ? '✓ VÁLIDO' : '✗ ERROR'}`);
    console.log('');
});

// Analizar TODO el archivo
console.log('\n=== ANÁLISIS COMPLETO DEL ARCHIVO ===\n');

let totalErrorsOld = 0;
let totalErrorsNew = 0;

result.data.forEach((row, idx) => {
    const fromValOld = row['From'] || row['from'] || row['FROM'];
    const toValOld = row['To'] || row['to'] || row['TO'];
    const isValidOld = isNumeric(fromValOld) && isNumeric(toValOld);

    const fromValNew = row['From'] || row['from'] || row['FROM'] || row['SAMPFROM'];
    const toValNew = row['To'] || row['to'] || row['TO'] || row['SAMPTO'];
    const isValidNew = isNumeric(fromValNew) && isNumeric(toValNew);

    if (!isValidOld) totalErrorsOld++;
    if (!isValidNew) totalErrorsNew++;
});

console.log(`Total de filas: ${result.data.length}`);
console.log(`\nCon validación ANTIGUA (sin SAMPFROM/SAMPTO):`);
console.log(`  Errores "Non-numeric From/To values": ${totalErrorsOld}`);
console.log(`  Porcentaje de errores: ${((totalErrorsOld / result.data.length) * 100).toFixed(2)}%`);
console.log(`\nCon validación NUEVA (con SAMPFROM/SAMPTO):`);
console.log(`  Errores "Non-numeric From/To values": ${totalErrorsNew}`);
console.log(`  Porcentaje de errores: ${((totalErrorsNew / result.data.length) * 100).toFixed(2)}%`);
console.log(`\n✓ Errores corregidos: ${totalErrorsOld - totalErrorsNew}`);
