import cv2
import numpy as np
import os

def analyze_white_pixels(frame_path):
    img = cv2.imread(frame_path)
    if img is None:
        return None
    
    # Convert to HSV to easily detect white
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Define range for white color (low saturation, high value)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 50, 255])
    
    mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Count white pixels
    white_pixel_count = cv2.countNonZero(mask)
    
    # Find bounding box of white pixels
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bbox = None
    if contours:
        # Combine all contours to find the bounding box of all white elements
        all_points = np.vstack([c for c in contours])
        x, y, w, h = cv2.boundingRect(all_points)
        bbox = (x, y, w, h)
        
    return {
        'white_count': white_pixel_count,
        'bbox': bbox
    }

frames_dir = 'video_analysis_frames'
frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])

print("Frame | Time (s) | White Pixels | BBox (x, y, w, h)")
print("-" * 60)

for i, frame_file in enumerate(frame_files):
    frame_path = os.path.join(frames_dir, frame_file)
    result = analyze_white_pixels(frame_path)
    
    if result:
        time_sec = (i + 1) * 0.1
        bbox_str = str(result['bbox']) if result['bbox'] else "None"
        print(f"{i+1:5d} | {time_sec:8.1f} | {result['white_count']:12d} | {bbox_str}")
