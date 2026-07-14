export const downloadCSV = (data, filename = 'relatorio.csv') => {
  if (!data || !data.length) {
    return;
  }

  // Pega as chaves do primeiro objeto para criar o cabeçalho
  const headers = Object.keys(data[0]);

  const csvRows = [];
  // Cabeçalho
  csvRows.push(headers.join(','));

  // Linhas
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM (Excel compatibility)
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
