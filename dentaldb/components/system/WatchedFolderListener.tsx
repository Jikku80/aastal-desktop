'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, X } from 'lucide-react';
import { useContextPanelStore } from '@/store/contextpanel.store';
import { useAuthStore } from '@/store/auth.store';
import { filesApi } from '@/lib/api';
import { base64ToFile } from '@/lib/electronFiles';

/**
 * Mounted once at the dashboard layout (desktop app only — no-ops on the
 * web build). Subscribes to electron/watched-folder.js's "new image"
 * events and, if a patient is currently open (tracked globally in
 * contextpanel.store so this works no matter which page triggered the
 * selection), shows an "Attach this to [patient]?" prompt. Accepting
 * pushes the image through the exact same upload endpoint
 * (filesApi.upload) the manual upload button in PatientFilesPanel uses —
 * nothing special about how it lands on the patient's Files tab.
 *
 * If no patient is open, the image simply waits in the local gallery
 * (electron/gallery-store.js already copied it in) — the user can pick it
 * up later from any patient's Files tab via "Choose from Gallery".
 */
export default function WatchedFolderListener() {
  const qc = useQueryClient();

  // A ref, not just the hook's return value, so the IPC callback — which is
  // registered once and lives for the app's lifetime — always reads whichever
  // patient is open AT THE MOMENT the photo arrives, not whichever one was
  // open when the listener was first attached.
  const selectedPatientRef = useRef(useContextPanelStore.getState().selectedPatient);

  useEffect(
    () => useContextPanelStore.subscribe((s) => { selectedPatientRef.current = s.selectedPatient; }),
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onNewGalleryImage((item) => {
      // Not signed in — nothing to attach to yet. It's still safely sitting
      // in the gallery (copied in by the main process regardless of auth
      // state) and will be there once the user logs in.
      if (!useAuthStore.getState().isAuthenticated) return;

      const patient = selectedPatientRef.current;

      const attach = async (patientId: string, patientLabel: string, toastId: string) => {
        toast.loading(`Attaching ${item.fileName}…`, { id: toastId });
        try {
          const full = await window.electronAPI!.readGalleryFile(item.id);
          if (!full) throw new Error('Could not read the image');
          const file = base64ToFile(full.data, full.fileName, full.mimeType);
          const fd = new FormData();
          fd.append('file', file);
          fd.append('category', 'image');
          fd.append('description', 'Auto-imported from watched folder');
          await filesApi.upload(patientId, fd);
          await window.electronAPI!.markGalleryItemAttached(item.id, patientId);
          qc.invalidateQueries({ queryKey: ['patient-files', patientId] });
          toast.success(`Attached to ${patientLabel}`, { id: toastId });
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Failed to attach image', { id: toastId });
        }
      };

      if (patient) {
        const patientLabel = `${patient.firstName} ${patient.lastName}`;
        toast.custom(
          (t) => (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl shadow-lg max-w-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', opacity: t.visible ? 1 : 0 }}
            >
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                <ImagePlus size={16} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">New photo detected</p>
                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{item.fileName}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={() => { toast.dismiss(t.id); attach(patient.id, patientLabel, `attach-${item.id}`); }}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Attach to {patient.firstName}
                  </button>
                  <button onClick={() => toast.dismiss(t.id)} className="btn-secondary text-xs py-1.5 px-3">
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ),
          { duration: 15000 },
        );
      } else {
        toast(`New photo added to gallery: ${item.fileName}`, { icon: '🖼️', duration: 4000 });
      }
    });

    return unsubscribe;
  }, [qc]);

  // A gallery item that permanently fails to push to the hosted backend
  // (most commonly: it's over the sync size cap — see gallery-sync.js's
  // MAX_PUSH_SIZE) previously failed the exact same way on every 5-minute
  // retry forever with nothing but a console.error no one ever saw. This
  // surfaces it once per item per session so the reason is actually
  // visible — the photo still stays safely in the local gallery either way.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onGallerySyncFailed) return;
    const unsubscribe = window.electronAPI.onGallerySyncFailed(({ item, reason }) => {
      toast.error(`Couldn't sync "${item.fileName}" to the web: ${reason}`, { duration: 8000 });
    });
    return unsubscribe;
  }, []);

  return null;
}