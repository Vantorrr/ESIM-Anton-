import cv2
import numpy as np
import json
import os

def analyze_video_specific(video_path, output_json="video_analysis_specific.json"):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Analyzing {video_path}...")
    print(f"Resolution: {width}x{height}, FPS: {fps}, Total Frames: {frame_count}")

    analysis_data = {
        "meta": {
            "width": width,
            "height": height,
            "fps": fps,
            "duration": frame_count / fps
        },
        "frames": []
    }

    # Target timestamps: 0, 1, 2, 3, 4 seconds
    target_times = [0, 1, 2, 3, 4]
    
    for t in target_times:
        frame_idx = int(t * fps)
        if frame_idx >= frame_count:
            print(f"Frame {frame_idx} (time {t}s) is out of bounds.")
            continue
            
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            print(f"Could not read frame at {t}s")
            continue
            
        # Analyze frame
        # 1. Detect Background Color (using corners)
        corners = np.concatenate([
            frame[0:10, 0:10],
            frame[0:10, width-10:width],
            frame[height-10:height, 0:10],
            frame[height-10:height, width-10:width]
        ])
        avg_bg_bgr = np.mean(corners, axis=(0,1))
        bg_color_hex = '#{:02x}{:02x}{:02x}'.format(int(avg_bg_bgr[2]), int(avg_bg_bgr[1]), int(avg_bg_bgr[0]))
        
        # 2. Detect Foreground Elements
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(frame, np.uint8(avg_bg_bgr))
        mask = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(mask, 30, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        elements = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 100: # Filter small noise
                x, y, w, h = cv2.boundingRect(cnt)
                
                # Get average color of the element
                mask_cnt = np.zeros_like(gray)
                cv2.drawContours(mask_cnt, [cnt], -1, 255, -1)
                # Use mean of the original frame where mask is active
                mean_val = cv2.mean(frame, mask=mask_cnt)
                color_hex = '#{:02x}{:02x}{:02x}'.format(int(mean_val[2]), int(mean_val[1]), int(mean_val[0]))
                
                elements.append({
                    "x": int(x),
                    "y": int(y),
                    "w": int(w),
                    "h": int(h),
                    "area": float(area),
                    "color": color_hex,
                    "center_x": float(x + w/2),
                    "center_y": float(y + h/2)
                })
        
        elements.sort(key=lambda e: e['area'], reverse=True)

        frame_data = {
            "timestamp": t,
            "frame_idx": frame_idx,
            "background_color": bg_color_hex,
            "elements": elements
        }
        analysis_data["frames"].append(frame_data)
        print(f"Analyzed frame at {t}s")

    cap.release()
    
    with open(output_json, 'w') as f:
        json.dump(analysis_data, f, indent=2)
    print(f"Analysis saved to {output_json}")

if __name__ == "__main__":
    analyze_video_specific("MOJO anim_2.mp4")
