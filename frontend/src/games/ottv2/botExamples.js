import {pythonExample} from './botExample.js';
export const examples = {
 python:pythonExample,
 cpp:`#include "ottv2.hpp"
ottv2::Move choose_move(const ottv2::State& state) {
  for (const auto& p : state.pieces) {
    if (p.color != state.color) continue;
    int x=p.square[0]-'a', y=std::stoi(p.square.substr(1));
    for (int dx=-1;dx<=1;dx++) for(int dy=-1;dy<=1;dy++) {
      int nx=x+dx,ny=y+dy;
      if ((!dx&&!dy)||nx<0||nx>=state.length||ny<1||ny>state.width) continue;
      std::string to=std::string(1,char('a'+nx))+std::to_string(ny);
      bool blocked=false;
      for (const auto& q:state.pieces) if(q.square==to && (q.color==p.color||q.type==p.type))blocked=true;
      if(!blocked)return {p.square,to};
    }
  }
  return {"a1","a1"};
}`,
 java:`import ottv2.sdk.*;
public class RobotPlayer {
  public static void run(RobotController rc) throws Exception {
    while(true) {
      boolean moved=false;
      int length=rc.getGameEngine().getLength(), width=rc.getGameEngine().getWidth();
      outer: for(Piece p:rc.sensePieces()) {
        if(!p.color().equals(rc.getColor()))continue;
        int x=p.square().charAt(0)-'a',y=Integer.parseInt(p.square().substring(1));
        for(int dx=-1;dx<=1;dx++)for(int dy=-1;dy<=1;dy++) {
          int nx=x+dx,ny=y+dy;
          if(nx<0||nx>=length||ny<1||ny>width||dx==0&&dy==0)continue;
          String to=""+(char)('a'+nx)+ny;
          if(rc.canMove(p.square(),to)){rc.move(p.square(),to);moved=true;break outer;}
        }
      }
      if(!moved)rc.move("a1","a1");
      rc.yieldTurn();
    }
  }
}`
};
