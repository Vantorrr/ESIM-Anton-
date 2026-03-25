import json
import math

def summarize_analysis(json_path):
    with open(json_path, 'r') as f:
        data = json.load(f)

    frames = data["frames"]
    fps = data["meta"]["fps"]
    width = data["meta"]["width"]
    height = data["meta"]["height"]

    print(f"Video Analysis Summary ({len(frames)} frames)")
    print(f"Resolution: {width}x{height}, FPS: {fps}")

    # Track main object (largest area)
    prev_obj = None
    prev_bg = None
    
    events = []

    for i, frame in enumerate(frames):
        timestamp = frame["timestamp"]
        bg_color = frame["background_color"]
        elements = frame["elements"]

        # Find largest element
        main_obj = None
        if elements:
            main_obj = max(elements, key=lambda x: x["area"])

        # Check for background change
        if prev_bg and bg_color != prev_bg:
            print(f"[{timestamp:.2f}s] Background Color Changed: {prev_bg} -> {bg_color}")
        prev_bg = bg_color

        # Check for object changes
        if main_obj:
            center_x = main_obj["center_x"]
            center_y = main_obj["center_y"]
            w = main_obj["w"]
            h = main_obj["h"]
            color = main_obj["color"]
            
            if prev_obj is None:
                print(f"[{timestamp:.2f}s] Object Appeared: Center({center_x:.0f}, {center_y:.0f}), Size({w}x{h}), Color({color})")
                events.append({"time": timestamp, "type": "appear", "obj": main_obj})
            else:
                # Check for significant movement or size change
                prev_cx = prev_obj["center_x"]
                prev_cy = prev_obj["center_y"]
                prev_w = prev_obj["w"]
                prev_h = prev_obj["h"]
                prev_color = prev_obj["color"]

                dist = math.sqrt((center_x - prev_cx)**2 + (center_y - prev_cy)**2)
                size_change = abs(w - prev_w) + abs(h - prev_h)
                
                if dist > 10 or size_change > 10 or color != prev_color:
                    # Only log every 0.2s or significant events to avoid spam
                    if i % 5 == 0: 
                        print(f"[{timestamp:.2f}s] Object Update: Pos({center_x:.0f}, {center_y:.0f}), Size({w}x{h}), Color({color})")
                        if color != prev_color:
                             print(f"  -> Color Change: {prev_color} -> {color}")
                        if size_change > 50:
                             print(f"  -> Size Change: {prev_w}x{prev_h} -> {w}x{h}")
                        if dist > 50:
                             print(f"  -> Moved: {dist:.0f}px")

            prev_obj = main_obj
        else:
            if prev_obj is not None:
                print(f"[{timestamp:.2f}s] Object Disappeared")
            prev_obj = None

    # Final state
    if frames:
        last_frame = frames[-1]
        print(f"\nFinal State ({last_frame['timestamp']:.2f}s):")
        print(f"  Background: {last_frame['background_color']}")
        if last_frame['elements']:
            obj = max(last_frame['elements'], key=lambda x: x['area'])
            print(f"  Main Object: Pos({obj['center_x']:.0f}, {obj['center_y']:.0f}), Size({obj['w']}x{obj['h']}), Color({obj['color']})")
        else:
            print("  No objects detected.")

if __name__ == "__main__":
    summarize_analysis("video_analysis.json")
