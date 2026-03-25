import cv2
import os

def extract_frames(video_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error opening video file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = 5.0 # Extract first 5 seconds
    interval = 0.2 # Extract every 0.2 seconds

    timestamps = [i * interval for i in range(int(duration / interval) + 1)]

    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if not ret:
            break
            
        filename = os.path.join(output_dir, f"frame_{t:.1f}.jpg")
        cv2.imwrite(filename, frame)
        print(f"Extracted {filename}")

    cap.release()

if __name__ == "__main__":
    extract_frames("MOJO anim_2.mp4", "review_frames")
