/**
 * File helper utilities
 */

/**
 * Validate file type
 * @param {File} file - File object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {Boolean} - True if valid
 */
export const validateFileType = (file, allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']) => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File object
 * @param {Number} maxSizeMB - Maximum size in MB
 * @returns {Boolean} - True if valid
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {String} filename - Filename for download
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format file size
 * @param {Number} bytes - Size in bytes
 * @returns {String} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
























