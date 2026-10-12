def beats(attacker, defender):
    return (
        (attacker == "rock" and defender == "scissors")
        or (attacker == "scissors" and defender == "paper")
        or (attacker == "paper" and defender == "rock")
    )

def choose_move(state):
    occupied = {piece.square: piece for piece in state.pieces}
    choices = []
    for piece in state.pieces:
        if piece.color != state.color:
            continue
        file_index = ord(piece.square[0]) - ord("a")
        rank = int(piece.square[1:])
        for file_step in (-1, 0, 1):
            for rank_step in (-1, 0, 1):
                if file_step == 0 and rank_step == 0:
                    continue
                destination_file = file_index + file_step
                destination_rank = rank + rank_step
                if not (0 <= destination_file < state.board_size and 1 <= destination_rank <= state.board_size):
                    continue
                destination = chr(ord("a") + destination_file) + str(destination_rank)
                target = occupied.get(destination)
                if target is not None and target.color == state.color:
                    continue
                if target is not None and not beats(piece.type, target.type):
                    continue
                choices.append((piece.square, destination))

    return choices[0] if choices else ("a1", "a1")
