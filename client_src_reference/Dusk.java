/*
 * Decompiled with CFR 0.152.
 */
import java.applet.Applet;
import java.applet.AudioClip;
import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.Point;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentEvent;
import java.awt.event.ComponentListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.WindowEvent;
import java.awt.image.ImageObserver;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.Socket;
import javax.net.ssl.SSLSocketFactory;
import java.net.URL;
import java.util.Enumeration;
import java.util.Vector;

public class Dusk
implements Runnable,
MouseListener,
KeyListener,
ComponentListener,
ActionListener,
ImageObserver {
    static String strVersion = "2.7.3";
    int numSpriteImages;
    int numPlayerImages;
    int numMapImages;
    int MapRows = 0;
    int MapColumns = 0;
    int ID;
    int targetID = -1;
    int LocX = 0;
    int LocY = 0;
    int inthp;
    int intmaxhp;
    int intsp;
    int intmaxsp;
    int range = 1;
    String strTile = "-1";
    long loncash;
    boolean blnLoaded;
    boolean blnMenuRefresh;
    boolean blnConnected = false;
    boolean blnApplet;
    boolean blnListLoaded = false;
    boolean blnLoadingList = false;
    boolean blnEditorMode = false;
    boolean blnShowTileEditor = false;
    boolean hideAllNames = false;
    int intMusicTypes;
    int[] intNumSongs;
    AudioClip[] audSFX;
    AudioClip[][] audMusic;
    AudioClip audMusicPlaying;
    Applet appShell;
    String strRCAddress;
    Vector vctMerchantItems;
    Vector vctSell;
    Vector vctChoiceDropItems;
    Vector vctChoiceActionItems;
    Vector vctEntities;
    Vector vctItems;
    Image imgOriginalSprites;
    Image imgOriginalPlayers;
    Image imgOriginalMap;
    Image imgSprites;
    Image imgPlayers;
    Image imgMap;
    Image imgEditorMap;
    Image imgDisplay;
    Image imgEditorDisplay;
    Socket sckConnection;
    DataOutputStream stmOut;
    DataInputStream stmIn;
    short[][] shrMap;
    int mapSize = 11;
    int editorSize = 11;
    int viewRange = 5;
    Entity[][] entEntities;
    Entity[][] entBuffer;
    Entity[] equipArray;
    String[] equipLocArray = new String[]{"Wielded", "Arms", "Legs", "Torso", "Waist", "Neck", "Skull", "Eyes", "Hands"};
    boolean intStep;
    boolean blnMusic = true;
    boolean allowCommands = true;
    boolean blnStarting = true;
    Thread thrRun;
    int intImageSize = 36;
    int intEditorImageSize = 36;
    int intEditorPanel = 0;
    final int MOB = 0;
    final int ITEM = 1;
    final int SIGN = 2;
    final int PROP = 3;
    final int MERC = 4;
    final int DOOR = 5;
    String strSet = null;
    String sEditorCommand = null;
    MainFrame frame;
    MerchantFrame frmMerchant;
    Graphics g1;
    Graphics g2;
    Graphics gD;
    Graphics gED;
    GraphicsThread thrGraphics;
    String address = "dusk.wesowin.org";
    int port = 7423;
    boolean blnUseTLS = false;

    public Dusk(Applet parent) {
        this.appShell = parent;
        this.blnApplet = true;
        this.startUp();
    }

    public Dusk() {
        this.startUp();
    }

    void startUp() {
        try {
            this.frame = new MainFrame(this);
            this.frame.initComponents();
            ((Component)this.frame).setVisible(true);
            this.addText(String.valueOf(String.valueOf(new StringBuffer("Dusk Client v").append(strVersion).append(" -- http://dusk.wesowin.org/\n"))));
            this.addText(String.valueOf(String.valueOf(new StringBuffer("You are using Java version ").append(System.getProperty("java.version")).append("\n"))));
            this.frame.txtInput.addKeyListener(this);
            this.frame.addComponentListener(this);
            this.frame.pnlGraphics.addMouseListener(this);
            this.frame.pnlEditorGraphics.addMouseListener(this);
            this.frame.pnlGraphics.addKeyListener(this);
            this.scaleWindow();
            try {
                if (this.blnApplet) {
                    this.frame.btnEquipment.repaint();
                    this.frame.btnMerchant.repaint();
                    this.frame.btnQuit.repaint();
                    this.paint();
                } else {
                    this.frame.btnConnect.repaint();
                    this.frame.btnEquipment.repaint();
                    this.frame.btnMerchant.repaint();
                    this.frame.btnQuit.repaint();
                    this.paint();
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
            if (this.blnApplet) {
                this.address = this.appShell.getParameter("address");
                this.port = Integer.parseInt(this.appShell.getParameter("port"));
                this.connect();
            } else {
                this.addText(255, 0, 0, "Click \"connect\" to connect to a server and begin playing.\n");
            }
            this.thrGraphics = new GraphicsThread(this);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        new Dusk();
    }

    void connect() {
        try {
            if (this.blnUseTLS) {
                this.sckConnection = SSLSocketFactory.getDefault().createSocket(this.address, this.port);
            } else {
                this.sckConnection = new Socket(this.address, this.port);
            }
            this.stmOut = new DataOutputStream(this.sckConnection.getOutputStream());
            this.stmIn = new DataInputStream(this.sckConnection.getInputStream());
            this.addText("Please enter your character name or the name of a new character: \n");
            this.thrRun = new Thread(this);
            this.thrRun.start();
            this.blnConnected = true;
            this.entEntities = new Entity[this.mapSize][this.mapSize];
            this.frmMerchant = new MerchantFrame(this);
            this.vctEntities = new Vector(0, 3);
            this.vctMerchantItems = new Vector(0, 3);
            this.vctSell = new Vector(0, 3);
            this.vctChoiceDropItems = new Vector(0, 3);
            this.vctChoiceActionItems = new Vector(0, 3);
            this.vctItems = new Vector(0, 5);
            this.equipArray = new Entity[9];
        }
        catch (Exception e) {
            System.err.println("Error connecting to server: ".concat(String.valueOf(String.valueOf(e.toString()))));
            this.addText(String.valueOf(String.valueOf(new StringBuffer("Error connecting to server: ").append(e.toString()).append("\n"))));
            return;
        }
    }

    void addText(String strAdd) {
        this.addText(0, 0, 0, strAdd);
    }

    void addText(int red, int green, int blue, String strAdd) {
        if (this.frame.txtOutput.getText().length() > 7500) {
            this.frame.txtOutput.setText(this.frame.txtOutput.getText().substring(this.frame.txtOutput.getText().length() - 5000));
        }
        try {
            this.frame.txtOutput.appendText(strAdd);
        }
        catch (Exception e) {
            System.err.println(e.toString());
        }
        this.frame.txtOutput.setCaretPosition(this.frame.txtOutput.getText().length() - 1);
    }

    void addEntity(Entity entStore) {
        Vector vector = this.vctEntities;
        synchronized (vector) {
            entStore.intNum = 0;
            Entity entStore2 = null;
            int i = 0;
            int i2 = 0;
            double xloc = entStore.intLocX - (double)this.LocX + (double)this.viewRange;
            double yloc = entStore.intLocY - (double)this.LocY + (double)this.viewRange;
            if (entStore.intMoveDirection != -1) {
                switch (entStore.intMoveDirection) {
                    case 0: {
                        yloc -= 0.5;
                        break;
                    }
                    case 1: {
                        yloc += 0.5;
                        break;
                    }
                    case 2: {
                        xloc -= 0.5;
                        break;
                    }
                    case 3: {
                        xloc += 0.5;
                    }
                }
            }
            if (xloc > (double)this.mapSize || yloc > (double)this.mapSize || xloc < 0.0 || yloc < 0.0) {
                try {
                    Commands.parseCommand(this, String.valueOf(String.valueOf(new StringBuffer("rement ").append(entStore.ID).append("\n"))));
                }
                catch (Exception exception) {
                    // empty catch block
                }
                this.reloadChoiceLook();
                return;
            }
            i = 0;
            while ((double)i < xloc) {
                for (i2 = 0; i2 < this.mapSize; ++i2) {
                    entStore2 = this.entEntities[i][i2];
                    while (entStore2 != null) {
                        if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                            ++entStore.intNum;
                        }
                        entStore2 = entStore2.entNext;
                    }
                }
                ++i;
            }
            i2 = 0;
            while ((double)i2 < yloc + 1.0) {
                entStore2 = this.entEntities[(int)xloc][i2];
                if (entStore2 != null) {
                    if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                        ++entStore.intNum;
                    }
                    while (entStore2.entNext != null) {
                        if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                            ++entStore.intNum;
                        }
                        entStore2 = entStore2.entNext;
                    }
                }
                ++i2;
            }
            if (entStore2 == null) {
                this.entEntities[(int)xloc][(int)yloc] = entStore;
            } else {
                entStore2.entNext = entStore;
            }
            this.vctEntities.addElement(entStore);
            for (i = (int)xloc; i < this.mapSize; ++i) {
                while (i2 < this.mapSize) {
                    entStore2 = this.entEntities[i][i2];
                    while (entStore2 != null) {
                        if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                            ++entStore2.intNum;
                        }
                        entStore2 = entStore2.entNext;
                    }
                    ++i2;
                }
                i2 = 0;
            }
        }
    }

    void removeEntity(long lngStore) {
        Entity entStore = null;
        int intStore2 = 0;
        boolean blnBreak = false;
        Vector vector = this.vctEntities;
        synchronized (vector) {
            Entity entStore2;
            int intStore;
            for (intStore = 0; intStore < this.mapSize && !blnBreak; ++intStore) {
                for (intStore2 = 0; intStore2 < this.mapSize && !blnBreak; ++intStore2) {
                    entStore2 = this.entEntities[intStore][intStore2];
                    if (entStore2 == null) continue;
                    if ((long)entStore2.ID == lngStore) {
                        this.vctEntities.removeElement(entStore2);
                        this.entEntities[intStore][intStore2] = entStore2.entNext;
                        entStore = entStore2;
                        entStore2 = entStore2.entNext;
                        while (entStore2 != null) {
                            if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                                --entStore2.intNum;
                            }
                            entStore2 = entStore2.entNext;
                        }
                        blnBreak = true;
                        continue;
                    }
                    while (entStore2.entNext != null) {
                        if ((long)entStore2.entNext.ID == lngStore) {
                            this.vctEntities.removeElement(entStore2.entNext);
                            entStore = entStore2.entNext;
                            entStore2.entNext = entStore2.entNext.entNext;
                            blnBreak = true;
                            while (entStore2.entNext != null) {
                                if (entStore.strName.equalsIgnoreCase(entStore2.entNext.strName)) {
                                    --entStore2.entNext.intNum;
                                }
                                entStore2 = entStore2.entNext;
                            }
                            continue;
                        }
                        entStore2 = entStore2.entNext;
                    }
                }
            }
            if (entStore != null) {
                --intStore;
                while (intStore < this.mapSize) {
                    while (intStore2 < this.mapSize) {
                        entStore2 = this.entEntities[intStore][intStore2];
                        while (entStore2 != null) {
                            if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                                --entStore2.intNum;
                            }
                            entStore2 = entStore2.entNext;
                        }
                        ++intStore2;
                    }
                    intStore2 = 0;
                    ++intStore;
                }
                this.vctEntities.removeElement(entStore);
            }
        }
    }

    void removeEntity(Entity entStore) {
        Vector vector = this.vctEntities;
        synchronized (vector) {
            Entity entStore2;
            this.vctEntities.removeElement(entStore);
            double dblStore = entStore.intLocX - (double)this.LocX + (double)this.viewRange;
            double dblStore2 = entStore.intLocY - (double)this.LocY + (double)this.viewRange;
            if (entStore.intMoveDirection != -1) {
                switch (entStore.intMoveDirection) {
                    case 0: {
                        dblStore2 -= 0.5;
                        break;
                    }
                    case 1: {
                        dblStore2 += 0.5;
                        break;
                    }
                    case 2: {
                        dblStore -= 0.5;
                        break;
                    }
                    case 3: {
                        dblStore += 0.5;
                        break;
                    }
                }
            }
            try {
                entStore2 = this.entEntities[(int)dblStore][(int)dblStore2];
                if (entStore2 == null) {
                    return;
                }
                if (entStore == entStore2) {
                    this.entEntities[(int)dblStore][(int)dblStore2] = entStore.entNext;
                    entStore.entNext = null;
                } else {
                    while (entStore2.entNext != null && entStore2.entNext != entStore) {
                        entStore2 = entStore2.entNext;
                    }
                    if (entStore2.entNext == null) {
                        return;
                    }
                    entStore2.entNext = entStore2.entNext.entNext;
                    entStore.entNext = null;
                    entStore2 = entStore2.entNext;
                }
                while (entStore2 != null) {
                    if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                        --entStore2.intNum;
                    }
                    entStore2 = entStore2.entNext;
                }
            }
            catch (Exception exception) {
                // empty catch block
            }
            if (dblStore < 0.0) {
                dblStore = 0.0;
            }
            dblStore2 = dblStore2 < 0.0 ? 0.0 : (dblStore2 += 1.0);
            while (dblStore < (double)this.mapSize) {
                while (dblStore2 < (double)this.mapSize) {
                    entStore2 = this.entEntities[(int)dblStore][(int)dblStore2];
                    while (entStore2 != null) {
                        if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                            --entStore2.intNum;
                        }
                        entStore2 = entStore2.entNext;
                    }
                    dblStore2 += 1.0;
                }
                dblStore2 = 0.0;
                dblStore += 1.0;
            }
        }
    }

    void removeEntityFromBuffer(Entity entStore) {
        Vector vector = this.vctEntities;
        synchronized (vector) {
            Entity entStore2;
            this.vctEntities.removeElement(entStore);
            int intStore = (int)entStore.intLocX - this.LocX + this.viewRange;
            int intStore2 = (int)entStore.intLocY - this.LocY + this.viewRange;
            try {
                entStore2 = this.entBuffer[intStore][intStore2];
                while (entStore2 != entStore) {
                    entStore2 = entStore2.entNext;
                }
                entStore2 = entStore2.entNext;
                while (entStore2 != null) {
                    if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                        --entStore2.intNum;
                    }
                    entStore2 = entStore2.entNext;
                }
            }
            catch (Exception exception) {
                // empty catch block
            }
            if (intStore < 0) {
                intStore = 0;
            }
            intStore2 = intStore2 < 0 ? 0 : ++intStore2;
            while (intStore < this.mapSize) {
                while (intStore2 < this.mapSize) {
                    entStore2 = this.entBuffer[intStore][intStore2];
                    while (entStore2 != null) {
                        if (entStore.strName.equalsIgnoreCase(entStore2.strName)) {
                            --entStore2.intNum;
                        }
                        entStore2 = entStore2.entNext;
                    }
                    ++intStore2;
                }
                intStore2 = 0;
                ++intStore;
            }
        }
    }

    /*
     * Unable to fully structure code
     */
    public void run() {
        boolean blnBreak;
        int changeLocX, changeLocY;
        Entity entStore;
        Entity entity;
        EditFrame frmEdit;
        int hp;
        int i, i2;
        byte incoming;
        long ID;
        int intID;
        int intStore, intStore2;
        long lngStore;
        String sTitle;
        String strStore, strStore2;
        String v4, v5;
        Vector var12_11, var12_12;
        Vector lockObj, lockObj2, lockObj3, lockObj4;
        entStore = null;
        intStore = 0;
        incoming = 0;
        blnBreak = false;
        block125: while (incoming != -1) {
            try {
                incoming = this.stmIn.readByte();
                switch (incoming) {
                    case 0: {
                        this.blnLoaded = false;
                        this.blnConnected = false;
                        this.sckConnection.close();
                        return;
                    }
                    case 1: {
                        this.strRCAddress = this.stmIn.readLine();
                        try {
                            this.thrGraphics.thread.stop();
                        }
                        catch (Exception var12_10) {
                            // empty catch block
                        }
                        this.thrGraphics.thread = new Thread(this.thrGraphics);
                        this.thrGraphics.thread.start();
                        continue block125;
                    }
                    case 2: {
                        if (this.blnStarting) {
                            this.allowCommands = false;
                            this.blnStarting = false;
                        }
                        var12_11 = this.vctEntities;
                        synchronized (var12_11) {
                            changeLocX = Integer.parseInt(this.stmIn.readLine()) - this.LocX;
                            changeLocY = Integer.parseInt(this.stmIn.readLine()) - this.LocY;
                            this.LocX += changeLocX;
                            this.LocY += changeLocY;
                            for (i = 0; i < this.mapSize; ++i) {
                                for (i2 = 0; i2 < this.mapSize; ++i2) {
                                    this.shrMap[i][i2] = Short.parseShort(this.stmIn.readLine());
                                }
                            }
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if (!(Math.abs(entStore.intLocX - (double)this.LocX) > (double)this.viewRange) && !(Math.abs(entStore.intLocY - (double)this.LocY) > (double)this.viewRange)) continue;
                                this.vctEntities.removeElementAt(i);
                                --i;
                            }
                            this.entBuffer = this.entEntities;
                            this.entEntities = new Entity[this.mapSize][this.mapSize];
                            for (i = 0; i < this.mapSize; ++i) {
                                for (i2 = 0; i2 < this.mapSize; ++i2) {
                                    entStore = this.entBuffer[i][i2];
                                    if (entStore == null) continue;
                                    try {
                                        this.entEntities[i - changeLocX][i2 - changeLocY] = entStore;
                                        continue;
                                    }
                                    catch (Exception e) {
                                        do {
                                            this.removeEntityFromBuffer(entStore);
                                        } while ((entStore = entStore.entNext) != null);
                                    }
                                }
                            }
                            this.frame.lblInfo.setText(String.valueOf(String.valueOf(new StringBuffer("HP: ").append(this.inthp).append("/").append(this.intmaxhp).append(" MP: ").append(this.intsp).append("/").append(this.intmaxsp).append(" Loc: ").append(this.LocX).append("/").append(this.LocY))));
                            boolean blnOnMerchant = false;
                            for (int checkI = 0; checkI < this.vctEntities.size(); ++checkI) {
                                Entity entCheck = (Entity)this.vctEntities.elementAt(checkI);
                                if (entCheck.intType == 2 && (int)entCheck.intLocX == this.LocX && (int)entCheck.intLocY == this.LocY) {
                                    blnOnMerchant = true;
                                    break;
                                }
                            }
                            this.frame.btnMerchant.setEnabled(blnOnMerchant);
                            this.vctMerchantItems = new Vector(0, 5);
                            this.reloadChoiceLook();
                            this.reloadChoiceGet();
                            this.reloadChoiceAttack();
                            this.update();
                            this.paint();
                            continue block125;
                        }
                    }
                    case 3: {
                        this.addText(String.valueOf(String.valueOf(this.stmIn.readLine())).concat("\n"));
                        continue block125;
                    }
                    case 4: {
                        var12_12 = this.vctEntities;
                        synchronized (var12_12) {
                            strStore = this.stmIn.readLine();
                            intStore = Byte.parseByte(this.stmIn.readLine());
                            if (intStore != 0) {
                                try {
                                    entStore = new Entity(strStore, Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), -1, intStore, this.stmIn.readLine());
                                    if (entStore.intType == 0 || entStore.intType == 4) {
                                        entStore.hp = Integer.parseInt(this.stmIn.readLine());
                                        entStore.maxhp = Integer.parseInt(this.stmIn.readLine());
                                    }
                                }
                                catch (NullPointerException e) {
                                    entStore = null;
                                }
                            } else {
                                try {
                                    entStore = new Entity(strStore, Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), Integer.parseInt(this.stmIn.readLine()), intStore, this.stmIn.readLine());
                                    if (entStore.intType == 0 || entStore.intType == 4) {
                                        entStore.hp = Integer.parseInt(this.stmIn.readLine());
                                        entStore.maxhp = Integer.parseInt(this.stmIn.readLine());
                                    }
                                }
                                catch (NullPointerException e) {
                                    entStore = null;
                                }
                            }
                            if (entStore != null) {
                                this.addEntity(entStore);
                            }
                            this.reloadChoiceLook();
                            this.reloadChoiceGet();
                            this.reloadChoiceAttack();
                            this.update();
                            this.paint();
                            continue block125;
                        }
                    }
                    case 5: {
                        this.inthp = Integer.parseInt(this.stmIn.readLine());
                        this.intmaxhp = Integer.parseInt(this.stmIn.readLine());
                        this.intsp = Integer.parseInt(this.stmIn.readLine());
                        this.intmaxsp = Integer.parseInt(this.stmIn.readLine());
                        this.frame.lblInfo.setText(String.valueOf(String.valueOf(new StringBuffer("HP: ").append(this.inthp).append("/").append(this.intmaxhp).append(" MP: ").append(this.intsp).append("/").append(this.intmaxsp).append(" Loc: ").append(this.LocX).append("/").append(this.LocY))));
                        continue block125;
                    }
                    case 6: {
                        this.vctChoiceDropItems = new Vector(0, 5);
                        this.frame.frmEquipment.blnRefreshMenus = true;
                        try {
                            this.vctItems.removeAllElements();
                            this.frame.frmEquipment.chcWield.removeAll();
                            this.frame.frmEquipment.chcArms.removeAll();
                            this.frame.frmEquipment.chcLegs.removeAll();
                            this.frame.frmEquipment.chcTorso.removeAll();
                            this.frame.frmEquipment.chcWaist.removeAll();
                            this.frame.frmEquipment.chcNeck.removeAll();
                            this.frame.frmEquipment.chcSkull.removeAll();
                            this.frame.frmEquipment.chcEyes.removeAll();
                            this.frame.frmEquipment.chcHands.removeAll();
                        }
                        catch (Exception var12_13) {
                            // empty catch block
                        }
                        try {
                            intStore = Integer.parseInt(this.stmIn.readLine());
                            while (true) {
                                strStore = this.stmIn.readLine();
                                intID = Integer.parseInt(this.stmIn.readLine());
                                entStore = new Entity(strStore, intID, intStore);
                                this.insertIntoVector(this.vctItems, entStore);
                                switch (intStore) {
                                    case 0: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        break;
                                    }
                                    case 1: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcWield.addItem(strStore);
                                        break;
                                    }
                                    case 2: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcArms.addItem(strStore);
                                        break;
                                    }
                                    case 3: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcLegs.addItem(strStore);
                                        break;
                                    }
                                    case 4: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcTorso.addItem(strStore);
                                        break;
                                    }
                                    case 5: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcWaist.addItem(strStore);
                                        break;
                                    }
                                    case 6: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcNeck.addItem(strStore);
                                        break;
                                    }
                                    case 7: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcSkull.addItem(strStore);
                                        break;
                                    }
                                    case 8: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcEyes.addItem(strStore);
                                        break;
                                    }
                                    case 9: {
                                        this.vctChoiceDropItems.addElement(strStore);
                                        this.frame.frmEquipment.chcHands.addItem(strStore);
                                        break;
                                    }
                                }
                                intStore = Integer.parseInt(this.stmIn.readLine());
                            }
                        }
                        catch (Exception var12_14) {
                            this.frame.frmEquipment.chcWield.addItem("none");
                            this.frame.frmEquipment.chcArms.addItem("none");
                            this.frame.frmEquipment.chcLegs.addItem("none");
                            this.frame.frmEquipment.chcTorso.addItem("none");
                            this.frame.frmEquipment.chcWaist.addItem("none");
                            this.frame.frmEquipment.chcNeck.addItem("none");
                            this.frame.frmEquipment.chcSkull.addItem("none");
                            this.frame.frmEquipment.chcEyes.addItem("none");
                            this.frame.frmEquipment.chcHands.addItem("none");
                            this.frame.frmEquipment.blnRefreshMenus = false;
                            this.reloadChoiceDrop();
                            continue block125;
                        }
                    }
                    case 7: {
                        try {
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[0] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[0] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label9.setText("Wielded: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcWield.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[1] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[1] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label2.setText("Arms: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcArms.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[2] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[2] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label3.setText("Legs: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcLegs.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[3] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[3] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label1.setText("Torso: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcTorso.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[4] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[4] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label6.setText("Waist: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcWaist.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[5] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[5] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label4.setText("Neck: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcNeck.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[6] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[6] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.lblSkull.setText("Skull: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcSkull.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[7] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[7] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label5.setText("Eyes: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcEyes.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                            strStore = this.stmIn.readLine();
                            if (strStore.equals("none")) {
                                this.equipArray[8] = null;
                            } else {
                                intID = Integer.parseInt(this.stmIn.readLine());
                                this.equipArray[8] = entStore = new Entity(strStore, intID, intStore);
                            }
                            this.frame.frmEquipment.Label7.setText("Hands: ".concat(String.valueOf(String.valueOf(strStore))));
                            try {
                                this.frame.frmEquipment.chcHands.select(strStore);
                            }
                            catch (Exception excSelect) {
                                // Item not currently in the dropdown's option list - ignore.
                            }
                        }
                        catch (Exception e) {
                            System.err.println("Error loading equipment: ".concat(String.valueOf(String.valueOf(e.toString()))));
                        }
                        continue block125;
                    }
                    case 8: {
                        try {
                            strStore2 = "";
                            strStore = this.stmIn.readLine();
                            while (!strStore.equals(".")) {
                                strStore2 = String.valueOf(String.valueOf(strStore2)).concat(String.valueOf(String.valueOf(String.valueOf(String.valueOf(strStore)).concat("\n"))));
                                strStore = this.stmIn.readLine();
                            }
                            this.frame.txtOther.setText(strStore2);
                        }
                        catch (Exception e) {
                            System.err.println("Error loading stats".concat(String.valueOf(String.valueOf(e.toString()))));
                        }
                        continue block125;
                    }
                    case 9: {
                        this.blnLoaded = false;
                        continue block125;
                    }
                    case 10: {
                        strStore = this.stmIn.readLine();
                        this.vctChoiceActionItems = new Vector(0, 5);
                        while (!strStore.equals(".")) {
                            this.vctChoiceActionItems.addElement(strStore);
                            strStore = this.stmIn.readLine();
                        }
                        this.reloadChoiceAction();
                        continue block125;
                    }
                    case 11: {
                        try {
                            if (!this.blnApplet) continue block125;
                            this.addText("Loading music.\n");
                            this.intMusicTypes = Integer.parseInt(this.stmIn.readLine());
                            this.audMusic = new AudioClip[this.intMusicTypes][];
                            this.intNumSongs = new int[this.intMusicTypes];
                            for (intStore = 0; intStore < this.intMusicTypes; ++intStore) {
                                this.intNumSongs[intStore] = Integer.parseInt(this.stmIn.readLine());
                                this.audMusic[intStore] = new AudioClip[this.intNumSongs[intStore]];
                                for (intStore2 = 0; intStore2 < this.intNumSongs[intStore]; ++intStore2) {
                                    strStore = this.stmIn.readLine();
                                    try {
                                        this.audMusic[intStore][intStore2] = this.appShell.getAudioClip(new URL(strStore));
                                        while (this.audMusic[intStore][intStore2] == null) {
                                        }
                                        continue;
                                    }
                                    catch (Exception e) {
                                        System.err.println(String.valueOf(String.valueOf(new StringBuffer("Error while trying to load music file ").append(strStore).append(":").append(e.toString()))));
                                    }
                                }
                            }
                            this.addText("Music loaded.\n");
                        }
                        catch (Exception e) {
                            this.blnMusic = false;
                            this.addText("Your java virtual machine does not support midi music\n");
                            System.err.println("Error while trying to load music files:".concat(String.valueOf(String.valueOf(e.toString()))));
                        }
                        continue block125;
                    }
                    case 12: {
                        if (!this.blnMusic) continue block125;
                        try {
                            intStore = Integer.parseInt(this.stmIn.readLine());
                            if (this.audMusicPlaying != null) {
                                this.audMusicPlaying.stop();
                            }
                            this.audMusicPlaying = this.audMusic[intStore][(int)(Math.random() * (double)this.intNumSongs[intStore])];
                            this.audMusicPlaying.loop();
                        }
                        catch (Exception e) {
                            System.err.println("Error while trying to play music file:".concat(String.valueOf(String.valueOf(e.toString()))));
                        }
                        continue block125;
                    }
                    case 13: {
                        Commands.parseCommand(this, "notdead\n");
                        continue block125;
                    }
                    case 14: {
                        this.blnLoaded = true;
                        continue block125;
                    }
                    case 15: {
                        try {
                            this.audSFX[Integer.parseInt(this.stmIn.readLine())].play();
                        }
                        catch (Exception e) {}
                        continue block125;
                    }
                    case 16: {
                        lockObj = this.vctEntities;
                        synchronized (lockObj) {
                            lngStore = Long.valueOf(this.stmIn.readLine());
                            this.removeEntity(lngStore);
                            this.reloadChoiceLook();
                            this.reloadChoiceGet();
                            this.reloadChoiceAttack();
                            this.update();
                            continue block125;
                        }
                    }
                    case 17: {
                        strStore = this.stmIn.readLine();
                        while (!strStore.equals(".")) {
                            this.vctMerchantItems.addElement(strStore);
                            strStore = this.stmIn.readLine();
                        }
                        this.reloadChoiceBuy();
                        continue block125;
                    }
                    case 18: {
                        frmEdit = new EditFrame(this.stmIn.readLine(), this, true);
                        frmEdit.show();
                        strStore = this.stmIn.readLine();
                        while (!strStore.equals("--EOF--")) {
                            frmEdit.txtEdit.append(String.valueOf(String.valueOf(strStore)).concat("\n"));
                            strStore = this.stmIn.readLine();
                        }
                        continue block125;
                    }
                    case 19: {
                        lockObj2 = this.vctEntities;
                        synchronized (lockObj2) {
                            this.mapSize = Integer.parseInt(this.stmIn.readLine());
                            this.viewRange = (this.mapSize - 1) / 2;
                            this.entEntities = new Entity[this.mapSize][this.mapSize];
                            this.shrMap = new short[this.mapSize][this.mapSize];
                            if (this.blnApplet) {
                                Commands.parseCommand(this, "appletimages\n");
                            } else {
                                Commands.parseCommand(this, "applicationimages\n");
                            }
                            this.scaleWindow();
                            continue block125;
                        }
                    }
                    case 20: {
                        if (!this.blnEditorMode) {
                            frmEdit = new EditFrame(this.stmIn.readLine(), this, false);
                            frmEdit.show();
                            strStore = this.stmIn.readLine();
                            while (!strStore.equals("--EOF--")) {
                                frmEdit.txtEdit.append(String.valueOf(String.valueOf(strStore)).concat("\n"));
                                strStore = this.stmIn.readLine();
                            }
                            continue block125;
                        }
                        sTitle = this.stmIn.readLine();
                        strStore = this.stmIn.readLine();
                        if (!this.blnLoadingList) {
                            this.frame.chcObject.removeAll();
                        }
                        while (!strStore.equals("--EOF--")) {
                            if (this.blnLoadingList) {
                                this.frame.list.add(strStore);
                            } else {
                                this.frame.chcObject.addItem(strStore);
                            }
                            strStore = this.stmIn.readLine();
                        }
                        if (!this.blnLoadingList) continue block125;
                        this.blnLoadingList = false;
                        this.blnListLoaded = true;
                        continue block125;
                    }
                    case 21: {
                        this.frmMerchant.hide();
                        this.vctMerchantItems = new Vector(0, 5);
                        this.vctSell = new Vector(0, 5);
                        continue block125;
                    }
                    case 22: {
                        this.vctSell = new Vector(0, 5);
                        strStore = this.stmIn.readLine();
                        while (!strStore.equals(".")) {
                            this.vctSell.addElement(strStore);
                            strStore = this.stmIn.readLine();
                        }
                        this.reloadChoiceSell();
                        continue block125;
                    }
                    case 23: {
                        v4 = this.stmIn.readLine();
                        strStore = v4;
                        v5 = this.stmIn.readLine();
                        strStore = v5;
                        strStore = this.stmIn.readLine();
                        this.addText(Integer.parseInt(v4), Integer.parseInt(v5), Integer.parseInt(strStore), String.valueOf(String.valueOf(this.stmIn.readLine())).concat("\n"));
                        continue block125;
                    }
                    case 24: {
                        ID = this.stmIn.readLong();
                        lockObj3 = this.vctEntities;
                        synchronized (lockObj3) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if ((long)entStore.ID != ID) continue;
                                if (entStore.intMoveDirection != -1) {
                                    this.removeEntity(entStore);
                                    if (entStore.intStep != -1) {
                                        entStore.intStep = 1;
                                    }
                                    entStore.intLocY -= 1;
                                    try {
                                        this.addEntity(entStore);
                                    }
                                    catch (Exception excIgnored) {
                                        // empty catch block
                                    }
                                    this.reloadChoiceAttack();
                                    this.update();
                                    break;
                                }
                                this.removeEntity(entStore);
                                if (entStore.intStep != -1) {
                                    entStore.intStep = 1;
                                }
                                entStore.intLocY -= 1;
                                try {
                                    this.addEntity(entStore);
                                }
                                catch (Exception excIgnored) {
                                    // empty catch block
                                }
                                this.reloadChoiceAttack();
                                entStore.intLocY += 0.5;
                                this.thrGraphics.addEntityToMove(entStore, 0);
                                this.update();
                                this.paint();
                                break;
                            }
                            continue block125;
                        }
                    }
                    case 25: {
                        ID = this.stmIn.readLong();
                        lockObj3 = this.vctEntities;
                        synchronized (lockObj3) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if ((long)entStore.ID != ID) continue;
                                if (entStore.intMoveDirection != -1) {
                                    this.removeEntity(entStore);
                                    if (entStore.intStep != -1) {
                                        entStore.intStep = 3;
                                    }
                                    entStore.intLocY += 1;
                                    try {
                                        this.addEntity(entStore);
                                    }
                                    catch (Exception excIgnored) {
                                        // empty catch block
                                    }
                                    this.update();
                                    this.reloadChoiceAttack();
                                    break;
                                }
                                this.removeEntity(entStore);
                                if (entStore.intStep != -1) {
                                    entStore.intStep = 3;
                                }
                                entStore.intLocY += 1;
                                try {
                                    this.addEntity(entStore);
                                }
                                catch (Exception excIgnored) {
                                    // empty catch block
                                }
                                this.reloadChoiceAttack();
                                entStore.intLocY -= 0.5;
                                this.thrGraphics.addEntityToMove(entStore, 1);
                                this.update();
                                this.paint();
                                break;
                            }
                            continue block125;
                        }
                    }
                    case 26: {
                        ID = this.stmIn.readLong();
                        lockObj3 = this.vctEntities;
                        synchronized (lockObj3) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if ((long)entStore.ID != ID) continue;
                                if (entStore.intMoveDirection != -1) {
                                    this.removeEntity(entStore);
                                    if (entStore.intStep != -1) {
                                        entStore.intStep = 5;
                                    }
                                    entStore.intLocX -= 1;
                                    try {
                                        this.addEntity(entStore);
                                    }
                                    catch (Exception excIgnored) {
                                        // empty catch block
                                    }
                                    this.reloadChoiceAttack();
                                    this.update();
                                    break;
                                }
                                this.removeEntity(entStore);
                                if (entStore.intStep != -1) {
                                    entStore.intStep = 5;
                                }
                                entStore.intLocX -= 1;
                                try {
                                    this.addEntity(entStore);
                                }
                                catch (Exception excIgnored) {
                                    // empty catch block
                                }
                                this.reloadChoiceAttack();
                                entStore.intLocX += 0.5;
                                this.thrGraphics.addEntityToMove(entStore, 2);
                                this.update();
                                this.paint();
                                break;
                            }
                            continue block125;
                        }
                    }
                    case 27: {
                        ID = this.stmIn.readLong();
                        lockObj3 = this.vctEntities;
                        synchronized (lockObj3) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if ((long)entStore.ID != ID) continue;
                                if (entStore.intMoveDirection != -1) {
                                    this.removeEntity(entStore);
                                    entStore.intLocX += 1;
                                    if (entStore.intStep != -1) {
                                        entStore.intStep = 7;
                                    }
                                    try {
                                        this.addEntity(entStore);
                                    }
                                    catch (Exception excIgnored) {
                                        // empty catch block
                                    }
                                    this.reloadChoiceAttack();
                                    this.update();
                                    break;
                                }
                                this.removeEntity(entStore);
                                if (entStore.intStep != -1) {
                                    entStore.intStep = 7;
                                }
                                entStore.intLocX += 1;
                                try {
                                    this.addEntity(entStore);
                                }
                                catch (Exception excIgnored) {
                                    // empty catch block
                                }
                                this.reloadChoiceAttack();
                                entStore.intLocX -= 0.5;
                                this.thrGraphics.addEntityToMove(entStore, 3);
                                this.update();
                                this.paint();
                                break;
                            }
                            continue block125;
                        }
                    }
                    case 28: {
                        this.range = Integer.parseInt(this.stmIn.readLine());
                        continue block125;
                    }
                    case 29: {
                        lngStore = Long.valueOf(this.stmIn.readLine());
                        intStore = Integer.parseInt(this.stmIn.readLine());
                        lockObj4 = this.vctEntities;
                        synchronized (lockObj4) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                if ((long)entStore.ID != lngStore) continue;
                                entStore.intFlag = intStore;
                                break;
                            }
                        }
                        this.update();
                        continue block125;
                    }
                    case 30: {
                        lockObj4 = this.vctEntities;
                        synchronized (lockObj4) {
                            for (i = 0; i < this.vctEntities.size(); ++i) {
                                entStore = (Entity)this.vctEntities.elementAt(i);
                                entStore.intFlag = 0;
                            }
                        }
                        this.update();
                        continue block125;
                    }
                    case 31: {
                        strStore = this.stmIn.readLine().trim();
                        entStore = this.getEntity(Integer.parseInt(strStore));
                        if (entStore == null) continue block125;
                        entStore.intImage = Integer.parseInt(this.stmIn.readLine());
                        i = (int)(entStore.intLocX - (double)this.LocX + (double)this.viewRange);
                        i2 = (int)(entStore.intLocY - (double)this.LocY + (double)this.viewRange);
                        try {
                            this.gD.drawImage(this.imgMap, i * this.intImageSize, i2 * this.intImageSize, (i + 1) * this.intImageSize, (i2 + 1) * this.intImageSize, this.shrMap[i][i2] * this.intImageSize, 0, (this.shrMap[i][i2] + 1) * this.intImageSize, this.intImageSize, null);
                        }
                        catch (Exception e) {
                            try {
                                this.gD.drawImage(this.imgMap, i * this.intImageSize, i2 * this.intImageSize, (i + 1) * this.intImageSize, (i2 + 1) * this.intImageSize, 0, 0, this.intImageSize, this.intImageSize, null);
                            }
                            catch (Exception excIgnored2) {
                                // empty catch block
                            }
                        }
                        this.drawEntity(entStore);
                        continue block125;
                    }
                    case 32: {
                        try {
                            strStore = this.stmIn.readLine().trim();
                            hp = Integer.parseInt(strStore);
                            entity = this.getEntity(this.targetID);
                            if (entity != null && hp > 0) {
                                entity.hp = hp;
                                this.frame.lblTarget.setText(String.valueOf(String.valueOf(new StringBuffer("Target: ").append(entity.getDisplayName()).append("    ").append(entity.hp).append("/").append(entity.maxhp))));
                                continue block125;
                            }
                            this.targetID = -1;
                            this.frame.lblTarget.setText("Target:");
                        }
                        catch (Exception e) {
                            System.err.println("Error in targeting: ".concat(String.valueOf(String.valueOf(e))));
                        }
                        continue block125;
                    }
                }
                System.err.println("Lost incoming byte: ".concat(String.valueOf(String.valueOf(incoming))));
                strStore = this.stmIn.readLine();
                System.err.println("String: ".concat(String.valueOf(String.valueOf(strStore))));
            }
            catch (Exception e) {
                System.err.println(String.valueOf(String.valueOf(new StringBuffer("Error at run() with value ").append(incoming).append(" : ").append(e.toString()))));
                e.printStackTrace();
                this.addText(String.valueOf(String.valueOf(new StringBuffer("Error at run() with value ").append(incoming).append(" : ").append(e.toString()).append("\n"))));
                this.blnConnected = false;
                return;
            }
        }
    }

    public void reloadChoiceLook() {
        this.blnMenuRefresh = true;
        try {
            this.frame.chcLook.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        this.frame.chcLook.addItem("Look");
        for (int i = 0; i < this.vctEntities.size(); ++i) {
            Entity entStore = (Entity)this.vctEntities.elementAt(i);
            this.frame.chcLook.addItem(entStore.getDisplayName());
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceAttack() {
        this.blnMenuRefresh = true;
        try {
            this.frame.chcAttack.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        this.frame.chcAttack.addItem("Attack");
        for (int i = 0; i < this.vctEntities.size(); ++i) {
            Entity entStore = (Entity)this.vctEntities.elementAt(i);
            if (entStore.intType != 0 && entStore.intType != 1 && entStore.intType != 4 || !(Math.abs((double)this.LocX - entStore.intLocX) + Math.abs((double)this.LocY - entStore.intLocY) <= (double)this.range)) continue;
            this.frame.chcAttack.addItem(entStore.getDisplayName());
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceGet() {
        this.blnMenuRefresh = true;
        try {
            this.frame.chcGet.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        this.frame.chcGet.addItem("Get");
        for (int i = 0; i < this.vctEntities.size(); ++i) {
            Entity entStore = (Entity)this.vctEntities.elementAt(i);
            if (entStore.intType != 1 || !((double)this.LocX - entStore.intLocX + ((double)this.LocY - entStore.intLocY) < (double)2)) continue;
            this.frame.chcGet.addItem(entStore.getDisplayName());
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceBuy() {
        this.blnMenuRefresh = true;
        try {
            this.frmMerchant.chcBuy.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        for (int i = 0; i < this.vctMerchantItems.size(); ++i) {
            this.frmMerchant.chcBuy.addItem((String)this.vctMerchantItems.elementAt(i));
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceSell() {
        this.blnMenuRefresh = true;
        try {
            this.frmMerchant.chcSell.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        for (int i = 0; i < this.vctSell.size(); ++i) {
            this.frmMerchant.chcSell.addItem((String)this.vctSell.elementAt(i));
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceDrop() {
        this.blnMenuRefresh = true;
        try {
            this.frame.chcDrop.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        this.frame.chcDrop.addItem("Drop");
        for (int i = 0; i < this.vctChoiceDropItems.size(); ++i) {
            this.frame.chcDrop.addItem((String)this.vctChoiceDropItems.elementAt(i));
        }
        this.blnMenuRefresh = false;
    }

    public void reloadChoiceAction() {
        this.blnMenuRefresh = true;
        try {
            this.frame.chcAction.removeAll();
        }
        catch (Exception exception) {
            // empty catch block
        }
        this.frame.chcAction.addItem("Action");
        for (int i = 0; i < this.vctChoiceActionItems.size(); ++i) {
            this.frame.chcAction.addItem((String)this.vctChoiceActionItems.elementAt(i));
        }
        this.blnMenuRefresh = false;
    }

    public void scaleImages() {
        try {
            if (this.imgMap != null) {
                this.imgMap.flush();
            }
            if (this.imgEditorMap != null) {
                this.imgEditorMap.flush();
            }
            if (this.imgPlayers != null) {
                this.imgMap.flush();
            }
            if (this.imgSprites != null) {
                this.imgMap.flush();
            }
            this.imgMap = this.imgOriginalMap.getScaledInstance(this.intImageSize * (this.numMapImages + 1), this.intImageSize, 1);
            this.imgEditorMap = this.imgOriginalMap.getScaledInstance(this.intEditorImageSize * (this.numMapImages + 1), this.intEditorImageSize, 1);
            this.imgPlayers = this.imgOriginalPlayers.getScaledInstance(this.intImageSize * (this.numPlayerImages + 1) * 8, this.intImageSize, 1);
            this.imgSprites = this.imgOriginalSprites.getScaledInstance(this.intImageSize * (this.numSpriteImages + 1), this.intImageSize, 1);
        }
        catch (Exception exception) {
            // empty catch block
        }
    }

    public void scaleWindow() {
        int intMaxCandidate;
        if (this.frame.pnlContents.getBounds().width - 310 > this.frame.pnlContents.getBounds().height - 150) {
            intMaxCandidate = this.frame.pnlContents.getBounds().height - 150;
        } else {
            intMaxCandidate = this.frame.pnlContents.getBounds().width - 310;
        }
        int intGraphicsSize;
        if (intMaxCandidate > 330) {
            intGraphicsSize = 330 + (intMaxCandidate - 330) / 2;
        } else {
            intGraphicsSize = intMaxCandidate;
        }
        this.frame.pnlGraphics.setSize(intGraphicsSize, intGraphicsSize);
        this.intImageSize = this.frame.pnlGraphics.getBounds().width / this.mapSize;
        if (this.intImageSize < 1) {
            this.intImageSize = 1;
        }
        this.frame.pnlGraphics.setSize(this.intImageSize * this.mapSize, this.intImageSize * this.mapSize);
        this.imgDisplay = this.frame.pnlGraphics.createImage(this.intImageSize * this.mapSize, this.intImageSize * this.mapSize);
        this.gD = this.imgDisplay.getGraphics();
        this.g1 = this.frame.pnlGraphics.getGraphics();
        this.frame.txtInput.setLocation(0, this.frame.pnlGraphics.getBounds().height);
        this.frame.txtOutput.setLocation(0, this.frame.pnlGraphics.getBounds().height + 25);
        this.frame.txtOutput.setSize(this.frame.pnlContents.getBounds().width, this.frame.pnlContents.getBounds().height - this.frame.pnlGraphics.getBounds().height - 25);
        this.frame.txtInput.setSize(this.frame.pnlContents.getBounds().width, 25);
        this.frame.pnlStats.setSize(this.frame.pnlContents.getBounds().width - this.frame.pnlGraphics.getBounds().width, this.frame.pnlGraphics.getBounds().height);
        this.frame.pnlStats.setLocation(this.frame.pnlGraphics.getBounds().width, 0);
        this.frame.txtOther.setSize(this.frame.pnlStats.getBounds().width - 140, this.frame.pnlStats.getBounds().height - 60);
        this.frame.lblTarget.setLocation(this.frame.pnlStats.getBounds().width - 200, this.frame.pnlStats.getBounds().height - 30);
        this.frame.lblTarget.setSize(this.frame.pnlStats.getBounds().width - 140, 30);
        this.frame.lblInfo.setSize(this.frame.pnlContents.getBounds().width, 20);
        int adjHeight = this.frame.txtInput.getBounds().height + this.frame.txtOutput.getBounds().height;
        int adjWidth = this.frame.pnlGraphics.getBounds().width;
        this.frame.pnlEditor.setSize(this.frame.getBounds().width - adjWidth, this.frame.getBounds().height - adjHeight);
        this.frame.pnlEditor.setLocation(this.frame.pnlGraphics.getBounds().width, 0);
        this.frame.pnlEditorMenu.setSize(this.frame.getBounds().width - 10, 26);
        this.frame.pnlEditorMenu.setLocation(10, 1);
        if (this.frame.getBounds().width - adjWidth > this.frame.getBounds().height - adjHeight) {
            this.frame.pnlEditorGraphics.setSize(this.frame.pnlEditor.getBounds().height - 35, this.frame.pnlEditor.getBounds().height - 35);
        } else {
            this.frame.pnlEditorGraphics.setSize(this.frame.pnlEditor.getBounds().width - 10, this.frame.pnlEditor.getBounds().width - 10);
        }
        this.frame.pnlEditorGraphics.setLocation(10, 35);
        int height = this.frame.pnlEditorGraphics.getBounds().height;
        this.intEditorImageSize = (int)Math.sqrt(height * height / (this.numMapImages > 0 ? this.numMapImages : 26));
        this.imgEditorDisplay = this.frame.pnlEditorGraphics.createImage(this.intEditorImageSize * this.editorSize, this.intEditorImageSize * this.editorSize);
        this.gED = this.imgEditorDisplay.getGraphics();
        this.g2 = this.frame.pnlEditorGraphics.getGraphics();
        System.gc();
    }

    public void mousePressed(MouseEvent evt) {
    }

    public void mouseReleased(MouseEvent evt) {
    }

    public void mouseClicked(MouseEvent evt) {
        if (!this.blnConnected) {
            return;
        }
        if (evt.getComponent() == this.frame.pnlGraphics) {
            int x = evt.getX();
            int y = evt.getY();
            if (!this.blnLoaded) {
                return;
            }
            int dX = x / this.intImageSize;
            int dY = y / this.intImageSize;
            int destX = dX + this.LocX - this.viewRange;
            int destY = dY + this.LocY - this.viewRange;
            Entity entity = null;
            try {
                entity = this.entEntities[dX][dY];
                if (entity == null) {
                    Commands.parseCommand(this, String.valueOf(String.valueOf(new StringBuffer("goto ").append(destX).append(" ").append(destY).append("\n"))));
                }
                while (entity != null) {
                    if (entity.intType == 0 || entity.intType == 4) {
                        this.targetEntity(entity);
                    }
                    if (entity.intType == 1) {
                        Commands.parseCommand(this, String.valueOf(String.valueOf(new StringBuffer("get ").append(entity.strName).append("\n"))));
                    }
                    if (entity.intType == 5) {
                        Commands.parseCommand(this, String.valueOf(String.valueOf(new StringBuffer("opendoor ").append(entity.ID).append("\n"))));
                    }
                    entity = entity.entNext;
                }
            }
            catch (Exception e) {
                this.addText(String.valueOf(String.valueOf(new StringBuffer("Error at mouseDown(): ").append(e.toString()).append("\n"))));
            }
        } else if (evt.getComponent() == this.frame.pnlEditorGraphics) {
            int x = evt.getX();
            int y = evt.getY();
            if (!this.blnLoaded) {
                return;
            }
            int dX = x / this.intEditorImageSize;
            int dY = y / this.intEditorImageSize;
            int inc = this.frame.pnlEditorGraphics.getBounds().height / this.intEditorImageSize + 1;
            int num = dX + dY * inc;
            this.send(">".concat(String.valueOf(String.valueOf(num))));
        }
        this.frame.txtInput.requestFocus();
    }

    public void mouseEntered(MouseEvent evt) {
    }

    public void mouseExited(MouseEvent evt) {
    }

    public void keyPressed(KeyEvent evt) {
        if (!this.blnConnected) {
            return;
        }
        DataOutputStream dataOutputStream = this.stmOut;
        synchronized (dataOutputStream) {
            try {
                int nkey = evt.getKeyCode();
                if (nkey == 10) {
                    String strStore = this.frame.txtInput.getText();
                    if (strStore.startsWith("!")) {
                        this.strSet = strStore.length() == 1 ? null : strStore.substring(1);
                    } else {
                        Commands.parseCommand(this, String.valueOf(String.valueOf(strStore)).concat("\n"));
                    }
                    this.frame.txtInput.setText("");
                }
                if (this.blnLoaded) {
                    switch (nkey) {
                        case 38: {
                            Commands.parseCommand(this, "n\n");
                            if (this.strSet != null) {
                                Commands.parseCommand(this, String.valueOf(String.valueOf(this.strSet)).concat("\n"));
                            }
                            return;
                        }
                        case 40: {
                            Commands.parseCommand(this, "s\n");
                            if (this.strSet != null) {
                                Commands.parseCommand(this, String.valueOf(String.valueOf(this.strSet)).concat("\n"));
                            }
                            return;
                        }
                        case 37: {
                            Commands.parseCommand(this, "w\n");
                            if (this.strSet != null) {
                                Commands.parseCommand(this, String.valueOf(String.valueOf(this.strSet)).concat("\n"));
                            }
                            return;
                        }
                        case 39: {
                            Commands.parseCommand(this, "e\n");
                            if (this.strSet != null) {
                                Commands.parseCommand(this, String.valueOf(String.valueOf(this.strSet)).concat("\n"));
                            }
                            return;
                        }
                    }
                }
            }
            catch (Exception e) {
                this.addText(String.valueOf(String.valueOf(new StringBuffer("Error at keyPressed(): ").append(e.toString()).append("\n"))));
                e.printStackTrace();
            }
        }
    }

    public void keyReleased(KeyEvent evt) {
    }

    public void keyTyped(KeyEvent evt) {
    }

    public void componentResized(ComponentEvent e) {
        this.scaleWindow();
        this.scaleImages();
    }

    public void componentMoved(ComponentEvent e) {
    }

    public void componentShown(ComponentEvent e) {
    }

    public void componentHidden(ComponentEvent e) {
    }

    public void actionPerformed(ActionEvent evt) {
        if (evt.getSource() == this.frame.btnConnect) {
            this.frame.frmConnect.show();
            ((Component)this.frame.frmConnect).setSize(350, 200);
        } else if (evt.getSource() == this.frame.btnEquipment) {
            if (this.frame.frmEquipment != null) {
                this.frame.frmEquipment.show();
                ((Component)this.frame.frmEquipment).setSize(300, 440);
            }
        } else if (evt.getSource() == this.frame.btnMerchant) {
            if (this.frmMerchant != null) {
                this.frmMerchant.show();
                ((Component)this.frmMerchant).setSize(300, 120);
            }
        } else if (evt.getSource() == this.frame.btnQuit) {
            try {
                if (this.blnConnected) {
                    Commands.parseCommand(this, "quit\n");
                }
            }
            catch (Exception exception) {
                // empty catch block
            }
            try {
                this.sckConnection.close();
            }
            catch (Exception exception) {
                // empty catch block
            }
            try {
                this.imgOriginalSprites.flush();
                this.imgOriginalPlayers.flush();
                this.imgOriginalMap.flush();
                this.imgSprites.flush();
                this.imgPlayers.flush();
                this.imgMap.flush();
                this.imgEditorMap.flush();
            }
            catch (Exception exception) {
                // empty catch block
            }
            System.gc();
            if (this.blnApplet) {
                this.appShell.destroy();
            } else {
                System.exit(0);
            }
        } else if (evt.getSource() == this.frame.btnTile) {
            if (!this.blnShowTileEditor) {
                this.frame.pnlObjectEntry.setVisible(false);
                this.frame.pnlEditorGraphics.setVisible(true);
                this.blnShowTileEditor = true;
                this.sEditorCommand = null;
                this.update();
            }
        } else if (evt.getSource() == this.frame.btnMob) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.send("list mobs");
            this.frame.lblValue2.setText("Level:");
            this.frame.lblValue2.setLocation(10, 50);
            this.frame.txtValue1.setLocation(this.frame.lblValue2.getBounds().width + 10, 50);
            this.frame.pnlObjectEntry.setVisible(true);
            this.frame.chcObject.setVisible(true);
            this.frame.lblValue2.setVisible(true);
            this.frame.txtValue1.setVisible(true);
            this.intEditorPanel = 0;
            this.sEditorCommand = "<";
        } else if (evt.getSource() == this.frame.btnItem) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.send("list items");
            this.frame.pnlObjectEntry.setVisible(true);
            this.frame.chcObject.setVisible(true);
            this.intEditorPanel = 1;
            this.sEditorCommand = "<";
        } else if (evt.getSource() == this.frame.btnProp) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.frame.pnlObjectEntry.setVisible(true);
            this.frame.chcObject.setVisible(true);
            this.intEditorPanel = 3;
            this.sEditorCommand = "<prop ";
            this.send("list props");
        } else if (evt.getSource() == this.frame.btnSign) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.frame.pnlObjectEntry.setVisible(true);
            this.frame.lblValue1.setText("Message:");
            this.frame.lblValue1.setLocation(new Point(10, 10));
            this.frame.lblValue1.setVisible(true);
            this.frame.txtName.setLocation(new Point(this.frame.lblValue1.getBounds().width + 10, 10));
            this.frame.txtName.setVisible(true);
            this.frame.lblValue1.setVisible(true);
            this.intEditorPanel = 2;
            this.sEditorCommand = "<sign ";
        } else if (evt.getSource() == this.frame.btnMerc) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.frame.pnlObjectEntry.setVisible(true);
            if (!this.blnListLoaded) {
                this.blnLoadingList = true;
                this.frame.list.removeAll();
                this.frame.list.add("train:str");
                this.frame.list.add("train:dex");
                this.frame.list.add("train:int");
                this.frame.list.add("train:wis");
                this.frame.list.add("train:con");
                this.frame.list.add("train:hp");
                this.frame.list.add("train:mp");
                this.frame.list.add("pet");
                this.send("list items");
            }
            this.frame.lblValue1.setText("Name:");
            this.frame.lblValue1.setLocation(new Point(10, 10));
            this.frame.lblValue2.setText("Inventory:");
            this.frame.lblValue2.setLocation(new Point(10, 50));
            this.frame.txtName.setLocation(new Point(this.frame.lblValue1.getBounds().width + 10, 10));
            this.frame.txtName.setVisible(true);
            this.frame.list.setVisible(true);
            this.frame.lblValue1.setVisible(true);
            this.frame.lblValue2.setVisible(true);
            this.intEditorPanel = 4;
            this.sEditorCommand = "<merchant ";
        } else if (evt.getSource() == this.frame.btnDoor) {
            if (this.blnShowTileEditor) {
                this.frame.pnlEditorGraphics.setVisible(false);
                this.blnShowTileEditor = false;
            }
            this.frame.clearEditorFields();
            this.frame.hideEditorFields();
            this.frame.lblValue1.setText("Description:");
            this.frame.lblValue2.setText("Open Image:");
            this.frame.lblValue3.setText("Close Image:");
            this.frame.lblValue4.setText("isOpen:");
            this.frame.lblValue5.setText("isLocked:");
            this.frame.lblValue6.setText("Key Name:");
            this.frame.lblValue1.setLocation(new Point(10, 10));
            this.frame.lblValue2.setLocation(new Point(10, 30));
            this.frame.lblValue3.setLocation(new Point(10, 50));
            this.frame.lblValue4.setLocation(new Point(10, 70));
            this.frame.lblValue5.setLocation(new Point(10, 90));
            this.frame.lblValue6.setLocation(new Point(10, 110));
            this.frame.txtName.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 10));
            this.frame.txtValue1.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 30));
            this.frame.txtValue2.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 50));
            this.frame.chkbxValue1.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 70));
            this.frame.chkbxValue2.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 90));
            this.frame.txtValue3.setLocation(new Point(this.frame.lblValue3.getBounds().width + 10, 110));
            this.frame.lblValue1.setVisible(true);
            this.frame.lblValue2.setVisible(true);
            this.frame.lblValue3.setVisible(true);
            this.frame.lblValue4.setVisible(true);
            this.frame.lblValue5.setVisible(true);
            this.frame.lblValue6.setVisible(true);
            this.frame.txtName.setVisible(true);
            this.frame.txtValue1.setVisible(true);
            this.frame.txtValue2.setVisible(true);
            this.frame.txtValue3.setVisible(true);
            this.frame.txtValue4.setVisible(false);
            this.frame.chkbxValue1.setVisible(true);
            this.frame.chkbxValue2.setVisible(true);
            this.frame.pnlObjectEntry.setVisible(true);
            this.intEditorPanel = 5;
            this.sEditorCommand = "<door ";
        } else if (evt.getSource() == this.frame.btnAddObject) {
            String strStore;
            if (this.intEditorPanel == 0 || this.intEditorPanel == 1 || this.intEditorPanel == 3) {
                if (this.frame.chcObject.getSelectedIndex() == 0) {
                    return;
                }
                strStore = this.frame.chcObject.getSelectedItem();
                if (!this.frame.txtValue2.getText().equals("")) {
                    strStore = String.valueOf(String.valueOf(strStore)).concat(String.valueOf(String.valueOf(" lev:".concat(String.valueOf(String.valueOf(this.frame.txtValue2.getText()))))));
                }
            } else if (this.intEditorPanel == 5) {
                strStore = String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.frame.txtValue1.getText()))).append(" ").append(this.frame.txtValue2.getText()).append(" ").append(this.frame.chkbxValue1.getState()).append(" ").append(this.frame.chkbxValue2.getState()).append(" ")));
                String sKey = this.frame.txtValue3.getText();
                if (!sKey.equals("")) {
                    strStore = String.valueOf(String.valueOf(strStore)).concat(String.valueOf(String.valueOf(String.valueOf(String.valueOf(new StringBuffer("key:").append(sKey).append(" "))))));
                }
                strStore = String.valueOf(String.valueOf(strStore)).concat(String.valueOf(String.valueOf("desc:".concat(String.valueOf(String.valueOf(this.frame.txtName.getText()))))));
            } else {
                strStore = this.frame.txtName.getText();
                this.frame.txtName.setText("");
            }
            this.send(String.valueOf(String.valueOf(this.sEditorCommand)).concat(String.valueOf(String.valueOf(strStore))));
            if (this.intEditorPanel == 4) {
                String[] items = this.frame.list.getSelectedItems();
                for (int i = 0; i < items.length; ++i) {
                    this.send("madd ".concat(String.valueOf(String.valueOf(items[i]))));
                }
            }
            this.frame.clearEditorFields();
            this.frame.txtInput.requestFocus();
        } else if (evt.getSource() == this.frame.btnCloseEditor) {
            this.mapEditor(false);
            this.frame.txtInput.requestFocus();
        }
    }

    void thisWindowClosing(WindowEvent e) {
        ((Component)this.frame).setVisible(false);
    }

    public void update() {
        block10: {
            Vector vector = this.vctEntities;
            synchronized (vector) {
                int i;
                for (i = 0; i < this.mapSize; ++i) {
                    for (int i2 = 0; i2 < this.mapSize; ++i2) {
                        try {
                            this.gD.drawImage(this.imgMap, i * this.intImageSize, i2 * this.intImageSize, (i + 1) * this.intImageSize, (i2 + 1) * this.intImageSize, this.shrMap[i][i2] * this.intImageSize, 0, (this.shrMap[i][i2] + 1) * this.intImageSize, this.intImageSize, null);
                            continue;
                        }
                        catch (Exception e) {
                            try {
                                this.gD.drawImage(this.imgMap, i * this.intImageSize, i2 * this.intImageSize, (i + 1) * this.intImageSize, (i2 + 1) * this.intImageSize, 0, 0, this.intImageSize, this.intImageSize, null);
                                continue;
                            }
                            catch (Exception exception) {
                                // empty catch block
                            }
                        }
                    }
                }
                for (i = 0; i < this.vctEntities.size(); ++i) {
                    Entity entStore = (Entity)this.vctEntities.elementAt(i);
                    this.drawEntity(entStore);
                }
            }
            if (!this.blnShowTileEditor) break block10;
            this.updateEditor();
        }
    }

    void drawEntity(Entity entStore) {
        double x = entStore.intLocX - (double)this.LocX + (double)this.viewRange;
        double y = entStore.intLocY - (double)this.LocY + (double)this.viewRange;
        if (entStore.intFlag != 0) {
            if (entStore.intFlag == 1) {
                this.gD.setColor(Color.green);
                this.gD.drawRoundRect((int)(x * (double)this.intImageSize), (int)(y * (double)this.intImageSize), this.intImageSize, this.intImageSize, this.intImageSize / 3, this.intImageSize / 3);
            } else if (entStore.intFlag == 2) {
                this.gD.setColor(Color.red);
                this.gD.drawRoundRect((int)(x * (double)this.intImageSize), (int)(y * (double)this.intImageSize), this.intImageSize, this.intImageSize, this.intImageSize / 3, this.intImageSize / 3);
            }
        }
        if (entStore.intStep == -1) {
            try {
                this.gD.drawImage(this.imgSprites, (int)(x * (double)this.intImageSize), (int)(y * (double)this.intImageSize), (int)((x + 1.0) * (double)this.intImageSize), (int)((y + 1.0) * (double)this.intImageSize), entStore.intImage * this.intImageSize, 0, (entStore.intImage + 1) * this.intImageSize, this.intImageSize, null);
            }
            catch (Exception exception) {}
        } else {
            try {
                this.gD.drawImage(this.imgPlayers, (int)(x * (double)this.intImageSize), (int)(y * (double)this.intImageSize), (int)((x + 1.0) * (double)this.intImageSize), (int)((y + 1.0) * (double)this.intImageSize), (entStore.intImage * 8 + entStore.intStep) * this.intImageSize, 0, (entStore.intImage * 8 + entStore.intStep + 1) * this.intImageSize, this.intImageSize, null);
            }
            catch (Exception exception) {
                // empty catch block
            }
        }
        if (!entStore.hideName && !this.hideAllNames) {
            this.gD.setColor(Color.black);
            this.gD.drawString(entStore.getDisplayName(), (int)(x * (double)this.intImageSize) - 1, (int)((y + 1.0) * (double)this.intImageSize));
            this.gD.setColor(Color.white);
            this.gD.drawString(entStore.getDisplayName(), (int)(x * (double)this.intImageSize), (int)((y + 1.0) * (double)this.intImageSize));
        }
    }

    public void updateEditor() {
        boolean i2 = false;
        int y = 0;
        int x = 0;
        int width = this.frame.pnlEditorGraphics.getBounds().width;
        for (int i = 0; i < this.numMapImages + 1; ++i) {
            try {
                this.gED.drawImage(this.imgEditorMap, x * this.intEditorImageSize, y * this.intEditorImageSize, (x + 1) * this.intEditorImageSize, (y + 1) * this.intEditorImageSize, i * this.intEditorImageSize, 0, (i + 1) * this.intEditorImageSize, this.intEditorImageSize, null);
            }
            catch (Exception e) {
                try {
                    this.gED.drawImage(this.imgEditorMap, x * this.intEditorImageSize, y * this.intEditorImageSize, (x + 1) * this.intEditorImageSize, (y + 1) * this.intEditorImageSize, 0, 0, this.intEditorImageSize, this.intEditorImageSize, null);
                }
                catch (Exception exception) {
                    // empty catch block
                }
            }
            if (++x * this.intEditorImageSize <= width + 1) continue;
            x = 0;
            ++y;
        }
        this.paint();
    }

    public void mapEditor(boolean show) {
        if (show) {
            this.frame.pnlStats.setVisible(false);
            this.frame.pnlEditor.setVisible(true);
            this.updateEditor();
        } else {
            this.frame.pnlStats.setVisible(true);
            this.frame.pnlEditor.setVisible(false);
            this.blnShowTileEditor = false;
        }
        this.blnEditorMode = show;
    }

    public boolean imageUpdate(Image img, int infoflags, int x, int y, int width, int height) {
        this.paint();
        return true;
    }

    public void paint() {
        this.g1.drawImage(this.imgDisplay, 0, 0, this);
        if (this.blnShowTileEditor) {
            this.g2.drawImage(this.imgEditorDisplay, 0, 0, this);
        }
    }

    public Entity getEntity(int targetID) {
        Enumeration enumeration = this.vctEntities.elements();
        while (enumeration.hasMoreElements()) {
            Entity entity = (Entity)enumeration.nextElement();
            if (entity.ID != targetID) continue;
            return entity;
        }
        return null;
    }

    public Entity getEntity(String sName) {
        Enumeration enumeration = this.vctEntities.elements();
        while (enumeration.hasMoreElements()) {
            Entity entity = (Entity)enumeration.nextElement();
            String entName = entity.getDisplayName();
            if (!sName.equalsIgnoreCase(entName)) continue;
            return entity;
        }
        return null;
    }

    public Entity holdsItem(String sName) {
        Enumeration enumeration = this.vctItems.elements();
        while (enumeration.hasMoreElements()) {
            Entity entity = (Entity)enumeration.nextElement();
            if (!sName.equalsIgnoreCase(entity.strName)) continue;
            return entity;
        }
        return null;
    }

    public Entity wearsItem(String sName) {
        int i = 9;
        while (--i >= 0) {
            Entity entity = this.equipArray[i];
            if (entity == null || !sName.equalsIgnoreCase(entity.strName)) continue;
            return entity;
        }
        return null;
    }

    protected final void send(String sText) {
        try {
            this.stmOut.writeBytes(String.valueOf(String.valueOf(sText.trim())).concat("\n"));
        }
        catch (Exception e) {
            System.out.println("Error in sending command to server: ".concat(String.valueOf(String.valueOf(sText))));
        }
    }

    public final void insertIntoVector(Vector vector, Entity entity) {
        int size = vector.size();
        if (size == 0) {
            vector.addElement(entity);
        } else {
            String strName = entity.strName;
            for (int i = 0; i < size; ++i) {
                Entity entStore = (Entity)vector.elementAt(i);
                if (strName.compareTo(entStore.strName) >= 0) continue;
                vector.insertElementAt(entity, i);
                return;
            }
            vector.addElement(entity);
        }
    }

    public void targetEntity(Entity entity) {
        if (entity != null && entity.ID != this.ID) {
            int oldID = this.targetID;
            this.frame.lblTarget.setText(String.valueOf(String.valueOf(new StringBuffer("Target: ").append(entity.getDisplayName()).append("    ").append(entity.hp).append("/").append(entity.maxhp))));
            this.targetID = entity.ID;
            this.send(String.valueOf(String.valueOf(new StringBuffer("target ").append(this.targetID).append(" ").append(oldID))));
        }
    }

    public void setPlayerLoaded(boolean isLoaded) {
        this.allowCommands = isLoaded;
        this.frame.lblLoading.setVisible(false);
        this.send("playerloaded ".concat(String.valueOf(String.valueOf(isLoaded))));
    }
}

