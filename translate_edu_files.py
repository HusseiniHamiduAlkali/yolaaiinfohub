import os
import re

en_dir = r"c:\Users\user\Desktop\New Folder 2 - Copy\details\Edu\En"
ig_dir = r"c:\Users\user\Desktop\New Folder 2 - Copy\details\Edu\Ig"
pi_dir = r"c:\Users\user\Desktop\New Folder 2 - Copy\details\Edu\Pi"

os.makedirs(ig_dir, exist_ok=True)
os.makedirs(pi_dir, exist_ok=True)

files = [f for f in os.listdir(en_dir) if f.endswith('.html')]

for fname in files:
    with open(os.path.join(en_dir, fname), 'r', encoding='utf-8') as f:
        content = f.read()
    # Igbo modifications
    ig_content = content.replace('<html lang="en">', '<html lang="ig">')
    ig_content = ig_content.replace('Back to Education Info Page', 'Laghachi na Peeji Mmụta')
    # mark translations by prefixing titles/headings
    ig_content = re.sub(r'(<title>)(.*?)(</title>)', r"\1Igbo: \2\3", ig_content)
    ig_content = re.sub(r'(<h1>)(.*?)(</h1>)', r"\1Igbo: \2\3", ig_content)
    # Pidgin modifications
    pi_content = content.replace('<html lang="en">', '<html lang="pi">')
    pi_content = pi_content.replace('Back to Education Info Page', 'Go back to Education Info Page')
    pi_content = re.sub(r'(<title>)(.*?)(</title>)', r"\1Pidgin: \2\3", pi_content)
    pi_content = re.sub(r'(<h1>)(.*?)(</h1>)', r"\1Pidgin: \2\3", pi_content)
    # write files
    with open(os.path.join(ig_dir, fname), 'w', encoding='utf-8') as f:
        f.write(ig_content)
    with open(os.path.join(pi_dir, fname), 'w', encoding='utf-8') as f:
        f.write(pi_content)

print(f"Processed {len(files)} files")
