/*
 * Houses to rent (Kingshaven's Lantern Row, tools/world/cities/capital.mjs).
 *
 * The city's plan writes the "housing" file in the game directory, a line
 * per house: id|door x|door y|price|days. A house's door only lets through
 * whoever holds its flag, house_<id> (a who-may-step rule); renting gives
 * the flag, and the flag timers (server/Quests.java) take it away when the
 * rent runs out. Who rents what is kept in "houses": id|player|until (ms).
 *
 * Only a conversation can rent (the landlord's: js/dialogue.js "rent"): it
 * gives the hidden condition rentnow, then
 *   order trigger "house rent"   rents the first free house, or renews the
 *                                player's own (up to three weeks ahead),
 *                                for its price
 *   order trigger "house info"   says which house is theirs, and till when
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Housing {
    static final String HOUSES = "housing", RENTS = "houses", FLAG = "rentnow";
    static final long DAY = 24L * 60 * 60 * 1000;
    static final long AHEAD = 21 * DAY; // the most one can have paid ahead

    static class House {
        String id;
        int x, y, price, days;
        String owner;
        long until;
    }

    public static void start(DuskEngine engine) {
        try {
            File cond = new File("defConditions", FLAG);
            if (!cond.exists()) Talk.write(cond, "nodisplay\n.\n".getBytes("UTF-8"));
        } catch (Exception e) {
            Log.logError(e, "Housing: making defConditions/" + FLAG, false);
        }
    }

    public static String command(LivingThing who, DuskEngine engine, String line) {
        String lower = line.trim().toLowerCase();
        if (!lower.equals("house rent") && !lower.equals("house info")) return null;
        // Only from a conversation that just gave the hidden flag.
        if (!who.hasCondition(FLAG)) return null;
        who.removeCondition(FLAG);
        // Ordered by a script, a command's answer goes nowhere: say it.
        String said;
        try {
            synchronized (Housing.class) {
                List<House> houses = load();
                if (houses.isEmpty()) said = "There are no houses to let here.";
                else said = lower.endsWith("info") ? info(who, houses) : rent(who, engine, houses);
            }
        } catch (Exception e) {
            Log.logError(e, "Housing: " + line + " for " + who.strName, false);
            said = "The landlord fumbles with his keys. Try again.";
        }
        who.chatMessage(said + "\n");
        return "";
    }

    static String date(long ms) {
        return new SimpleDateFormat("EEEE d MMMM").format(new Date(ms));
    }

    static House mine(String name, List<House> houses) {
        long now = System.currentTimeMillis();
        for (House h : houses) if (h.owner != null && h.owner.equalsIgnoreCase(name) && h.until > now) return h;
        return null;
    }

    static String info(LivingThing who, List<House> houses) {
        House h = mine(who.strName, houses);
        if (h == null) return "Landlord Crake says: You don't rent a house from me. Yet.";
        return "Landlord Crake says: You rent house " + h.id + ", its door at " + h.x + ", " + h.y + ", until " + date(h.until) + ".";
    }

    static String rent(LivingThing who, DuskEngine engine, List<House> houses) throws Exception {
        long now = System.currentTimeMillis();
        House h = mine(who.strName, houses);
        boolean renewing = h != null;
        if (renewing && h.until - now >= AHEAD) return "Landlord Crake says: You've paid three weeks ahead already. Come back later.";
        if (!renewing) {
            for (House f : houses) if (f.owner == null || f.until <= now) { h = f; break; }
            if (h == null) return "Landlord Crake says: Every house on the row is let. Try me another day.";
        }
        if (who.cash < h.price) return "Landlord Crake says: It's " + h.price + " gold a week. Come back when you have it.";
        who.cash -= h.price;
        h.until = (renewing ? h.until : now) + h.days * DAY;
        h.owner = who.strName;
        save(houses);
        String flag = "house_" + h.id;
        if (!who.hasCondition(flag)) {
            Condition c = engine.getCondition(flag);
            if (c != null) who.addCondition(c);
        }
        Quests.setTimer(who.strName, flag, h.until);
        who.updateStats();
        Log.logEvent(who.strName + (renewing ? " renewed" : " rented") + " house " + h.id + " until " + date(h.until));
        if (renewing) return "Landlord Crake says: Renewed: house " + h.id + " is yours until " + date(h.until) + ". (" + h.price + " gold)";
        return "Landlord Crake says: Here's your key. House " + h.id + ", its door at " + h.x + ", " + h.y + ", is yours until " + date(h.until)
            + ". Only you can open it. Sleep in your own bed, and come back to renew. (" + h.price + " gold)";
    }

    static List<House> load() throws Exception {
        List<House> out = new ArrayList<House>();
        File f = new File(HOUSES);
        if (!f.isFile()) return out;
        Map<String, House> byId = new LinkedHashMap<String, House>();
        for (String line : Files.readAllLines(f.toPath(), StandardCharsets.ISO_8859_1)) {
            String l = line.trim();
            if (l.isEmpty() || l.startsWith("#")) continue;
            String[] p = l.split("\\|");
            if (p.length < 5) continue;
            House h = new House();
            h.id = p[0].trim();
            h.x = Integer.parseInt(p[1].trim());
            h.y = Integer.parseInt(p[2].trim());
            h.price = Integer.parseInt(p[3].trim());
            h.days = Integer.parseInt(p[4].trim());
            byId.put(h.id, h);
            out.add(h);
        }
        File r = new File(RENTS);
        if (r.isFile()) {
            for (String line : Files.readAllLines(r.toPath(), StandardCharsets.ISO_8859_1)) {
                String[] p = line.trim().split("\\|");
                if (p.length != 3 || !byId.containsKey(p[0])) continue;
                House h = byId.get(p[0]);
                h.owner = p[1];
                h.until = Long.parseLong(p[2]);
            }
        }
        return out;
    }

    static void save(List<House> houses) throws Exception {
        StringBuilder b = new StringBuilder();
        for (House h : houses) if (h.owner != null) b.append(h.id).append('|').append(h.owner).append('|').append(h.until).append('\n');
        Talk.write(new File(RENTS), b.toString().getBytes("UTF-8"));
    }
}
