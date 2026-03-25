import cv2
import numpy as np

def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Video: {video_path}")
    print(f"Duration: {duration:.2f}s, FPS: {fps}, Resolution: {width}x{height}")
    print("-" * 60)

    # Sample every 0.2s
    sample_rate = 0.2
    frame_interval = int(fps * sample_rate)

    for i in range(0, frame_count, frame_interval):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            break
            
        time_sec = i / fps
        
        # Center pixel color
        center_px = frame[height//2, width//2]
        center_hex = '#{:02x}{:02x}{:02x}'.format(center_px[2], center_px[1], center_px[0])

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Use adaptive thresholding to find text/details
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        current_objects = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 50: # Small threshold for text
                x, y, w, h = cv2.boundingRect(cnt)
                
                # Get average color
                mask_roi = np.zeros(gray.shape, np.uint8)
                cv2.drawContours(mask_roi, [cnt], 0, 255, -1)
                mean_val = cv2.mean(frame, mask=mask_roi)
                obj_rgb = (int(mean_val[2]), int(mean_val[1]), int(mean_val[0]))
                obj_hex = '#{:02x}{:02x}{:02x}'.format(*obj_rgb)

                current_objects.append({
                    'x': x, 'y': y, 'w': w, 'h': h, 'area': area,
                    'color': obj_hex
                })
        
        # Sort by area
        current_objects.sort(key=lambda o: o['area'], reverse=True)

        print(f"Time: {time_sec:.2f}s | Center: {center_hex} | Objects: {len(current_objects)}")
        # Print top 5 objects
        for idx, obj in enumerate(current_objects[:5]):
            print(f"  Obj {idx+1}: Pos({obj['x']},{obj['y']}) Size({obj['w']}x{obj['h']}) Color:{obj['color']}")

    cap.release()

if __name__ == "__main__":
    analyze_video("MOJO anim_2.mp4")
