---
name: image-to-a4-pdf
description: Merge multiple image files into a single PDF in filename order, with each image placed on its own A4 page. Use this skill whenever the user asks to combine images/photos/scans/screenshots into a PDF, make an A4 PDF from a folder of images, convert ordered PNG/JPG/JPEG/WebP/TIFF files to PDF, or says phrases like "图片合并成 PDF", "每张一页", "按文件名顺序", "A4纸", "照片转 PDF". This skill is especially useful when the user provides a directory path and expects the output PDF to be created locally.
---

# Image To A4 PDF

Use this skill to turn a set of local image files into one PDF, sorted by filename, with one image per A4 page.

## Default Behavior

- Resolve the user's path carefully. If they write `~/Download`, also check `~/Downloads` when the first path does not exist.
- Accept either a directory of images or an explicit list of image paths.
- Include common image formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff`, `.bmp`, `.gif`.
- Sort files by natural filename order, so `1.png`, `2.png`, `10.png` sort as 1, 2, 10.
- Create a single PDF with A4 pages: `595.2756 x 841.8898` PDF points.
- Put exactly one image on each page.
- Preserve aspect ratio and center the image on the page.
- Do not crop unless the user explicitly asks for cropping.
- Name the output after the source directory when the user does not specify a filename, for example `shijuan_A4.pdf`.
- Prefer writing the finished PDF next to the input images. If sandbox permissions prevent that, write it in the workspace and then request permission to copy it to the target directory.

## Workflow

1. Inspect the input path and list candidate images.
2. Confirm the final sorted order when there is ambiguity, such as mixed names or more files than the user mentioned.
3. Use the bundled script:

```bash
python3 scripts/images_to_a4_pdf.py --output OUTPUT.pdf INPUT_OR_IMAGE...
```

Examples:

```bash
python3 scripts/images_to_a4_pdf.py --output /path/to/shijuan_A4.pdf /path/to/shijuan
python3 scripts/images_to_a4_pdf.py --output out.pdf /path/to/1.png /path/to/2.png /path/to/3.png
```

4. Verify the result:

```bash
file OUTPUT.pdf
python3 -c "import re; data=open('OUTPUT.pdf','rb').read(); print(len(re.findall(br'/Type /Page(?!s)', data)))"
```

If `pdfinfo` is available, use it for page count and page size too.

5. Report the output path and the number of pages.

## Notes

- The script uses only Python standard library for PNG/JPEG passthrough PDF generation when possible, and falls back to macOS `sips` for formats that need conversion to PNG.
- On macOS, `sips` is usually available at `/usr/bin/sips`.
- If a format cannot be decoded and no converter is available, explain which file blocked the conversion and ask the user whether to install or use another converter.
