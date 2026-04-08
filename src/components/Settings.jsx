import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { SelectRow, ToggleRow } from './shared'

export default function Settings({ settings, setSettings }) {
  const [ffmpegStatus, setFfmpegStatus] = useState(null)

  const set = (key) => (value) => setSettings(s => ({ ...s, [key]: value }))

  const pickOutputDir = async () => {
    const dir = await open({ directory: true, multiple: false })
    if (dir) set('outputDir')(dir)
  }

  const checkFfmpeg = async () => {
    setFfmpegStatus('checking')
    try {
      const result = await invoke('check_ffmpeg', { ffmpegPath: settings.ffmpegPath })
      setFfmpegStatus(`✓ FFmpeg ${result.version} — ${result.path}`)
    } catch (e) {
      setFfmpegStatus(`✗ Не найден: ${e}`)
    }
  }

  return (
    <div className="content">
      {/* FFmpeg paths */}
      <div className="card">
        <div className="card-header"><span className="card-title">Пути к FFmpeg</span></div>

        <div className="row">
          <div>
            <div className="row-label">Путь к ffmpeg</div>
            <div className="row-hint">Оставьте пустым для автопоиска</div>
          </div>
          <input
            className="ios-input"
            style={{ width: 160, textAlign: 'left' }}
            placeholder="ffmpeg"
            value={settings.ffmpegPath}
            onChange={e => set('ffmpegPath')(e.target.value)}
          />
        </div>

        <div className="row">
          <div>
            <div className="row-label">Путь к ffprobe</div>
          </div>
          <input
            className="ios-input"
            style={{ width: 160, textAlign: 'left' }}
            placeholder="ffprobe"
            value={settings.ffprobePath}
            onChange={e => set('ffprobePath')(e.target.value)}
          />
        </div>

        <div className="row">
          <div className="row-label">Статус</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {ffmpegStatus && (
              <span style={{
                fontSize: 12,
                color: ffmpegStatus.startsWith('✓') ? 'var(--ios-green)' : 'var(--ios-red)'
              }}>
                {ffmpegStatus}
              </span>
            )}
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={checkFfmpeg}>
              Проверить
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="card">
        <div className="card-header"><span className="card-title">Вывод файлов</span></div>

        <div className="row">
          <div className="row-label">Папка по умолчанию</div>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={pickOutputDir}>
            {settings.outputDir ? settings.outputDir.split(/[\\/]/).pop() : 'Рядом с оригиналом'}
          </button>
        </div>

        <SelectRow label="Суффикс имени" value={settings.suffix} onChange={set('suffix')}
          options={[
            { label: '_converted', value: '_converted' },
            { label: '_out', value: '_out' },
            { label: 'Нет суффикса', value: '' },
          ]} />
      </div>

      {/* Interface */}
      <div className="card">
        <div className="card-header"><span className="card-title">Интерфейс</span></div>

        <SelectRow label="Тема" value={settings.theme} onChange={set('theme')}
          options={[
            { label: 'Системная', value: 'system' },
            { label: 'Светлая', value: 'light' },
            { label: 'Тёмная', value: 'dark' },
          ]} />

        <ToggleRow label="Показывать команду FFmpeg" on={settings.showCmd} onChange={set('showCmd')} />
      </div>

      {/* Hardware */}
      <div className="card">
        <div className="card-header"><span className="card-title">Производительность</span></div>

        <SelectRow label="Аппаратное ускорение" value={settings.hwAccel} onChange={set('hwAccel')}
          options={[
            { label: 'Нет (CPU)', value: 'none' },
            { label: 'NVENC (NVIDIA)', value: 'nvenc' },
            { label: 'VideoToolbox (Apple)', value: 'videotoolbox' },
            { label: 'VAAPI (Linux/AMD)', value: 'vaapi' },
            { label: 'AMF (AMD Windows)', value: 'amf' },
          ]} />

        <SelectRow label="Параллельных задач (пакет)" value={String(settings.parallelJobs)}
          onChange={v => set('parallelJobs')(Number(v))}
          options={['1','2','3','4']} />
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header"><span className="card-title">О приложении</span></div>
        <div className="row">
          <div className="row-label">FFStudio</div>
          <span className="badge badge-gray">v0.1.0</span>
        </div>
        <div className="row">
          <div className="row-label">Движок</div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>FFmpeg + Tauri + React</span>
        </div>
        <div className="row">
          <div className="row-label">Разработчик</div>
          <button 
            className="btn btn-primary" 
            style={{ fontSize: 12 }}
            onClick={() => {
              import('@tauri-apps/plugin-shell').then(({ open }) => {
                open('https://www.donationalerts.com/r/haillord1')
              })
            }}
          >
            ☕ Поддержать разработчика
          </button>
        </div>
      </div>
    </div>
  )
}
