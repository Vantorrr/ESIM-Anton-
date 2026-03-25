import cv2
import numpy as np
import os

frames_dir = "frames_new"
timestamps = [0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 4.9]

print("Timestamp | Edge Count (Center Region)")

for ts in timestamps:
    filename = os.path.join(frames_dir, f"frame_{ts:05.2f}.jpg")
    img = cv2.imread(filename)
    if img is None:
        continue
        
    h, w, _ = img.shape
    # Center region
    roi = img[400:700, 300:800]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_count = np.count_nonzero(edges)
    
    print(f"{ts:.2f} | {edge_count}")
