#pragma once
#include <sstream>
#include <string>
#include <vector>
#include <iostream>
#include <utility>

namespace ottv2 {
enum class soldierType { rock, paper, scissor };
enum class teamType { A, B };
enum class direction { N, NE, E, SE, S, SW, W, NW };
struct Move {
private:
  std::string from, to;
public:
  Move() = default;
  Move(std::string fromValue, std::string toValue)
    : from(std::move(fromValue)), to(std::move(toValue)) {}
  const std::string& getFrom() const { return from; }
  const std::string& getTo() const { return to; }
};
struct coordinate {
private:
  int xCor{}, yCor{};
public:
  coordinate() = default;
  coordinate(int x, int y) : xCor(x), yCor(y) {}
  int getXCor() const { return xCor; }
  int getYCor() const { return yCor; }
  void setXCor(int value) { xCor = value; }
  void setYCor(int value) { yCor = value; }
};
struct soldier {
private:
  teamType team{};
  soldierType soldierValue{};
  int id{};
  coordinate position{};
public:
  soldier() = default;
  soldier(teamType teamValue, soldierType soldierValue, int idValue, coordinate positionValue)
    : team(teamValue), soldierValue(soldierValue), id(idValue), position(positionValue) {}
  teamType getTeamType() const { return team; }
  soldierType getSoldierType() const { return soldierValue; }
  int getId() const { return id; }
  coordinate getPosition() const { return position; }
  void setPosition(coordinate value) { position = value; }
  Move moveTo(direction next) const {
    static constexpr int dx[] = {0, 1, 1, 1, 0, -1, -1, -1};
    static constexpr int dy[] = {1, 1, 0, -1, -1, -1, 0, 1};
    const auto index = static_cast<int>(next);
    coordinate destination{position.getXCor() + dx[index], position.getYCor() + dy[index]};
    return {
      std::string(1, static_cast<char>('a' + position.getXCor())) + std::to_string(position.getYCor() + 1),
      std::string(1, static_cast<char>('a' + destination.getXCor())) + std::to_string(destination.getYCor() + 1)
    };
  }
};
struct team {
private:
  coordinate flag;
  std::vector<soldier> soldiers;
public:
  team() = default;
  team(coordinate flagValue, std::vector<soldier> soldiersValue)
    : flag(flagValue), soldiers(std::move(soldiersValue)) {}
  coordinate getFlag() const { return flag; }
  void setFlag(coordinate value) { flag = value; }
  const std::vector<soldier>& getSoldiers() const { return soldiers; }
  void setSoldiers(std::vector<soldier> value) { soldiers = std::move(value); }
};
struct gameEngine {
private:
  coordinate size;
  int totalTurns{};
  int timeTurnLimit{};
  std::vector<soldier> soldiers;
public:
  gameEngine() = default;
  gameEngine(coordinate sizeValue, int totalTurnsValue, int timeTurnLimitValue,
             std::vector<soldier> soldiersValue)
    : size(sizeValue), totalTurns(totalTurnsValue), timeTurnLimit(timeTurnLimitValue),
      soldiers(std::move(soldiersValue)) {}
  int getLength() const { return size.getXCor(); }
  int getWidth() const { return size.getYCor(); }
  int getTotalTurns() const { return totalTurns; }
  int getTimeTurnLimit() const { return timeTurnLimit; }
  const std::vector<soldier>& getSoldiers() const { return soldiers; }
  coordinate getSize() const { return size; }
  void setSize(coordinate value) { size = value; }
  void setTotalTurns(int value) { totalTurns = value; }
  void setTimeTurnLimit(int value) { timeTurnLimit = value; }
  void setSoldiers(std::vector<soldier> value) { soldiers = std::move(value); }
};
struct Piece {
private:
  std::string id, color, type, square;
public:
  Piece() = default;
  Piece(std::string idValue, std::string colorValue, std::string typeValue, std::string squareValue)
    : id(std::move(idValue)), color(std::move(colorValue)), type(std::move(typeValue)),
      square(std::move(squareValue)) {}
  const std::string& getId() const { return id; }
  const std::string& getColor() const { return color; }
  const std::string& getType() const { return type; }
  const std::string& getSquare() const { return square; }
};
struct State {
private:
  std::string color, current_turn;
  int turn_number{};
  int board_size{9};
  int length{9}, width{9};
  std::vector<Piece> pieces;
  gameEngine engine;
  team own_team, enemy_team;
public:
  const std::string& getColor() const { return color; }
  const std::string& getCurrentTurn() const { return current_turn; }
  int getTurnNumber() const { return turn_number; }
  int getBoardSize() const { return board_size; }
  int getLength() const { return length; }
  int getWidth() const { return width; }
  const std::vector<Piece>& getPieces() const { return pieces; }
  const gameEngine& getGameEngine() const { return engine; }
  const team& getTeam() const { return own_team; }
  const team& getEnemyTeam() const { return enemy_team; }
  bool has_moves() const { return color == current_turn; }
  void setColor(std::string value) { color = std::move(value); }
  void setCurrentTurn(std::string value) { current_turn = std::move(value); }
  void setTurnNumber(int value) { turn_number = value; }
  void setBoardSize(int value) { board_size = value; }
  void setLength(int value) { length = value; }
  void setWidth(int value) { width = value; }
  void setPieces(std::vector<Piece> value) { pieces = std::move(value); }
  void setGameEngine(gameEngine value) { engine = std::move(value); }
  void setTeam(team value) { own_team = std::move(value); }
  void setEnemyTeam(team value) { enemy_team = std::move(value); }
};
inline State read_state(std::istream& input) {
  std::string line;
  if (!std::getline(input, line)) return {};
  State state;
  std::stringstream fields(line);
  std::string field;
  std::vector<std::string> values;
  coordinate white_flag{state.getLength() - 1, state.getWidth() - 1};
  coordinate black_flag{0, 0};
  while (std::getline(fields, field, '|')) values.push_back(field);
  if (values.size() < 3) return {};
  state.setColor(values[0]); state.setCurrentTurn(values[1]);
  state.setTurnNumber(std::stoi(values[2]));
  for (size_t i = 3; i < values.size(); ++i) {
    if (values[i].rfind("@boardSize=",0)==0) {state.setBoardSize(std::stoi(values[i].substr(11)));continue;}
    if (values[i].rfind("@length=",0)==0) {state.setLength(std::stoi(values[i].substr(8)));continue;}
    if (values[i].rfind("@width=",0)==0) {state.setWidth(std::stoi(values[i].substr(7)));continue;}
    if (values[i].rfind("@flag-white=",0)==0) {
      const std::string value = values[i].substr(12);
      if (value.find(',') == std::string::npos) {
        white_flag = coordinate(value[0] - 'a', std::stoi(value.substr(1)) - 1); continue;
      }
      std::stringstream flag(value);
      std::string x, y; std::getline(flag, x, ','); std::getline(flag, y, ',');
      white_flag = coordinate(std::stoi(x), std::stoi(y)); continue;
    }
    if (values[i].rfind("@flag-black=",0)==0) {
      const std::string value = values[i].substr(12);
      if (value.find(',') == std::string::npos) {
        black_flag = coordinate(value[0] - 'a', std::stoi(value.substr(1)) - 1); continue;
      }
      std::stringstream flag(value);
      std::string x, y; std::getline(flag, x, ','); std::getline(flag, y, ',');
      black_flag = coordinate(std::stoi(x), std::stoi(y)); continue;
    }
    std::stringstream piece(values[i]);
    std::vector<std::string> parts;
    while (std::getline(piece, field, ',')) parts.push_back(field);
    if (parts.size() == 4) {
      auto pieces = state.getPieces();
      pieces.emplace_back(parts[0], parts[1], parts[2], parts[3]);
      state.setPieces(std::move(pieces));
    }
  }
  std::vector<soldier> all, own, enemy;
  for (size_t i = 0; i < state.getPieces().size(); ++i) {
    const auto& piece = state.getPieces()[i];
    const auto split = piece.getSquare().find_first_of("0123456789");
    coordinate position(piece.getSquare()[0] - 'a', std::stoi(piece.getSquare().substr(split)) - 1);
    soldier current{piece.getColor() == state.getColor() ? teamType::A : teamType::B,
      piece.getType() == "rock" ? soldierType::rock : piece.getType() == "paper" ? soldierType::paper : soldierType::scissor,
      static_cast<int>(i), position};
    all.push_back(current);
    if (piece.getColor() == state.getColor()) own.push_back(current);
    else enemy.push_back(current);
  }
  state.setGameEngine(gameEngine(coordinate(state.getLength(), state.getWidth()),
    20 * state.getLength() * state.getWidth(), 1000, std::move(all)));
  state.setTeam(team(state.getColor() == "white" ? white_flag : black_flag, std::move(own)));
  state.setEnemyTeam(team(state.getColor() == "white" ? black_flag : white_flag, std::move(enemy)));
  return state;
}
inline void yield_turn(const Move& next) {
  std::cout << next.getFrom() << ' ' << next.getTo() << '\n' << std::flush;
}
}
