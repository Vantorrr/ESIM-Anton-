import cv2
import numpy as np
from sklearn.cluster import KMeans
import os

def get_dominant_colors(img, k=3):
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pixels = img.reshape((-1, 3))
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    kmeans.fit(pixels)
    colors = kmeans.cluster_centers_.astype(int)
    return colors

def analyze_frame_detail(frame_path):
    img = cv2.imread(frame_path)
    if img is None:
        return None
    
    # Get dominant colors
    colors = get_dominant_colors(img)
    
    # Edge detection
    edges = cv2.Canny(img, 100, 200)
    edge_count = np.count_nonzero(edges)
    
    return {
        'colors': colors,
        'edge_count': edge_count
    }

frames_to_analyze = [1, 10, 20, 25, 30, 40, 50]
frames_dir = 'video_analysis_frames'

print("Frame | Time (s) | Edge Count | Dominant Colors (RGB)")
print("-" * 80)

for i in frames_to_analyze:
    frame_file = f"frame_{i:04d}.jpg"
    frame_path = os.path.join(frames_dir, frame_file)
    result = analyze_frame_detail(frame_path)
    
    if result:
        time_sec = i * 0.1
        colors_str = ", ".join([str(c) for c in result['colors']])
        print(f"{i:5d} | {time_sec:8.1f} | {result['edge_count']:10d} | {colors_str}")
