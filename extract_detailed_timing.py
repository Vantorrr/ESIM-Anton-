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
    start_time = 0.3
    end_time = 1.2
    interval = 0.05

    timestamps = [start_time + i * interval for i in range(int((end_time - start_time) / interval) + 1)]

    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if not ret:
            break
            
        filename = os.path.join(output_dir, f"detail_{t:.2f}.jpg")
        cv2.imwrite(filename, frame)
        print(f"Extracted {filename}")

    cap.release()

if __name__ == "__main__":
    extract_frames("/Users/pavelgalante/Antonio/MOJO anim_2.mp4", "detailed_timing_frames")
