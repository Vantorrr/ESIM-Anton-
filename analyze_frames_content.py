import cv2
import numpy as np
import os

frames_dir = "my_frames"
frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])

print("Frame Analysis (Canny Edges - Detailed):")
print("========================================")

for frame_file in frame_files:
    if frame_file not in ['frame_1.5.jpg', 'frame_2.5.jpg', 'frame_3.5.jpg']:
        continue

    filepath = os.path.join(frames_dir, frame_file)
    frame = cv2.imread(filepath)
    if frame is None:
        continue

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    print(f"\nFrame: {frame_file}")
    
    if contours:
        print(f"  Top 3 Contours:")
        for i, contour in enumerate(contours[:3]):
            area = cv2.contourArea(contour)
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w)/h
            
            M = cv2.moments(contour)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
            else:
                cX, cY = x + w//2, y + h//2
            
            print(f"    Contour {i+1}:")
            print(f"      Area: {area:.0f}")
            print(f"      Box: ({x}, {y}, {w}, {h})")
            print(f"      Center: ({cX}, {cY})")
            print(f"      Aspect Ratio: {aspect_ratio:.2f}")
