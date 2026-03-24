import re
import random
from datetime import datetime

try:
    from treys import Card, Evaluator, Deck
    _TREYS_AVAILABLE = True
except ImportError:
    _TREYS_AVAILABLE = False


def _calculate_equity(hero_cards: list[str], villain_cards: list[str], board: list[str]) -> float:
    """Hero's equity (0.0–1.0) at the moment of all-in via Monte Carlo."""
    if not _TREYS_AVAILABLE:
        return 0.5
    try:
        evaluator = Evaluator()
        hero    = [Card.new(c) for c in hero_cards]
        villain = [Card.new(c) for c in villain_cards]
        board_c = [Card.new(c) for c in board]
    except Exception:
        return 0.5

    cards_needed = 5 - len(board_c)

    if cards_needed == 0:
        # River — deterministic
        try:
            hs = evaluator.evaluate(board_c, hero)
            vs = evaluator.evaluate(board_c, villain)
            return 1.0 if hs < vs else (0.5 if hs == vs else 0.0)
        except Exception:
            return 0.5

    dealt   = set(hero + villain + board_c)
    remaining = [c for c in Deck.GetFullDeck() if c not in dealt]

    wins  = 0.0
    N     = 600
    for _ in range(N):
        extra = random.sample(remaining, cards_needed)
        full_board = board_c + extra
        try:
            hs = evaluator.evaluate(full_board, hero)
            vs = evaluator.evaluate(full_board, villain)
            if   hs < vs: wins += 1.0
            elif hs == vs: wins += 0.5
        except Exception:
            wins += 0.5

    return wins / N


def _allin_street(hand_text: str) -> str | None:
    """Return the street name where the first all-in occurred, or None."""
    sections = [
        ('preflop', r'\*\*\* HOLE CARDS \*\*\*(.*?)(?=\*\*\* (?:FLOP|SHOW DOWN|SUMMARY))'),
        ('flop',    r'\*\*\* FLOP \*\*\*[^\n]*\n(.*?)(?=\*\*\* (?:TURN|SHOW DOWN|SUMMARY))'),
        ('turn',    r'\*\*\* TURN \*\*\*[^\n]*\n(.*?)(?=\*\*\* (?:RIVER|SHOW DOWN|SUMMARY))'),
        ('river',   r'\*\*\* RIVER \*\*\*[^\n]*\n(.*?)(?=\*\*\* (?:SHOW DOWN|SUMMARY))'),
    ]
    for street, pat in sections:
        m = re.search(pat, hand_text, re.DOTALL)
        if m and re.search(r'and is all-in', m.group(1), re.IGNORECASE):
            return street
    return None


# ── helpers ──────────────────────────────────────────────────────────────────

def split_hands(content: str) -> list[str]:
    """Split a file's content into individual hand blocks."""
    blocks = re.split(r'\n{2,}', content.strip())
    return [b.strip() for b in blocks if b.strip().startswith('Poker Hand')]


# ── summary (Phase 3) ─────────────────────────────────────────────────────────

def parse_hand_header(hand_text: str) -> dict | None:
    m = re.search(
        r'Poker Hand #(\w+):.*?\(\$([0-9.]+)/\$([0-9.]+)\) - (\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})',
        hand_text,
    )
    if not m:
        return None
    bb = float(m.group(3))
    return {
        'handId': m.group(1),
        'bb': bb,
        'stakes': f"NL{int(bb * 100)}",
        'timestamp': datetime.strptime(m.group(4), '%Y/%m/%d %H:%M:%S'),
    }


def parse_files_summary(contents: list[str]) -> dict:
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


# ── full parse (Phase 4) ──────────────────────────────────────────────────────

_POSITION_MAPS = {
    2: ['BTN', 'BB'],
    3: ['BTN', 'SB', 'BB'],
    4: ['BTN', 'SB', 'BB', 'UTG'],
    5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
    6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
}


def _get_position(seat_nums: list[int], button_seat: int, hero_seat: int) -> str:
    n = len(seat_nums)
    pos_names = _POSITION_MAPS.get(n, ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'])
    if button_seat not in seat_nums:
        return 'BTN'
    btn_idx = seat_nums.index(button_seat)
    hero_idx = seat_nums.index(hero_seat)
    offset = (hero_idx - btn_idx) % n
    return pos_names[offset] if offset < len(pos_names) else '?'


def _parse_net(hand_text: str, bb: float) -> tuple[float, float, float]:
    """Return (net_dollars, net_bb, hero_invested) for Hero."""
    hero_invested = 0.0
    hero_street_invested = 0.0  # resets each street

    for line in hand_text.split('\n'):
        line = line.strip()

        # Street boundaries — reset per-street tracker (NOT at HOLE CARDS — blinds carry over into preflop)
        if re.match(r'\*\*\* (FLOP|TURN|RIVER) \*\*\*', line):
            hero_street_invested = 0.0
            continue

        if re.match(r'\*\*\* (SHOW DOWN|SUMMARY) \*\*\*', line):
            break

        # Blind posts (before HOLE CARDS but counted)
        m = re.match(r'Hero: posts (?:small|big) blind \$([0-9.]+)', line)
        if m:
            amt = float(m.group(1))
            hero_invested += amt
            hero_street_invested += amt
            continue

        # Call
        m = re.match(r'Hero: calls \$([0-9.]+)', line)
        if m:
            amt = float(m.group(1))
            hero_invested += amt
            hero_street_invested += amt
            continue

        # Bet
        m = re.match(r'Hero: bets \$([0-9.]+)', line)
        if m:
            amt = float(m.group(1))
            hero_invested += amt
            hero_street_invested += amt
            continue

        # Raise — $Y is hero's total this street
        m = re.match(r'Hero: raises \$[0-9.]+ to \$([0-9.]+)', line)
        if m:
            y = float(m.group(1))
            additional = y - hero_street_invested
            hero_invested += additional
            hero_street_invested = y
            continue

        # Uncalled bet returned
        m = re.match(r'Uncalled bet \(\$([0-9.]+)\) returned to Hero', line)
        if m:
            hero_invested -= float(m.group(1))

    # Collected
    hero_collected = sum(
        float(m.group(1))
        for m in re.finditer(r'Hero collected \$([0-9.]+) from', hand_text)
    )

    net = round(hero_collected - hero_invested, 2)
    net_bb = round(net / bb, 2) if bb > 0 else 0.0
    return net, net_bb, hero_invested


def _action_label(raw: str, street: str, bet_count: int, bb: float) -> str:
    """Convert a raw action string to a human-readable label."""
    if raw in ('folds', 'checks'):
        return raw

    m = re.match(r'raises \$[0-9.]+ to \$([0-9.]+)', raw)
    if m:
        to_amt = m.group(1)
        n = bet_count + 1  # this raise is the nth bet
        if n <= 2:
            return f'raises to ${to_amt}'
        return f'{n}-bets to ${to_amt}'

    m = re.match(r'bets \$([0-9.]+)', raw)
    if m:
        return f'bets ${m.group(1)}'

    m = re.match(r'calls \$([0-9.]+)', raw)
    if m:
        amt_str = m.group(1)
        # Limp: preflop, calling the BB, no raise yet (bet_count == 1 = only BB posted)
        if street == 'preflop' and bet_count == 1 and abs(float(amt_str) - bb) < 0.01:
            return f'limps ${amt_str}'
        return f'calls ${amt_str}'

    m = re.match(r'posts small blind \$([0-9.]+)', raw)
    if m:
        return f'posts SB ${m.group(1)}'

    m = re.match(r'posts big blind \$([0-9.]+)', raw)
    if m:
        return f'posts BB ${m.group(1)}'

    return raw


def _parse_streets(hand_text: str, bb: float) -> dict:
    """Extract action lists per street, with human-readable labels."""
    street_patterns = [
        ('preflop', r'\*\*\* HOLE CARDS \*\*\*', r'\*\*\* (?:FLOP|SHOW DOWN|SUMMARY) \*\*\*'),
        ('flop',    r'\*\*\* FLOP \*\*\* \[[^\]]+\]', r'\*\*\* (?:TURN|SHOW DOWN|SUMMARY) \*\*\*'),
        ('turn',    r'\*\*\* TURN \*\*\* \[[^\]]+\] \[[^\]]+\]', r'\*\*\* (?:RIVER|SHOW DOWN|SUMMARY) \*\*\*'),
        ('river',   r'\*\*\* RIVER \*\*\* \[[^\]]+\] \[[^\]]+\]', r'\*\*\* (?:SHOW DOWN|SUMMARY) \*\*\*'),
    ]

    result: dict[str, list] = {}
    action_re = re.compile(
        r'^(\S+): (folds|checks|calls \$[0-9.]+|bets \$[0-9.]+|raises \$[0-9.]+ to \$[0-9.]+|posts (?:small|big) blind \$[0-9.]+)'
    )

    for street, start_pat, end_pat in street_patterns:
        m = re.search(f'(?:{start_pat})(.*?)(?:{end_pat})', hand_text, re.DOTALL)
        if not m:
            continue

        # Preflop: BB post counts as bet 1 already on the table
        bet_count = 1 if street == 'preflop' else 0
        actions = []

        for raw_line in m.group(1).split('\n'):
            raw_line = raw_line.strip()
            am = action_re.match(raw_line)
            if not am:
                continue
            raw_action = am.group(2)
            label = _action_label(raw_action, street, bet_count, bb)
            # Increment bet count after a bet or raise
            if re.match(r'(raises|bets) ', raw_action):
                bet_count += 1
            actions.append({'player': am.group(1), 'action': raw_action, 'label': label})

        if actions:
            result[street] = actions

    return result


def parse_hand_full(hand_text: str) -> dict | None:
    # ── header ────────────────────────────────────────────────────────────────
    hm = re.search(
        r'Poker Hand #(\w+):.*?\(\$([0-9.]+)/\$([0-9.]+)\) - (\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})',
        hand_text,
    )
    if not hm:
        return None

    hand_id = hm.group(1)
    sb_val  = float(hm.group(2))
    bb_val  = float(hm.group(3))
    timestamp = datetime.strptime(hm.group(4), '%Y/%m/%d %H:%M:%S')
    stakes = f"NL{int(bb_val * 100)}"

    # ── table + button ────────────────────────────────────────────────────────
    tm = re.search(r"Table '([^']+)' \d+-max Seat #(\d+) is the button", hand_text)
    button_seat = int(tm.group(2)) if tm else None

    # ── seats ─────────────────────────────────────────────────────────────────
    seats: dict[int, str] = {}  # seat_num → player_name
    for m in re.finditer(r'Seat (\d+): (\S+) \(\$[0-9.]+ in chips\)', hand_text):
        seats[int(m.group(1))] = m.group(2)

    hero_seat = next((s for s, n in seats.items() if n == 'Hero'), None)
    seat_nums = sorted(seats.keys())

    # ── positions (all players) ───────────────────────────────────────────────
    position: str | None = None
    player_positions: dict[str, str] = {}
    if button_seat and seat_nums:
        n = len(seat_nums)
        pos_names = _POSITION_MAPS.get(n, ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'])
        btn_idx = seat_nums.index(button_seat) if button_seat in seat_nums else 0
        for i, seat_num in enumerate(seat_nums):
            offset = (i - btn_idx) % n
            pos = pos_names[offset] if offset < len(pos_names) else '?'
            name = seats[seat_num]
            player_positions[name] = pos
        if hero_seat:
            position = player_positions.get('Hero')

    # ── hole cards ────────────────────────────────────────────────────────────
    hcm = re.search(r'Dealt to Hero \[([^\]]+)\]', hand_text)
    hole_cards = hcm.group(1).split() if hcm else []

    # ── board ─────────────────────────────────────────────────────────────────
    board: list[str] = []
    fm = re.search(r'\*\*\* FLOP \*\*\* \[([^\]]+)\]', hand_text)
    um = re.search(r'\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]', hand_text)
    rm = re.search(r'\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]', hand_text)
    if fm: board.extend(fm.group(1).split())
    if um: board.extend(um.group(1).split())
    if rm: board.extend(rm.group(1).split())

    # ── pot type ──────────────────────────────────────────────────────────────
    # Count raises in the preflop section
    preflop_section = re.search(
        r'\*\*\* HOLE CARDS \*\*\*(.*?)(?:\*\*\* (?:FLOP|SHOW DOWN|SUMMARY) \*\*\*)',
        hand_text, re.DOTALL,
    )
    preflop_raises = 0
    if preflop_section:
        preflop_raises = len(re.findall(r'\S+: raises \$', preflop_section.group(1)))

    if preflop_raises <= 1:
        pot_type = 'single-raise'
    elif preflop_raises == 2:
        pot_type = '3bet'
    else:
        pot_type = '4bet+'

    # Multiway: 3+ unique players with actions on the flop
    flop_section = re.search(
        r'\*\*\* FLOP \*\*\*.*?(.*?)(?:\*\*\* (?:TURN|SHOW DOWN|SUMMARY) \*\*\*)',
        hand_text, re.DOTALL,
    )
    is_multiway = False
    if flop_section:
        flop_actors = set(re.findall(r'^(\S+):', flop_section.group(1), re.MULTILINE))
        flop_actors = {p for p in flop_actors if p not in {'Uncalled', 'Total', 'Board'} and not p.startswith('*')}
        is_multiway = len(flop_actors) >= 3

    # ── showdown ──────────────────────────────────────────────────────────────
    went_to_showdown = '*** SHOW DOWN ***' in hand_text or bool(re.search(r'Hero: shows \[', hand_text))

    # Collect all shown cards at showdown (all players including Hero)
    showdown_cards: dict[str, list[str]] = {}
    for m in re.finditer(r'(\S+): shows \[([^\]]+)\]', hand_text):
        showdown_cards[m.group(1)] = m.group(2).split()

    # ── net winnings ──────────────────────────────────────────────────────────
    net, net_bb, hero_invested = _parse_net(hand_text, bb_val)

    # ── pot + rake ────────────────────────────────────────────────────────────
    pot_m  = re.search(r'Total pot \$([0-9.]+)', hand_text)
    rake_m = re.search(r'Rake \$([0-9.]+)', hand_text)
    pot        = float(pot_m.group(1))  if pot_m  else 0.0
    total_rake = float(rake_m.group(1)) if rake_m else 0.0
    # Hero's rake share = proportional to their investment in the pot
    rake = round(total_rake * (hero_invested / pot), 4) if pot > 0 else 0.0

    # ── opponents ─────────────────────────────────────────────────────────────
    opponents = [name for name in seats.values() if name != 'Hero']

    # ── streets ───────────────────────────────────────────────────────────────
    streets = _parse_streets(hand_text, bb_val)

    # ── EV winnings ───────────────────────────────────────────────────────────
    # Default: actual result (folds, regular showdowns, parse errors)
    ev_winnings = net

    allin_st = _allin_street(hand_text)
    # Only calculate equity for HU all-in with both players' cards known
    if allin_st and len(showdown_cards) == 2 and 'Hero' in showdown_cards:
        villain_name  = next(n for n in showdown_cards if n != 'Hero')
        villain_cards = showdown_cards[villain_name]
        board_at_allin = {
            'preflop': [],
            'flop':    board[:3],
            'turn':    board[:4],
            'river':   board[:5],
        }[allin_st]

        equity      = _calculate_equity(hole_cards, villain_cards, board_at_allin)
        distributed = pot - total_rake          # what actually gets paid out
        ev_winnings = round(equity * distributed - hero_invested, 2)

    return {
        'handId':          hand_id,
        'timestamp':       timestamp.isoformat(),
        'stakes':          stakes,
        'bb':              bb_val,
        'position':        position,
        'holeCards':       hole_cards,
        'board':           board,
        'netWinnings':     net,
        'netBB':           net_bb,
        'pot':             pot,
        'rake':            rake,
        'potType':         pot_type,
        'isMultiway':      is_multiway,
        'wentToShowdown':  went_to_showdown,
        'showdownCards':   showdown_cards,
        'opponents':       opponents,
        'playerPositions': player_positions,
        'streets':         streets,
        'evWinnings':      ev_winnings,
    }


def parse_files_full(contents: list[str]) -> list[dict]:
    """Parse all hands from all file contents, sorted newest-first."""
    hands = []
    for content in contents:
        for hand_text in split_hands(content):
            h = parse_hand_full(hand_text)
            if h:
                hands.append(h)
    hands.sort(key=lambda h: h['timestamp'], reverse=True)
    return hands


def compute_pool_stats(parsed_hands: list[dict]) -> dict:
    """Aggregate player pool statistics from all parsed hands (opponents only, not Hero)."""

    def pct(num: int, den: int) -> float:
        return round(num / den * 100, 1) if den > 0 else 0.0

    # [numerator, denominator] for each stat
    vpip          = [0, 0]
    pfr           = [0, 0]
    threebet      = [0, 0]
    fold_flop     = [0, 0]
    fold_turn     = [0, 0]
    fold_river    = [0, 0]
    flop_cbet     = [0, 0]
    wtsd          = [0, 0]

    for hand in parsed_hands:
        streets   = hand.get('streets', {})
        opponents = hand.get('opponents', [])
        showdown_cards = hand.get('showdown_cards', {})

        if not opponents:
            continue

        opp_set = set(opponents)

        # ── Preflop ──────────────────────────────────────────────────────────
        preflop = streets.get('preflop', [])

        # Walk through preflop: track voluntary raise count BEFORE each action
        raise_count = 0   # voluntary raises seen so far in the street
        opp_pf: dict[str, list[tuple[str, int]]] = {opp: [] for opp in opponents}

        for act in preflop:
            player, raw = act['player'], act['action']
            if player in opp_set:
                opp_pf[player].append((raw, raise_count))
            if re.match(r'raises', raw):
                raise_count += 1

        for opp in opponents:
            acts = opp_pf[opp]

            vpip[1] += 1
            pfr[1]  += 1
            threebet[1] += 1

            did_vpip  = any(re.match(r'(calls|raises|bets)', a[0]) for a in acts)
            did_pfr   = any(re.match(r'raises', a[0]) for a in acts)
            # 3-bet: opponent raised when at least one voluntary raise had already happened
            did_3bet  = any(re.match(r'raises', a[0]) and a[1] >= 1 for a in acts)

            if did_vpip:  vpip[0]     += 1
            if did_pfr:   pfr[0]      += 1
            if did_3bet:  threebet[0] += 1

        # ── Preflop aggressor (for c-bet tracking) ───────────────────────────
        # Last player (opponent or Hero) to raise preflop
        preflop_aggressor = None
        for act in reversed(preflop):
            if re.match(r'raises', act['action']):
                preflop_aggressor = act['player']
                break

        # ── Flop c-bet ───────────────────────────────────────────────────────
        flop = streets.get('flop', [])
        if flop and preflop_aggressor and preflop_aggressor in opp_set:
            flop_cbet[1] += 1
            # First action by preflop aggressor on flop
            agg_acts = [a for a in flop if a['player'] == preflop_aggressor]
            if agg_acts and re.match(r'bets|raises', agg_acts[0]['action']):
                flop_cbet[0] += 1

        # ── Fold vs aggression (flop / turn / river) ─────────────────────────
        for street_name, counter in [
            ('flop',  fold_flop),
            ('turn',  fold_turn),
            ('river', fold_river),
        ]:
            acts = streets.get(street_name, [])
            facing_bet = False

            for act in acts:
                player, raw = act['player'], act['action']

                if re.match(r'bets|raises', raw):
                    facing_bet = True
                elif raw == 'checks':
                    facing_bet = False
                elif player in opp_set and facing_bet:
                    counter[1] += 1
                    if raw == 'folds':
                        counter[0] += 1

        # ── WTSD ─────────────────────────────────────────────────────────────
        # Opportunity: opponent appeared on the flop
        if flop:
            flop_players = {a['player'] for a in flop}
            for opp in opponents:
                if opp in flop_players:
                    wtsd[1] += 1
                    if opp in showdown_cards:
                        wtsd[0] += 1

    return {
        'hands':        len(parsed_hands),
        'vpip':         pct(*vpip),
        'pfr':          pct(*pfr),
        'threeBet':     pct(*threebet),
        'foldFlopBet':  pct(*fold_flop),
        'foldTurnBet':  pct(*fold_turn),
        'foldRiverBet': pct(*fold_river),
        'flopCbet':     pct(*flop_cbet),
        'wtsd':         pct(*wtsd),
    }
