"""Create all 30 levels of mobile media without modifying source videos.

python3 scripts/prepare-tree-assets.py /path/to/final --ffmpeg /path/to/ffmpeg
For the Android Studio FFmpeg build, set LD_LIBRARY_PATH to its extracted directory.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('--ffmpeg', default='ffmpeg')
parser.add_argument('--ffprobe', default='ffprobe')
parser.add_argument('--encoder', choices=['libopenh264', 'libx264'], default='libopenh264')
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / 'assets/tree-streak'
files = {}
for file in args.source.glob('*.mp4'):
    match = re.search(r'day_(\d+)', file.name, re.I)
    if match:
        day = int(match[1])
        if day in files:
            parser.error(f'Duplicate source for Day {day}')
        files[day] = file
if set(files) != set(range(1, 31)):
    parser.error('Expected exactly one video for each day from 1 to 30')
output.mkdir(parents=True, exist_ok=True)

def run(*arguments):
    subprocess.run([args.ffmpeg, '-v', 'error', *map(str, arguments)], check=True)

for day, source in sorted(files.items()):
    duration = 10 if day == 30 else 4
    run('-ss', duration - .1, '-i', source, '-frames:v', 1, '-vf', 'scale=960:540', '-q:v', 4, '-y', output / f'day-{day:02}.jpg')
    if day == 1:
        run('-ss', .1, '-i', source, '-frames:v', 1, '-vf', 'scale=960:540', '-q:v', 4, '-y', output / 'seed.jpg')
    encoding = ['-c:v', args.encoder, '-b:v', '1600k'] if args.encoder == 'libopenh264' else ['-c:v', 'libx264', '-crf', '25', '-preset', 'fast']
    run('-i', source, '-t', duration, '-vf', 'scale=960:540,fps=30', *encoding, '-an', '-movflags', '+faststart', '-y', output / f'day-{day:02}.mp4')
run('-ss', 8, '-i', files[30], '-t', 2, '-vf', 'scale=960:540,fps=30', '-c:v', args.encoder, '-b:v', '1600k', '-an', '-movflags', '+faststart', '-y', output / 'mature.mp4')
print(f'All videos: {sum(p.stat().st_size for p in output.glob("*.mp4")) / 1048576:.2f} MiB')

manifest = []
for file in sorted(output.glob('*.mp4')):
    metadata = json.loads(subprocess.check_output([args.ffprobe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(file)]))
    video = metadata['streams'][0]
    duration = float(metadata['format']['duration'])
    expected = 2 if file.stem == 'mature' else 10 if file.stem == 'day-30' else 4
    if len(metadata['streams']) != 1 or video['codec_name'] != 'h264' or video['width'] != 960 or video['height'] != 540 or video['r_frame_rate'] != '30/1' or abs(duration - expected) > .05:
        parser.error(f'Unexpected media format for {file.name}')
    manifest.append(dict(file=file.name, bytes=file.stat().st_size, duration=duration, width=960, height=540, codec='h264', fps=30, audio=False))
if len(manifest) != 31 or sum(item['bytes'] for item in manifest) >= 30 * 1048576:
    parser.error('Expected 31 videos totaling less than 30 MiB')
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
