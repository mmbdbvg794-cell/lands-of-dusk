// Checks spell scripts compile, using the server's own Script class, without the game:
//   javac -cp ~/DuskRPG -d /tmp TestCompile.java && java -cp /tmp:$HOME/DuskRPG TestCompile <script copies...>
// (It writes each script's .dsko next to it, so run it on copies, not the live files.)
// Compiles spell scripts with the server's own Script class, outside the game.
public class TestCompile {
  public static void main(String[] a) throws Exception {
    for (String path : a) {
      new java.io.File(path + ".dsko").delete();
      try {
        new Script(path, null, true);
      } catch (Exception e) {
        System.out.println(path + ": ERROR " + e);
      }
      java.io.File out = new java.io.File(path + ".dsko");
      System.out.println(path + ": compiled " + (out.exists() ? out.length() + " bytes" : "NOTHING"));
    }
  }
}
