import cv2
import numpy as np

def sample_colors(frame_path):
    img = cv2.imread(frame_path)
    if img is None:
        print(f"Error reading {frame_path}")
        return

    height, width, _ = img.shape
    
    # Sample center
    cx, cy = width // 2, height // 2
    center_color = img[cy, cx]
    center_hex = "#{:02x}{:02x}{:02x}".format(center_color[2], center_color[1], center_color[0])
    
    # Sample top-left
    tl_color = img[0, 0]
    tl_hex = "#{:02x}{:02x}{:02x}".format(tl_color[2], tl_color[1], tl_color[0])
    
    print(f"Frame: {frame_path}")
    print(f"Top-Left: {tl_hex}")
    print(f"Center: {center_hex}")
    
    # Check a grid of points to find where the color changes
    print("Grid Sampling (10x10):")
    grid_w = width // 10
    grid_h = height // 10
    
    row_str = ""
    for y in range(0, height, grid_h):
        for x in range(0, width, grid_w):
            color = img[y, x]
            hex_c = "#{:02x}{:02x}{:02x}".format(color[2], color[1], color[0])
            if hex_c == tl_hex:
                row_str += "." # Background
            else:
                row_str += "X" # Content
        row_str += "\n"
    print(row_str)

sample_colors("temp_frames/frame_001_new.png")
