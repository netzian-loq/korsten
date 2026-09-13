"use client";

import type { AttachedDocument } from "./clients";

/**
 * Attached file bytes, in IndexedDB.
 *
 * localStorage would blow its few-megabyte quota on the first scanned PDF, so
 * the blobs live here and the client record keeps only the id and metadata.
 * Everything stays on this device until a storage backend is wired up.
 */

const DB_NAME = "realtor-suite";
const DB_VERSION = 1;
const STORE = "files";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Runs one transaction and closes the connection either way. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Stores the bytes and returns the id to keep on the client record. */
export async function putFile(file: File): Promise<string> {
  const fileId = crypto.randomUUID();
  await withStore("readwrite", (store) => store.put(file, fileId));
  return fileId;
}

export async function getFile(fileId: string): Promise<Blob | null> {
  const value = await withStore<Blob | undefined>("readonly", (store) =>
    store.get(fileId),
  );
  return value ?? null;
}

export async function deleteFile(fileId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(fileId));
}

/** Hands one stored file to the browser as a download. */
export async function downloadDocument(
  document_: AttachedDocument,
): Promise<boolean> {
  const blob = await getFile(document_.fileId);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = document_.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/**
 * Downloads several files back to back.
 *
 * Browsers rate-limit and may prompt on multiple downloads from one gesture,
 * so they are spaced out. Returns how many actually started.
 */
export async function downloadAll(
  documents: AttachedDocument[],
): Promise<number> {
  let started = 0;

  for (const [index, item] of documents.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 400));
    if (await downloadDocument(item)) started += 1;
  }

  return started;
}
