/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param headers - Optional custom headers mapping (key -> label)
 */
export function exportToCSV(
  data: any[],
  filename: string,
  headers?: Record<string, string>
) {
  if (data.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  // Get keys from first object
  const keys = Object.keys(data[0]);

  // Create header row
  const headerRow = keys
    .map((key) => headers?.[key] || key)
    .map((h) => `"${h}"`)
    .join(",");

  // Create data rows
  const rows = data.map((item) => {
    return keys
      .map((key) => {
        const value = item[key];
        // Handle different types
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return `"${value.toLocaleDateString("pt-BR")}"`;
        }
        return `"${value}"`;
      })
      .join(",");
  });

  // Combine header and rows
  const csv = [headerRow, ...rows].join("\n");

  // Create blob and download
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
