"""A tiny scripted Dusk player, for testing server changes against a
scratch copy of the game (never the live one):

  python3 testclient.py PORT NAME PASSWORD COMMAND...

Logs in (creating the character, as a human or $RACE, if it's new), sends each
command, and prints the server's text replies as they come, one per line,
prefixed with "> " for what was sent. Inventory updates (opcode 6) print as
"inventory: ...". A command "wait N" just listens for N seconds; "useitem
<name>" sends "use <ID>" for that item in the latest inventory.
"""
import os, socket, sys, time

port, name, password, *commands = sys.argv[1:]
s = socket.create_connection(('127.0.0.1', int(port)))
s.settimeout(0.2)
buf = b''
inventory = {}  # item name -> an ID, from the latest inventory
seen = {}  # creature/person name -> [(id, x, y)], from entities in view
me = [0, 0]  # where we are (our own entity)


def pump(seconds):
    """Reads for a while; returns the text lines seen."""
    global buf
    end = time.time() + seconds
    lines = []
    while time.time() < end:
        try:
            chunk = s.recv(65536)
            if not chunk:
                break
            buf += chunk
        except socket.timeout:
            continue
    # Messages start with an opcode byte below 40 at the start of a line.
    text = buf.decode('latin-1')
    buf = b''
    msgs, cur = [], ''
    for line in text.split('\n'):
        if line and ord(line[0]) < 40:
            if cur:
                msgs.append(cur)
            cur = line
        else:
            cur += '\n' + line
    if cur:
        msgs.append(cur)
    for m in msgs:
        op, body = ord(m[0]), m[1:]
        if op == 3:  # text: exactly one line; anything more is a stray
            first, *rest = body.split('\n')
            lines.append(first)
            for l in rest:
                if l.strip():
                    lines.append('STRAY (read as opcode %d): %s' % (ord(l[0]), l))
        elif op == 23:  # colour text: r, g, b, text
            parts = body.split('\n')
            if len(parts) > 3:
                lines.append(parts[3])
        elif op == 6:
            parts = body.split('\n')
            # Each item: its count, its name, its ID (for "use <id>").
            names = ['%s #%s' % (parts[i + 1], parts[i + 2].strip()) for i in range(0, len(parts) - 2, 3) if parts[i].strip().isdigit()]
            inventory.clear()
            for i in range(0, len(parts) - 2, 3):
                if parts[i].strip().isdigit():
                    inventory[parts[i + 1].lower()] = parts[i + 2].strip()
            lines.append('inventory: ' + ', '.join(names))
        elif op in (4,):
            parts = body.split('\n')
            if len(parts) > 3:
                lines.append('entity: %s type %s' % (parts[0], parts[4] if len(parts) > 4 else '?'))
                if len(parts) > 4 and parts[2].strip().isdigit():
                    try:
                        x, y = int(parts[3]), int(parts[4])
                    except ValueError:
                        x = y = 0
                    if parts[0].lower() == name.lower():
                        me[:] = [x, y]
                    else:
                        seen.setdefault(parts[0].lower(), []).append((parts[2].strip(), x, y))
    return lines


def send(line):
    s.sendall((line + '\n').encode('latin-1'))


send(name)
for _ in range(20):
    lines = pump(1.0)
    for l in lines:
        print(l)
    joined = '\n'.join(lines)
    if 'Is that correct' in joined:
        send('yes')
    elif 'Enter a new password' in joined or 'Confirm that password' in joined or 'Enter your password' in joined:
        send(password)
    elif 'Choose one of the following races' in joined:
        send(os.environ.get('RACE', 'human'))
    elif 'Login Accepted' in joined and 'races' not in joined:
        pass
    if any('has entered the world' in l for l in lines):
        break
for l in pump(2.0):
    print(l)
for c in commands:
    # "wait N": just listen for N seconds.
    if c.startswith('wait ') and c[5:].isdigit():
        for l in pump(float(c[5:])):
            print(l)
        continue
    # "useitem <name>": "use <its ID>"; and "use/wear/eat/drink <name>"
    # become "<verb> <its ID>", as the Java client does.
    if c.startswith('useitem ') and c[8:].lower() in inventory:
        c = 'use ' + inventory[c[8:].lower()]
    verb, _, rest = c.partition(' ')
    if verb in ('use', 'wear', 'eat', 'drink') and rest.lower() in inventory:
        c = verb + ' ' + inventory[rest.lower()]
    if verb in ('a', 'attack') and rest.lower() in seen:
        # The nearest of that name, as you'd pick it.
        c = 'a ' + min(seen[rest.lower()], key=lambda e: max(abs(e[1] - me[0]), abs(e[2] - me[1])))[0]
    print('> ' + c)
    send(c)
    for l in pump(1.5):
        print(l)
# Log out properly, so the character is saved.
send('quit')
pump(1.5)
s.close()
