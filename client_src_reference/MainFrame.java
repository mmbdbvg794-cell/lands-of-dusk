/*
 * Decompiled with CFR 0.152.
 */
import java.awt.BorderLayout;
import java.awt.Button;
import java.awt.Checkbox;
import java.awt.Choice;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Frame;
import java.awt.Label;
import java.awt.List;
import java.awt.Panel;
import java.awt.Point;
import java.awt.TextArea;
import java.awt.TextField;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.util.StringTokenizer;

public class MainFrame
extends Frame
implements ItemListener {
    Color background;
    Color textbackground;
    Panel pnlContents = new Panel();
    Panel pnlStats = new Panel();
    Panel pnlGraphics = new Panel();
    Choice chcAttack = new Choice();
    Choice chcAction = new Choice();
    Choice chcLook = new Choice();
    Choice chcGet = new Choice();
    Choice chcDrop = new Choice();
    Label lblInfo = new Label();
    Label lblTarget = new Label("Target:");
    Label lblLoading = new Label("Loading Images ...");
    Button btnMerchant = new Button();
    Button btnQuit = new Button();
    Button btnConnect = new Button();
    Button btnEquipment = new Button();
    Button btnAddObject = new Button();
    Button btnCloseEditor = new Button();
    TextField txtInput = new TextField();
    TextArea txtOutput = new TextArea();
    TextArea txtOther = new TextArea();
    Panel pnlEditor = new Panel();
    Panel pnlEditorMenu = new Panel();
    Panel pnlEditorGraphics = new Panel();
    Panel pnlObjectEntry = new Panel();
    Button btnTile = new Button();
    Button btnMob = new Button();
    Button btnItem = new Button();
    Button btnMerc = new Button();
    Button btnProp = new Button();
    Button btnSign = new Button();
    Button btnDoor = new Button();
    Label lblValue1 = new Label();
    Label lblValue2 = new Label();
    Label lblValue3 = new Label();
    Label lblValue4 = new Label();
    Label lblValue5 = new Label();
    Label lblValue6 = new Label();
    TextField txtName = new TextField();
    TextField txtValue1 = new TextField();
    TextField txtValue2 = new TextField();
    TextField txtValue3 = new TextField();
    TextField txtValue4 = new TextField();
    Checkbox chkbxValue1 = new Checkbox();
    Checkbox chkbxValue2 = new Checkbox();
    Choice chcObject = new Choice();
    List list = new List(7, true);
    EquipmentFrame frmEquipment;
    ConnectFrame frmConnect;
    Dusk appParent;
    private boolean mShown = false;

    public MainFrame(Dusk inParent) {
        this.appParent = inParent;
        this.background = new Color(140, 140, 140);
        this.textbackground = new Color(220, 220, 220);
    }

    public void initComponents() throws Exception {
        this.pnlStats.setLocation(new Point(330, 0));
        this.pnlStats.setVisible(true);
        this.pnlStats.setLayout(null);
        this.pnlStats.setSize(new Dimension(570, 330));
        this.pnlStats.add(this.btnMerchant);
        this.pnlStats.add(this.lblInfo);
        this.pnlStats.add(this.txtOther);
        this.pnlStats.add(this.lblTarget);
        this.pnlStats.add(this.chcAttack);
        this.pnlStats.add(this.chcAction);
        this.pnlStats.add(this.chcLook);
        this.pnlStats.add(this.chcGet);
        this.pnlStats.add(this.chcDrop);
        this.pnlStats.add(this.btnQuit);
        this.pnlStats.add(this.btnEquipment);
        if (!this.appParent.blnApplet) {
            this.pnlStats.add(this.btnConnect);
        }
        this.pnlStats.setBackground(this.background);
        this.pnlContents.setLayout(null);
        this.pnlContents.setVisible(true);
        this.pnlContents.setBackground(this.background);
        this.lblInfo.setLocation(new Point(10, 10));
        this.lblInfo.setVisible(true);
        this.lblInfo.setSize(new Dimension(550, 20));
        this.chcAttack.setLocation(new Point(10, 40));
        this.chcAttack.setVisible(true);
        this.chcAttack.setSize(new Dimension(160, 20));
        this.chcAction.setLocation(new Point(10, 70));
        this.chcAction.setVisible(true);
        this.chcAction.setSize(new Dimension(160, 20));
        this.chcLook.setLocation(new Point(10, 100));
        this.chcLook.setVisible(true);
        this.chcLook.setSize(new Dimension(160, 20));
        this.chcGet.setLocation(new Point(10, 131));
        this.chcGet.setVisible(true);
        this.chcGet.setSize(new Dimension(160, 20));
        this.chcDrop.setLocation(new Point(10, 160));
        this.chcDrop.setVisible(true);
        this.chcDrop.setSize(new Dimension(160, 20));
        this.txtOther.setLocation(new Point(180, 30));
        this.txtOther.setVisible(true);
        this.txtOther.setSize(new Dimension(380, 270));
        this.txtOther.setBackground(this.textbackground);
        this.lblTarget.setLocation(new Point(180, 270));
        this.lblTarget.setVisible(true);
        this.lblTarget.setSize(new Dimension(380, 40));
        this.lblTarget.setBackground(this.textbackground);
        this.btnQuit.setLabel("Quit");
        this.btnQuit.setLocation(new Point(10, 280));
        this.btnQuit.setVisible(true);
        this.btnQuit.setSize(new Dimension(160, 20));
        this.btnEquipment.setLabel("Equipment");
        this.btnEquipment.setLocation(new Point(10, 260));
        this.btnEquipment.setVisible(true);
        this.btnEquipment.setSize(new Dimension(160, 20));
        this.btnConnect.setLabel("Connect");
        this.btnConnect.setLocation(new Point(10, 220));
        this.btnConnect.setVisible(true);
        this.btnConnect.setSize(new Dimension(160, 20));
        this.btnMerchant.setLabel("Merchant");
        this.btnMerchant.setLocation(new Point(10, 240));
        this.btnMerchant.setVisible(true);
        this.btnMerchant.setSize(new Dimension(160, 20));
        this.initEditorPanel();
        this.pnlGraphics.setLocation(new Point(0, 0));
        this.pnlGraphics.setVisible(false);
        this.pnlGraphics.setLayout(null);
        this.pnlGraphics.setSize(new Dimension(330, 330));
        this.pnlGraphics.setBackground(this.background);
        this.lblLoading.setLocation(new Point(80, 140));
        this.lblLoading.setVisible(true);
        this.lblLoading.setSize(new Dimension(150, 20));
        this.lblLoading.setBackground(this.background);
        this.txtInput.setLocation(new Point(0, 330));
        this.txtInput.setVisible(true);
        this.txtInput.setSize(new Dimension(900, 25));
        this.txtInput.setBackground(this.textbackground);
        this.txtOutput.setLocation(new Point(1, 1));
        this.txtOutput.setVisible(true);
        this.txtOutput.setSize(new Dimension(898, 118));
        this.txtOutput.setEditable(false);
        this.txtOutput.setBackground(this.textbackground);
        ((Component)this).setLocation(new Point(0, 0));
        this.setTitle("Dusk");
        this.setLayout(new BorderLayout());
        ((Component)this).setSize(new Dimension(900, 650));
        this.add((Component)this.pnlContents, "Center");
        this.pnlContents.add(this.pnlStats);
        this.pnlContents.add(this.pnlGraphics);
        this.pnlContents.add(this.pnlEditor);
        this.pnlContents.add(this.txtInput);
        this.pnlContents.add(this.txtOutput);
        this.pnlContents.add(this.lblLoading);
        this.chcAttack.addItemListener(this);
        this.chcAction.addItemListener(this);
        this.chcLook.addItemListener(this);
        this.chcGet.addItemListener(this);
        this.chcDrop.addItemListener(this);
        this.btnMerchant.addActionListener(this.appParent);
        this.btnQuit.addActionListener(this.appParent);
        this.btnEquipment.addActionListener(this.appParent);
        if (!this.appParent.blnApplet) {
            this.btnConnect.addActionListener(this.appParent);
        }
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                MainFrame.this.thisWindowClosing(e);
            }
        });
        this.frmEquipment = new EquipmentFrame(this.appParent);
        if (!this.appParent.blnApplet) {
            this.frmConnect = new ConnectFrame(this.appParent);
        }
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
        this.dispose();
        System.exit(0);
    }

    public void itemStateChanged(ItemEvent evt) {
        try {
            if (evt.getSource() == this.chcAttack) {
                if (this.chcAttack.getSelectedIndex() == 0) {
                    return;
                }
                String strStore = this.chcAttack.getSelectedItem();
                int i = strStore.lastIndexOf(">");
                if (i > 0) {
                    strStore = strStore.substring(i + 1, strStore.length());
                }
                Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("a ").append(strStore).append("\n"))));
                this.appParent.blnMenuRefresh = true;
                this.appParent.blnMenuRefresh = false;
            } else if (evt.getSource() == this.chcAction) {
                if (this.chcAction.getSelectedIndex() == 0) {
                    return;
                }
                Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(this.chcAction.getSelectedItem())).concat("\n"));
                this.appParent.blnMenuRefresh = true;
                this.appParent.blnMenuRefresh = false;
            } else if (evt.getSource() == this.chcLook) {
                if (this.chcLook.getSelectedIndex() == 0) {
                    return;
                }
                String strStore = this.chcLook.getSelectedItem();
                StringTokenizer tknStore = new StringTokenizer(strStore, ">");
                while (tknStore.countTokens() > 0) {
                    strStore = tknStore.nextToken();
                }
                Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("look ").append(strStore).append("\n"))));
                this.appParent.blnMenuRefresh = true;
                this.appParent.blnMenuRefresh = false;
            } else if (evt.getSource() == this.chcGet) {
                if (this.chcGet.getSelectedIndex() == 0) {
                    return;
                }
                String strStore = this.chcGet.getSelectedItem();
                Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("get ").append(strStore).append("\n"))));
                this.appParent.blnMenuRefresh = true;
                this.appParent.blnMenuRefresh = false;
            } else if (evt.getSource() == this.chcDrop) {
                if (this.chcDrop.getSelectedIndex() == 0) {
                    return;
                }
                String strStore = this.chcDrop.getSelectedItem();
                Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("drop ").append(strStore).append("\n"))));
                this.appParent.blnMenuRefresh = true;
                this.appParent.blnMenuRefresh = false;
            }
        }
        catch (Exception e) {
            System.out.println("Error at MainFrame.actionPerformed(): ".concat(String.valueOf(String.valueOf(e.toString()))));
        }
        this.txtInput.requestFocus();
    }

    private void initEditorPanel() {
        this.pnlEditor.setLocation(new Point(340, 0));
        this.pnlEditor.setVisible(false);
        this.pnlEditor.setLayout(null);
        this.pnlEditor.setSize(new Dimension(550, 330));
        this.pnlEditor.setBackground(this.textbackground);
        this.pnlEditor.add(this.pnlEditorMenu);
        this.pnlEditor.add(this.pnlEditorGraphics);
        this.pnlEditor.add(this.pnlObjectEntry);
        this.pnlEditorMenu.setLocation(10, 1);
        this.pnlEditorMenu.setLayout(new FlowLayout(0));
        this.pnlEditorMenu.setSize(new Dimension(550, 26));
        this.pnlEditorMenu.setVisible(true);
        this.pnlEditorMenu.add(this.btnTile);
        this.pnlEditorMenu.add(this.btnMob);
        this.pnlEditorMenu.add(this.btnItem);
        this.pnlEditorMenu.add(this.btnMerc);
        this.pnlEditorMenu.add(this.btnProp);
        this.pnlEditorMenu.add(this.btnSign);
        this.pnlEditorMenu.add(this.btnDoor);
        this.pnlEditorMenu.add(this.btnCloseEditor);
        this.btnTile.setLabel("Tile");
        this.btnTile.setSize(new Dimension(20, 20));
        this.btnTile.setVisible(true);
        this.btnMob.setLabel("Mob");
        this.btnMob.setSize(new Dimension(20, 20));
        this.btnMob.setVisible(true);
        this.btnItem.setLabel("Item");
        this.btnItem.setSize(new Dimension(20, 20));
        this.btnItem.setVisible(true);
        this.btnMerc.setLabel("Merch");
        this.btnMerc.setSize(new Dimension(20, 20));
        this.btnMerc.setVisible(true);
        this.btnProp.setLabel("Prop");
        this.btnProp.setSize(new Dimension(20, 20));
        this.btnProp.setVisible(true);
        this.btnSign.setLabel("Sign");
        this.btnSign.setSize(new Dimension(20, 20));
        this.btnSign.setVisible(true);
        this.btnDoor.setLabel("Door");
        this.btnDoor.setSize(new Dimension(20, 20));
        this.btnDoor.setVisible(true);
        this.btnCloseEditor.setLabel("X");
        this.btnCloseEditor.setSize(new Dimension(10, 20));
        this.btnCloseEditor.setVisible(true);
        this.pnlEditorGraphics.setLocation(new Point(10, 30));
        this.pnlEditorGraphics.setVisible(false);
        this.pnlEditorGraphics.setSize(new Dimension(290, 280));
        this.pnlEditorGraphics.setBackground(this.background);
        this.pnlObjectEntry.setLocation(new Point(10, 30));
        this.pnlObjectEntry.setVisible(false);
        this.pnlObjectEntry.setLayout(null);
        this.pnlObjectEntry.setSize(new Dimension(290, 280));
        this.pnlObjectEntry.setBackground(this.background);
        this.pnlObjectEntry.add(this.chcObject);
        this.pnlObjectEntry.add(this.list);
        this.pnlObjectEntry.add(this.btnAddObject);
        this.pnlObjectEntry.add(this.txtName);
        this.pnlObjectEntry.add(this.txtValue1);
        this.pnlObjectEntry.add(this.txtValue2);
        this.pnlObjectEntry.add(this.txtValue3);
        this.pnlObjectEntry.add(this.txtValue4);
        this.pnlObjectEntry.add(this.chkbxValue1);
        this.pnlObjectEntry.add(this.chkbxValue2);
        this.pnlObjectEntry.add(this.lblValue1);
        this.pnlObjectEntry.add(this.lblValue2);
        this.pnlObjectEntry.add(this.lblValue3);
        this.pnlObjectEntry.add(this.lblValue4);
        this.pnlObjectEntry.add(this.lblValue5);
        this.pnlObjectEntry.add(this.lblValue6);
        this.chcObject.setLocation(new Point(10, 20));
        this.chcObject.setVisible(false);
        this.chcObject.setSize(new Dimension(150, 20));
        this.list.setLocation(new Point(10, 70));
        this.list.setVisible(false);
        this.list.setSize(new Dimension(150, 90));
        this.txtName.setLocation(new Point(10, 20));
        this.txtName.setVisible(false);
        this.txtName.setSize(new Dimension(150, 20));
        this.btnAddObject.setLabel("Add");
        this.btnAddObject.setLocation(new Point(90, 230));
        this.btnAddObject.setSize(new Dimension(50, 30));
        this.btnAddObject.setVisible(true);
        this.txtValue1.setSize(new Dimension(150, 20));
        this.txtValue1.setVisible(false);
        this.txtValue2.setSize(new Dimension(150, 20));
        this.txtValue1.setVisible(false);
        this.txtValue3.setSize(new Dimension(150, 20));
        this.txtValue1.setVisible(false);
        this.txtValue4.setSize(new Dimension(150, 20));
        this.txtValue1.setVisible(false);
        this.lblValue1.setSize(new Dimension(90, 20));
        this.lblValue2.setSize(new Dimension(90, 20));
        this.lblValue3.setSize(new Dimension(90, 20));
        this.lblValue4.setSize(new Dimension(90, 20));
        this.lblValue5.setSize(new Dimension(90, 20));
        this.lblValue6.setSize(new Dimension(90, 20));
        this.chkbxValue1.setSize(new Dimension(20, 20));
        this.chkbxValue1.setVisible(false);
        this.chkbxValue2.setSize(new Dimension(20, 20));
        this.chkbxValue2.setVisible(false);
        this.btnTile.addActionListener(this.appParent);
        this.btnMob.addActionListener(this.appParent);
        this.btnItem.addActionListener(this.appParent);
        this.btnMerc.addActionListener(this.appParent);
        this.btnProp.addActionListener(this.appParent);
        this.btnSign.addActionListener(this.appParent);
        this.btnDoor.addActionListener(this.appParent);
        this.btnAddObject.addActionListener(this.appParent);
        this.btnCloseEditor.addActionListener(this.appParent);
    }

    public void clearEditorFields() {
        this.txtName.setText("");
        this.txtValue1.setText("");
        this.txtValue2.setText("");
        this.txtValue3.setText("");
        this.txtValue4.setText("");
        this.lblValue1.setText("");
        this.lblValue2.setText("");
        this.lblValue3.setText("");
        this.lblValue4.setText("");
        this.lblValue5.setText("");
        this.lblValue6.setText("");
        this.chkbxValue1.setState(false);
        this.chkbxValue2.setState(false);
        this.list.select(0);
    }

    public void hideEditorFields() {
        this.txtName.setVisible(false);
        this.txtValue1.setVisible(false);
        this.txtValue2.setVisible(false);
        this.txtValue3.setVisible(false);
        this.txtValue4.setVisible(false);
        this.lblValue1.setVisible(false);
        this.lblValue2.setVisible(false);
        this.lblValue3.setVisible(false);
        this.lblValue4.setVisible(false);
        this.lblValue5.setVisible(false);
        this.lblValue6.setVisible(false);
        this.chkbxValue1.setVisible(false);
        this.chkbxValue2.setVisible(false);
        this.chcObject.setVisible(false);
        this.list.setVisible(false);
    }
}

