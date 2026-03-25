import cv2
import os

def extract_frames(video_path, output_dir, interval=0.5):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error opening video file {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps

    print(f"Video Duration: {duration:.2f}s, FPS: {fps}")

    current_time = 0.0
    while current_time <= duration:
        cap.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)
        ret, frame = cap.read()
        if not ret:
            break

        filename = os.path.join(output_dir, f"frame_{current_time:.1f}.jpg")
        cv2.imwrite(filename, frame)
        print(f"Saved {filename}")

        current_time += interval

    cap.release()

if __name__ == "__main__":
    extract_frames("MOJO anim_2.mp4", "analysis_frames", interval=0.2)
