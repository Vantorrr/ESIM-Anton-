import cv2
import numpy as np

def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print("Time(s) | WhitePixels | Bounds (MinX,MaxX, MinY,MaxY) | Center(X,Y) | Width x Height")

    for i in range(frame_count):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            break
            
        time_sec = i / fps
        
        # Detect White Pixels (Blue > 200, Green > 200, Red > 200)
        # Background is Orange (R~220, G~130, B~70)
        # So B > 150 is enough to separate White from Background.
        
        blue_channel = frame[:, :, 0]
        green_channel = frame[:, :, 1]
        red_channel = frame[:, :, 2]
        
        # Strict white mask
        mask = (blue_channel > 200) & (green_channel > 200) & (red_channel > 200)
        
        points = np.argwhere(mask) # [y, x]
        
        if len(points) > 0:
            min_y, min_x = points.min(axis=0)
            max_y, max_x = points.max(axis=0)
            
            width = max_x - min_x
            height = max_y - min_y
            
            center_x = (min_x + max_x) // 2
            center_y = (min_y + max_y) // 2
            
            print(f"{time_sec:.2f} | {len(points):6d} | ({min_x:4d},{max_x:4d}, {min_y:4d},{max_y:4d}) | ({center_x:4d},{center_y:4d}) | {width:4d} x {height:4d}")
        else:
            # Print empty state occasionally
            if i % 5 == 0:
                 print(f"{time_sec:.2f} |      0 | (   -,   -,    -,   -) | (   -,   -) |    0 x    0")

    cap.release()

if __name__ == "__main__":
    analyze_video("MOJO anim_2.mp4")
