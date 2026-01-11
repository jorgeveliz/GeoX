import Papa from 'papaparse';
import fs from 'fs';

// Leer el archivo CSV
const csvContent = fs.readFileSync('BD_ANT_HIST_ASSAY.csv', 'utf-8');

console.log('=== PRIMERAS 500 CARACTERES DEL ARCHIVO ===');
console.log(csvContent.substring(0, 500));
console.log('\n');

// Parsear SIN dynamicTyping
console.log('=== PARSEANDO SIN dynamicTyping ===');
const result1 = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
});

console.log('Total de filas:', result1.data.length);
console.log('Campos detectados:', result1.meta.fields);
console.log('\nPrimeras 5 filas:');
result1.data.slice(0, 5).forEach((row, idx) => {
    console.log(`\nFila ${idx + 1}:`);
    console.log('  HOLEID:', row.HOLEID, '(tipo:', typeof row.HOLEID, ')');
    console.log('  SAMPFROM:', row.SAMPFROM, '(tipo:', typeof row.SAMPFROM, ')');
    console.log('  SAMPTO:', row.SAMPTO, '(tipo:', typeof row.SAMPTO, ')');
    console.log('  From:', row.From, '(tipo:', typeof row.From, ')');
    console.log('  To:', row.To, '(tipo:', typeof row.To, ')');
    console.log('  Cu:', row.Cu, '(tipo:', typeof row.Cu, ')');

    // Verificar isNumeric
    const isNumeric = (val) => {
        if (val === null || val === undefined || val === '') return false;
        return !isNaN(Number(val));
    };

    const fromVal = row['From'] || row['from'] || row['FROM'] || row['SAMPFROM'];
    const toVal = row['To'] || row['to'] || row['TO'] || row['SAMPTO'];

    console.log('  fromVal:', fromVal, '-> isNumeric:', isNumeric(fromVal));
    console.log('  toVal:', toVal, '-> isNumeric:', isNumeric(toVal));
    console.log('  Number(fromVal):', Number(fromVal));
    console.log('  Number(toVal):', Number(toVal));
});

// Parsear CON dynamicTyping
console.log('\n\n=== PARSEANDO CON dynamicTyping ===');
const result2 = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
});

console.log('Total de filas:', result2.data.length);
console.log('\nPrimeras 3 filas:');
result2.data.slice(0, 3).forEach((row, idx) => {
    console.log(`\nFila ${idx + 1}:`);
    console.log('  HOLEID:', row.HOLEID, '(tipo:', typeof row.HOLEID, ')');
    console.log('  SAMPFROM:', row.SAMPFROM, '(tipo:', typeof row.SAMPFROM, ')');
    console.log('  SAMPTO:', row.SAMPTO, '(tipo:', typeof row.SAMPTO, ')');
    console.log('  Cu:', row.Cu, '(tipo:', typeof row.Cu, ')');
});
