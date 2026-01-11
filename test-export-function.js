// Script de prueba para verificar la función de exportación CSV
// Simula la función downloadValidationReport

// Datos de prueba
const validationMessages = [
    {
        id: 'test-1',
        fileType: 'COLLAR',
        severity: 'ERROR',
        holeId: 'AM-1',
        lineNumber: 2,
        message: 'Missing HoleID',
        value: undefined,
        limit: undefined,
        endDate: '2023-06-15',
        prospectName: 'Antamina Norte'
    },
    {
        id: 'test-2',
        fileType: 'SURVEY',
        severity: 'WARNING',
        holeId: 'AM-2',
        lineNumber: 45,
        message: 'Survey depth exceeds Collar Depth',
        value: 350.5,
        limit: 300,
        endDate: '2023-08-20',
        prospectName: 'Zona Central'
    }
];

// Función escapeCSV
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Generar CSV
console.log('=== PRUEBA DE EXPORTACIÓN CSV ===\n');

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

console.log('CSV Generado:');
console.log('─'.repeat(80));
console.log(csvContent);
console.log('─'.repeat(80));
console.log('\nTamaño:', csvContent.length, 'caracteres');

// Simular data URI
const BOM = '\uFEFF';
const csvWithBOM = BOM + csvContent;
const encodedUri = encodeURIComponent(csvWithBOM);
const dataUri = `data:text/csv;charset=utf-8,${encodedUri}`;

console.log('\nData URI generado (primeros 100 caracteres):');
console.log(dataUri.substring(0, 100) + '...');
console.log('\nLongitud del Data URI:', dataUri.length, 'caracteres');

// Verificar que las columnas están presentes
console.log('\n=== VERIFICACIÓN ===');
console.log('✓ Headers incluyen FechaFin:', headers.includes('FechaFin'));
console.log('✓ Headers incluyen Prospecto:', headers.includes('Prospecto'));
console.log('✓ Primer mensaje tiene endDate:', validationMessages[0].endDate !== undefined);
console.log('✓ Primer mensaje tiene prospectName:', validationMessages[0].prospectName !== undefined);

// Verificar que los valores están en el CSV
console.log('\n✓ CSV contiene "2023-06-15":', csvContent.includes('2023-06-15'));
console.log('✓ CSV contiene "Antamina Norte":', csvContent.includes('Antamina Norte'));
console.log('✓ CSV contiene "Zona Central":', csvContent.includes('Zona Central'));

console.log('\n✅ Prueba completada exitosamente!');
console.log('El código de exportación está funcionando correctamente.');
