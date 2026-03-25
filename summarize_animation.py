import json
import math

def analyze_velocity(track):
    velocities = []
    for i in range(1, len(track)):
        dt = track[i]['time'] - track[i-1]['time']
        if dt == 0: continue
        
        dx = (track[i]['cx'] - track[i-1]['cx']) / dt
        dy = (track[i]['cy'] - track[i-1]['cy']) / dt
        dw = (track[i]['w'] - track[i-1]['w']) / dt
        dh = (track[i]['h'] - track[i-1]['h']) / dt
        
        velocities.append({
            'time': track[i]['time'],
            'dx': dx, 'dy': dy, 'dw': dw, 'dh': dh
        })
    return velocities

def detect_easing(velocities, component='dy'):
    vals = [v[component] for v in velocities]
    if not vals: return "None"
    
    # Simple heuristic
    start_v = abs(vals[0])
    mid_v = abs(vals[len(vals)//2])
    end_v = abs(vals[-1])
    
    if max(vals) == 0: return "None"
    
    if start_v < mid_v and end_v < mid_v:
        return "Ease-in-out"
    elif start_v < end_v:
        return "Ease-in"
    elif start_v > end_v:
        return "Ease-out"
    else:
        return "Linear"

def analyze_tracks_detailed(json_path):
    with open(json_path, 'r') as f:
        frames = json.load(f)

    # Reconstruct tracks (same logic as before)
    tracks = {}
    next_track_id = 0
    active_tracks = {}

    for frame in frames:
        time = frame['time']
        current_objects = frame['objects']
        
        matches = []
        for obj in current_objects:
            best_dist = float('inf')
            best_track_id = -1
            for tid, last_obj in active_tracks.items():
                dist = math.sqrt((last_obj['cx'] - obj['cx'])**2 + (last_obj['cy'] - obj['cy'])**2)
                if dist < 50:
                    if dist < best_dist:
                        best_dist = dist
                        best_track_id = tid
            matches.append((best_dist, best_track_id, obj))
        
        matches.sort(key=lambda x: x[0])
        assigned_tracks = set()
        assigned_objects = set()
        
        for dist, tid, obj in matches:
            if tid != -1 and tid not in assigned_tracks and id(obj) not in assigned_objects:
                tracks[tid].append({'time': time, **obj})
                active_tracks[tid] = obj
                assigned_tracks.add(tid)
                assigned_objects.add(id(obj))
            elif tid == -1:
                tracks[next_track_id] = [{'time': time, **obj}]
                active_tracks[next_track_id] = obj
                next_track_id += 1
                assigned_objects.add(id(obj))

        stale_ids = []
        for tid, last_obj in active_tracks.items():
            if time - tracks[tid][-1]['time'] > 0.2:
                stale_ids.append(tid)
        for tid in stale_ids:
            del active_tracks[tid]

    # Analyze significant tracks
    significant_ids = [4, 22, 26, 27, 38] # Based on previous run
    
    for tid in significant_ids:
        if tid not in tracks: continue
        track = tracks[tid]
        velocities = analyze_velocity(track)
        
        print(f"\nTrack {tid} Analysis:")
        
        # Determine dominant motion
        start = track[0]
        end = track[-1]
        dx_total = end['cx'] - start['cx']
        dy_total = end['cy'] - start['cy']
        dw_total = end['w'] - start['w']
        
        motion_axis = 'dy' if abs(dy_total) > abs(dx_total) else 'dx'
        if abs(dw_total) > abs(dx_total) and abs(dw_total) > abs(dy_total):
            motion_axis = 'dw'
            
        easing = detect_easing(velocities, motion_axis)
        print(f"  Dominant Axis: {motion_axis}")
        print(f"  Detected Easing: {easing}")
        
        # Print a few velocity samples
        print("  Velocity samples (time, val):")
        step = max(1, len(velocities)//5)
        for i in range(0, len(velocities), step):
            v = velocities[i]
            print(f"    {v['time']:.2f}s: {v[motion_axis]:.1f}")

if __name__ == "__main__":
    analyze_tracks_detailed("detailed_analysis.json")
