import { useState, useMemo } from 'react'
import {
  useFile, useConvert, saveOutput,
  Chip, SelectRow, ToggleRow, SliderRow,
  ConvertFooter, CmdPreview, FileDropZone,
} from './shared'

const AUDIO_FORMATS = ['MP3', 'AAC', 'FLAC', 'WAV', 'OGG', 'M4A', 'OPUS', 'WMA']
const CODEC_MAP = {
  MP3: 'libmp3lame', AAC: 'aac', FLAC: 'flac',
  WAV: 'pcm_s16le', OGG: 'libvorbis', M4A: 'aac',
  OPUS: 'libopus', WMA: 'wmav2',
}
const SAMPLE_RATES = ['8000', '22050', '44100', '48000', '96000', '192000']
const BITRATES = ['64k','96k','128k','160k','192k','256k','320k','Auto']
const CHANNELS = [
  { label: 'Моно', value: '1' },
  { label: 'Стерео', value: '2' },
  { label: '5.1', value: '6' },
]

export default function AudioTab({ settings }) {
  const { file, pickFile, clearFile } = useFile()
  const { state, progress, speed, fps, error, run, reset } = useConvert()

  const [fmt, setFmt]           = useState('MP3')
  const [bitrate, setBitrate]   = useState('192k')
  const [sampleRate, setSR]     = useState('44100')
  const [channels, setChannels] = useState('2')
  const [normalize, setNormalize] = useState(false)
  const [volume, setVolume]     = useState(100)   // percent
  const [trimSilence, setTrimSilence] = useState(false)
  const [extractOnly, setExtract]     = useState(false) // extract audio from video

  const ffArgs = useMemo(() => {
    const args = []
    const codec = CODEC_MAP[fmt] ?? 'aac'
    args.push('-vn') // no video
    args.push('-acodec', codec)
    if (bitrate !== 'Auto' && !['flac','pcm_s16le'].includes(codec)) {
      args.push('-b:a', bitrate)
    }
    args.push('-ar', sampleRate)
    args.push('-ac', channels)

    const filters = []
    if (normalize) filters.push('loudnorm=I=-14:TP=-1.5:LRA=11')
    if (volume !== 100) filters.push(`volume=${(volume / 100).toFixed(2)}`)
    if (trimSilence) filters.push('silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB')
    if (filters.length) args.push('-af', filters.join(','))

    return args
  }, [fmt, bitrate, sampleRate, channels, normalize, volume, trimSilence])

  const cmd = useMemo(() => {
    if (!file) return 'ffmpeg -i input.mp3 ...'
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
        onPick={() => pickFile([
          { name: 'Аудио', extensions: ['mp3','aac','flac','wav','ogg','m4a','opus','wma'] },
          { name: 'Видео (извлечь звук)', extensions: ['mp4','mkv','avi','mov','webm'] },
        ])}
        onClear={clearFile}
        accept="MP3, AAC, FLAC, WAV, OGG, M4A, OPUS — или видео для извлечения звука"
      />

      {/* Format */}
      <div className="card">
        <div className="card-header"><span className="card-title">Формат вывода</span></div>
        <div className="chip-row">
          {AUDIO_FORMATS.map(f => (
            <Chip key={f} label={f} sel={fmt === f} onClick={() => setFmt(f)} />
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="card">
        <div className="card-header"><span className="card-title">Параметры</span></div>
        <SelectRow label="Битрейт" value={bitrate} onChange={setBitrate} options={BITRATES} />
        <SelectRow label="Частота дискретизации (Hz)" value={sampleRate} onChange={setSR}
          options={SAMPLE_RATES.map(v => ({ label: `${v} Hz`, value: v }))} />
        <SelectRow label="Каналы" value={channels} onChange={setChannels} options={CHANNELS} />
      </div>

      {/* Processing */}
      <div className="card">
        <div className="card-header"><span className="card-title">Обработка</span></div>
        <ToggleRow label="Нормализация громкости" hint="loudnorm -14 LUFS (стандарт стриминга)"
          on={normalize} onChange={setNormalize} />
        <SliderRow label="Громкость" min={0} max={200} step={1} value={volume}
          onChange={setVolume} unit="%" />
        <ToggleRow label="Удалить тишину в начале/конце" on={trimSilence} onChange={setTrimSilence} />
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
