import cv2
import numpy as np
import os
import glob

frames_dir = "detailed_frames"
frame_files = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")), key=os.path.getmtime)

print("Time(s) | Objects (Count) | Details (ID: x,y,w,h,area)")

for frame_file in frame_files:
    try:
        timestamp = float(os.path.basename(frame_file).split('_')[1].replace('.jpg', ''))
    except ValueError:
        continue

    if timestamp < 1.0 or timestamp > 3.0:
        continue

    frame = cv2.imread(frame_file)
    if frame is None:
        continue

    h, w, _ = frame.shape
    
    # Background Color (average of corners)
    corners = [
        frame[0, 0], frame[0, w-1],
        frame[h-1, 0], frame[h-1, w-1]
    ]
    avg_bg = np.mean(corners, axis=0).astype(int)
    
    # Difference from background
    diff = np.abs(frame - avg_bg)
    mask = np.any(diff > 30, axis=2).astype(np.uint8) * 255
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    objects = []
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area > 500: # Filter small noise
            x, y, w_box, h_box = cv2.boundingRect(cnt)
            objects.append({
                'id': i,
                'x': x, 'y': y, 'w': w_box, 'h': h_box, 'area': area,
                'center': (x + w_box//2, y + h_box//2)
            })
            
    objects.sort(key=lambda o: o['area'], reverse=True)
    
    obj_details = " | ".join([f"{o['x']},{o['y']},{o['w']},{o['h']}" for o in objects])
    
    print(f"{timestamp:.1f} | {len(objects)} | {obj_details}")
