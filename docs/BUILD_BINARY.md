# Build Binary Guide

Panduan untuk meng-compile project timetabling menjadi binary standalone menggunakan Bun.

## Prasyarat

- [Bun](https://bun.sh/) terinstall (versi 1.0.0 atau lebih baru)
- File data Excel (`data_uisi.xlsx`) di folder `examples/timetabling/`

## Quick Start

### Build untuk Current Platform

```bash
bun run build:binary
```

Output: `timetable-solver` (binary executable)

### Build untuk Semua Platform

```bash
bun run build:binary:all
```

Output:
- `timetable-solver-linux-x64`
- `timetable-solver-darwin-x64`
- `timetable-solver-darwin-arm64`
- `timetable-solver-windows-x64.exe`

## Build Commands

| Command | Platform | Output File |
|---------|----------|-------------|
| `bun run build:binary` | Current platform | `timetable-solver` |
| `bun run build:binary:all` | All platforms | Multiple files |
| `bun run build:binary:linux` | Linux x64 | `timetable-solver-linux-x64` |
| `bun run build:binary:macos` | macOS Intel | `timetable-solver-darwin-x64` |
| `bun run build:binary:macos-arm` | macOS Apple Silicon | `timetable-solver-darwin-arm64` |
| `bun run build:binary:windows` | Windows x64 | `timetable-solver-windows-x64.exe` |

## Advanced Usage

### Custom Options

```bash
# Custom output filename
bun scripts/build-binary.ts --outfile=my-solver

# Cross-compile dengan target spesifik
bun scripts/build-binary.ts --target=bun-linux-x64 --outfile=solver-linux

# Tanpa minification (lebih cepat build, lebih besar file)
bun scripts/build-binary.ts --no-minify

# Tanpa bytecode (lebih lambat runtime)
bun scripts/build-binary.ts --no-bytecode
```

## Cara Penggunaan Binary

### 1. Pastikan File Data Ada

Binary memerlukan file Excel di folder `examples/timetabling/`:

```
examples/timetabling/
├── timetable-solver          # Binary executable
├── data_uisi.xlsx           # Data input (WAJIB ADA)
└── (output files akan dibuat di sini)
```

**Catatan:** File `data_uisi.xlsx` adalah file data spesifik untuk universitas Anda. Library ini tidak menyertakan file data sample. Anda perlu membuat file Excel dengan format yang sesuai (lihat dokumentasi di `examples/timetabling/README.md`).

### 2. Jalankan Binary

**Linux/macOS:**
```bash
cd examples/timetabling
chmod +x timetable-solver
./timetable-solver
```

**Windows:**
```cmd
cd examples\timetabling
timetable-solver.exe
```

### 3. Output Files

Setelah dijalankan, binary akan menghasilkan:

- `initial-state.json` - State awal (sebelum optimasi)
- `initial-solution.json` - Jadwal awal
- `timetable-result.json` - Hasil optimasi final

## Tips

### Ukuran Binary

Binary hasil compile akan berukuran sekitar **50-100 MB** karena meng-bundle:
- Bun runtime
- Semua dependencies (pdfkit, xlsx, dll)
- Kode aplikasi

### Optimasi Ukuran

Gunakan `--minify` dan `--bytecode` untuk ukuran lebih kecil:

```bash
bun build --compile --minify --bytecode ./examples/timetabling/example-basic.ts --outfile timetable-solver
```

### Cross-Compilation

Bun mendukung cross-compile ke berbagai platform:

- `bun-linux-x64` - Linux 64-bit
- `bun-linux-arm64` - Linux ARM64
- `bun-darwin-x64` - macOS Intel
- `bun-darwin-arm64` - macOS Apple Silicon
- `bun-windows-x64` - Windows 64-bit
- `bun-windows-x64-baseline` - Windows (compatible dengan CPU pre-2013)
- `bun-windows-x64-modern` - Windows (CPU 2013+, lebih cepat)

## Troubleshooting

### Error: "Cannot find module"

Pastikan semua dependencies terinstall:
```bash
bun install
```

### Error: "data_uisi.xlsx not found"

Pastikan file Excel ada di folder `examples/timetabling/` saat menjalankan binary.

### Binary tidak bisa dijalankan (Permission denied)

Berikan permission execute:
```bash
chmod +x timetable-solver
```

### Windows: Binary tidak berjalan

- Pastikan menggunakan versi `bun-windows-x64-baseline` untuk kompatibilitas lebih baik
- Jika tetap tidak berjalan, coba build di Windows machine langsung

## Technical Details

### Apa yang Ter-bundle?

Bun compile akan bundle:
- ✅ Bun runtime
- ✅ Semua JavaScript/TypeScript code
- ✅ Semua npm dependencies
- ❌ File eksternal (Excel, JSON, dll) - harus disediakan saat runtime

### Performance

Binary standalone memiliki:
- **Startup lebih cepat** - Tidak perlu load Node.js/Bun
- **Execution speed sama** - Runtime yang sama dengan `bun run`
- **Ukuran lebih besar** - Tapi self-contained

## Referensi

- [Bun Compile Documentation](https://bun.sh/docs/bundler/executables)
- [Bun Build API](https://bun.sh/docs/api/build)
