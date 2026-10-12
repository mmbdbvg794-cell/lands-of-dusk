/*
 * Players' real addresses. Everyone reaches the game through the WebSocket
 * bridge (dusk_bridge.py) or the Tailscale TCP funnel, so every socket the
 * server sees comes from 127.0.0.1: IP bans, whois and the login history
 * were useless, and banning one player's address banned everybody.
 *
 * The bridge now starts each connection with one line,
 *     #bridge <secret> <address> [<device>]
 * (the address from the funnel's X-Forwarded-For, the device a random ID
 * the browser keeps), before relaying anything else. wrap() reads it and
 * returns a socket that reports that address, so Player's ban check,
 * whois, loginhistory and banip all see the real one without changing.
 * The secret (conf/bridgesecret, made here at start-up, readable only by
 * the server's user) stops anyone else connecting to the local port from
 * claiming an address. A connection without the line (the Java client
 * through the TCP funnel) is passed through untouched: whatever was read
 * while looking is handed back first.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.SequenceInputStream;
import java.net.InetAddress;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.security.MessageDigest;
import java.security.SecureRandom;

public class BridgedSocket extends Socket {
    static final String SECRET_FILE = "conf/bridgesecret";
    static final String PREFIX = "#bridge ";
    static final int WAIT_MS = 300; // the bridge sends its line at once
    static final int MAX_LINE = 400;
    private static String secret = null;

    private final Socket raw;
    private final InetAddress address;
    final String device; // null if none
    boolean viaBridge;   // came with the bridge's line: a browser player
    private final InputStream in;

    private BridgedSocket(Socket raw, InetAddress address, String device, byte[] unread) throws IOException {
        this.raw = raw;
        this.address = address;
        this.device = device;
        InputStream rest = raw.getInputStream();
        this.in = unread.length == 0 ? rest : new SequenceInputStream(new ByteArrayInputStream(unread), rest);
    }

    // At start-up: make a new secret and write it where the bridge reads it.
    static void start() {
        try {
            byte[] b = new byte[24];
            new SecureRandom().nextBytes(b);
            StringBuilder s = new StringBuilder();
            for (byte x : b) s.append(String.format("%02x", x));
            File f = new File(SECRET_FILE);
            f.delete();
            f.createNewFile();
            f.setReadable(false, false);
            f.setWritable(false, false);
            f.setReadable(true, true);
            f.setWritable(true, true);
            FileWriter w = new FileWriter(f);
            w.write(s.toString() + "\n");
            w.close();
            secret = s.toString();
        } catch (Exception e) {
            secret = null;
            Log.logError(e, "Could not write " + SECRET_FILE + "; bridge addresses are off", false);
        }
    }

    // The socket to give Player: the bridge's, with the real address, or
    // the one accepted, as it was.
    static Socket wrap(Socket raw) {
        try {
            if (!raw.getInetAddress().isLoopbackAddress()) return raw;
            InputStream in = raw.getInputStream();
            int old = raw.getSoTimeout();
            raw.setSoTimeout(WAIT_MS);
            ByteArrayOutputStream got = new ByteArrayOutputStream();
            boolean line = false;
            try {
                int c;
                while (got.size() < MAX_LINE && (c = in.read()) != -1) {
                    got.write(c);
                    if (c == '\n') { line = true; break; }
                    // Not the bridge's line: stop at once and hand it back.
                    if (got.size() <= PREFIX.length() && c != PREFIX.charAt(got.size() - 1)) break;
                }
            } catch (SocketTimeoutException e) {
                // Nothing (more) yet: the Java client waits to be asked.
            }
            raw.setSoTimeout(old);
            byte[] bytes = got.toByteArray();
            String text = new String(bytes, "UTF-8").trim();
            if (line && text.startsWith(PREFIX)) {
                String[] p = text.substring(PREFIX.length()).trim().split("\\s+");
                if (secret != null && p.length >= 2 && same(p[0], secret) && p[1].matches("[0-9A-Fa-f:.]{2,45}")) {
                    // A literal address only (never a name to look up).
                    InetAddress a = InetAddress.getByName(p[1]);
                    String dev = p.length >= 3 && p[2].matches("[A-Za-z0-9-]{8,64}") ? p[2].toLowerCase() : null;
                    BridgedSocket b = new BridgedSocket(raw, a, dev, new byte[0]);
                    b.viaBridge = true;
                    return b;
                }
                Log.logEvent("Ignored a bridge line with the wrong secret");
                return new BridgedSocket(raw, raw.getInetAddress(), null, new byte[0]);
            }
            return bytes.length == 0 ? raw : new BridgedSocket(raw, raw.getInetAddress(), null, bytes);
        } catch (Exception e) {
            return raw;
        }
    }

    // Whether a player plays in the browser (through the bridge), so can be
    // sent lines only the browser client reads.
    static boolean browser(Socket s) {
        return s instanceof BridgedSocket && ((BridgedSocket) s).viaBridge;
    }

    // The device a socket came from, if the bridge said.
    static String deviceOf(Socket s) {
        return s instanceof BridgedSocket ? ((BridgedSocket) s).device : null;
    }

    private static boolean same(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(), b.getBytes());
    }

    @Override public InetAddress getInetAddress() { return address; }
    @Override public InputStream getInputStream() { return in; }
    @Override public OutputStream getOutputStream() throws IOException { return raw.getOutputStream(); }
    @Override public synchronized void close() throws IOException { raw.close(); }
    @Override public synchronized void setSoTimeout(int ms) throws SocketException { raw.setSoTimeout(ms); }
    @Override public synchronized int getSoTimeout() throws SocketException { return raw.getSoTimeout(); }
    @Override public boolean isClosed() { return raw.isClosed(); }
    @Override public boolean isConnected() { return raw.isConnected(); }
    @Override public boolean isInputShutdown() { return raw.isInputShutdown(); }
    @Override public boolean isOutputShutdown() { return raw.isOutputShutdown(); }
    @Override public void shutdownInput() throws IOException { raw.shutdownInput(); }
    @Override public void shutdownOutput() throws IOException { raw.shutdownOutput(); }
    @Override public int getPort() { return raw.getPort(); }
    @Override public int getLocalPort() { return raw.getLocalPort(); }
    @Override public InetAddress getLocalAddress() { return raw.getLocalAddress(); }
    @Override public void setTcpNoDelay(boolean on) throws SocketException { raw.setTcpNoDelay(on); }
    @Override public void setKeepAlive(boolean on) throws SocketException { raw.setKeepAlive(on); }
    @Override public String toString() { return "Socket[addr=/" + address.getHostAddress() + " via bridge" + (device != null ? ", device " + device : "") + "]"; }
}
