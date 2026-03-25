import cv2
import numpy as np
import os
import glob

frames_dir = "frames_new"
frame_files = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))

print("Timestamp | Background Color | Object Count | Object Details (Center X, Center Y, Width, Height)")

for frame_file in frame_files:
    # Extract timestamp from filename
    filename = os.path.basename(frame_file)
    timestamp_str = filename.replace("frame_", "").replace(".jpg", "")
    timestamp = float(timestamp_str)

    img = cv2.imread(frame_file)
    if img is None:
        continue

    h, w, _ = img.shape

    # 1. Background Color (median of corners)
    corners = np.array([
        img[0, 0], img[0, w-1],
        img[h-1, 0], img[h-1, w-1]
    ])
    bg_color = np.median(corners, axis=0).astype(int)
    bg_color_hex = "#{:02x}{:02x}{:02x}".format(bg_color[2], bg_color[1], bg_color[0])

    # 2. Object Detection (Contours)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Simple thresholding to find objects different from background
    # We use the background color intensity as a reference
    bg_intensity = np.mean(bg_color)
    
    # Adaptive threshold or simple difference
    # Calculate difference from background color
    diff = np.abs(img - bg_color)
    mask = np.any(diff > 30, axis=2).astype(np.uint8) * 255
    
    # Morphological operations to clean up noise
    kernel = np.ones((5,5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    objects = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 500: # Filter small noise
            x, y, w_obj, h_obj = cv2.boundingRect(cnt)
            cx = x + w_obj // 2
            cy = y + h_obj // 2
            objects.append(f"({cx},{cy},{w_obj},{h_obj})")

    print(f"{timestamp:.2f} | {bg_color_hex} | {len(objects)} | {', '.join(objects)}")
