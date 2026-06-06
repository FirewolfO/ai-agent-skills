#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import struct
import subprocess
import tempfile
import zlib


A4_WIDTH = 595.2755905511812
A4_HEIGHT = 841.8897637795277
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif"}


def natural_key(path):
    name = os.path.basename(path)
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def collect_images(inputs):
    images = []
    for item in inputs:
        expanded = os.path.expanduser(item)
        if os.path.isdir(expanded):
            for name in os.listdir(expanded):
                path = os.path.join(expanded, name)
                if os.path.isfile(path) and os.path.splitext(name)[1].lower() in IMAGE_EXTENSIONS:
                    images.append(path)
        elif os.path.isfile(expanded):
            if os.path.splitext(expanded)[1].lower() in IMAGE_EXTENSIONS:
                images.append(expanded)
        else:
            raise FileNotFoundError(item)
    return sorted(images, key=natural_key)


def paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def jpeg_size(path):
    with open(path, "rb") as f:
        data = f.read()
    if not data.startswith(b"\xff\xd8"):
        raise ValueError("not a JPEG")
    pos = 2
    while pos < len(data):
        while pos < len(data) and data[pos] == 0xFF:
            pos += 1
        marker = data[pos]
        pos += 1
        if marker in (0xD8, 0xD9):
            continue
        length = struct.unpack(">H", data[pos : pos + 2])[0]
        if marker in range(0xC0, 0xC4) or marker in range(0xC5, 0xC8) or marker in range(0xC9, 0xCC) or marker in range(0xCD, 0xD0):
            bits, height, width = struct.unpack(">BHH", data[pos + 2 : pos + 7])
            if bits != 8:
                raise ValueError("only 8-bit JPEG is supported")
            return width, height, data
        pos += length
    raise ValueError("JPEG dimensions not found")


def read_png_rgba(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")

    pos = 8
    width = height = bit_depth = color_type = None
    idat = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
                raise ValueError("unsupported PNG variant")
        elif kind == b"IDAT":
            idat.append(chunk)
        elif kind == b"IEND":
            break

    raw = zlib.decompress(b"".join(idat))
    channels = 4 if color_type == 6 else 3
    stride = width * channels
    rows = []
    offset = 0
    prev = bytearray(stride)
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        row = bytearray(raw[offset : offset + stride])
        offset += stride
        for i in range(stride):
            left = row[i - channels] if i >= channels else 0
            up = prev[i]
            upper_left = prev[i - channels] if i >= channels else 0
            if filter_type == 1:
                row[i] = (row[i] + left) & 255
            elif filter_type == 2:
                row[i] = (row[i] + up) & 255
            elif filter_type == 3:
                row[i] = (row[i] + ((left + up) // 2)) & 255
            elif filter_type == 4:
                row[i] = (row[i] + paeth(left, up, upper_left)) & 255
            elif filter_type != 0:
                raise ValueError(f"unsupported PNG filter {filter_type}")
        rows.append(bytes(row))
        prev = row

    rgb = bytearray(width * height * 3)
    alpha = bytearray(width * height)
    ri = ai = 0
    has_alpha = color_type == 6
    for row in rows:
        for x in range(width):
            src = x * channels
            rgb[ri : ri + 3] = row[src : src + 3]
            ri += 3
            if has_alpha:
                alpha[ai] = row[src + 3]
                ai += 1
    return width, height, bytes(rgb), bytes(alpha) if has_alpha and any(a != 255 for a in alpha) else None


def convert_to_png(path, tmpdir):
    sips = shutil.which("sips")
    if not sips:
        raise RuntimeError(f"Cannot convert {path}; macOS sips is not available")
    out = os.path.join(tmpdir, os.path.basename(path) + ".png")
    subprocess.run([sips, "-s", "format", "png", path, "--out", out], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return out


class PdfBuilder:
    def __init__(self):
        self.objects = []

    def add(self, body):
        self.objects.append(body)
        return len(self.objects)

    def stream(self, dictionary, data):
        return self.add(dictionary + f"\n/Length {len(data)}\n>>\nstream\n".encode() + data + b"\nendstream")

    def write(self, path, catalog_id):
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for i, body in enumerate(self.objects, start=1):
            offsets.append(len(out))
            out.extend(f"{i} 0 obj\n".encode())
            out.extend(body)
            out.extend(b"\nendobj\n")
        xref = len(out)
        out.extend(f"xref\n0 {len(self.objects) + 1}\n".encode())
        out.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            out.extend(f"{offset:010d} 00000 n \n".encode())
        out.extend(f"trailer\n<< /Size {len(self.objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
        with open(path, "wb") as f:
            f.write(out)


def add_image_page(pdf, path, tmpdir):
    ext = os.path.splitext(path)[1].lower()
    mask_id = None
    if ext in (".jpg", ".jpeg"):
        width, height, jpeg = jpeg_size(path)
        image_id = pdf.stream(
            f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode".encode(),
            jpeg,
        )
    else:
        png_path = path if ext == ".png" else convert_to_png(path, tmpdir)
        width, height, rgb, alpha = read_png_rgba(png_path)
        if alpha is not None:
            mask_id = pdf.stream(
                f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode".encode(),
                zlib.compress(alpha, 9),
            )
        image_dict = f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode"
        if mask_id is not None:
            image_dict += f" /SMask {mask_id} 0 R"
        image_id = pdf.stream(image_dict.encode(), zlib.compress(rgb, 9))

    scale = min(A4_WIDTH / width, A4_HEIGHT / height)
    draw_width = width * scale
    draw_height = height * scale
    x = (A4_WIDTH - draw_width) / 2
    y = (A4_HEIGHT - draw_height) / 2
    content = f"q\n{draw_width:.4f} 0 0 {draw_height:.4f} {x:.4f} {y:.4f} cm\n/Im0 Do\nQ\n".encode()
    content_id = pdf.stream(b"<<", content)
    return pdf.add(
        (
            f"<< /Type /Page /MediaBox [0 0 {A4_WIDTH:.4f} {A4_HEIGHT:.4f}] "
            f"/Resources << /XObject << /Im0 {image_id} 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()
    )


def build_pdf(image_paths, output_path):
    pdf = PdfBuilder()
    page_ids = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for path in image_paths:
            page_ids.append(add_image_page(pdf, path, tmpdir))
    pages_id = pdf.add((f"<< /Type /Pages /Count {len(page_ids)} /Kids [" + " ".join(f"{pid} 0 R" for pid in page_ids) + "] >>").encode())
    for page_id in page_ids:
        head, tail = pdf.objects[page_id - 1].rsplit(b">>", 1)
        pdf.objects[page_id - 1] = head + f"/Parent {pages_id} 0 R >>".encode() + tail
    catalog_id = pdf.add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode())
    pdf.write(output_path, catalog_id)


def main():
    parser = argparse.ArgumentParser(description="Merge images into one A4 PDF, one image per page, sorted by filename.")
    parser.add_argument("inputs", nargs="+", help="Image files or directories containing images")
    parser.add_argument("-o", "--output", required=True, help="Output PDF path")
    parser.add_argument("--print-order", action="store_true", help="Print the sorted input order")
    args = parser.parse_args()

    images = collect_images(args.inputs)
    if not images:
        raise SystemExit("No supported image files found")
    if args.print_order:
        for image in images:
            print(image)

    build_pdf(images, os.path.expanduser(args.output))
    print(os.path.abspath(os.path.expanduser(args.output)))


if __name__ == "__main__":
    main()
