import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class PalletteFrame extends JPanel implements MouseListener, MouseMotionListener, ActionListener {
    DuskMapEditor appParent;
    JPanel pnlGraphics;
    JLabel lblInfo = new JLabel("Palette");
    JComboBox<String> cmbZoom = new JComboBox<String>(new String[]{"100%", "75%", "50%", "25%"});
    int lastX = 0,
            lastY = 0,
            lastMouseX = 0,
            lastMouseY = 0;

    public PalletteFrame(DuskMapEditor inParent) {
        appParent = inParent;
    }

    public void initComponents() throws Exception {
        setLayout(new BorderLayout());

        pnlGraphics = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                if (appParent != null && appParent.getPaletteImage() != null) {
                    g.drawImage(appParent.getPaletteImage(), 0, 0, this);
                }
            }
        };

        JPanel pnlTop = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 2));
        pnlTop.add(lblInfo);
        pnlTop.add(new JLabel("Zoom:"));
        cmbZoom.setSelectedItem("75%");
        pnlTop.add(cmbZoom);
        add(pnlTop, BorderLayout.NORTH);

        int intX = 25 * appParent.intImageSizePalette;
        int intY = ((appParent.numMapImages / 25) + 1) * appParent.intImageSizePalette;
        pnlGraphics.setPreferredSize(new Dimension(intX, intY));
        pnlGraphics.setCursor(new Cursor(Cursor.WAIT_CURSOR));

        JScrollPane scrollPane = new JScrollPane(pnlGraphics);
        scrollPane.getVerticalScrollBar().setUnitIncrement(appParent.intImageSizePalette);
        add(scrollPane, BorderLayout.CENTER);

        // Reasonable default height for the docked palette strip; the split pane
        // divider lets the person resize this themselves afterward.
        setPreferredSize(new Dimension(intX, 170));

        cmbZoom.addActionListener(this);
    }

	
	//Accept mouse input
	public void mousePressed(MouseEvent evt)
	{
		int x = evt.getX();
		int y = evt.getY();

		if(!appParent.blnLoaded) return;

		//Find coordinates of click on map
		lastX = (x / appParent.intImageSizePalette);
		lastY = (y / appParent.intImageSizePalette);
	}

	public void mouseReleased(MouseEvent evt)
	{
		int x = evt.getX();
		int y = evt.getY();

		if(!appParent.blnLoaded) return;

		//Find coordinates of click on map
		int newX = (x / appParent.intImageSizePalette);
		int newY = (y / appParent.intImageSizePalette);

		if ((lastX == newX) && (lastY == newY))
		{
			appParent.pfX = newX;
			appParent.pfY = newY;
			appParent.ForeGroundTile = (short)((newY*25) + newX);

			appParent.update();
			appParent.frame.pnlGraphics.repaint();
		}
	}

	public void mouseClicked(MouseEvent evt)
	{
		if (evt.getComponent() == pnlGraphics)
		{
			int x = evt.getX();
			int y = evt.getY();
			int newX,
				newY;
 			if(!appParent.blnLoaded) return;
 	
 			//Find coordinates of click on map
 			newX = (x / appParent.intImageSizePalette);
 			newY = (y / appParent.intImageSizePalette);

			appParent.pfX = newX;
			appParent.pfY = newY;
			appParent.ForeGroundTile = (short)((newY*25) + newX);

			appParent.update();
			appParent.frame.pnlGraphics.repaint();
		}
	}
	public void mouseEntered(MouseEvent evt) {}

	public void mouseExited(MouseEvent evt)
	{
		evt.consume();
		if (!appParent.blnLoaded)
		{
			return;
		}
		if (evt.getComponent() == pnlGraphics)
		{
			drawTile(lastMouseX,lastMouseY,((lastMouseY*25) + lastMouseX));
			appParent.update();
			appParent.frame.pnlGraphics.repaint();
		}
	}

    public void mouseMoved(MouseEvent evt)
	{
        evt.consume();
		if (!appParent.blnLoaded)
		{
			return;
		}
		if (evt.getComponent() == pnlGraphics)
		{
			int x = evt.getX();
			int y = evt.getY();

 			int destX = (x / appParent.intImageSizePalette);
 			int destY = (y / appParent.intImageSizePalette);

			if (destX != appParent.pfX || destY != appParent.pfY) {
				appParent.pfX = destX;
				appParent.pfY = destY;
				appParent.update();
				pnlGraphics.repaint();
			}
		}
	}
	
	public void mouseDragged(MouseEvent evt) {}


	public void actionPerformed(ActionEvent evt)
	{
		String selected = (String) cmbZoom.getSelectedItem();
		if ("100%".equals(selected))
		{
			appParent.intImageSizePalette = appParent.intImageOriginalSize;
		} else if ("75%".equals(selected))
		{
			appParent.intImageSizePalette = (appParent.intImageOriginalSize * 3)/4;
		} else if ("50%".equals(selected))
		{
			appParent.intImageSizePalette = appParent.intImageOriginalSize/2;
		} else if ("25%".equals(selected))
		{
			appParent.intImageSizePalette = appParent.intImageOriginalSize/4;
		}
		appParent.updatePalette();
	}

	public void setInfoText(String text)
	{
		lblInfo.setText(text);
	}

	public void drawTile(int x, int y, int tile)
	{
		appParent.gD_p.drawImage(appParent.getCurrentPaletteImage(),
						x*appParent.intImageSizePalette,
						y*appParent.intImageSizePalette,
						(x+1)*appParent.intImageSizePalette,
						(y+1)*appParent.intImageSizePalette,
						tile*appParent.intImageOriginalSize,
						0,
						(tile+1)*appParent.intImageOriginalSize,
						appParent.intImageOriginalSize,
						null);
	}
}
