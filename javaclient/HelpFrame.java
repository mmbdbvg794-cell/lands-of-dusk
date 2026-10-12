/*
 * The Help button's window in the Java client: a guide for playing with
 * this client, mostly the commands to type. The text comes from the game's
 * resource server (<rc address>javahelp.txt, so it can change without a new
 * jar), or the short guide below when that can't be read.
 *
 * Part of the browser client project (dusk-browser-client/javaclient).
 */
import java.awt.BorderLayout;
import java.awt.Button;
import java.awt.Color;
import java.awt.Font;
import java.awt.Frame;
import java.awt.Panel;
import java.awt.TextArea;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;

public class HelpFrame extends Frame {
    static final String FALLBACK =
        "DUSK - HELP FOR THE CLASSIC CLIENT\n\n"
        + "Type commands in the box at the bottom and press Enter.\n\n"
        + "talk                talk to the person next to you\n"
        + "  then type one of the answers shown in brackets, e.g. train me\n"
        + "mine                dig at the ore vein next to you (needs a mining pick)\n"
        + "mine stop           stop digging\n"
        + "smith               at a forge or anvil: what you can make\n"
        + "smith <item> [n]    make it, e.g. smith bronze bar 5\n\n"
        + "(The full guide couldn't be loaded from the server just now.)\n";

    static HelpFrame open;

    TextArea text = new TextArea("Loading the guide...", 30, 80, TextArea.SCROLLBARS_VERTICAL_ONLY);

    // Shows the guide, or brings it to the front if it's already open.
    public static void show(String rcAddress) {
        if (open != null && open.isDisplayable()) {
            open.toFront();
            return;
        }
        open = new HelpFrame(rcAddress);
    }

    HelpFrame(final String rcAddress) {
        super("Dusk - Help");
        setLayout(new BorderLayout());
        text.setEditable(false);
        text.setBackground(Color.white);
        text.setFont(new Font("Monospaced", Font.PLAIN, 13));
        add(text, BorderLayout.CENTER);
        Panel bottom = new Panel();
        Button close = new Button("Close");
        close.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                dispose();
            }
        });
        bottom.add(close);
        add(bottom, BorderLayout.SOUTH);
        addWindowListener(new WindowAdapter() {
            public void windowClosing(WindowEvent e) {
                dispose();
            }
        });
        setSize(700, 560);
        setVisible(true);
        new Thread(new Runnable() {
            public void run() {
                String got = fetch(rcAddress);
                text.setText(got != null ? got : FALLBACK);
                text.setCaretPosition(0);
            }
        }, "Help").start();
    }

    static String fetch(String rcAddress) {
        if (rcAddress == null || rcAddress.length() == 0) return null;
        try {
            URLConnection c = new URL(rcAddress + (rcAddress.endsWith("/") ? "" : "/") + "javahelp.txt").openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setUseCaches(false);
            BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
            StringBuilder b = new StringBuilder();
            for (String line; (line = in.readLine()) != null && b.length() < 100000;) b.append(line).append('\n');
            in.close();
            return b.length() > 0 ? b.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
