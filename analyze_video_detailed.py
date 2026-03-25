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

print(f"Video Info: {width}x{height}, {fps} FPS")

step = 5
for i in range(0, frame_count, step):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ret, frame = cap.read()
    if not ret:
        break
    
    timestamp = i / fps
    
    # Center crop
    center_x, center_y = width // 2, height // 2
    crop_size = 100
    center_crop = frame[center_y-crop_size:center_y+crop_size, center_x-crop_size:center_x+crop_size]
    avg_center = np.mean(center_crop, axis=(0, 1))
    
    # Corner average
    corners = [
        frame[0, 0], frame[0, width-1],
        frame[height-1, 0], frame[height-1, width-1]
    ]
    avg_bg = np.mean(corners, axis=0)
    
    # Difference
    diff = np.linalg.norm(avg_center - avg_bg)
    
    # Edge detection count (complexity)
    edges = cv2.Canny(frame, 100, 200)
    edge_count = np.count_nonzero(edges)
    
    print(f"Time: {timestamp:.2f}s | Center: {avg_center.astype(int)} | BG: {avg_bg.astype(int)} | Diff: {diff:.1f} | Edges: {edge_count}")

cap.release()
