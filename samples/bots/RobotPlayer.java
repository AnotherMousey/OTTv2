import ottv2.sdk.*;
public class RobotPlayer {
  public static void run(RobotController rc) throws Exception {
    while(true) {
      boolean moved=false;
      int size=rc.getState().board().size();
      outer: for(Piece p:rc.sensePieces()) {
        if(!p.color().equals(rc.getColor()))continue;
        int x=p.square().charAt(0)-'a',y=Integer.parseInt(p.square().substring(1));
        for(int dx=-1;dx<=1;dx++)for(int dy=-1;dy<=1;dy++) {
          int nx=x+dx,ny=y+dy;
          if(nx<0||nx>=size||ny<1||ny>size||dx==0&&dy==0)continue;
          String to=""+(char)('a'+nx)+ny;
          if(rc.canMove(p.square(),to)){rc.move(p.square(),to);moved=true;break outer;}
        }
      }
      if(!moved)rc.move("a1","a1");
      rc.yieldTurn();
    }
  }
}
