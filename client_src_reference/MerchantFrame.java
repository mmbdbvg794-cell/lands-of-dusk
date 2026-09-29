/*
 * Decompiled with CFR 0.152.
 */
import java.awt.Button;
import java.awt.Choice;
import java.awt.Component;
import java.awt.Frame;
import java.awt.Label;
import java.awt.TextField;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

public class MerchantFrame
extends Frame
implements MouseListener {
    Dusk appParent;
    Button btnBuy;
    Button btnSell;
    Choice chcBuy;
    Choice chcSell;
    TextField txtQuantity;
    Label lblQuantity;

    public MerchantFrame(Dusk inParent) {
        this.appParent = inParent;
        this.setTitle("Merchant");
        this.chcBuy = new Choice();
        this.chcBuy.setLocation(0, 30);
        this.chcBuy.setSize(150, 30);
        this.chcBuy.setVisible(true);
        this.chcSell = new Choice();
        this.chcSell.setLocation(150, 30);
        this.chcSell.setSize(150, 30);
        this.chcSell.setVisible(true);
        this.txtQuantity = new TextField();
        this.txtQuantity.setLocation(150, 50);
        this.txtQuantity.setSize(75, 30);
        this.txtQuantity.setText("1");
        this.txtQuantity.setVisible(true);
        this.txtQuantity.setBackground(this.appParent.frame.textbackground);
        this.lblQuantity = new Label();
        this.lblQuantity.setText("Quantity:");
        this.lblQuantity.setLocation(75, 50);
        this.lblQuantity.setSize(75, 30);
        this.lblQuantity.setVisible(true);
        this.lblQuantity.setAlignment(2);
        this.btnBuy = new Button();
        this.btnBuy.setLabel("Buy");
        this.btnBuy.setLocation(80, 70);
        this.btnBuy.setSize(70, 30);
        this.btnBuy.setVisible(true);
        this.btnSell = new Button();
        this.btnSell.setLabel("Sell");
        this.btnSell.setLocation(150, 70);
        this.btnSell.setSize(70, 30);
        this.btnSell.setVisible(true);
        ((Component)this).setLocation(20, 20);
        this.setLayout(null);
        this.add(this.chcBuy);
        this.add(this.chcSell);
        this.add(this.txtQuantity);
        this.add(this.lblQuantity);
        this.add(this.btnBuy);
        this.add(this.btnSell);
        ((Component)this).setBackground(this.appParent.frame.background);
        this.btnBuy.addMouseListener(this);
        this.btnSell.addMouseListener(this);
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                MerchantFrame.this.thisWindowClosing(e);
            }
        });
    }

    public void mousePressed(MouseEvent evt) {
    }

    public void mouseReleased(MouseEvent evt) {
    }

    public void mouseClicked(MouseEvent evt) {
        try {
            if (evt.getComponent() == this.btnBuy) {
                String strStore = this.chcBuy.getSelectedItem();
                strStore = strStore.substring(strStore.indexOf(")") + 1);
                this.appParent.stmOut.writeBytes(String.valueOf(String.valueOf(new StringBuffer("buy ").append(this.txtQuantity.getText()).append(" ").append(strStore).append("\n"))));
            } else if (evt.getComponent() == this.btnSell) {
                String strStore = this.chcSell.getSelectedItem();
                strStore = strStore.substring(strStore.indexOf(")") + 1);
                this.appParent.stmOut.writeBytes(String.valueOf(String.valueOf(new StringBuffer("sell ").append(this.txtQuantity.getText()).append(" ").append(strStore).append("\n"))));
            }
        }
        catch (Exception exception) {
            // empty catch block
        }
    }

    public void mouseEntered(MouseEvent evt) {
    }

    public void mouseExited(MouseEvent evt) {
    }

    void thisWindowClosing(WindowEvent e) {
        ((Component)this).setVisible(false);
    }
}

