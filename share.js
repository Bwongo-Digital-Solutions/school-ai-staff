/* Getting a PDF off the phone and to a parent.

   WhatsApp is the point of this, and WhatsApp cannot be handed a file by a link:
   whatsapp://send?phone= carries text and nothing else. The only way to put a document in
   a parent's chat from here is Android's own share sheet, which means the document has to
   exist as a file on the phone first. So: download to the cache, hand the file to the
   sheet, and let the member of staff pick the chat.

   Because the sheet belongs to the operating system, the app is never told which app was
   chosen or whether anything was sent. Callers must not claim a delivery on the strength
   of shareFile() returning — see how ReportScreen words it. */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ApiError } from './api';

/* Cache rather than documents: these are copies of something the server can rebuild at any
   time, and the OS may clear them whenever it needs the space. */
const directory = () => `${FileSystem.cacheDirectory}reports/`;

async function ensureDirectory() {
  const dir = directory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

/**
 * Downloads a document to the cache and returns its local uri.
 *
 * The PDF routes answer errors as JSON with a normal status code, so a 403 or a 404 arrives
 * as a small file rather than a failed download — the status is checked rather than trusted.
 */
export async function downloadDocument(url, filename) {
  const dir = await ensureDirectory();
  const target = `${dir}${filename}`;

  let result;
  try {
    result = await FileSystem.downloadAsync(url, target);
  } catch {
    throw new ApiError('Cannot reach the server to fetch that document.', 0);
  }

  if (result.status === 403) throw new ApiError('You are not allowed to open that document.', 403);
  if (result.status === 404) throw new ApiError('The server has no such document.', 404);
  if (result.status >= 400) throw new ApiError(`The server refused that document (${result.status}).`, result.status);

  return result.uri;
}

/**
 * Opens the phone's share sheet on a downloaded file. WhatsApp, Gmail and Drive are all
 * one tap away inside it; which one is chosen is the operating system's business, not ours.
 */
export async function shareFile(uri, { title, mimeType = 'application/pdf' } = {}) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('This phone has nothing installed to share a PDF with.', 0);
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: title || 'Share document',
    UTI: 'com.adobe.pdf',
  });
}

/** Download, then share. The two are always wanted together. */
export async function shareDocument(url, filename, { title } = {}) {
  const uri = await downloadDocument(url, filename);
  await shareFile(uri, { title });
  return uri;
}

export default { downloadDocument, shareFile, shareDocument };
