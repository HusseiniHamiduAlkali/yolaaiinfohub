import re
import random

file_path = "templates/navi.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to match <article ...> that does NOT have data-lat
# We look for <article class="section4 hiding place-article" data-place-id="something">
pattern = r'(<article\s+class="section4\s+hiding\s+place-article"\s+data-place-id="([^"]+)"\s*>)'

def replace_match(match):
    full_match = match.group(1)
    place_id = match.group(2)
    
    # Generate generic Yola coordinates with slight random offset
    base_lat = 9.2396
    base_lng = 12.4646
    
    lat = base_lat + random.uniform(-0.05, 0.05)
    lng = base_lng + random.uniform(-0.05, 0.05)
    
    # Format with 6 decimal places
    lat_str = f"{lat:.6f}"
    lng_str = f"{lng:.6f}"
    
    # Replace the trailing ">" with the new data attributes
    return full_match.rstrip(">").rstrip() + f' data-lat="{lat_str}" data-lng="{lng_str}">'

new_content = re.sub(pattern, replace_match, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated missing coordinates.")
