import cv2
import numpy as np
from collections import Counter

def get_dominant_color(image, k=3):
    pixels = np.float32(image.reshape(-1, 3))
    n_colors = len(pixels)
    if n_colors < k:
        return None
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    centers = np.uint8(centers)
    counts = Counter(labels.flatten())
    dominant = centers[counts.most_common(1)[0][0]]
    return dominant

def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print("Error opening video file")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Video: {video_path}")
    print(f"Resolution: {width}x{height}")
    print(f"FPS: {fps}")

    timestamps = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5]

    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        
        if not ret:
            break

        print(f"\nTimestamp: {t:.1f}s")
        
        # 1. Background Color (average of corners)
        corners = [
            frame[0:50, 0:50],
            frame[0:50, width-50:width],
            frame[height-50:height, 0:50],
            frame[height-50:height, width-50:width]
        ]
        avg_bg = np.mean([np.mean(c, axis=(0,1)) for c in corners], axis=0)
        bg_hex = '#{:02x}{:02x}{:02x}'.format(int(avg_bg[2]), int(avg_bg[1]), int(avg_bg[0]))
        print(f"  Background Color: {bg_hex}")

        # 2. Center Color
        center_region = frame[height//2-50:height//2+50, width//2-50:width//2+50]
        center_dom = get_dominant_color(center_region)
        if center_dom is not None:
            center_hex = '#{:02x}{:02x}{:02x}'.format(center_dom[2], center_dom[1], center_dom[0])
            print(f"  Center Dominant Color: {center_hex}")

        # 3. Detect Objects (Contours)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        objects = []
        for cnt in contours:
            if cv2.contourArea(cnt) > 500: # Filter small noise
                x, y, w, h = cv2.boundingRect(cnt)
                # Get color of object center
                mask = np.zeros(gray.shape, np.uint8)
                cv2.drawContours(mask, [cnt], 0, 255, -1)
                mean_val = cv2.mean(frame, mask=mask)
                color_hex = '#{:02x}{:02x}{:02x}'.format(int(mean_val[2]), int(mean_val[1]), int(mean_val[0]))
                objects.append({'rect': (x, y, w, h), 'color': color_hex})
        
        objects.sort(key=lambda o: o['rect'][1]) # Sort by Y position (top to bottom)
        
        if objects:
            print(f"  Detected {len(objects)} significant objects:")
            for i, obj in enumerate(objects):
                x, y, w, h = obj['rect']
                print(f"    Object {i+1}: Pos({x}, {y}), Size({w}x{h}), Color: {obj['color']}")
        else:
            print("  No significant objects detected.")

    cap.release()

if __name__ == "__main__":
    analyze_video("MOJO anim_2.mp4")
