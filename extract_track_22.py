import json

def extract_track_22(json_path):
    with open(json_path, 'r') as f:
        frames = json.load(f)

    track_22 = []
    prev_obj = None
    
    for frame in frames:
        time = frame['time']
        if time < 0.5: continue
        if time > 1.5: break
        
        candidates = frame['objects']
        candidates.sort(key=lambda x: x['area'], reverse=True)
        
        best_obj = None
        if prev_obj is None:
            for obj in candidates:
                if 0.5 <= time <= 0.7 and obj['w'] > 50 and obj['h'] > 50:
                    best_obj = obj
                    break
        else:
            min_dist = float('inf')
            for obj in candidates:
                dist = ((obj['cx'] - prev_obj['cx'])**2 + (obj['cy'] - prev_obj['cy'])**2)**0.5
                if dist < 200: # Increased threshold
                    if dist < min_dist:
                        min_dist = dist
                        best_obj = obj
        
        if best_obj:
            print(f"Time: {time:.2f}, W: {best_obj['w']}, H: {best_obj['h']}, CX: {best_obj['cx']}, CY: {best_obj['cy']}")
            prev_obj = best_obj
        else:
            print(f"Time: {time:.2f}, No match found")

if __name__ == "__main__":
    extract_track_22("detailed_analysis.json")
