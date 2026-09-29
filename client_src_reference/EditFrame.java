/*
 * Decompiled with CFR 0.152.
 */
import java.awt.BorderLayout;
import java.awt.Button;
import java.awt.Component;
import java.awt.Frame;
import java.awt.TextArea;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

public class EditFrame
extends Frame
implements MouseListener {
    Dusk appParent;
    TextArea txtEdit;
    Button btnSubmit;
    String strName;

    public EditFrame(String inName, Dusk inParent, boolean blnSubmit) {
        this.appParent = inParent;
        this.strName = inName;
        this.setTitle(this.strName);
        this.setLayout(new BorderLayout());
        if (blnSubmit) {
            this.btnSubmit = new Button("Submit");
            this.add((Component)this.btnSubmit, "South");
            this.btnSubmit.addMouseListener(this);
        }
        this.txtEdit = new TextArea(40, 40);
        this.add(this.txtEdit);
        ((Component)this).setBackground(this.appParent.frame.background);
        this.addWindowListener(new WindowAdapter(){

            public void windowClosing(WindowEvent e) {
                EditFrame.this.thisWindowClosing(e);
            }
        });
        this.pack();
    }

    public void mousePressed(MouseEvent evt) {
    }

    public void mouseReleased(MouseEvent evt) {
    }

    public void mouseClicked(MouseEvent evt) {
        if (evt.getComponent() == this.btnSubmit) {
            try {
                this.appParent.stmOut.writeBytes(String.valueOf(String.valueOf(new StringBuffer("submit ").append(this.strName).append("\n"))));
                this.appParent.stmOut.writeBytes(String.valueOf(String.valueOf(this.txtEdit.getText())).concat("\n--EOF--\n"));
            }
            catch (Exception e) {
                this.appParent.addText("Error while submitting file: ".concat(String.valueOf(String.valueOf(e.toString()))));
            }
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

