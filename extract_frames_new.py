import cv2
import os

video_path = "MOJO anim_2.mp4"
output_dir = "frames_new"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = frame_count / fps

print(f"Video FPS: {fps}")
print(f"Duration: {duration} seconds")

interval = 0.1  # Extract a frame every 0.1 seconds
current_time = 0

while current_time < duration:
    cap.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)
    ret, frame = cap.read()
    if ret:
        filename = os.path.join(output_dir, f"frame_{current_time:05.2f}.jpg")
        cv2.imwrite(filename, frame)
        print(f"Saved {filename}")
    current_time += interval

cap.release()
