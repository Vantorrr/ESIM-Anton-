import cv2
import numpy as np
import os

frames_dir = "frames_new"
ts = 1.5
filename = os.path.join(frames_dir, f"frame_{ts:05.2f}.jpg")
img = cv2.imread(filename)

h, w, _ = img.shape
corners = [img[0, 0], img[0, w-1], img[h-1, 0], img[h-1, w-1]]
center = img[h//2, w//2]

print(f"Timestamp: {ts}")
print(f"Top-Left: {corners[0]}")
print(f"Top-Right: {corners[1]}")
print(f"Bottom-Left: {corners[2]}")
print(f"Bottom-Right: {corners[3]}")
y960 = img[960, w//2]
y1500 = img[1500, w//2]
print(f"Y=960: {y960}")
print(f"Y=1500: {y1500}")
