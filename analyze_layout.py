import cv2
import numpy as np

def analyze_frame_layout(frame_path, frame_name):
    img = cv2.imread(frame_path)
    if img is None:
        return

    height, width, _ = img.shape
    print(f"\n--- {frame_name} ({width}x{height}) ---")
    
    # Background color
    bg_color = img[0, 0]
    bg_hex = "#{:02x}{:02x}{:02x}".format(bg_color[2], bg_color[1], bg_color[0])
    print(f"Background: {bg_hex}")

    # Grayscale and threshold
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Group contours that are close to each other to form "elements"
    # This is a simple heuristic
    rects = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 5 and h > 5:
            rects.append((x, y, w, h))
            
    # Sort by Y then X
    rects.sort(key=lambda r: (r[1], r[0]))
    
    for x, y, w, h in rects:
        # Classify element
        center_x = x + w/2
        center_y = y + h/2
        
        # Relative position
        rel_x = center_x / width
        rel_y = center_y / height
        
        print(f"Element at {rel_x:.2f}, {rel_y:.2f} (Size: {w}x{h}) - Pos: {x},{y}")

analyze_frame_layout("temp_frames/frame_002.png", "Start (002)")
analyze_frame_layout("temp_frames/frame_010.png", "Middle")
analyze_frame_layout("temp_frames/frame_025.png", "End")
