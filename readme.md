# Reduse

A simple library to convert image files to a specific format in a project and or fix anywhere they are referenced in your project files : )

## Installation

```bash
npm i -g reduse
```

## Usage

```bash
reduse <path/to/web/project/directory> [-f : format ] [--fixImports]
```

### Converting all images in a directory ♻️

```bash
reduse <path/to/web/project/directory> -f <format> - Converts all images in given directory to specified format and outputs them in same location
```

- Converts all images in given directory to specified format, outputs them to same location. Images of the following formats are accepted and can be converted to another:
  - avif
  - dz
  - fits
  - gif
  - heif
  - input
  - jpeg
  - jpg
  - jp2
  - jxl
  - magick
  - openslide
  - pdf
  - png
  - ppm
  - raw
  - svg
  - tiff
  - tif
  - v
  - webp

### Converting all images in a directory and replacing all references to that image in any files ♻️♻️

```bash
reduse <path/to/web/project/directory> -f <format> --fixImports
```

- Converts all images in given directory to specified format, outputs them to same location, then replaces any references in the following files:
  - .html
  - .css
  - .scss
  - .js
  - .jsx
  - .ts
  - .tsx
