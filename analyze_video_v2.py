import cv2
import numpy as np

def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps

    print(f"Video Duration: {duration:.2f}s, FPS: {fps}")
    print("Time(s) | TL | TR | BL | BR | Center | Diff(Max-Min Corner)")

    # Sample every 0.1s
    sample_rate = 0.1
    frame_interval = int(fps * sample_rate)

    for i in range(0, frame_count, frame_interval):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            break
            
        time_sec = i / fps
        h, w, _ = frame.shape

        # Get colors at 5 points
        # OpenCV uses BGR, convert to RGB
        def get_color(y, x):
            b, g, r = frame[y, x]
            return (int(r), int(g), int(b))

        tl = get_color(0, 0)
        tr = get_color(0, w-1)
        bl = get_color(h-1, 0)
        br = get_color(h-1, w-1)
        center = get_color(h//2, w//2)

        # Calculate max difference between corners to detect gradient
        corners = [tl, tr, bl, br]
        max_diff = 0
        for c1 in corners:
            for c2 in corners:
                diff = sum(abs(c1[k] - c2[k]) for k in range(3))
                if diff > max_diff:
                    max_diff = diff

        print(f"{time_sec:.2f} | {tl} | {tr} | {bl} | {br} | {center} | {max_diff}")

    cap.release()

if __name__ == "__main__":
    analyze_video("MOJO anim_2.mp4")
