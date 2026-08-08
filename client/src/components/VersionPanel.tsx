import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import type { Version } from '@/types';

interface Props {
  roomId: string;
  toJSON: () => string;
}

export default function VersionPanel({ roomId, toJSON }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ['versions', roomId],
    queryFn: () => api.get(`/versions/${roomId}`).then((r) => r.data),
    enabled: open && !!roomId,
  });

  const saveVersion = useMutation({
    mutationFn: (label: string) =>
      api.post(`/versions/${roomId}`, { label, canvasData: toJSON() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions', roomId] });
      toast.success('Version saved!');
    },
  });

  const restoreVersion = useMutation({
    mutationFn: (versionId: string) =>
      api.post(`/versions/${roomId}/${versionId}/restore`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Version restored — reload to see changes');
      setOpen(false);
    },
  });

  return (
    <>
      <button
        className="btn-ghost text-sm gap-1"
        onClick={() => setOpen(true)}
        title="Version History"
      >
        📋 History
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold">Version History</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="flex gap-2 p-4 border-b border-gray-100">
              <input
                id="version-label"
                className="input"
                placeholder="Version label (optional)"
              />
              <button
                className="btn-primary whitespace-nowrap"
                onClick={() => {
                  const label = (document.getElementById('version-label') as HTMLInputElement).value;
                  saveVersion.mutate(label || `Manual save`);
                }}
                disabled={saveVersion.isPending}
              >
                Save now
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {versions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No versions yet</p>}
              {versions.map((v) => (
                <div key={v._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-gray-400">
                      v{v.versionNumber} · {v.createdBy?.name} · {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      if (confirm(`Restore to "${v.label}"? Current state will be saved first.`)) {
                        restoreVersion.mutate(v._id);
                      }
                    }}
                    disabled={restoreVersion.isPending}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
