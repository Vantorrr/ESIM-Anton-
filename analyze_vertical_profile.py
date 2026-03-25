import cv2
import numpy as np
import os

frames_dir = "frames_new"
timestamps = [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 2.0, 2.5]

print("Timestamp | Center Pixel (BGR) | Transition Y (approx)")

for ts in timestamps:
    filename = os.path.join(frames_dir, f"frame_{ts:05.2f}.jpg")
    img = cv2.imread(filename)
    if img is None:
        continue
        
    h, w, _ = img.shape
    center_col = img[:, w//2] # Get the center column of pixels
    center_px = img[h//2, w//2]
    
    # Find where color changes significantly
    diffs = np.sum(np.abs(np.diff(center_col, axis=0)), axis=1)
    significant_changes = np.where(diffs > 50)[0]
    
    transition_y = "None"
    if len(significant_changes) > 0:
        max_change_idx = np.argmax(diffs)
        transition_y = max_change_idx
        
    if isinstance(transition_y, (int, np.int64)):
        top_color = center_col[transition_y - 10] if transition_y > 10 else center_col[0]
        bottom_color = center_col[transition_y + 10] if transition_y < h-10 else center_col[h-1]
        print(f"{ts:.2f} | Center: {center_px} | Trans Y: {transition_y} | Top: {top_color} | Bottom: {bottom_color}")
    else:
        print(f"{ts:.2f} | Center: {center_px} | Trans Y: None")
