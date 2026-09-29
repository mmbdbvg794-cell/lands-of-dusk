/*
 * Decompiled with CFR 0.152.
 */
import java.awt.Button;
import java.awt.Choice;
import java.awt.Component;
import java.awt.Frame;
import java.awt.Insets;
import java.awt.Label;
import java.awt.Point;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

public class EquipmentFrame
extends Frame
implements ActionListener {
    Dusk appParent;
    boolean blnRefreshMenus;
    Choice chcSkull = new Choice();
    Choice chcArms = new Choice();
    Choice chcEyes = new Choice();
    Choice chcTorso = new Choice();
    Choice chcLegs = new Choice();
    Choice chcNeck = new Choice();
    Choice chcWaist = new Choice();
    Choice chcHands = new Choice();
    Choice chcWield = new Choice();
    Button btnRemoveSkull = new Button("Remove");
    Button btnRemoveArms = new Button("Remove");
    Button btnRemoveEyes = new Button("Remove");
    Button btnRemoveTorso = new Button("Remove");
    Button btnRemoveLegs = new Button("Remove");
    Button btnRemoveNeck = new Button("Remove");
    Button btnRemoveWaist = new Button("Remove");
    Button btnRemoveHands = new Button("Remove");
    Button btnRemoveWield = new Button("Remove");
    Label lblSkull = new Label();
    Label Label1 = new Label();
    Label Label2 = new Label();
    Label Label3 = new Label();
    Label Label4 = new Label();
    Label Label5 = new Label();
    Label Label6 = new Label();
    Label Label7 = new Label();
    Label Label8 = new Label();
    Label Label9 = new Label();
    private boolean mShown = false;

    public EquipmentFrame(Dusk inAppParent) {
        try {
            this.appParent = inAppParent;
            this.initComponents();
        }
        catch (Exception e) {
            System.err.println("Error at EquipmentFrame(): ".concat(String.valueOf(String.valueOf(e.toString()))));
            if (this.appParent != null) {
                this.appParent.addText("DEBUG: Error at EquipmentFrame(): " + e.toString() + "\n");
                java.io.StringWriter sw = new java.io.StringWriter();
                e.printStackTrace(new java.io.PrintWriter(sw));
                this.appParent.addText("DEBUG: " + sw.toString() + "\n");
            }
        }
    }

    public void initComponents() throws Exception {
        this.chcSkull.setLocation(30, 40);
        this.chcSkull.setVisible(true);
        this.chcSkull.setSize(240, 20);
        this.chcArms.setLocation(30, 120);
        this.chcArms.setVisible(true);
        this.chcArms.setSize(240, 20);
        this.chcEyes.setLocation(30, 240);
        this.chcEyes.setVisible(true);
        this.chcEyes.setSize(240, 20);
        this.chcTorso.setLocation(30, 80);
        this.chcTorso.setVisible(true);
        this.chcTorso.setSize(240, 20);
        this.chcLegs.setLocation(30, 160);
        this.chcLegs.setVisible(true);
        this.chcLegs.setSize(240, 20);
        this.chcNeck.setLocation(30, 200);
        this.chcNeck.setVisible(true);
        this.chcNeck.setSize(240, 20);
        this.chcWaist.setLocation(30, 280);
        this.chcWaist.setVisible(true);
        this.chcWaist.setSize(240, 20);
        this.chcHands.setLocation(30, 320);
        this.chcHands.setVisible(true);
        this.chcHands.setSize(240, 20);
        this.chcWield.setLocation(30, 360);
        this.chcWield.setVisible(true);
        this.chcWield.setSize(240, 20);
        this.btnRemoveSkull.setLocation(280, 40);
        this.btnRemoveSkull.setVisible(true);
        this.btnRemoveSkull.setSize(70, 20);
        this.btnRemoveTorso.setLocation(280, 80);
        this.btnRemoveTorso.setVisible(true);
        this.btnRemoveTorso.setSize(70, 20);
        this.btnRemoveArms.setLocation(280, 120);
        this.btnRemoveArms.setVisible(true);
        this.btnRemoveArms.setSize(70, 20);
        this.btnRemoveLegs.setLocation(280, 160);
        this.btnRemoveLegs.setVisible(true);
        this.btnRemoveLegs.setSize(70, 20);
        this.btnRemoveNeck.setLocation(280, 200);
        this.btnRemoveNeck.setVisible(true);
        this.btnRemoveNeck.setSize(70, 20);
        this.btnRemoveEyes.setLocation(280, 240);
        this.btnRemoveEyes.setVisible(true);
        this.btnRemoveEyes.setSize(70, 20);
        this.btnRemoveWaist.setLocation(280, 280);
        this.btnRemoveWaist.setVisible(true);
        this.btnRemoveWaist.setSize(70, 20);
        this.btnRemoveHands.setLocation(280, 320);
        this.btnRemoveHands.setVisible(true);
        this.btnRemoveHands.setSize(70, 20);
        this.btnRemoveWield.setLocation(280, 360);
        this.btnRemoveWield.setVisible(true);
        this.btnRemoveWield.setSize(70, 20);
        this.lblSkull.setText("Skull:");
        this.lblSkull.setLocation(10, 20);
        this.lblSkull.setVisible(true);
        this.lblSkull.setSize(400, 20);
        this.Label1.setText("Torso:");
        this.Label1.setLocation(10, 60);
        this.Label1.setVisible(true);
        this.Label1.setSize(400, 20);
        this.Label2.setText("Arms:");
        this.Label2.setLocation(9, 100);
        this.Label2.setVisible(true);
        this.Label2.setSize(400, 20);
        this.Label3.setText("Legs:");
        this.Label3.setLocation(9, 135);
        this.Label3.setVisible(true);
        this.Label3.setSize(400, 20);
        this.Label4.setText("Neck:");
        this.Label4.setLocation(10, 180);
        this.Label4.setVisible(true);
        this.Label4.setSize(400, 20);
        this.Label5.setText("Eyes:");
        this.Label5.setLocation(10, 220);
        this.Label5.setVisible(true);
        this.Label5.setSize(400, 20);
        this.Label6.setText("Waist:");
        this.Label6.setLocation(10, 260);
        this.Label6.setVisible(true);
        this.Label6.setSize(400, 20);
        this.Label7.setText("Hands:");
        this.Label7.setLocation(10, 300);
        this.Label7.setVisible(true);
        this.Label7.setSize(400, 20);
        this.Label9.setText("Wielded:");
        this.Label9.setLocation(10, 340);
        this.Label9.setVisible(true);
        this.Label9.setSize(400, 20);
        this.Label8.setText("Equipment");
        this.Label8.setLocation(10, 0);
        this.Label8.setAlignment(1);
        this.Label8.setVisible(true);
        this.Label8.setSize(280, 20);
        ((Component)this).setLocation(0, 0);
        this.setTitle("Equipment");
        this.setLayout(null);
        ((Component)this).setSize(360, 440);
        this.add(this.chcSkull);
        this.add(this.chcArms);
        this.add(this.chcEyes);
        this.add(this.chcTorso);
        this.add(this.chcLegs);
        this.add(this.chcNeck);
        this.add(this.chcWaist);
        this.add(this.chcHands);
        this.add(this.chcWield);
        this.add(this.btnRemoveSkull);
        this.add(this.btnRemoveTorso);
        this.add(this.btnRemoveArms);
        this.add(this.btnRemoveLegs);
        this.add(this.btnRemoveNeck);
        this.add(this.btnRemoveEyes);
        this.add(this.btnRemoveWaist);
        this.add(this.btnRemoveHands);
        this.add(this.btnRemoveWield);
        this.add(this.lblSkull);
        this.add(this.Label1);
        this.add(this.Label2);
        this.add(this.Label3);
        this.add(this.Label4);
        this.add(this.Label5);
        this.add(this.Label6);
        this.add(this.Label7);
        this.add(this.Label8);
        this.add(this.Label9);
        ((Component)this).setBackground(this.appParent.frame.background);
        this.chcSkull.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(7);
            }
        });
        this.chcArms.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(2);
            }
        });
        this.chcEyes.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(8);
            }
        });
        this.chcTorso.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(4);
            }
        });
        this.chcLegs.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(3);
            }
        });
        this.chcNeck.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(6);
            }
        });
        this.chcWaist.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(5);
            }
        });
        this.chcHands.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(9);
            }
        });
        this.chcWield.addItemListener(new ItemListener(){

            public void itemStateChanged(ItemEvent e) {
                EquipmentFrame.this.Equip(1);
            }
        });
        this.btnRemoveWield.addActionListener(this);
        this.btnRemoveArms.addActionListener(this);
        this.btnRemoveLegs.addActionListener(this);
        this.btnRemoveTorso.addActionListener(this);
        this.btnRemoveWaist.addActionListener(this);
        this.btnRemoveNeck.addActionListener(this);
        this.btnRemoveSkull.addActionListener(this);
        this.btnRemoveEyes.addActionListener(this);
        this.btnRemoveHands.addActionListener(this);
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                EquipmentFrame.this.thisWindowClosing(e);
            }
        });
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                EquipmentFrame.this.thisWindowClosing(e);
            }
        });
    }

    public void RemoveEquipped(int slot) {
        Entity entity = this.appParent.equipArray[slot];
        if (entity != null) {
            this.appParent.send("unwear ".concat(String.valueOf(entity.ID)));
        }
    }

    public void actionPerformed(ActionEvent evt) {
        if (this.blnRefreshMenus) {
            return;
        }
        if (evt.getSource() == this.chcWield) {
            this.Equip(1);
        } else if (evt.getSource() == this.chcArms) {
            this.Equip(2);
        } else if (evt.getSource() == this.chcLegs) {
            this.Equip(3);
        } else if (evt.getSource() == this.chcTorso) {
            this.Equip(4);
        } else if (evt.getSource() == this.chcWaist) {
            this.Equip(5);
        } else if (evt.getSource() == this.chcNeck) {
            this.Equip(6);
        } else if (evt.getSource() == this.chcSkull) {
            this.Equip(7);
        } else if (evt.getSource() == this.chcEyes) {
            this.Equip(8);
        } else if (evt.getSource() == this.chcHands) {
            this.Equip(9);
        } else if (evt.getSource() == this.btnRemoveWield) {
            this.RemoveEquipped(0);
        } else if (evt.getSource() == this.btnRemoveArms) {
            this.RemoveEquipped(1);
        } else if (evt.getSource() == this.btnRemoveLegs) {
            this.RemoveEquipped(2);
        } else if (evt.getSource() == this.btnRemoveTorso) {
            this.RemoveEquipped(3);
        } else if (evt.getSource() == this.btnRemoveWaist) {
            this.RemoveEquipped(4);
        } else if (evt.getSource() == this.btnRemoveNeck) {
            this.RemoveEquipped(5);
        } else if (evt.getSource() == this.btnRemoveSkull) {
            this.RemoveEquipped(6);
        } else if (evt.getSource() == this.btnRemoveEyes) {
            this.RemoveEquipped(7);
        } else if (evt.getSource() == this.btnRemoveHands) {
            this.RemoveEquipped(8);
        }
    }

    public void addNotify() {
        super.addNotify();
        if (this.mShown) {
            return;
        }
        Insets insets = this.getInsets();
        Component[] components = this.getComponents();
        for (int i = 0; i < components.length; ++i) {
            Point location = components[i].getLocation();
            location.move(location.x, location.y + insets.top);
            components[i].setLocation(location);
        }
        this.mShown = true;
    }

    void thisWindowClosing(WindowEvent e) {
        ((Component)this).setVisible(false);
    }

    public void Equip(int intStore) {
        try {
            switch (intStore) {
                case 1: {
                    String strStore = this.chcWield.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[0];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 2: {
                    String strStore = this.chcArms.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[1];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 3: {
                    String strStore = this.chcLegs.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[2];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 4: {
                    String strStore = this.chcTorso.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[3];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 5: {
                    String strStore = this.chcWaist.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[4];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 6: {
                    String strStore = this.chcNeck.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[5];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 7: {
                    String strStore = this.chcSkull.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[6];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 8: {
                    String strStore = this.chcEyes.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[7];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
                case 9: {
                    String strStore = this.chcHands.getSelectedItem();
                    if (strStore.equals("none")) {
                        Entity entity = this.appParent.equipArray[8];
                        if (entity != null) {
                            Commands.parseCommand(this.appParent, "remove ".concat(String.valueOf(entity.ID)));
                        }
                        break;
                    }
                    Commands.parseCommand(this.appParent, String.valueOf(String.valueOf(new StringBuffer("wear ").append(strStore).append("\n"))));
                    break;
                }
            }
        }
        catch (Exception e) {
            this.appParent.addText("Error at Equip(): ".concat(String.valueOf(String.valueOf(e.toString()))));
        }
    }
}

