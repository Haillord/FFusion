import { useState } from 'react'
import {
  useConvert, saveOutput,
  Chip, SliderRow, SelectRow, ToggleRow,
  ConvertFooter, CmdPreview, FileDropZone,
} from './shared'
import { invoke } from '@tauri-apps/api/core'

const MERGE_FORMATS = ['MP4', 'MKV', 'MOV', 'TS']

export default function MergeTab({ settings }) {
  const { state, progress, speed, fps, error, run, reset } = useConvert()
  const [files, setFiles] = useState([])
  const [fmt, setFmt] = useState('MP4')
  const [vcodec, setVcodec] = useState('copy')
  const [acodec, setAcodec] = useState('copy')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const pickFiles = async () => {
    const selected = await invoke('dialog_open', {
      multiple: true,
      filters: [{ name: 'Видео файлы', extensions: ['mp4','mkv','avi','mov','webm','ts','flv'] }]
    })
    if (selected) setFiles(prev => [...prev, ...selected])
  }

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    if (newFiles.length === 0) reset()
  }

  const moveFile = (index, dir) => {
    const newFiles = [...files]
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= files.length) return
    [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]]
    setFiles(newFiles)
  }

  const clearAll = () => {
    setFiles([])
    reset()
  }

  const handleMerge = async () => {
    if (files.length < 2) return
    const ext = fmt.toLowerCase()
    const outPath = await saveOutput(`merged.${ext}`, [{ name: fmt, extensions: [ext] }])
    if (!outPath) return

    // Create temp list file
    const listContent = files.map(f => {
      // Правильное экранирование для FFmpeg concat демуксера
      const escapedPath = f.path.replace(/'/g, "'\\''")
      return `file '${escapedPath}'`
    }).join('\n')
    const listPath = await invoke('temp_file', { prefix: 'ffmpeg_merge_', suffix: '.txt' })
    await invoke('fs_write_file', { path: listPath, contents: listContent })

    const args = [
      '-y', '-f', 'concat', '-safe', '0',
      '-i', listPath,
      '-vcodec', vcodec,
      '-acodec', acodec,
    ]

    run(files[0].path, outPath, args)
  }

  const cmd = `ffmpeg -f concat -safe 0 -i list.txt -c copy output.${fmt.toLowerCase()}`

  return (
    <div className="content">
      <FileDropZone
        multiple
        files={files}
        onPick={pickFiles}
        onClear={clearAll}
        accept="Выберите несколько видео файлов"
        onRemove={removeFile}
        onMove={moveFile}
      />

      <div className="card">
        <div className="card-header"><span className="card-title">Формат вывода</span></div>
        <div className="chip-row">
          {MERGE_FORMATS.map(f => (
            <Chip key={f} label={f} sel={fmt === f} onClick={() => setFmt(f)} />
          ))}
        </div>
      </div>

      <div className="card">
        <div 
          className="card-header clickable" 
          onClick={() => setShowAdvanced(prev => !prev)}
          style={{ cursor: 'pointer' }}
        >
          <span className="card-title">⚙️ Дополнительные параметры</span>
          <span style={{ opacity: 0.6 }}>{showAdvanced ? '▲' : '▼'}</span>
        </div>
        
        {showAdvanced && (
          <div style={{ paddingTop: 8 }}>
            <div className="two-col">
              <div>
                <SelectRow label="Режим кодирования" value={vcodec} onChange={setVcodec}
                  options={[
                    { label: '🚀 Быстрая склейка (без перекодирования)', value: 'copy' },
                    { label: '🎥 Перекодировать H.264 (универсальный)', value: 'libx264' },
                    { label: '🎞️ Перекодировать H.265 (маленький размер)', value: 'libx265' },
                  ]} />
              </div>
              <div>
                <SelectRow label="Аудио" value={acodec} onChange={setAcodec}
                  options={[
                    { label: 'Копировать', value: 'copy' },
                    { label: 'AAC', value: 'aac' },
                    { label: 'MP3', value: 'libmp3lame' },
                  ]} />
              </div>
            </div>
          </div>
        )}
      </div>

      <CmdPreview cmd={cmd} />

      <ConvertFooter
        state={state} progress={progress} speed={speed} fps={fps} error={error}
        onConvert={handleMerge} onReset={reset}
        disabled={files.length < 2}
      />
    </div>
  )
}