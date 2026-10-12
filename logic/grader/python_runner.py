import importlib.util
import sys
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]).resolve().parent))
from ottv2 import read_state, yield_turn

spec = importlib.util.spec_from_file_location("player", sys.argv[1])
player = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = player
spec.loader.exec_module(player)

while True:
    state = read_state()
    if state is None:
        break
    yield_turn(player.choose_move(state))
