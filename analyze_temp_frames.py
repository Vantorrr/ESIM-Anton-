import cv2
import numpy as np

def analyze_frame(frame_path, frame_name):
    img = cv2.imread(frame_path)
    if img is None:
        print(f"Error reading {frame_path}")
        return

    height, width, _ = img.shape
    
    # Background color (top-left pixel)
    bg_color = img[0, 0]
    bg_hex = "#{:02x}{:02x}{:02x}".format(bg_color[2], bg_color[1], bg_color[0])
    print(f"[{frame_name}] Background Color: {bg_hex}")

    # Find white pixels (assuming elements are white or light)
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Threshold to find light elements
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"[{frame_name}] Found {len(contours)} contours")
    
    # Sort contours by area (largest first)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for i, cnt in enumerate(contours):
        if i > 5: break # Only show top 5
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter small noise
        if w > 10 and h > 10:
            # Calculate center
            cx = x + w // 2
            cy = y + h // 2
            print(f"  Contour {i}: Pos=({x},{y}), Size=({w}x{h}), Center=({cx},{cy})")

analyze_frame("temp_frames/frame_001.png", "Start (001)")
analyze_frame("temp_frames/frame_025.png", "End (025)")
