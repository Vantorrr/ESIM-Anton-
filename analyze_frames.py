import cv2
import numpy as np
import os

frames_dir = os.path.abspath("frames_v2")
frame_files = ["frame_0.0s.jpg", "frame_1.0s.jpg", "frame_2.0s.jpg", "frame_3.0s.jpg", "frame_4.0s.jpg"]

def get_center_of_mass(mask):
    M = cv2.moments(mask.astype(np.uint8))
    if M["m00"] != 0:
        cX = int(M["m10"] / M["m00"])
        cY = int(M["m01"] / M["m00"])
        return (cX, cY)
    return None

prev_img = None
for i, filename in enumerate(frame_files):
    filepath = os.path.join(frames_dir, filename)
    curr_img = cv2.imread(filepath)
    
    if curr_img is None:
        continue
        
    if prev_img is not None:
        # Compute difference
        diff = cv2.absdiff(curr_img, prev_img)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray_diff, 10, 255, cv2.THRESH_BINARY)
        
        # Calculate center of mass of changes
        cm = get_center_of_mass(thresh)
        
        # Calculate bounding box of changes
        coords = cv2.findNonZero(thresh)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            bbox = (x, y, w, h)
        else:
            bbox = None
            
        print(f"Change {frame_files[i-1]} -> {filename}:")
        if cm:
            print(f"  Center of Change: {cm}")
        if bbox:
            print(f"  Area of Change: {bbox}")
            
    prev_img = curr_img
