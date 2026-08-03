// dentaldb/lib/electronFiles.ts
//
// Small shared helper used wherever a file's bytes cross the Electron IPC
// boundary as base64 (gallery reads, "open local folder" picks, watched-
// folder auto-import) and need to become a real browser File so they can
// be appended to a FormData and pushed through the existing upload API
// exactly like a normal drag-and-drop or <input type=file> upload.

/** Rebuilds a base64 string (as returned by window.electronAPI) into a File. */
export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: mimeType });
}