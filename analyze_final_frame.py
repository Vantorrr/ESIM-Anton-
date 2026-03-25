import cv2
import numpy as np

def analyze_final_frame(video_path):
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count - 5) # Get a frame near the end
    ret, frame = cap.read()
    
    if ret:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        print(f"Found {len(contours)} contours in final frame.")
        
        # Filter small contours
        large_contours = [c for c in contours if cv2.contourArea(c) > 100]
        print(f"Found {len(large_contours)} large contours (>100 area).")
        
        for i, c in enumerate(large_contours):
            x, y, w, h = cv2.boundingRect(c)
            print(f"Contour {i}: Pos({x},{y}), Size({w}x{h})")

    cap.release()

if __name__ == "__main__":
    analyze_final_frame("MOJO anim_2.mp4")
