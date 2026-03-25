import cv2
import numpy as np
import os
import glob

frames_dir = "detailed_frames"
# Sort by timestamp
frame_files = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")), key=lambda x: float(os.path.basename(x).split('_')[1].replace('.jpg', '').replace('s', '')))

print("Time(s) | ASCII Art Representation (60x30)")

for frame_file in frame_files:
    try:
        filename = os.path.basename(frame_file)
        timestamp_str = filename.split('_')[1].replace('.jpg', '').replace('s', '')
        timestamp = float(timestamp_str)
    except ValueError:
        continue

    frame = cv2.imread(frame_file)
    if frame is None:
        continue

    h, w, _ = frame.shape
    
    # Resize for ASCII art
    ascii_w = 60
    ascii_h = 30
    small_frame = cv2.resize(frame, (ascii_w, ascii_h))
    
    # Convert to grayscale
    gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
    
    # Calculate average background color from corners of original frame
    corners = [
        frame[0, 0], frame[0, w-1],
        frame[h-1, 0], frame[h-1, w-1]
    ]
    avg_bg = np.mean(corners, axis=0).astype(int)
    bg_gray = np.mean(cv2.cvtColor(np.array([avg_bg], dtype=np.uint8).reshape(1,1,3), cv2.COLOR_BGR2GRAY))

    # Create ASCII art
    # Characters from dark to light
    chars = ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "]
    
    print(f"\n--- Time: {timestamp:.1f}s ---")
    for y in range(ascii_h):
        line = ""
        for x in range(ascii_w):
            pixel_val = gray[y, x]
            # Simple mapping based on difference from background
            diff = abs(int(pixel_val) - int(bg_gray))
            
            if diff < 20:
                line += " " # Background
            else:
                # Map diff to char index
                # If diff is large (e.g. > 100), use darker char
                # If diff is small but > 20, use lighter char
                # Actually, let's just map pixel intensity directly to char
                idx = int(pixel_val / 255 * (len(chars) - 1))
                line += chars[idx]
        print(line)
