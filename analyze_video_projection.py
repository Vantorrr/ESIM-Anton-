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

# Read the last frame to find text lines
cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count - 5)
ret, last_frame = cap.read()
if not ret:
    exit()

gray_last = cv2.cvtColor(last_frame, cv2.COLOR_BGR2GRAY)
edges_last = cv2.Canny(gray_last, 100, 200)

# Horizontal projection (sum of edges along rows)
proj = np.sum(edges_last, axis=1)

# Find peaks (lines of text)
peaks = []
threshold = np.max(proj) * 0.2
in_peak = False
start = 0
for i, val in enumerate(proj):
    if val > threshold and not in_peak:
        in_peak = True
        start = i
    elif val <= threshold and in_peak:
        in_peak = False
        peaks.append((start, i))

print(f"Detected {len(peaks)} lines of content at Y positions: {peaks}")

# Now track the intensity of these regions over time
step = 5
for i in range(0, frame_count, step):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ret, frame = cap.read()
    if not ret:
        break
    
    timestamp = i / fps
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    line_intensities = []
    for (y1, y2) in peaks:
        # Check average intensity or edge density in this strip
        roi = gray[y1:y2, :]
        edges_roi = cv2.Canny(roi, 100, 200)
        density = np.count_nonzero(edges_roi)
        line_intensities.append(density)
        
    print(f"Time: {timestamp:.2f}s | Line Densities: {line_intensities}")

cap.release()
