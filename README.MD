
# 🛫 MSFS Layout Generator

![downloads](https://img.shields.io/npm/d18m/msfs-layout-generator) ![npm](https://img.shields.io/npm/v/msfs-layout-generator) ![types](https://img.shields.io/npm/types/msfs-layout-generator) ![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A tool for **Microsoft Flight Simulator (MSFS)** developers to automatically generate and update `layout.json` files for their add-ons.
  
---  

## ✨ Features

- **Automatic Layout Generation**    
  Scans package directories and creates `layout.json` with file metadata

- **Manifest Integration**    
  Automatically updates `total_package_size` in `manifest.json`
- **Multiple Processing Modes**    
  Process single packages, multiple packages, or batch operations

- **Batch Processing**    
  Interactive Windows batch file with menu system for easy use

- **Flexible CLI**    
  Command-line interface with various options for different workflows

- **TypeScript Support**    
  Fully typed API for programmatic usage

---  

## 📦 Installation & Quick Start

### Windows batch file with menu system (recommended)

1. Download `msfs-layout-generator.bat` from the latest [release](https://github.com/p-sergienko/msfs-layout-generator/releases)
2. Place it in your desired directory
3. Double-click to run
4. Choose options from the interactive menu

### Manual Installation as a Global CLI Tool

```bash  
npm install -g msfs-layout-generator
```    
  
---  

## 💻 API Usage (For Developers)

Use your manager (npm, yarn, bun etc.) to install the package:
```bash  
npm install msfs-layout-generator
```      
Import the generator in your TypeScript / JavaScript projects:
```ts  
import { generateLayout } from 'msfs-layout-generator';  
  
// Process a single package  
await generateLayout("F:\\fs20\\Community\\my-package");  
```  
---  

**Happy Flying! ✈️** 