import cv2
import numpy as np
import os

def analyze_frame(frame_path):
    img = cv2.imread(frame_path)
    if img is None:
        return None

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Calculate average color
    avg_color = cv2.mean(img)[:3]

    # Threshold to find non-black pixels (higher threshold to ignore dark background)
    _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)
    
    # Find contours to get bounding box
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bbox = None
    center = None
    area = 0
    
    if contours:
        # Get the largest contour
        c = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        bbox = (x, y, w, h)
        
        # Calculate center of mass
        M = cv2.moments(c)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
            center = (cX, cY)
        
        area = cv2.contourArea(c)

    return {
        'color': avg_color,
        'bbox': bbox,
        'center': center,
        'area': area
    }

frames_dir = 'video_analysis_frames'
frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])

print("Frame | Time (s) | Color (B, G, R) | BBox | Center | Area")
print("-" * 80)

for i, frame_file in enumerate(frame_files):
    frame_path = os.path.join(frames_dir, frame_file)
    result = analyze_frame(frame_path)
    
    if result:
        time_sec = (i + 1) * 0.1
        color_str = f"({result['color'][0]:.1f}, {result['color'][1]:.1f}, {result['color'][2]:.1f})"
        bbox_str = str(result['bbox']) if result['bbox'] else "None"
        center_str = str(result['center']) if result['center'] else "None"
        print(f"{i+1:5d} | {time_sec:8.1f} | {color_str:20s} | {bbox_str:20s} | {center_str:15s} | {result['area']:10.1f}")
