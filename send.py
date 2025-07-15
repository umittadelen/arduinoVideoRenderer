import cv2
import numpy as np
import serial
import time
import threading
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import simpleaudio as sa

HEADER = b'\xAA\x55\xAA\x55'  # Unique 4-byte header


# ---------------- DITHERING TYPES ---------------- #

def floyd_steinberg_dither(gray_image):
    img = gray_image.astype(np.float32) / 255.0
    height, width = img.shape
    for y in range(height):
        for x in range(width):
            old_pixel = img[y, x]
            new_pixel = 1.0 if old_pixel >= 0.5 else 0.0
            img[y, x] = new_pixel
            quant_error = old_pixel - new_pixel
            if x + 1 < width:
                img[y, x + 1] = np.clip(img[y, x + 1] + quant_error * 7 / 16, 0, 1)
            if y + 1 < height:
                if x > 0:
                    img[y + 1, x - 1] = np.clip(img[y + 1, x - 1] + quant_error * 3 / 16, 0, 1)
                img[y + 1, x] = np.clip(img[y + 1, x] + quant_error * 5 / 16, 0, 1)
                if x + 1 < width:
                    img[y + 1, x + 1] = np.clip(img[y + 1, x + 1] + quant_error * 1 / 16, 0, 1)
    return (img > 0.5).astype(np.uint8)

def threshold_dither(gray_image):
    return (gray_image > 127).astype(np.uint8)

def bayer_dither(gray_image):
    bayer_matrix = np.array([
        [ 15, 135,  45, 165],
        [195,  75, 225, 105],
        [ 60, 180,  30, 150],
        [240, 120, 210,  90]
    ], dtype=np.uint8)
    h, w = gray_image.shape
    tiled = np.tile(bayer_matrix, (h // 4 + 1, w // 4 + 1))[:h, :w]
    return (gray_image > tiled).astype(np.uint8)

def atkinson_dither(gray_image):
    img = gray_image.astype(np.float32) / 255.0
    height, width = img.shape
    for y in range(height):
        for x in range(width):
            old_pixel = img[y, x]
            new_pixel = 1.0 if old_pixel >= 0.5 else 0.0
            img[y, x] = new_pixel
            quant_error = (old_pixel - new_pixel) / 8.0
            if x + 1 < width: img[y, x + 1] += quant_error
            if x + 2 < width: img[y, x + 2] += quant_error
            if y + 1 < height:
                if x > 0: img[y + 1, x - 1] += quant_error
                img[y + 1, x] += quant_error
                if x + 1 < width: img[y + 1, x + 1] += quant_error
            if y + 2 < height:
                img[y + 2, x] += quant_error
    return (img > 0.5).astype(np.uint8)

def apply_dithering(gray, dither_type="floyd"):
    if dither_type == "floyd":
        return floyd_steinberg_dither(gray)
    elif dither_type == "threshold":
        return threshold_dither(gray)
    elif dither_type == "bayer":
        return bayer_dither(gray)
    elif dither_type == "atkinson":
        return atkinson_dither(gray)
    else:
        print(f"Unknown dither type: {dither_type}, using threshold.")
        return threshold_dither(gray)

# -------------------------------------------------- #

def frame_to_ssd1309_bytes_with_dither(frame, width=128, height=64, dither_type="floyd"):
    frame_h, frame_w = frame.shape[:2]
    scale = min(width / frame_w, height / frame_h)
    new_w, new_h = int(frame_w * scale), int(frame_h * scale)
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    x_offset = (width - new_w) // 2
    y_offset = (height - new_h) // 2
    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

    gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    dithered = apply_dithering(gray, dither_type)

    packed = bytearray()
    for page in range(height // 8):
        for x in range(width):
            byte = 0
            for bit in range(8):
                y = page * 8 + bit
                byte |= (dithered[y, x] << bit)
            packed.append(byte)

    return bytes(packed)

def play_audio_in_thread(audio_file):
    try:
        audio = AudioSegment.from_file(audio_file)
        if len(audio) == 0:
            print("No audio found in file.")
            return
        playback = sa.play_buffer(audio.raw_data,
                                  num_channels=audio.channels,
                                  bytes_per_sample=audio.sample_width,
                                  sample_rate=audio.frame_rate)
        playback.wait_done()
    except CouldntDecodeError:
        print("Could not decode audio — skipping audio playback.")
    except Exception as e:
        print(f"Audio error: {e}")

def stream_video_smart(video_path, serial_port, baudrate=115200,
                       frame_skipping_enabled=True, play_audio=False,
                       dither_type="floyd"):
    ser = serial.Serial(serial_port, baudrate, timeout=1)
    time.sleep(2)  # wait for Arduino to reset

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 15
    frame_interval = 1.0 / fps

    print(f"🎥 Video FPS: {fps:.2f}, Frame Interval: {frame_interval:.3f}s")
    print(f"⚙️ Frame skipping: {'ENABLED' if frame_skipping_enabled else 'DISABLED'}")
    print(f"🎨 Dithering: {dither_type}")
    if play_audio:
        print("🎵 Audio: ENABLED")

    if play_audio:
        threading.Thread(target=play_audio_in_thread, args=(video_path,), daemon=True).start()

    frame_index = 0
    skipped_frames = 0
    start_time = time.time()

    try:
        while cap.isOpened():
            target_time = start_time + frame_index * frame_interval

            ret, frame = cap.read()
            if not ret:
                print("\n🌟 End of video!")
                break

            if frame_skipping_enabled and skipped_frames > 0:
                skipped_frames -= 1
                frame_index += 1
                continue

            frame_bytes = frame_to_ssd1309_bytes_with_dither(frame, dither_type=dither_type)

            ser.write(HEADER)
            ser.write(frame_bytes)

            ack = ser.read()
            if ack != b'\xAC':
                print(f"\n⚠️ Lost sync at frame {frame_index}!")
                break

            now = time.time()
            remaining = target_time - now

            if remaining > 0:
                time.sleep(remaining)
            elif frame_skipping_enabled:
                frames_behind = int(abs(remaining) / frame_interval)
                skipped_frames = max(frames_behind, 0)
                print(f"⏩ Skipping {skipped_frames} frames to catch up", end='\r')
            else:
                print(f"🐢 Running behind by {-remaining:.3f}s", end='\r')

            frame_index += 1

    finally:
        cap.release()
        ser.close()
        print("\n📴 Streaming ended.")

if __name__ == "__main__":
    video_file = "bad.mp4"    # change to your file
    serial_port = "COM3"       # change to your port

    stream_video_smart(
        video_path=video_file,
        serial_port=serial_port,
        frame_skipping_enabled=True,
        play_audio=True,
        dither_type="floyd"    # floyd | threshold | bayer | atkinson
    )
