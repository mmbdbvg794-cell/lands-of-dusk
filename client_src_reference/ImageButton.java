/*
 * Decompiled with CFR 0.152.
 */
import java.awt.Canvas;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

class ImageButton
extends Canvas
implements MouseListener {
    Image imgNormal;
    Image imgMouseOver;
    Image imgMouseDown;
    int state = 0;
    ActionListener listener;

    public ImageButton() {
        this.addMouseListener(this);
        this.repaint();
    }

    public void addActionListener(ActionListener l) {
        this.listener = l;
    }

    public void paint(Graphics g) {
        switch (this.state) {
            case 0: {
                if (this.imgNormal == null) break;
                g.drawImage(this.imgNormal, 0, 0, this);
                break;
            }
            case 1: {
                if (this.imgMouseOver == null) break;
                g.drawImage(this.imgMouseOver, 0, 0, this);
                break;
            }
            case 2: {
                if (this.imgMouseDown == null) break;
                g.drawImage(this.imgMouseDown, 0, 0, this);
            }
        }
    }

    public void update(Graphics g) {
        this.paint(g);
    }

    public void mousePressed(MouseEvent evt) {
        this.state = 2;
        this.repaint();
    }

    public void mouseReleased(MouseEvent evt) {
        this.state = 0;
        this.repaint();
    }

    public void mouseClicked(MouseEvent evt) {
        this.listener.actionPerformed(new ActionEvent(this, 0, null));
    }

    public void mouseEntered(MouseEvent evt) {
        this.state = 1;
        this.repaint();
    }

    public void mouseExited(MouseEvent evt) {
        this.state = 0;
        this.repaint();
    }
}

