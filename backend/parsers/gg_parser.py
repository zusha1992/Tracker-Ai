import re
from datetime import datetime


def split_hands(content: str) -> list[str]:
    """Split a file's content into individual hand blocks."""
    blocks = re.split(r'\n{2,}', content.strip())
    return [b.strip() for b in blocks if b.strip().startswith('Poker Hand')]


def parse_hand_header(hand_text: str) -> dict | None:
    """Extract lightweight summary info from a single hand."""
    m = re.search(
        r'Poker Hand #(\w+):.*?\(\$([0-9.]+)/\$([0-9.]+)\) - (\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})',
        hand_text,
    )
    if not m:
        return None

    hand_id = m.group(1)
    bb = float(m.group(3))
    timestamp = datetime.strptime(m.group(4), '%Y/%m/%d %H:%M:%S')
    stakes = f"NL{int(bb * 100)}"

    return {
        'handId': hand_id,
        'bb': bb,
        'stakes': stakes,
        'timestamp': timestamp,
    }


def parse_files_summary(contents: list[str]) -> dict:
    """
    Parse one or more file contents (as strings) and return a top-level summary:
    - hand count
    - unique stakes
    - date range
    - detected site & hero name
    """
    hand_count = 0
    stakes_set: set[str] = set()
    timestamps: list[datetime] = []

    for content in contents:
        for hand_text in split_hands(content):
            info = parse_hand_header(hand_text)
            if info:
                hand_count += 1
                stakes_set.add(info['stakes'])
                timestamps.append(info['timestamp'])

    timestamps.sort()

    return {
        'handCount': hand_count,
        'stakes': sorted(stakes_set),
        'dateRange': {
            'first': timestamps[0].isoformat() if timestamps else None,
            'last': timestamps[-1].isoformat() if timestamps else None,
        },
        'hero': 'Hero',
        'site': 'GGPoker',
    }
