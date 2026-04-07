import { useState, useCallback } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { save } from '@tauri-apps/plugin-dialog'
import { formatSize, formatDuration } from './shared'

const STATUS_LABEL = {
  waiting:  { text: 'Ожидание', cls: 'badge-gray' },
  running:  { text: 'В процессе', cls: 'badge-blue' },
  done:     { text: 'Готово', cls: 'badge-green' },
  error:    { text: 'Ошибка', cls: 'badge-red' },
}

let jobCounter = 0
function makeId() { return `batch-${Date.now()}-${jobCounter++}` }

export default function BatchTab({ settings }) {
  const [queue, setQueue] = useState([])
  const [outputDir, setOutputDir] = useState('')
  const [vcodec, setVcodec]       = useState('libx264')
  const [crf, setCrf]             = useState(23)
  const [fmt, setFmt]             = useState('mp4')
  const [running, setRunning]     = useState(false)

  const updateItem = useCallback((id, patch) => {
    setQueue(q => q.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  const addFiles = async () => {
    const paths = await open({
      multiple: true,
      filters: [{ name: 'Видео', extensions: ['mp4','mkv','avi','mov','webm','ts','flv'] }],
    })
    if (!paths) return
    const newItems = (Array.isArray(paths) ? paths : [paths]).map(path => ({
      id: makeId(),
      path,
      name: path.split(/[\\/]/).pop(),
      status: 'waiting',
      progress: 0,
      error: null,
    }))
    setQueue(q => [...q, ...newItems])
  }

  const removeItem = (id) => {
    setQueue(q => q.filter(i => i.id !== id))
  }

  const clearDone = () => {
    setQueue(q => q.filter(i => i.status !== 'done'))
  }

  const runAll = async () => {
    if (!outputDir) {
      alert('Укажите папку вывода')
      return
    }
    setRunning(true)
    const waitingItems = queue.filter(i => i.status === 'waiting')

    // Listen to all progress events
    const unlisten = await listen('ffmpeg-progress', ({ payload }) => {
      const item = queue.find(i => i.id === payload.job_id)
      if (!item) return
      if (payload.done) {
        updateItem(payload.job_id, {
          status: payload.error ? 'error' : 'done',
          progress: payload.error ? item.progress : 100,
          error: payload.error || null,
        })
      } else {
        updateItem(payload.job_id, { progress: payload.percent })
      }
    })

    // Run jobs sequentially (or 2 at a time based on settings)
    for (const item of waitingItems) {
      updateItem(item.id, { status: 'running', progress: 0 })
      const outPath = `${outputDir}/${item.name.replace(/\.[^.]+$/, '')}_converted.${fmt}`
      const args = ['-vcodec', vcodec, '-crf', String(crf), '-acodec', 'aac', '-movflags', '+faststart']
      try {
        await invoke('convert', {
          args: { input: item.path, output: outPath, args, job_id: item.id }
        })
      } catch (e) {
        updateItem(item.id, { status: 'error', error: String(e) })
      }
    }

    unlisten()
    setRunning(false)
  }

  const pickOutputDir = async () => {
    const dir = await open({ directory: true, multiple: false })
    if (dir) setOutputDir(dir)
  }

  const waiting = queue.filter(i => i.status === 'waiting').length
  const done    = queue.filter(i => i.status === 'done').length
  const errors  = queue.filter(i => i.status === 'error').length
  const inprog  = queue.filter(i => i.status === 'running').length

  return (
    <div className="content">
      {/* Stats */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {waiting > 0 && <span className="badge badge-gray">{waiting} ожидает</span>}
          {inprog > 0  && <span className="badge badge-blue">{inprog} в процессе</span>}
          {done > 0    && <span className="badge badge-green">{done} готово</span>}
          {errors > 0  && <span className="badge badge-red">{errors} ошибок</span>}
        </div>
      )}

      {/* Queue */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Очередь ({queue.length} файлов)</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {done > 0 && (
              <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={clearDone}>
                Убрать готовые
              </button>
            )}
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={addFiles}>
              + Добавить
            </button>
          </div>
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Нет файлов. Нажмите «Добавить» или перетащите файлы.
          </div>
        ) : (
          queue.map(item => (
            <QueueRow key={item.id} item={item} onRemove={() => removeItem(item.id)} />
          ))
        )}
      </div>

      {/* Settings */}
      <div className="card">
        <div className="card-header"><span className="card-title">Настройки пакета</span></div>

        <div className="row">
          <div className="row-label">Папка вывода</div>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={pickOutputDir}>
            {outputDir ? outputDir.split(/[\\/]/).pop() : 'Выбрать...'}
          </button>
        </div>

        <div className="row">
          <div className="row-label">Формат вывода</div>
          <select className="ios-select" value={fmt} onChange={e => setFmt(e.target.value)}>
            {['mp4','mkv','webm','avi'].map(f => (
              <option key={f} value={f}>{f.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="row-label">Кодек</div>
          <select className="ios-select" value={vcodec} onChange={e => setVcodec(e.target.value)}>
            <option value="libx264">H.264</option>
            <option value="libx265">H.265</option>
            <option value="copy">Копия (без перекодирования)</option>
          </select>
        </div>

        <div className="row">
          <div><div className="row-label">Качество (CRF)</div><div className="row-hint">Меньше = лучше</div></div>
          <div className="slider-wrap">
            <input type="range" min={0} max={51} step={1} value={crf}
              onChange={e => setCrf(Number(e.target.value))} />
            <span className="slider-val">{crf}</span>
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        className="btn btn-primary"
        onClick={runAll}
        disabled={running || queue.filter(i => i.status === 'waiting').length === 0}
        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
      >
        {running ? '⏳ Конвертация...' : `▶ Запустить (${waiting} файлов)`}
      </button>
    </div>
  )
}

function QueueRow({ item, onRemove }) {
  const { text, cls } = STATUS_LABEL[item.status] ?? STATUS_LABEL.waiting
  return (
    <div className="queue-item">
      <div className="queue-thumb">🎬</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="queue-name">{item.name}</div>
        {item.error
          ? <div className="queue-meta" style={{ color: 'var(--ios-red)' }}>{item.error}</div>
          : <div className="queue-meta">{item.path}</div>
        }
        {item.status === 'running' && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
        )}
        {item.status === 'done' && (
          <div className="progress-bar">
            <div className="progress-fill done" style={{ width: '100%' }} />
          </div>
        )}
      </div>
      <span className={`badge ${cls}`}>{text}</span>
      {item.status !== 'running' && (
        <button className="btn-icon" onClick={onRemove} style={{ fontSize: 13 }}>✕</button>
      )}
    </div>
  )
}
