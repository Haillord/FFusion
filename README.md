# FFStudio — FFmpeg GUI

## Описание
FFStudio — это графический интерфейс для FFmpeg, написанный на React + Tauri (Rust).

## Требования
- Node.js 16+
- Rust 1.70+
- FFmpeg (должен быть установлен в системе)

## Установка

1. **Установка зависимостей Node.js:**
```bash
npm install
```

2. **Установка зависимостей Rust:**
```bash
cd src-tauri
cargo build
```

3. **Установка FFmpeg:**
Убедитесь, что FFmpeg установлен в вашей системе и доступен в PATH.

## Запуск

### Режим разработки
```bash
npm run dev
```

### Сборка
```bash
npm run build
```

### Запуск Tauri
```bash
npm run tauri
```

## Структура проекта
```
ff-studio/
├── src/                    # React код
│   ├── components/         # React компоненты
│   ├── App.jsx            # Основной компонент
│   └── index.css          # Стили
├── src-tauri/             # Rust код
│   ├── src/main.rs        # Точка входа Tauri
│   ├── Cargo.toml         # Зависимости Rust
│   └── tauri.conf.json    # Конфигурация Tauri
├── ff/                    # FFmpeg файлы
├── dist/                  # Сборка Vite
└── package.json           # Зависимости Node.js
```

## Использование
Приложение предоставляет графический интерфейс для работы с FFmpeg, включая:
- Конвертацию видео
- Извлечение аудио
- Обрезку видео
- Изменение размера
- И многое другое

## Лицензия
MIT