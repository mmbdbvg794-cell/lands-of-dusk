/*
 * Decompiled with CFR 0.152.
 */
import java.awt.Button;
import java.awt.Checkbox;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Frame;
import java.awt.Label;
import java.awt.List;
import java.awt.Point;
import java.awt.TextField;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.RandomAccessFile;
import java.util.Vector;

public class ConnectFrame
extends Frame {
    Vector vctBookmarks;
    Dusk appParent;
    List lstBookmarks = new List();
    Button btnConnect = new Button();
    TextField txtName = new TextField();
    TextField txtAddress = new TextField();
    Label lblAddress = new Label();
    TextField txtPort = new TextField();
    Label lblPort = new Label();
    Button btnBookmark = new Button();
    Button btnRemove = new Button();
    Checkbox chkTLS = new Checkbox("Use secure connection (TLS)");
    private boolean mShown = false;

    public ConnectFrame(Dusk inParent) {
        this.appParent = inParent;
        this.vctBookmarks = new Vector(0);
        try {
            RandomAccessFile rafBookmarks = new RandomAccessFile("bookmarks", "r");
            while (true) {
                Bookmark bkmStore = new Bookmark(rafBookmarks.readLine(), Integer.parseInt(rafBookmarks.readLine()));
                this.vctBookmarks.addElement(bkmStore);
            }
        }
        catch (Exception rafBookmarks) {
            this.lstBookmarks.removeAll();
            for (int i = 0; i < this.vctBookmarks.size(); ++i) {
                this.lstBookmarks.addItem(((Bookmark)this.vctBookmarks.elementAt(i)).toString());
            }
            try {
                this.initComponents();
            }
            catch (Exception e) {
                System.err.println("Error at ConnectFrame.initComponents: ".concat(String.valueOf(String.valueOf(e.toString()))));
            }
            return;
        }
    }

    public void initComponents() throws Exception {
        this.lstBookmarks.setLocation(new Point(160, 20));
        this.lstBookmarks.setVisible(true);
        this.lstBookmarks.setSize(new Dimension(180, 140));
        this.lstBookmarks.setBackground(this.appParent.frame.textbackground);
        this.btnConnect.setLabel("Connect");
        this.btnConnect.setLocation(new Point(10, 160));
        this.btnConnect.setVisible(true);
        this.btnConnect.setSize(new Dimension(140, 20));
        this.txtName.setText("New Dusk");
        this.txtName.setLocation(new Point(10, 30));
        this.txtName.setVisible(true);
        this.txtName.setSize(new Dimension(140, 20));
        this.txtName.setBackground(this.appParent.frame.textbackground);
        String strLastAddress = "dusk.wesowin.org";
        String strLastPort = "7423";
        boolean blnLastTLS = false;
        try {
            RandomAccessFile rafLast = new RandomAccessFile("lastconnect", "r");
            strLastAddress = rafLast.readLine();
            strLastPort = rafLast.readLine();
            String strLastTLS = rafLast.readLine();
            blnLastTLS = strLastTLS != null && strLastTLS.equals("true");
            rafLast.close();
        }
        catch (Exception e) {
            // No saved last-connection file yet - fall back to defaults above.
        }
        this.txtAddress.setText(strLastAddress);
        this.txtAddress.setLocation(new Point(10, 30));
        this.txtAddress.setVisible(true);
        this.txtAddress.setSize(new Dimension(140, 20));
        this.txtAddress.setBackground(this.appParent.frame.textbackground);
        this.lblAddress.setText("Server Address:");
        this.lblAddress.setLocation(new Point(20, 10));
        this.lblAddress.setVisible(true);
        this.lblAddress.setSize(new Dimension(120, 20));
        this.txtPort.setText(strLastPort);
        this.txtPort.setLocation(new Point(10, 70));
        this.txtPort.setVisible(true);
        this.txtPort.setSize(new Dimension(60, 20));
        this.txtPort.setBackground(this.appParent.frame.textbackground);
        this.lblPort.setText("Port:");
        this.lblPort.setLocation(new Point(20, 50));
        this.lblPort.setVisible(true);
        this.lblPort.setSize(new Dimension(50, 20));
        this.chkTLS.setState(blnLastTLS);
        this.chkTLS.setLocation(new Point(10, 95));
        this.chkTLS.setVisible(true);
        this.chkTLS.setSize(new Dimension(180, 20));
        this.btnBookmark.setLabel("Add Bookmark");
        this.btnBookmark.setLocation(new Point(10, 120));
        this.btnBookmark.setVisible(true);
        this.btnBookmark.setSize(new Dimension(140, 20));
        this.btnRemove.setLabel("Remove Bookmark");
        this.btnRemove.setLocation(new Point(10, 140));
        this.btnRemove.setVisible(true);
        this.btnRemove.setSize(new Dimension(140, 20));
        ((Component)this).setLocation(new Point(0, 0));
        this.setTitle("frmConnect");
        this.setLayout(null);
        ((Component)this).setSize(new Dimension(350, 220));
        this.add(this.btnConnect);
        this.add(this.txtAddress);
        this.add(this.lblAddress);
        this.add(this.txtPort);
        this.add(this.lblPort);
        this.add(this.chkTLS);
        this.add(this.btnBookmark);
        this.add(this.btnRemove);
        this.add(this.lstBookmarks);
        ((Component)this).setBackground(this.appParent.frame.background);
        this.lstBookmarks.addActionListener(new ActionListener(){

            public void actionPerformed(ActionEvent e) {
                ConnectFrame.this.lstBookmarksActionPerformed(e);
            }
        });
        this.btnConnect.addActionListener(new ActionListener(){

            public void actionPerformed(ActionEvent e) {
                ConnectFrame.this.btnConnectActionPerformed(e);
            }
        });
        this.btnBookmark.addActionListener(new ActionListener(){

            public void actionPerformed(ActionEvent e) {
                ConnectFrame.this.btnBookmarkActionPerformed(e);
            }
        });
        this.btnRemove.addActionListener(new ActionListener(){

            public void actionPerformed(ActionEvent e) {
                ConnectFrame.this.btnRemoveActionPerformed(e);
            }
        });
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                ConnectFrame.this.thisWindowClosing(e);
            }
        });
    }

    public void addNotify() {
        super.addNotify();
        if (this.mShown) {
            return;
        }
        this.mShown = true;
    }

    void thisWindowClosing(WindowEvent e) {
        ((Component)this).setVisible(false);
    }

    public void btnBookmarkActionPerformed(ActionEvent e) {
        this.vctBookmarks.addElement(new Bookmark(this.txtAddress.getText(), Integer.parseInt(this.txtPort.getText())));
        this.lstBookmarks.removeAll();
        for (int i = 0; i < this.vctBookmarks.size(); ++i) {
            this.lstBookmarks.addItem(((Bookmark)this.vctBookmarks.elementAt(i)).toString());
        }
        try {
            RandomAccessFile rafBookmarks = new RandomAccessFile("bookmarks", "rw");
            for (int i = 0; i < this.vctBookmarks.size(); ++i) {
                Bookmark bkmStore = (Bookmark)this.vctBookmarks.elementAt(i);
                rafBookmarks.writeBytes(String.valueOf(String.valueOf(bkmStore.strAddress)).concat("\n"));
                rafBookmarks.writeBytes(String.valueOf(String.valueOf(new StringBuffer("").append(bkmStore.port).append("\n"))));
            }
        }
        catch (Exception exc) {
            System.err.println("Error writing bookmarks: ".concat(String.valueOf(String.valueOf(e.toString()))));
        }
    }

    public void btnRemoveActionPerformed(ActionEvent e) {
        try {
            this.vctBookmarks.removeElementAt(this.lstBookmarks.getSelectedIndex());
            this.lstBookmarks.removeAll();
            for (int i = 0; i < this.vctBookmarks.size(); ++i) {
                this.lstBookmarks.addItem(((Bookmark)this.vctBookmarks.elementAt(i)).toString());
            }
            try {
                RandomAccessFile rafBookmarks = new RandomAccessFile("bookmarks", "rw");
                for (int i = 0; i < this.vctBookmarks.size(); ++i) {
                    Bookmark bkmStore = (Bookmark)this.vctBookmarks.elementAt(i);
                    rafBookmarks.writeBytes(String.valueOf(String.valueOf(bkmStore.strAddress)).concat("\n"));
                    rafBookmarks.writeBytes(String.valueOf(String.valueOf(new StringBuffer("").append(bkmStore.port).append("\n"))));
                }
            }
            catch (Exception exc) {
                System.err.println("Error writing bookmarks: ".concat(String.valueOf(String.valueOf(e.toString()))));
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
    }

    public void btnConnectActionPerformed(ActionEvent e) {
        if (this.appParent.blnConnected) {
            return;
        }
        this.appParent.address = this.txtAddress.getText();
        this.appParent.port = Integer.parseInt(this.txtPort.getText());
        this.appParent.blnUseTLS = this.chkTLS.getState();
        try {
            RandomAccessFile rafLast = new RandomAccessFile("lastconnect", "rw");
            rafLast.setLength(0L);
            rafLast.writeBytes(this.appParent.address + "\n");
            rafLast.writeBytes(this.appParent.port + "\n");
            rafLast.writeBytes(this.appParent.blnUseTLS + "\n");
            rafLast.close();
        }
        catch (Exception exc) {
            System.err.println("Error writing lastconnect: ".concat(String.valueOf(String.valueOf(exc.toString()))));
        }
        this.appParent.connect();
    }

    public void lstBookmarksActionPerformed(ActionEvent e) {
        try {
            Bookmark bkmStore = (Bookmark)this.vctBookmarks.elementAt(this.lstBookmarks.getSelectedIndex());
            this.txtAddress.setText(bkmStore.strAddress);
            this.txtPort.setText("".concat(String.valueOf(String.valueOf(bkmStore.port))));
        }
        catch (Exception exception) {
            // empty catch block
        }
    }
}

