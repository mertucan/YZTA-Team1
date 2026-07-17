import * as XLSX from "xlsx";

/**
 * Verilen başlıklar ve örnek satırlarla bir .xlsx şablonu oluşturup indirir.
 * @param {string[]} headers - Sütun başlıkları (ör. ["Ad", "Soyad", "TC Kimlik No", "Yaş"])
 * @param {Array<Array>} sampleRows - Örnek veri satırları
 * @param {string} fileName - İndirilecek dosya adı (uzantısız)
 * @param {string} sheetName - Çalışma sayfası adı
 */
export function downloadTemplate(headers, sampleRows, fileName, sheetName = "Sablon") {
  const data = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = headers.map(() => ({ wch: 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Yüklenen Excel/CSV dosyasını okuyup satırları nesne dizisi olarak döndürür.
 * Başlık satırı sütun anahtarı olarak kullanılır.
 * @param {File} file
 * @returns {Promise<Array<Object>>}
 */
export function parseSheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Bir satırdaki bir alanı, olası birden çok başlık adından ilkine göre okur.
 * (ör. "TC Kimlik No", "TC", "TCKN" başlıklarından hangisi varsa)
 */
export function pickField(row, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find(
      (k) => k.trim().toLocaleLowerCase("tr-TR") === alias.trim().toLocaleLowerCase("tr-TR")
    );
    if (key !== undefined) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
  }
  return "";
}
