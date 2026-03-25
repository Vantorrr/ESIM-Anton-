import cv2
import numpy as np

def analyze_shape(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    timestamps = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5]
    
    print(f"Analyzing shapes in {video_path}...")
    
    for t in timestamps:
        frame_idx = int(t * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
            
        # Basic preprocessing to isolate the object
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Assume background is the corner color
        bg_color = frame[0,0]
        # Create mask
        diff = cv2.absdiff(frame, np.full_like(frame, bg_color))
        mask = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(mask, 30, 255, cv2.THRESH_BINARY)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Find largest contour
            cnt = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(cnt)
            
            if area > 100:
                perimeter = cv2.arcLength(cnt, True)
                if perimeter == 0: continue
                
                circularity = 4 * np.pi * (area / (perimeter * perimeter))
                x, y, w, h = cv2.boundingRect(cnt)
                rectangularity = area / (w * h)
                
                shape = "Unknown"
                if circularity > 0.8:
                    shape = "Circle"
                elif rectangularity > 0.8:
                    shape = "Rectangle"
                
                print(f"[{t:.1f}s] Area: {area:.0f}, Circ: {circularity:.2f}, Rect: {rectangularity:.2f} -> Likely {shape}")
                print(f"       Pos: ({x},{y}), Size: {w}x{h}")
            else:
                print(f"[{t:.1f}s] No significant object detected.")
        else:
            print(f"[{t:.1f}s] No contours found.")

    cap.release()

if __name__ == "__main__":
    analyze_shape("MOJO anim_2.mp4")
