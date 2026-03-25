import cv2
import os
import shutil

video_path = "/Users/pavelgalante/Antonio/MOJO anim_2.mp4"
output_dir = "frames_v3"

if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error: Could not open video {video_path}")
    exit()

fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = frame_count / fps

print(f"Video FPS: {fps}")
print(f"Duration: {duration:.2f} seconds")

interval = 0.1  # Extract a frame every 0.1 seconds
current_time = 0

while current_time <= duration:
    # Set position in milliseconds
    cap.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)
    ret, frame = cap.read()
    if ret:
        # Save as frame_0.0.jpg, frame_0.1.jpg, etc.
        filename = os.path.join(output_dir, f"frame_{current_time:.1f}.jpg")
        cv2.imwrite(filename, frame)
    else:
        break
    current_time += interval

cap.release()
print("Frame extraction complete.")
