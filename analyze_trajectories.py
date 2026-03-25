import json

def analyze_trajectories(json_path):
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    frames = data['frames']
    
    print("Timestamp, Line_W, Shape1_Y, Shape1_H, Shape2_Y, Shape2_H")
    
    for frame in frames:
        t = frame['timestamp']
        elements = frame['elements']
        
        # Find Line (y ~ 1517)
        line = next((e for e in elements if 1510 < e['y'] < 1530 and e['h'] < 20), None)
        line_w = line['w'] if line else 0
        
        # Find Shape 1 (Rising, y ~ 1000-1450)
        shape1 = next((e for e in elements if e['area'] > 1000 and 1000 < e['y'] < 1450), None)
        shape1_y = shape1['y'] if shape1 else 0
        shape1_h = shape1['h'] if shape1 else 0

        # Find Shape 2 (Main Logo, y < 1000)
        shape2 = next((e for e in elements if e['area'] > 5000 and e['y'] < 1000), None)
        shape2_y = shape2['y'] if shape2 else 0
        shape2_h = shape2['h'] if shape2 else 0
        
        if line_w > 0 or shape1_y > 0 or shape2_y > 0:
            print(f"{t:.2f}, {line_w}, {shape1_y}, {shape1_h}, {shape2_y}, {shape2_h}")

if __name__ == "__main__":
    analyze_trajectories("video_analysis.json")
