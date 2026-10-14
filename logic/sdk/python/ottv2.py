import sys

rock = "rock"
paper = "paper"
scissor = "scissor"
scissors = scissor
A = "A"
B = "B"
N, NE, E, SE, S, SW, W, NW = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


class coordinate:
    __slots__ = ("_xCor", "_yCor")

    def __init__(self, xCor, yCor):
        self._xCor = xCor
        self._yCor = yCor

    def getXCor(self):
        return self._xCor

    def getYCor(self):
        return self._yCor

    def xCor(self):
        return self._xCor

    def yCor(self):
        return self._yCor

    def setXCor(self, value):
        self._xCor = value

    def setYCor(self, value):
        self._yCor = value

    def __eq__(self, other):
        return isinstance(other, coordinate) and (self._xCor, self._yCor) == (other._xCor, other._yCor)


class Move:
    __slots__ = ("_from_square", "_to_square")

    def __init__(self, from_square, to_square):
        self._from_square = from_square
        self._to_square = to_square

    def getFrom(self):
        return self._from_square

    def getTo(self):
        return self._to_square

    def from_(self):
        return self._from_square

    def to(self):
        return self._to_square

    def __iter__(self):
        yield self._from_square
        yield self._to_square


class soldier:
    __slots__ = ("_team", "_soldier", "_id", "_position")

    def __init__(self, team, soldier, id, position):
        self._team = team
        self._soldier = soldier
        self._id = id
        self._position = position

    def getTeamType(self):
        return self._team

    def getSoldierType(self):
        return self._soldier

    def getId(self):
        return self._id

    def getPosition(self):
        return self._position

    def setPosition(self, value):
        self._position = value

    def moveTo(self, direction):
        offsets = {
            N: (0, 1), NE: (1, 1), E: (1, 0), SE: (1, -1),
            S: (0, -1), SW: (-1, -1), W: (-1, 0), NW: (-1, 1),
        }
        dx, dy = offsets[direction]
        destination = coordinate(
            self._position.getXCor() + dx,
            self._position.getYCor() + dy,
        )
        return Move(self._square(self._position), self._square(destination))

    @staticmethod
    def _square(point):
        return chr(ord("a") + point.getXCor()) + str(point.getYCor() + 1)


class team:
    __slots__ = ("_flag", "_soldiers")

    def __init__(self, flag, soldiers):
        self._flag = flag
        self._soldiers = tuple(soldiers)

    def getFlag(self):
        return self._flag

    def setFlag(self, value):
        self._flag = value

    def getSoldiers(self):
        return self._soldiers

    def setSoldiers(self, value):
        self._soldiers = tuple(value)


class gameEngine:
    __slots__ = ("_size", "_totalTurns", "_timeTurnLimit", "_soldiers")

    def __init__(self, size, totalTurns, timeTurnLimit, soldiers):
        self._size = size
        self._totalTurns = totalTurns
        self._timeTurnLimit = timeTurnLimit
        self._soldiers = tuple(soldiers)

    def getSize(self):
        return self._size

    def getLength(self):
        return self._size.getXCor()

    def getWidth(self):
        return self._size.getYCor()

    def getTotalTurns(self):
        return self._totalTurns

    def getTimeTurnLimit(self):
        return self._timeTurnLimit

    def getSoldiers(self):
        return self._soldiers


class _piece:
    __slots__ = ("_id", "_color", "_type", "_square")

    def __init__(self, id, color, type, square):
        self._id = id
        self._color = color
        self._type = type
        self._square = square

    def getId(self):
        return self._id

    def getColor(self):
        return self._color

    def getType(self):
        return self._type

    def getSquare(self):
        return self._square


class State:
    __slots__ = (
        "_color", "_current_turn", "_turn_number", "_board_size",
        "_length", "_width", "_pieces", "_engine", "_team", "_enemy_team",
    )

    def __init__(self, color, current_turn, turn_number, pieces, board_size, length, width, engine, own_team, enemy_team):
        self._color = color
        self._current_turn = current_turn
        self._turn_number = turn_number
        self._board_size = board_size
        self._length = length
        self._width = width
        self._pieces = tuple(pieces)
        self._engine = engine
        self._team = own_team
        self._enemy_team = enemy_team

    def getColor(self):
        return self._color

    def getCurrentTurn(self):
        return self._current_turn

    def getTurnNumber(self):
        return self._turn_number

    def getBoardSize(self):
        return self._board_size

    def getLength(self):
        return self._length

    def getWidth(self):
        return self._width

    def getPieces(self):
        return self._pieces

    def getGameEngine(self):
        return self._engine

    def getTeam(self):
        return self._team

    def getEnemyTeam(self):
        return self._enemy_team

    def hasMoves(self):
        return self._color == self._current_turn


def _parse_coordinate(square):
    split = next(index for index, char in enumerate(square) if char.isdigit())
    return coordinate(ord(square[0]) - ord("a"), int(square[split:]) - 1)


def _parse_flag(fields, color, length, width):
    prefix = "@flag-" + color + "="
    value = next((field[len(prefix):] for field in fields if field.startswith(prefix)), None)
    if value is None:
        return coordinate(length - 1, width - 1) if color == "white" else coordinate(0, 0)
    if "," in value:
        x, y = value.split(",", 1)
        return coordinate(int(x), int(y))
    return _parse_coordinate(value)


def read_state():
    line = sys.stdin.readline()
    if not line:
        return None
    fields = line.rstrip("\n").split("|")
    if len(fields) < 3:
        return None
    size = next((int(field.split("=", 1)[1]) for field in fields[3:] if field.startswith("@boardSize=")), 9)
    length = next((int(field.split("=", 1)[1]) for field in fields[3:] if field.startswith("@length=")), size)
    width = next((int(field.split("=", 1)[1]) for field in fields[3:] if field.startswith("@width=")), size)
    pieces = [
        _piece(*value.split(",", 3))
        for value in fields[3:]
        if not value.startswith("@") and len(value.split(",", 3)) == 4
    ]
    soldiers = tuple(
        soldier(
            A if piece.getColor() == "white" else B,
            scissor if piece.getType() == "scissors" else piece.getType(),
            index,
            _parse_coordinate(piece.getSquare()),
        )
        for index, piece in enumerate(pieces)
    )
    own_team_id = A if fields[0] == "white" else B
    own = tuple(item for item in soldiers if item.getTeamType() == own_team_id)
    enemy = tuple(item for item in soldiers if item.getTeamType() != own_team_id)
    engine = gameEngine(coordinate(length, width), 20 * length * width, 1000, soldiers)
    own_flag = _parse_flag(fields[3:], fields[0], length, width)
    enemy_color = "black" if fields[0] == "white" else "white"
    enemy_flag = _parse_flag(fields[3:], enemy_color, length, width)
    return State(
        fields[0], fields[1], int(fields[2]), pieces, size, length, width,
        engine, team(own_flag, own), team(enemy_flag, enemy),
    )


def yield_turn(next_move):
    print(next_move.getFrom(), next_move.getTo(), flush=True)


# Java-compatible names. The legacy lowercase names remain available.
class Direction:
    N, NE, E, SE, S, SW, W, NW = N, NE, E, SE, S, SW, W, NW


class SoldierType:
    rock, paper, scissor = rock, paper, scissor


class TeamType:
    A, B = A, B


Coordinate = coordinate
Soldier = soldier
Team = team
GameEngine = gameEngine
Piece = _piece
