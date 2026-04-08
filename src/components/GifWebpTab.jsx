import { useState, useMemo } from 'react'
import {
  useFile, useConvert, saveOutput,
  Chip, SelectRow, ToggleRow, SliderRow,
  ConvertFooter, CmdPreview, FileDropZone,
} from './shared'

const OUTPUT_FORMATS = ['GIF', 'WebP', 'APNG']
const DITHER_MODES = [
  { label: 'bayer (быстро)', value: 'bayer' },
  { label: 'floyd_steinberg', value: 'floyd_steinberg' },
  { label: 'sierra2_4a', value: 'sierra2_4a' },
  { label: 'Нет', value: 'none' },
]

export default function GifWebpTab({ settings }) {
  const { file, pickFile, loadFileInfo, clearFile } = useFile()
  const { state, progress, speed, fps, error, run, reset } = useConvert()

  const [fmt, setFmt]           = useState('GIF')
  const [gifFps, setGifFps]     = useState(15)
  const [width, setWidth]       = useState(480)
  const [quality, setQuality]   = useState(85)
  const [loop, setLoop]         = useState(true)
  const [pingPong, setPingPong] = useState(false)
  const [dither, setDither]     = useState('bayer')
  const [startTime, setStart]   = useState(0)
  const [duration, setDuration] = useState(0)
  const [optimize, setOptimize] = useState(true)

  const ffArgs = useMemo(() => {
    const args = []
    if (startTime > 0) args.push('-ss', String(startTime))
    if (duration > 0)  args.push('-t', String(duration))

    if (fmt === 'GIF') {
      const scaleFilter = `fps=${gifFps},scale=${width}:-1:flags=lanczos`
      if (pingPong) {
        args.push('-vf',
          `${scaleFilter},split[v1][v2];[v2]reverse[rv];[v1][rv]concat=n=2:v=1,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=${dither}`)
      } else {
        args.push('-vf',
          `${scaleFilter},split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=${dither}`)
      }
      if (loop) args.push('-loop', '0')
      else args.push('-loop', '-1')
    } else if (fmt === 'WebP') {
      const scaleFilter = `fps=${gifFps},scale=${width}:-1:flags=lanczos`
      if (pingPong) {
        args.push('-vf', `${scaleFilter},split[v1][v2];[v2]reverse[rv];[v1][rv]concat=n=2:v=1`)
      } else {
        args.push('-vf', scaleFilter)
      }
      args.push('-vcodec', 'libwebp')
      args.push('-q:v', String(quality))
      args.push('-preset', 'default')
      args.push('-loop', loop ? '0' : '1')
      if (optimize) args.push('-compression_level', '6')
    } else if (fmt === 'APNG') {
      const scaleFilter = `fps=${gifFps},scale=${width}:-1:flags=lanczos`
      if (pingPong) {
        args.push('-vf', `${scaleFilter},split[v1][v2];[v2]reverse[rv];[v1][rv]concat=n=2:v=1`)
      } else {
        args.push('-vf', scaleFilter)
      }
      args.push('-vcodec', 'apng')
      args.push('-plays', loop ? '0' : '1')
    }

    return args
  }, [fmt, gifFps, width, quality, loop, pingPong, dither, startTime, duration, optimize])

  const cmd = useMemo(() => {
    if (!file) return 'ffmpeg -i input.mp4 ...'
    return `ffmpeg -y -i "${file.name}" ${ffArgs.join(' ')} "output.${fmt.toLowerCase()}"`
  }, [file, ffArgs, fmt])

  const handleConvert = async () => {
    if (!file) return
    const ext = fmt.toLowerCase()
    const outPath = await saveOutput(`output.${ext}`, [{ name: fmt, extensions: [ext] }])
    if (!outPath) return
    run(file.path, outPath, ffArgs)
  }

  return (
    <div className="content">
      <FileDropZone
        file={file}
        onPick={() => pickFile([{ name: 'Видео', extensions: ['mp4','mkv','avi','mov','webm','gif'] }])}
        onClear={clearFile}
        onDropPath={loadFileInfo}
        accept="MP4, MKV, MOV, WebM или существующий GIF для перекодирования"
      />

      <div className="card">
        <div className="card-header"><span className="card-title">Формат</span></div>
        <div className="chip-row">
          {OUTPUT_FORMATS.map(f => (
            <Chip key={f} label={f} sel={fmt === f} onClick={() => setFmt(f)} />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Параметры анимации</span></div>
        <SliderRow label="FPS" min={5} max={30} step={1} value={gifFps} onChange={setGifFps} />
        <SliderRow label="Ширина (px)" hint="Высота рассчитывается автоматически"
          min={100} max={1920} step={10} value={width} onChange={setWidth} unit="px" />
        {fmt === 'WebP' && (
          <SliderRow label="Качество" min={1} max={100} step={1} value={quality}
            onChange={setQuality} unit="%" />
        )}
        <ToggleRow label="Зациклить анимацию" on={loop} onChange={setLoop} />
        <ToggleRow label="Ping-pong (вперёд + назад)" hint="Анимация играет вперёд затем в обратную сторону"
          on={pingPong} onChange={setPingPong} />
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Дополнительно</span></div>
        {fmt === 'GIF' && (
          <SelectRow label="Дизеринг (dither)" value={dither} onChange={setDither}
            options={DITHER_MODES} />
        )}
        {fmt === 'WebP' && (
          <ToggleRow label="Оптимизировать (compression 6)" on={optimize} onChange={setOptimize} />
        )}
        <div className="row">
          <div>
            <div className="row-label">Начало (сек)</div>
            <div className="row-hint">0 = с начала</div>
          </div>
          <input type="number" className="ios-input" min={0} value={startTime}
            onChange={e => setStart(Number(e.target.value))} />
        </div>
        <div className="row">
          <div>
            <div className="row-label">Длительность (сек)</div>
            <div className="row-hint">0 = до конца</div>
          </div>
          <input type="number" className="ios-input" min={0} value={duration}
            onChange={e => setDuration(Number(e.target.value))} />
        </div>
      </div>

      <CmdPreview cmd={cmd} />

      <ConvertFooter
        state={state} progress={progress} speed={speed} fps={fps} error={error}
        onConvert={handleConvert} onReset={reset}
        disabled={!file}
      />
    </div>
  )
}