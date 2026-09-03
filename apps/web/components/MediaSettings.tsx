"use client";

import { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { DesktopSource, getDesktopSources } from "@/hooks/screenShareRepository";

type Device = MediaDeviceInfo;

export function MediaSettings({
  audioInputId,
  videoInputId,
  onChange,
  onClose,
}: {
  audioInputId: string;
  videoInputId: string;
  onChange: (devices: { audioInputId: string; videoInputId: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [audio, setAudio] = useState(audioInputId);
  const [video, setVideo] = useState(videoInputId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices).catch((error) => {
      console.error("Não foi possível listar os dispositivos de mídia", error);
    });
  }, []);

  const audioDevices = devices.filter((device) => device.kind === "audioinput");
  const videoDevices = devices.filter((device) => device.kind === "videoinput");

  async function save() {
    setSaving(true);
    try {
      await onChange({ audioInputId: audio, videoInputId: video });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-ink-900">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings size={19} /> Configurações de mídia</h2>
          <button onClick={onClose} aria-label="Fechar configurações"><X size={19} /></button>
        </div>
        <label className="block space-y-1 text-sm">
          <span>Microfone</span>
          <select className="w-full rounded-lg border border-ink-200 bg-transparent p-2 dark:border-ink-700" value={audio} onChange={(event) => setAudio(event.target.value)}>
            {audioDevices.length === 0 && <option value="">Microfone padrão</option>}
            {audioDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microfone sem nome"}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Câmera</span>
          <select className="w-full rounded-lg border border-ink-200 bg-transparent p-2 dark:border-ink-700" value={video} onChange={(event) => setVideo(event.target.value)}>
            {videoDevices.length === 0 && <option value="">Câmera padrão</option>}
            {videoDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Câmera sem nome"}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-ink-500">Cancelar</button>
          <button disabled={saving} onClick={save} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Aplicando..." : "Aplicar"}</button>
        </div>
      </div>
    </div>
  );
}

export function DesktopSourcePicker({
  onSelect,
  onClose,
}: {
  onSelect: (source: DesktopSource) => void;
  onClose: () => void;
}) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  useEffect(() => {
    getDesktopSources().then(setSources).catch((error) => console.error("Não foi possível listar as telas", error));
  }, []);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-ink-900">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Escolha o que compartilhar</h2><button onClick={onClose} aria-label="Fechar"><X size={19} /></button></div>
        {sources.length === 0 ? <p className="text-sm text-ink-500">Nenhuma tela ou janela disponível.</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sources.map((source) => <button key={source.id} onClick={() => onSelect(source)} className="overflow-hidden rounded-lg border border-ink-200 text-left hover:border-primary-500 dark:border-ink-700">
            {source.thumbnail && <img src={source.thumbnail} alt="" className="aspect-video w-full object-cover" />}
            <span className="block truncate p-2 text-sm">{source.name}</span>
          </button>)}
        </div>}
      </div>
    </div>
  );
}
