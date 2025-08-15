from PIL import Image
import math
import os

# --- Your hex colors with # ---
hex_palette = [
    "#7af1d8", "#d23170", "#ff68d5", "#696987", "#7a3a69",
    "#f8e0c7", "#d1afaa", "#0d6576", "#483760", "#c6797a",
    "#f3f3f3", "#c1d9dd", "#726a8a", "#4ba199", "#b8feda"
]

# Convert hex to RGB tuples
palette = [tuple(int(h[1+i:1+i+2], 16) for i in (0, 2, 4)) for h in hex_palette]

def closest_color(c):
    """Return the closest color from the palette to color c (RGB)."""
    r1, g1, b1 = c
    closest = palette[0]
    min_dist = math.inf
    for pr, pg, pb in palette:
        dist = (r1-pr)**2 + (g1-pg)**2 + (b1-pb)**2
        if dist < min_dist:
            min_dist = dist
            closest = (pr, pg, pb)
    return closest

# --- Create output folder if it doesn't exist ---
os.makedirs("output", exist_ok=True)

# --- Process all PNG files in current directory ---
for filename in os.listdir("."):
    if filename.lower().endswith(".png"):
        print(f"Processing {filename}...")
        img = Image.open(filename).convert("RGBA")
        pixels = img.load()
        
        color_map = {}
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                orig = (r, g, b)
                if orig not in color_map:
                    color_map[orig] = closest_color(orig)
                pixels[x, y] = color_map[orig] + (a,)
        
        out_path = os.path.join("output", filename)
        img.save(out_path)
        print(f"Saved cleaned image to {out_path}")

print("All done!")
