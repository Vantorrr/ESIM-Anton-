import cv2
import os
import numpy as np

def extract_frames(video_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print("Error opening video file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps
    
    print(f"Video Duration: {duration:.2f}s, FPS: {fps}")

    # Extract every 0.05s around the transition
    timestamps = np.arange(0.8, 1.4, 0.05)
    
    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if ret:
            filename = f"{output_dir}/frame_{t:.2f}s.jpg"
            cv2.imwrite(filename, frame)
            print(f"Saved {filename}")
        else:
            print(f"Failed to extract frame at {t:.2f}s")

    cap.release()

if __name__ == "__main__":
    extract_frames("MOJO anim_2.mp4", "frames_detailed")
