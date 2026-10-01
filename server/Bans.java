/*
 * Banning, now that players have real addresses (BridgedSocket):
 *
 *   ban <player>        the account, and if they're online their address
 *                       and device too; they're disconnected
 *   unban <player>      lifts all three
 *   banip <address|player>
 *                       an address, or the address an online player is on;
 *                       everyone on it is disconnected
 *   bandevice <player|id>
 *                       the browser an online player is using (or a device
 *                       ID from "bans"); it's disconnected
 *   unbandevice <id>
 *   bans                every banned account, address and device
 *
 * These run before the server's own ban commands (Commands, through the
 * Props hook) because those banned whatever address a player was on, which
 * was 127.0.0.1 for everyone: one "ban" locked the whole server out. An
 * address on this machine is never banned now. Account and address bans
 * stay in the server's own files (conf/banned, conf/bannedips, so unbanip
 * still works); devices, and which bans were whose, are in conf/banextra
 * ("device <id> <name>" and "ip <address> <name>" lines).
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

public class Bans {
    static final String FILE = "conf/banextra";
    static final int GOD_PRIVS = 3; // the server's own ban commands need privs > 2
    private static final List<String[]> extra = new ArrayList<String[]>(); // {kind, value, name}

    static synchronized void load() {
        extra.clear();
        try {
            File f = new File(FILE);
            if (!f.exists()) return;
            BufferedReader r = new BufferedReader(new FileReader(f));
            String line;
            while ((line = r.readLine()) != null) {
                String[] p = line.trim().split("\\s+");
                if (p.length >= 2 && (p[0].equals("device") || p[0].equals("ip"))) extra.add(new String[] { p[0], p[1], p.length >= 3 ? p[2] : "-" });
            }
            r.close();
        } catch (Exception e) {
            Log.logError(e, "Error loading " + FILE, false);
        }
    }

    private static synchronized void save() {
        try {
            PrintWriter w = new PrintWriter(new FileWriter(FILE));
            for (String[] e : extra) w.println(e[0] + " " + e[1] + " " + e[2]);
            w.close();
        } catch (Exception e) {
            Log.logError(e, "Error saving " + FILE, false);
        }
    }

    private static synchronized boolean has(String kind, String value) {
        for (String[] e : extra) if (e[0].equals(kind) && e[1].equalsIgnoreCase(value)) return true;
        return false;
    }

    private static synchronized boolean add(String kind, String value, String name) {
        if (has(kind, value)) return false;
        extra.add(new String[] { kind, value.toLowerCase(), name == null ? "-" : name.toLowerCase() });
        save();
        return true;
    }

    private static synchronized boolean remove(String kind, String value) {
        boolean gone = extra.removeIf(e -> e[0].equals(kind) && e[1].equalsIgnoreCase(value));
        if (gone) save();
        return gone;
    }

    // Every {kind, value} recorded against a name.
    private static synchronized List<String[]> of(String name) {
        List<String[]> out = new ArrayList<String[]>();
        for (String[] e : extra) if (e[2].equalsIgnoreCase(name)) out.add(e);
        return out;
    }

    // Called as each connection comes in: a banned device is told and
    // turned away before it gets as far as logging in.
    static boolean refuse(Socket s) {
        String dev = BridgedSocket.deviceOf(s);
        if (dev == null || !has("device", dev)) return false;
        try {
            OutputStream out = s.getOutputStream();
            out.write("\u0003This device has been banned from this server.\n".getBytes("UTF-8"));
            out.flush();
            Log.logEvent("Rejected connection from banned device: " + dev);
            s.close();
        } catch (Exception e) {
            // Gone already.
        }
        return true;
    }

    // An address that is this machine: the bridge or funnel itself.
    static boolean local(String address) {
        try {
            InetAddress a = InetAddress.getByName(address.matches("[0-9A-Fa-f:.]+") ? address : "0.0.0.0");
            return a.isLoopbackAddress() || a.isAnyLocalAddress() || address.equalsIgnoreCase("localhost");
        } catch (Exception e) {
            return true; // not an address at all: don't ban it
        }
    }

    static Player online(DuskEngine engine, String name) {
        LivingThing t = engine.getPlayer(name);
        return t instanceof Player ? (Player) t : null;
    }

    static String addressOf(Player p) {
        return p.sckConnection.getInetAddress().getHostAddress();
    }

    // Disconnects everyone matching (address or device), with a message.
    private static int kick(DuskEngine engine, String kind, String value, String message) {
        List<Player> out = new ArrayList<Player>();
        synchronized (engine.vctSockets) {
            for (int i = 0; i < engine.vctSockets.size(); i++) {
                Player p = (Player) engine.vctSockets.elementAt(i);
                String v = kind.equals("ip") ? addressOf(p) : BridgedSocket.deviceOf(p.sckConnection);
                if (v != null && v.equalsIgnoreCase(value)) out.add(p);
            }
        }
        for (Player p : out) {
            p.chatMessage(message);
            p.close();
        }
        return out.size();
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String t = line.trim();
        String lower = t.toLowerCase();
        String cmd = lower.split("\\s+", 2)[0];
        String arg = t.length() > cmd.length() ? t.substring(cmd.length()).trim() : "";
        switch (cmd) {
            case "ban": case "unban": case "banip": case "bandevice": case "unbandevice": case "bans":
                break;
            default:
                return null;
        }
        if (who.privs < GOD_PRIVS) return null; // the server answers as it always has
        try {
            switch (cmd) {
                case "ban": return ban(who, engine, arg);
                case "unban": return unban(who, arg);
                case "banip": return banIp(who, engine, arg);
                case "bandevice": return banDevice(who, engine, arg);
                case "unbandevice": return unbanDevice(who, arg);
                default: return list(who);
            }
        } catch (Exception e) {
            Log.logError(e, "Error at Bans." + cmd, false);
            return "That didn't work: " + e.getMessage();
        }
    }

    private static String ban(LivingThing who, DuskEngine engine, String name) {
        if (name.isEmpty()) return "Ban who?";
        String lower = name.toLowerCase();
        boolean account = Player.addBanned(lower);
        StringBuilder said = new StringBuilder(account ? name + " has been banned." : name + " was already banned.");
        Player p = online(engine, name);
        if (p != null) {
            String ip = addressOf(p);
            if (!local(ip)) {
                Player.addBannedIP(ip);
                add("ip", ip, lower);
                said.append(" Their address (").append(ip).append(") too.");
            }
            String dev = BridgedSocket.deviceOf(p.sckConnection);
            if (dev != null) {
                add("device", dev, lower);
                said.append(" Their device too.");
            }
            p.chatMessage(who.strName + " has banned you from the server.");
            p.close();
        }
        Log.logEvent(who.strName + " banned account: " + lower + (p != null ? " (" + addressOf(p) + ")" : ""));
        return said.toString();
    }

    private static String unban(LivingThing who, String name) {
        if (name.isEmpty()) return "Unban who?";
        String lower = name.toLowerCase();
        boolean account = Player.removeBanned(lower);
        int n = 0;
        for (String[] e : of(lower)) {
            if (e[0].equals("ip")) Player.removeBannedIP(e[1]);
            remove(e[0], e[1]);
            n++;
        }
        if (!account && n == 0) return name + " is not currently banned.";
        Log.logEvent(who.strName + " unbanned account: " + lower);
        return name + " has been unbanned" + (n > 0 ? " (and the address and device banned with them)." : ".");
    }

    private static String banIp(LivingThing who, DuskEngine engine, String arg) {
        if (arg.isEmpty()) return "Ban what IP? (an address, or the name of a player online)";
        Player p = online(engine, arg);
        String ip = p != null ? addressOf(p) : arg;
        String name = p != null ? p.strName : null;
        if (local(ip)) {
            return p != null
                ? p.strName + " is connected from this machine (" + ip + "), not the internet, so their address can't be banned. Use ban or bandevice."
                : ip + " is this machine (everyone without a real address comes from it), so banning it would lock everyone out. Not banned.";
        }
        boolean added = Player.addBannedIP(ip);
        if (name != null) add("ip", ip, name);
        int kicked = kick(engine, "ip", ip, who.strName + " has banned your address from the server.");
        Log.logEvent(who.strName + " banned IP: " + ip + (name != null ? " (" + name + ")" : ""));
        return (added ? ip + " has been banned." : ip + " was already banned.") + (kicked > 0 ? " Disconnected " + kicked + "." : "");
    }

    private static String banDevice(LivingThing who, DuskEngine engine, String arg) {
        if (arg.isEmpty()) return "Ban whose device? (the name of a player online, or a device ID from bans)";
        Player p = online(engine, arg);
        String dev = p != null ? BridgedSocket.deviceOf(p.sckConnection) : arg.toLowerCase();
        if (p != null && dev == null) return p.strName + " isn't playing in a browser, so there's no device to ban. Use ban.";
        if (p == null && !dev.matches("[a-z0-9-]{8,64}")) return "No player called " + arg + " is online, and that isn't a device ID.";
        boolean added = add("device", dev, p != null ? p.strName : null);
        int kicked = kick(engine, "device", dev, who.strName + " has banned this device from the server.");
        Log.logEvent(who.strName + " banned device: " + dev + (p != null ? " (" + p.strName + ")" : ""));
        return (added ? "Device banned" : "That device was already banned") + (p != null ? " (" + p.strName + "'s)" : "") + "." + (kicked > 0 ? " Disconnected " + kicked + "." : "");
    }

    private static String unbanDevice(LivingThing who, String arg) {
        if (arg.isEmpty()) return "Unban which device? (an ID from bans)";
        if (!remove("device", arg)) return "That device isn't banned.";
        Log.logEvent(who.strName + " unbanned device: " + arg.toLowerCase());
        return "Device unbanned.";
    }

    // Sent a line at a time (one chat line per message).
    private static String list(LivingThing who) {
        List<String> accounts = read("conf/banned");
        List<String> ips = read("conf/bannedips");
        who.chatMessage("Banned accounts: " + (accounts.isEmpty() ? "none" : String.join(", ", accounts)));
        StringBuilder a = new StringBuilder();
        for (String ip : ips) {
            String whose = null;
            synchronized (Bans.class) { for (String[] e : extra) if (e[0].equals("ip") && e[1].equalsIgnoreCase(ip)) whose = e[2]; }
            a.append(a.length() > 0 ? ", " : "").append(ip).append(whose != null && !whose.equals("-") ? " (" + whose + ")" : "");
        }
        who.chatMessage("Banned addresses: " + (a.length() == 0 ? "none" : a.toString()));
        StringBuilder d = new StringBuilder();
        synchronized (Bans.class) {
            for (String[] e : extra) if (e[0].equals("device")) d.append(d.length() > 0 ? ", " : "").append(e[1]).append(e[2].equals("-") ? "" : " (" + e[2] + ")");
        }
        return "Banned devices: " + (d.length() == 0 ? "none" : d.toString());
    }

    private static List<String> read(String path) {
        List<String> out = new ArrayList<String>();
        try {
            File f = new File(path);
            if (!f.exists()) return out;
            BufferedReader r = new BufferedReader(new FileReader(f));
            String line;
            while ((line = r.readLine()) != null) if (!line.trim().isEmpty()) out.add(line.trim());
            r.close();
        } catch (Exception e) {
            // Shown as none.
        }
        return out;
    }
}
