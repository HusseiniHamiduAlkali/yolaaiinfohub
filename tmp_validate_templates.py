import re
from pathlib import Path

def check_file(p):
    text = p.read_text(encoding='utf-8', errors='replace')
    issues = []
    tags = ['h1','h2','h3','h4','h5','h6','div','section','footer','a']
    for tag in tags:
        opens = len(re.findall(rf'<{tag}(\s|>|/)', text, flags=re.IGNORECASE))
        closes = len(re.findall(rf'</{tag}>', text, flags=re.IGNORECASE))
        if opens != closes:
            issues.append(f'{tag}: opens={opens}, closes={closes}')
    # Find obvious broken heading tags
    issues += [f'bad heading at {m.start()}' for m in re.finditer(r'<h[1-6][^>]*>[^<]*<h[1-6]', text, flags=re.IGNORECASE)]
    issues += [f'bad close tag at {m.start()}' for m in re.finditer(r'</(h[1-6])>[^<]*<\1', text, flags=re.IGNORECASE)]
    if issues:
        print('---', p.name)
        for issue in issues:
            print(' ', issue)

if __name__ == '__main__':
    base = Path('templates')
    for p in sorted(base.glob('*.html')):
        check_file(p)
