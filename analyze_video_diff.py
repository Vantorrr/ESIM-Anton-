import cv2
import numpy as np

video_path = "MOJO anim_2.mp4"
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error opening video file")
    exit()

fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

ret, prev_frame = cap.read()
prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

step = 2 # Check every 2nd frame for smoother motion tracking
for i in range(1, frame_count, step):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ret, frame = cap.read()
    if not ret:
        break
    
    timestamp = i / fps
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Absolute difference
    diff = cv2.absdiff(prev_gray, gray)
    
    # Threshold to find significant changes
    _, thresh = cv2.threshold(diff, 20, 255, cv2.THRESH_BINARY)
    
    # Find bounding box of changes
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Combine all contours to find the overall area of change
        all_points = np.concatenate(contours)
        x, y, w, h = cv2.boundingRect(all_points)
        center_y = y + h/2
        
        # Only report if change area is significant
        if cv2.contourArea(all_points) > 100:
             print(f"Time: {timestamp:.2f}s | Change BBox: y={y}, h={h}, center_y={center_y:.1f}")
    
    prev_gray = gray

cap.release()
