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
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps
    
    print(f"Video Duration: {duration}s, FPS: {fps}")

    timestamps = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 4.9]
    
    for t in timestamps:
        if t > duration:
            break
            
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if ret:
            filename = f"{output_dir}/frame_{t:.1f}s.jpg"
            cv2.imwrite(filename, frame)
            print(f"Saved {filename}")
        else:
            print(f"Failed to extract frame at {t}s")

    cap.release()

if __name__ == "__main__":
    extract_frames("MOJO anim_2.mp4", "detailed_frames")
