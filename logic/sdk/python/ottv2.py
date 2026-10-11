from dataclasses import dataclass
import sys

@dataclass(frozen=True)
class Piece:
    id: str
    color: str
    type: str
    square: str

@dataclass(frozen=True)
class State:
    color: str
    current_turn: str
    turn_number: int
    pieces: tuple[Piece, ...]

    @property
    def has_moves(self):
        return self.color == self.current_turn

def read_state():
    line = sys.stdin.readline()
    if not line:
        return None
    fields = line.rstrip("\n").split("|")
    pieces = tuple(Piece(*item.split(",")) for item in fields[3:] if len(item.split(",")) == 4)
    return State(fields[0], fields[1], int(fields[2]), pieces)

def move(from_square, to_square):
    return (from_square, to_square)

def yield_turn(next_move):
    from_square, to_square = next_move
    print(from_square, to_square, flush=True)
