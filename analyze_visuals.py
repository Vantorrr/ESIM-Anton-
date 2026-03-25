import cv2
import numpy as np
import os

def analyze_visuals(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    timestamps = [0.0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0]
    
    print(f"Visual Analysis of {video_path}")
    print(f"Resolution: {width}x{height}")

    prev_center = None
    prev_size = None

    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        # 1. Background Color (Top-Left 10x10)
        bg_sample = frame[0:10, 0:10]
        bg_color = np.mean(bg_sample, axis=(0,1))
        bg_hex = '#{:02x}{:02x}{:02x}'.format(int(bg_color[2]), int(bg_color[1]), int(bg_color[0]))

        # 2. Find Objects
        # Convert to HSV for better color segmentation if needed, but simple diff works for now
        diff = cv2.absdiff(frame, np.uint8(bg_color))
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray_diff, 30, 255, cv2.THRESH_BINARY)
        
        # Clean up noise
        kernel = np.ones((5,5), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        print(f"\nTime: {t:.1f}s")
        print(f"  Background: {bg_hex}")

        valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
        
        if not valid_contours:
            print("  No significant objects.")
            continue

        # Sort by area
        valid_contours.sort(key=cv2.contourArea, reverse=True)
        
        # Analyze top 2 objects (in case there are multiple parts)
        for i, cnt in enumerate(valid_contours[:2]):
            area = cv2.contourArea(cnt)
            x, y, w, h = cv2.boundingRect(cnt)
            center = (x + w//2, y + h//2)
            
            # Color of object (center point)
            obj_color = frame[int(center[1]), int(center[0])]
            obj_hex = '#{:02x}{:02x}{:02x}'.format(int(obj_color[2]), int(obj_color[1]), int(obj_color[0]))
            
            # Shape analysis
            perimeter = cv2.arcLength(cnt, True)
            circularity = 4 * np.pi * (area / (perimeter * perimeter)) if perimeter > 0 else 0
            rectangularity = area / (w * h)
            
            shape = "Complex"
            if circularity > 0.8: shape = "Circle"
            elif rectangularity > 0.85: shape = "Rectangle"
            
            print(f"  Object {i+1}: {shape}")
            print(f"    Pos: ({x}, {y}) - Center: {center}")
            print(f"    Size: {w}x{h} (Area: {area:.0f})")
            print(f"    Color: {obj_hex}")
            print(f"    Circularity: {circularity:.2f}, Rectangularity: {rectangularity:.2f}")

            if i == 0:
                if prev_center:
                    dx = center[0] - prev_center[0]
                    dy = center[1] - prev_center[1]
                    print(f"    Movement: ({dx}, {dy})")
                
                if prev_size:
                    dw = w - prev_size[0]
                    dh = h - prev_size[1]
                    print(f"    Size Change: ({dw}, {dh})")

                prev_center = center
                prev_size = (w, h)

    cap.release()

if __name__ == "__main__":
    analyze_visuals("MOJO anim_2.mp4")
