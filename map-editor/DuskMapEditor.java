import java.awt.*;
import java.awt.image.*;
import java.awt.event.*;
import java.io.*;
import java.util.Vector;
import java.util.Iterator;
import java.lang.Math;
import java.lang.reflect.Array;
import java.util.StringTokenizer;
import java.net.*;
import java.util.Deque;
import java.util.ArrayDeque;
import javax.swing.text.*;
import javax.swing.JScrollBar;
import javax.swing.ImageIcon;
import javax.swing.JOptionPane;

public class DuskMapEditor implements MouseListener,ComponentListener,ActionListener,KeyListener/*,ImageObserver*/,MouseMotionListener,AdjustmentListener, java.awt.event.MouseWheelListener
{
	static String strVersion="1.0";

	
	int numMapImages,
        MapRows=25,
        MapColumns=25,
        LocX=0,
        LocY=0,
		LastMouseX=0,
		LastMouseY=0,
		LastMouseXp=0,
		LastMouseYp=0,
		pfX = 0,
		pfY = 0,
		selectStartX=0,
		selectStartY=0,
		selectStopX=0,
		selectStopY=0,
		copyWidth=0,
		copyHeight=0,
		intButton;
	short ForeGroundTile=0;
	String strTile = "-1";
	String strCurrentFile = "untitled";
	String strCurrentPaletteFile = "untitled";
	String strCurrentDirectory = null;
	boolean blnLoaded=false,
			blnFirstDrag=true,
			blnActiveSelection=false,
			blnActivePaste=false,
			blnDirty=false;
    
	Image imgOriginalMap;
	Image imgMap = null;
	Image imgCursorMap = null;
	//VolatileImage imgDisplay;
	// Image imgDisplay;
	Image imgPalette;
	Image imgForeground;
	
	short shrMap[][];
	static final int MAX_UNDO_LEVELS = 30;
	Deque<short[][]> undoStack = new ArrayDeque<short[][]>();
	Deque<short[][]> redoStack = new ArrayDeque<short[][]>();
	short shrCopy[][];
	
    int intImageSize = 36;
	int intImageOriginalSize = 36;
    int intImageSizePalette = (intImageOriginalSize * 3)/4;
	int intXmod = 8;
	int intYmod = 34;
    
    MainFrame frame;
    PalletteFrame frmPalette;
    HelpFrame frmHelp;
    SizeFrame frmSize;
	SizeFrame frmReSize;
	
	//Color background;
	//Graphics g;
	// Graphics gD;
	//Graphics g_p;
	Graphics gD_p;
	//Graphics g_f;
	Graphics gD_f;
	//GraphicsThread thrGraphics;

	public DuskMapEditor() 
	{
    	startUp();
	}
	
	void startUp()
	{
		shrMap = new short[MapColumns][MapRows];
		try
		{
			//background = new Color(140,140,140);

			frame = new MainFrame(this);
			frame.initComponents();
			frame.pnlGraphics.setPreferredSize(new Dimension(MapColumns * intImageSize, MapRows * intImageSize));
			frame.setVisible(true);
			frame.pnlGraphics.addComponentListener(this);
			frame.addComponentListener(this);
			frame.pnlGraphics.addMouseListener(this);
			frame.pnlGraphics.addMouseMotionListener(this);
			frame.pnlGraphics.addKeyListener(this);
			frame.pnlForeground.addMouseListener(this);
			frame.scrollPane.addMouseWheelListener(this);
			frame.scrollPane.getVerticalScrollBar().addAdjustmentListener(this);
			frame.scrollPane.getHorizontalScrollBar().addAdjustmentListener(this);
			frame.scrollPane.getVerticalScrollBar().setUnitIncrement(intImageSize);
			frame.scrollPane.getHorizontalScrollBar().setUnitIncrement(intImageSize);

			frame.btnToolDraw.setIcon(loadIcon("drawUp.png"));
			frame.btnToolDraw.setSelectedIcon(loadIcon("drawDown.png"));
			frame.btnToolDraw.setSelected(true);

			frame.btnToolSelect.setIcon(loadIcon("selectUp.png"));
			frame.btnToolSelect.setSelectedIcon(loadIcon("selectDown.png"));
			frame.btnToolSelect.setSelected(false);

			frame.btnToolZoom.setIcon(loadIcon("zoomUp.png"));
			frame.btnToolZoom.setSelectedIcon(loadIcon("zoomDown.png"));
			frame.btnToolZoom.setSelected(false);

			frame.btnToolFill.setIcon(loadIcon("fillUp.png"));
			frame.btnToolFill.setSelectedIcon(loadIcon("fillDown.png"));
			frame.btnToolFill.setSelected(false);

			scaleWindow();


//			imgOriginalMap = Toolkit.getDefaultToolkit().getImage("map.gif");
			imgOriginalMap = Toolkit.getDefaultToolkit().getImage("map.png");
			try
			{
				MediaTracker mdtTracker = new MediaTracker(frame);
				mdtTracker.addImage(imgOriginalMap,0);
				mdtTracker.waitForAll();
			}catch(Exception e)
			{
				System.err.println("Error while waiting for images: "+e.toString());
			}
			numMapImages = (imgOriginalMap.getWidth(null)/imgOriginalMap.getHeight(null))-1;
			intImageOriginalSize = imgOriginalMap.getHeight(null);
			intImageSizePalette = (intImageOriginalSize * 3)/4;
//			imgDisplay = frame.pnlGraphics.createVolatileImage((MapColumns*intImageOriginalSize),(MapRows*intImageOriginalSize));
			// imgDisplay = frame.pnlGraphics.createImage((MapColumns*intImageOriginalSize),(MapRows*intImageOriginalSize));
			// gD = imgDisplay.getGraphics();
			//g = frame.pnlGraphics.getGraphics();

			imgForeground = frame.pnlForeground.createImage(intImageOriginalSize,intImageOriginalSize);
			frame.pnlForeground.setSize(new java.awt.Dimension(intImageOriginalSize,intImageOriginalSize));
			gD_f = imgForeground.getGraphics();
			//g_f = frame.pnlForeground.getGraphics();

			frmPalette = new PalletteFrame(this);
			frmPalette.initComponents();
			frmPalette.setInfoText("Palette: "+numMapImages+" images");
			frmPalette.pnlGraphics.addMouseListener(frmPalette);
			frmPalette.pnlGraphics.addMouseMotionListener(frmPalette);

			frame.pnlPaletteDock.removeAll();
			frame.pnlPaletteDock.add(frmPalette, BorderLayout.CENTER);
			frame.pnlPaletteDock.revalidate();
			frame.splitPane.setDividerLocation(0.8);

			int intX = 25 * intImageSizePalette;
			int intY = ((numMapImages / 25) + 1) * intImageSizePalette;
			imgPalette = frmPalette.pnlGraphics.createImage(intX, intY);
			gD_p = imgPalette.getGraphics();
			//g_p = frmPalette.pnlGraphics.getGraphics();

			frmSize = new SizeFrame(this);
			frmReSize = new SizeFrame(this,true);

			frmHelp = new HelpFrame();
			frmHelp.initComponents();
			frmHelp.hide();

			blnLoaded = true;
			scaleImages();
			update();
			frame.pnlGraphics.repaint();
			frmPalette.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
			frame.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));

			//thrGraphics = new GraphicsThread(this);
			//thrGraphics.run();

		}catch (Exception e) 
		{
			e.printStackTrace();
		}
	}

	// Main entry point
	static public void main(String[] args) 
	{
		new DuskMapEditor();
	}
	
	// Loads an icon by resource name, returning null (and logging a warning)
	// instead of throwing if the file is missing - a single missing icon
	// shouldn't be able to abort the entire startup sequence.
	private ImageIcon loadIcon(String resourceName) {
		java.net.URL url = getClass().getResource(resourceName);
		if (url == null) {
			System.err.println("Warning: missing icon resource '" + resourceName + "' - button will have no icon.");
			return null;
		}
		return new ImageIcon(url);
	}

	public void scaleImages()
	{
		try
		{
			if (imgMap != null) imgMap.flush();

//			imgMap = imgOriginalMap.getScaledInstance(intImageSize*(numMapImages+1),intImageSize,Image.SCALE_DEFAULT);
			if (imgMap == null)
			{
				imgMap = imgOriginalMap;
				imgCursorMap = ImageTools.makeImageTransparent(imgOriginalMap);
			}
		}catch (Exception e){}
	}
	
	public void scaleWindow()
	{
		frame.pnlGraphics.setPreferredSize(new Dimension(MapColumns * intImageSize, MapRows * intImageSize));
		frame.pnlGraphics.revalidate();
		System.gc();
	}

	// --- Zoom ---
	static final int[] ZOOM_LEVELS = {100, 75, 50, 25, 10, 5};
	int intZoomIndex = 0;

	public void setZoomPercent(int percent) {
		intImageSize = (intImageOriginalSize * percent) / 100;
		if (intImageSize < 1) intImageSize = 1;
		for (int i = 0; i < ZOOM_LEVELS.length; i++) {
			if (ZOOM_LEVELS[i] == percent) { intZoomIndex = i; break; }
		}
		frame.cbmi100.setSelected(percent == 100);
		frame.cbmi75.setSelected(percent == 75);
		frame.cbmi50.setSelected(percent == 50);
		frame.cbmi25.setSelected(percent == 25);
		frame.cbmi10.setSelected(percent == 10);
		frame.cbmi5.setSelected(percent == 5);
		scaleImages();
		scaleWindow();
		update();
		frame.pnlGraphics.repaint();
	}

	public void zoomIn() {
		if (intZoomIndex > 0) {
			intZoomIndex--;
			setZoomPercent(ZOOM_LEVELS[intZoomIndex]);
		}
	}

	public void zoomOut() {
		if (intZoomIndex < ZOOM_LEVELS.length - 1) {
			intZoomIndex++;
			setZoomPercent(ZOOM_LEVELS[intZoomIndex]);
		}
	}

	//Accept mouse input
	public void mousePressed(MouseEvent evt)
	{
		intButton = evt.getButton();

		if (frame.btnToolDraw.isSelected())
		{
			backupUndo();
		}
	}

	public void mouseReleased(MouseEvent evt)
	{
		blnFirstDrag=true;
	}

	public void mouseClicked(MouseEvent evt)
	{
        evt.consume();
		if (evt.getComponent() == frame.pnlGraphics)
		{
			if (frame.btnToolDraw.isSelected())
			{
				int x = evt.getX();
				int y = evt.getY();
				if(!blnLoaded) return;

				//Find coordinates of click on map
				int mapX = x / intImageSize;
				int mapY = y / intImageSize;
				frame.lblLocation.setText("Loc: "+mapX+","+mapY);

				if (mapX < 0 || mapX >= MapColumns || mapY < 0 || mapY >= MapRows) return;

				if (evt.getButton() == MouseEvent.BUTTON1)
				{
					if (blnActiveSelection)
					{
						int startX = min(selectStartX,selectStopX);
						int stopX = max(selectStartX,selectStopX);
						int startY = min(selectStartY,selectStopY);
						int stopY = max(selectStartY,selectStopY);

						if ((mapX >= startX) && (mapX <= stopX) &&
							(mapY >= startY) && (mapY <= stopY))
						{
							setTile(mapX, mapY, ForeGroundTile);
							frame.pnlGraphics.repaint();
						}
					} else {
						setTile(mapX, mapY, ForeGroundTile);
						frame.pnlGraphics.repaint();
					}
				} else if (evt.getButton() == MouseEvent.BUTTON3)
				{
					short replaceMe = getTile(mapX, mapY);
					if (blnActiveSelection)
					{
						int startX = min(selectStartX,selectStopX);
						int stopX = max(selectStartX,selectStopX);
						int startY = min(selectStartY,selectStopY);
						int stopY = max(selectStartY,selectStopY);

						for (int i=startX;i<=stopX;i++)
						{
							for (int i2=startY;i2<=stopY;i2++)
							{
								if (getTile(i,i2) == replaceMe)
								{
									setTile(i, i2, ForeGroundTile);
								}
							}
						}
					} else {
						for (int i=0;i<MapColumns;i++)
						{
							for (int i2=0;i2<MapRows;i2++)
							{
								if (getTile(i,i2) == replaceMe)
								{
									setTile(i, i2, ForeGroundTile);
								}
							}
						}
					}
					update();
					frame.pnlGraphics.repaint();
				}
			} else if(frame.btnToolSelect.isSelected())
			{
				if (evt.getButton() == MouseEvent.BUTTON1)
				{
					blnActiveSelection = false;
					frame.miCopy.setEnabled(false);
					frame.miClear.setEnabled(false);
					update();
					frame.pnlGraphics.repaint();
				}
				return;
			} else if (frame.btnToolFill.isSelected())
			{
				int x = evt.getX();
				int y = evt.getY();
				if(!blnLoaded) return;

				int mapX = x / intImageSize;
				int mapY = y / intImageSize;
				frame.lblLocation.setText("Loc: "+mapX+","+mapY);

				if (mapX < 0 || mapX >= MapColumns || mapY < 0 || mapY >= MapRows) return;

				if (evt.getButton() == MouseEvent.BUTTON1)
				{
					floodFill(mapX, mapY);
				}
			} else if (frame.btnToolZoom.isSelected())
			{
				if (evt.getButton() == MouseEvent.BUTTON1)
				{
					if (blnActiveSelection)
					{
						int Ymod = frame.pnlButtons.getBounds().height+frame.scrollPane.getHorizontalScrollBar().getBounds().height+(frame.getInsets().top+frame.getInsets().bottom);
						int Xmod = frame.scrollPane.getVerticalScrollBar().getBounds().width+(frame.getInsets().left+frame.getInsets().right);

						int currentWidth = (frame.pnlGraphics.getBounds().width - Xmod)/intImageSize;
						int currentHeight = (frame.pnlGraphics.getBounds().height - Ymod)/intImageSize;

						int startX = min(selectStartX,selectStopX);
						int stopX = max(selectStartX,selectStopX);
						int startY = min(selectStartY,selectStopY);
						int stopY = max(selectStartY,selectStopY);

						int newWidth = stopX - startX;
						int newHeight = stopY - startY;

						float scaleX = currentWidth / newWidth;
						float scaleY = currentHeight / newHeight;

						if (scaleX < scaleY)
						{
							intImageSize = (int)(scaleX * intImageSize);
						} else
						{
							intImageSize = (int)(scaleY * intImageSize);
						}

						frame.scrollPane.getHorizontalScrollBar().setValue(startX);
						frame.scrollPane.getVerticalScrollBar().setValue(startY);
						frame.cbmi100.setSelected(false);
						frame.cbmi75.setSelected(false);
						frame.cbmi50.setSelected(false);
						frame.cbmi25.setSelected(false);
						frame.cbmi10.setSelected(false);
						frame.cbmi5.setSelected(false);

						imgMap = imgOriginalMap;

						imgCursorMap.flush();
						imgCursorMap = ImageTools.makeImageTransparent(imgMap);
						try
						{
							MediaTracker mdtTracker = new MediaTracker(frame);
							mdtTracker.addImage(imgCursorMap,0);
							mdtTracker.waitForAll();
						}catch(Exception e)
						{
							System.err.println("Error while waiting for images: "+e.toString());
						}
						int intX = (frame.pnlGraphics.getBounds().width)/intImageSize;
						int intY = (frame.pnlGraphics.getBounds().height)/intImageSize;
						if (intX < 1)
							intX = 1;
						if (intY < 1)
							intY = 1;
						boolean blnResize = false;
						if (intX > MapColumns)
						{
							frame.scrollPane.getHorizontalScrollBar().setValue(0);
							intX = MapColumns;
							blnResize = true;
						}
						if (intY > MapRows)
						{
							frame.scrollPane.getVerticalScrollBar().setValue(0);
							intY = MapRows;
							blnResize = true;
						}
						frame.scrollPane.getVerticalScrollBar().setVisibleAmount(intY);
						frame.scrollPane.getHorizontalScrollBar().setVisibleAmount(intX);
						if (blnResize)
						{
//							Ymod = frame.pnlButtons.getBounds().height+frame.scrollPane.getHorizontalScrollBar().getBounds().height+(frame.getInsets().top+frame.getInsets().bottom);
//							Xmod = frame.scrollPane.getVerticalScrollBar().getBounds().width+(frame.getInsets().left+frame.getInsets().right);
							frame.setSize(((intImageSize*intX)+Xmod),((intImageSize*intY)+Ymod));
						}

						intX = intX * intImageSize;
						intY = intY * intImageSize;

						update();
						frame.pnlGraphics.repaint();

					} else
					{
					}
				}
			}
  		} else if (evt.getComponent() == frame.pnlForeground)
		{
			updatePalette();
  		}
	}
	
	
	public void mouseEntered(MouseEvent evt){}

	
	public void mouseExited(MouseEvent evt)
	{
		evt.consume();
		if (!blnLoaded)
		{
			return;
		}
		if (evt.getComponent() == frame.pnlGraphics)
		{
			if (frame.btnToolDraw.isSelected())
			{
				int mapX = LastMouseX / intImageSize;
				int mapY = LastMouseY / intImageSize;

				if (mapX >= 0 && mapX < MapColumns && mapY >= 0 && mapY < MapRows) {
					frame.pnlGraphics.repaint(mapX * intImageSize, mapY * intImageSize, intImageSize, intImageSize);
				}
			}
		}
	}

    public void mouseMoved(MouseEvent evt)
	{
        evt.consume();
		if (!blnLoaded) { return; }

		if (evt.getComponent() == frame.pnlGraphics)
		{
			int x = evt.getX();
			int y = evt.getY();

			int mapX = x / intImageSize;
			int mapY = y / intImageSize;
			frame.lblLocation.setText("Loc: "+mapX+","+mapY);

			if (!frame.btnToolDraw.isSelected()) { return; }

			if (mapX != LastMouseX || mapY != LastMouseY) {
				// Erase old cursor preview
				int oldX = LastMouseX;
				int oldY = LastMouseY;
				if (oldX >= 0 && oldX < MapColumns && oldY >= 0 && oldY < MapRows) {
					frame.pnlGraphics.repaint(oldX * intImageSize, oldY * intImageSize, intImageSize, intImageSize);
				}

				// Store new coordinates
				LastMouseX = mapX;
				LastMouseY = mapY;

				// Draw new cursor preview
				if (mapX >= 0 && mapX < MapColumns && mapY >= 0 && mapY < MapRows) {
					frame.pnlGraphics.repaint(mapX * intImageSize, mapY * intImageSize, intImageSize, intImageSize);
				}
			}
		}
	}
	
	public void mouseDragged(MouseEvent evt)
	{
        evt.consume();
		if (evt.getComponent() == frame.pnlGraphics)
		{
			int x = evt.getX();
			int y = evt.getY();

			//Find coordinates of click on map
			int mapX = x / intImageSize;
			int mapY = y / intImageSize;
			frame.lblLocation.setText("Loc: "+mapX+","+mapY);

			if (mapX < 0 || mapX >= MapColumns || mapY < 0 || mapY >= MapRows) return;

			if (frame.btnToolDraw.isSelected())
			{
				if (intButton == MouseEvent.BUTTON1)
				{
					if (isInSelection(mapX,mapY))
					{
						setTile(mapX, mapY, ForeGroundTile);
					}
				}
				frame.pnlGraphics.repaint();
			} else if (frame.btnToolSelect.isSelected())
			{
				if (intButton != MouseEvent.BUTTON1)
				{
					return;
				}
				int oldStartX = min(selectStartX,selectStopX);
				int oldStopX = max(selectStartX,selectStopX);
				if (blnFirstDrag)
				{
					frame.pnlGraphics.repaint();
					selectStartX = mapX;
					selectStartY = mapY;
					if (selectStartX >= MapColumns)
					{
						selectStartX = MapColumns - 1;
					}
					if (selectStartY >= MapRows)
					{
						selectStartY = MapRows - 1;
					}
					if (selectStartX < 0)
					{
						selectStartX = 0;
					}
					if (selectStartY < 0)
					{
						selectStartY = 0;
					}
					blnFirstDrag = false;
					blnActiveSelection = true;
					frame.miCopy.setEnabled(true);
					frame.miClear.setEnabled(true);
				}
				selectStopX = mapX;
				selectStopY = mapY;

				if (selectStopX >= MapColumns)
				{
					selectStopX = MapColumns - 1;
				}
				if (selectStopY >= MapRows)
				{
					selectStopY = MapRows - 1;
				}
				if (selectStopX < 0)
				{
					selectStopX = 0;
				}
				if (selectStopY < 0)
				{
					selectStopY = 0;
				}

				int startX = min(selectStartX,selectStopX);
				int stopX = max(selectStartX,selectStopX);
				int startY = min(selectStartY,selectStopY);
				int stopY = max(selectStartY,selectStopY);

				frame.pnlGraphics.repaint();
			}
		}
    }
	
	//Accept key input
	public void keyPressed(KeyEvent evt)
	{
		return;
	}
	public void keyReleased(KeyEvent evt){}
	public void keyTyped(KeyEvent evt){}
	public void componentResized(ComponentEvent evt)
	{
		if (evt.getSource() != frame)
		{
			return;
		}
		scaleWindow();
		update();
		frame.pnlGraphics.repaint();
	}
	public void componentMoved(ComponentEvent evt){}
	public void componentShown(ComponentEvent evt){}
	public void componentHidden(ComponentEvent evt){}

	public void actionPerformed(ActionEvent evt)
	{
		if (evt.getSource() == frame.miNew)
		{
			if (confirmProceedIfDirty("starting a new map"))
			{
				frmSize.show();
			}
		}else if (evt.getSource() == frame.miResize)
		{
			frmReSize.show();
		}else if (evt.getSource() == frame.miSave)
		{
			doSave();
		}else if (evt.getSource() == frame.miSaveAs)
		{
			doSaveAs();
		}else if (evt.getSource() == frame.miOpen)
		{
			if (!confirmProceedIfDirty("opening another map"))
			{
				return;
			}
			FileDialog fileChooser = new FileDialog(frame, "Open map file", FileDialog.LOAD);
			if (strCurrentDirectory != null)
			{
				fileChooser.setDirectory(strCurrentDirectory);
			}
			if (strCurrentFile != "untitled")
			{
				fileChooser.setFile(strCurrentFile);
			}
			fileChooser.show();
			String strName = fileChooser.getFile();
			String strDir = fileChooser.getDirectory();
			if (strName == null)
			{
				return;
			}
			String strFileName = strDir + strName;
			File newmap = new File(strFileName);
			if (newmap.exists())
			{
				frame.pnlGraphics.setCursor(new Cursor(Cursor.WAIT_CURSOR));
				try
				{
					DataInputStream dataIn = new DataInputStream(new BufferedInputStream(new FileInputStream(strFileName), 1 << 20));
					// Matches the exact format the Dusk server reads: cols, rows,
					// then cols*rows raw shorts. No header/magic number, single layer.
					int newCols = dataIn.readInt();
					int newRows = dataIn.readInt();

					long tileCount = (long) newCols * (long) newRows;
					if (newCols <= 0 || newRows <= 0 || tileCount > 25_000_000L) {
						dataIn.close();
						throw new IOException("File does not look like a valid map (got " + newCols + "x" + newRows +
							"). It may be from an older/incompatible map format.");
					}

					short[][] newMap = new short[newCols][newRows];
					for (int i=0;i<newCols;i++)
					{
						for (int i2=0;i2<newRows;i2++)
						{
							newMap[i][i2] = dataIn.readShort();
						}
					}
					dataIn.close();

					// Only commit to live app state now that the load fully succeeded.
					MapColumns = newCols;
					MapRows = newRows;
					shrMap = newMap;
					clearUndoRedoHistory();

					strCurrentFile = strName;
					strCurrentDirectory = strDir;
					blnDirty = false;
					updateTitle();
					frame.pnlGraphics.setPreferredSize(new Dimension(MapColumns * intImageSize, MapRows * intImageSize));
					frame.scrollPane.getVerticalScrollBar().setMaximum(MapRows);
					frame.scrollPane.getHorizontalScrollBar().setMaximum(MapColumns);
					update();
					frame.pnlGraphics.repaint();
				}
				catch (OutOfMemoryError oom) {
					System.gc();
					JOptionPane.showMessageDialog(frame,
						"Could not open this map: it doesn't look like a valid map file\n" +
						"(the size it reported would need an absurd amount of memory).\n" +
						"It may be from an older/incompatible map format.",
						"Failed to Open Map", JOptionPane.ERROR_MESSAGE);
					System.err.println("Failed to open map file (out of memory, likely bad/incompatible header): " + strFileName);
				}
				catch (Exception e) {
					JOptionPane.showMessageDialog(frame,
						"Could not open this map:\n" + e.getMessage(),
						"Failed to Open Map", JOptionPane.ERROR_MESSAGE);
					System.err.println("Failed to open map file: " + strFileName);
					e.printStackTrace();
				}
				frame.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
			}
		}else if (evt.getSource() == frame.miOpenPalette)
		{
			FileDialog fileChooser = new FileDialog(frame, "Open palette file", FileDialog.LOAD);
			if (strCurrentDirectory != null)
			{
				fileChooser.setDirectory(strCurrentDirectory);
			}
			if (strCurrentPaletteFile != "untitled")
			{
				fileChooser.setFile(strCurrentPaletteFile);
			}
			fileChooser.show();
			String strName = fileChooser.getFile();
			String strDir = fileChooser.getDirectory();
			if (strName == null)
			{
				return;
			}
			String strFileName = strDir + strName;
			File newpalette = new File(strFileName);
			if (newpalette.exists())
			{
				frame.pnlGraphics.setCursor(new Cursor(Cursor.WAIT_CURSOR));
				try
				{
					blnLoaded = false;
					imgOriginalMap = Toolkit.getDefaultToolkit().getImage(strFileName);
					try
					{
						MediaTracker mdtTracker = new MediaTracker(frame);
						mdtTracker.addImage(imgOriginalMap,0);
						mdtTracker.waitForAll();
					}catch(Exception e)
					{
						System.err.println("Error while waiting for images: "+e.toString());
					}
					numMapImages = (imgOriginalMap.getWidth(null)/imgOriginalMap.getHeight(null))-1;
					frmPalette.setInfoText("Palette: "+numMapImages+" images");
					intImageOriginalSize = imgOriginalMap.getHeight(null);
					intImageSizePalette = (intImageOriginalSize * 3)/4;

					int intX = (frame.pnlGraphics.getBounds().width)/intImageSize;
					int intY = (frame.pnlGraphics.getBounds().height)/intImageSize;
					if (intX < 1)
						intX = 1;
					if (intY < 1)
						intY = 1;
					boolean blnResize = false;
					if (intX > MapColumns)
					{
						frame.scrollPane.getHorizontalScrollBar().setValue(0);
						intX = MapColumns;
						blnResize = true;
					}
					if (intY > MapRows)
					{
						frame.scrollPane.getVerticalScrollBar().setValue(0);
						intY = MapRows;
						blnResize = true;
					}
					frame.scrollPane.getVerticalScrollBar().setVisibleAmount(intY);
					frame.scrollPane.getHorizontalScrollBar().setVisibleAmount(intX);
					if (blnResize)
					{
						int Ymod = frame.pnlButtons.getBounds().height+frame.scrollPane.getHorizontalScrollBar().getBounds().height+(frame.getInsets().top+frame.getInsets().bottom);
						int Xmod = frame.scrollPane.getVerticalScrollBar().getBounds().width+(frame.getInsets().left+frame.getInsets().right);
						frame.setSize(((intImageSize*intX)+Xmod),((intImageSize*intY)+Ymod));
					}
					intX = intX * intImageSize;
					intY = intY * intImageSize;

					imgForeground = frame.pnlForeground.createImage(intImageOriginalSize,intImageOriginalSize);
					frame.pnlForeground.setSize(new java.awt.Dimension(intImageOriginalSize,intImageOriginalSize));
					gD_f = imgForeground.getGraphics();

					imgMap = imgOriginalMap;
					intX = 25 * intImageSizePalette;
					intY = ((numMapImages / 25) + 1) * intImageSizePalette;
					frmPalette.pnlGraphics.setPreferredSize(new java.awt.Dimension(intX, intY));
					frmPalette.pnlGraphics.revalidate();
					if (imgPalette != null)
						imgPalette.flush();
					imgPalette = frmPalette.pnlGraphics.createImage(intX, intY);
					gD_p = imgPalette.getGraphics();
					//g_p = frmPalette.pnlGraphics.getGraphics();

					imgCursorMap.flush();
					imgCursorMap = ImageTools.makeImageTransparent(imgMap);
					try
					{
						MediaTracker mdtTracker = new MediaTracker(frame);
						mdtTracker.addImage(imgCursorMap,0);
						mdtTracker.waitForAll();
					}catch(Exception e)
					{
						System.err.println("Error while waiting for images: "+e.toString());
					}

					update();
					frame.pnlGraphics.repaint();
					blnLoaded = true;
				}
				catch (Exception e)
				{
					System.err.println("Error while waiting loading new palette image: "+e.toString());
				}
				frmPalette.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
				frame.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
			}
		}else if (evt.getSource() == frame.miQuit)
		{
			attemptQuit();
		}else if (evt.getSource() == frame.miCopy)
		{
			int x1, x2, y1, y2;
			x1=min(selectStartX,selectStopX);
			x2=max(selectStartX,selectStopX);
			y1=min(selectStartY,selectStopY);
			y2=max(selectStartY,selectStopY);
			copyWidth = x2-x1;
			copyHeight = y2-y1;
			shrCopy = new short[copyWidth+1][copyHeight+1];
			for (int x=0; x<=copyWidth; x++)
			{
				for (int y=0; y<=copyHeight; y++)
				{
					shrCopy[x][y] = getTile(x+x1, y+y1);
				}
			}
			frame.miPaste.setEnabled(true);
		}else if (evt.getSource() == frame.miPaste)
		{
			backupUndo();
			int sx = frame.scrollPane.getHorizontalScrollBar().getValue();
			int sy = frame.scrollPane.getVerticalScrollBar().getValue();

			int startX = sx;
			int startY = sy;
			if (blnActiveSelection)
			{
				startX = min(selectStartX,selectStopX);
				startY = min(selectStartY,selectStopY);
			}

			for (int x=0; x<=copyWidth; x++)
			{
				for (int y=0; y<=copyHeight; y++)
				{
					if((startX+x < MapColumns) && (startY+y < MapRows))
						setTile(startX+x, startY+y, shrCopy[x][y]);
				}
			}

			blnActiveSelection = false;
			update();
			frame.pnlGraphics.repaint();
		}else if (evt.getSource() == frame.miClear)
		{
			backupUndo();
			int startX = min(selectStartX,selectStopX);
			int stopX = max(selectStartX,selectStopX);
			int startY = min(selectStartY,selectStopY);
			int stopY = max(selectStartY,selectStopY);
			for (int x=startX; x<=stopX; x++)
			{
				for (int y=startY; y<=stopY; y++)
				{
					setTile(x,y,ForeGroundTile);
				}
			}
			update();
			frame.pnlGraphics.repaint();
		}else if (evt.getSource() == frame.miUndo)
		{
			restoreUndo();
			update();
			frame.pnlGraphics.repaint();
		}else if (evt.getSource() == frame.miRedo)
		{
			restoreRedo();
			update();
			frame.pnlGraphics.repaint();
		}else if (evt.getSource() == frame.miHelpHowTo)
		{
			frmHelp.setSize(500,600);
			frmHelp.setTitle("How to use this program");
			frmHelp.txtOutput.setText("Clicking on the map area while the draw tool is active will\n");
			frmHelp.txtOutput.append("\tdraw on the map with the currently selected draw tile.\n");
			frmHelp.txtOutput.append("Right clicking on the map while the draw tool is active\n");
			frmHelp.txtOutput.append("\twill replace all occurrances of the tile that was clicked\n");
			frmHelp.txtOutput.append("\twith the currently selected draw tile\n");
			frmHelp.txtOutput.append("Clicking and dragging on the map area while the Select tool\n");
			frmHelp.txtOutput.append("\tis selected will mark a selection area.\n");
			frmHelp.txtOutput.append("\tDrawing and tile replacement are restricted to the selection\n");
			frmHelp.txtOutput.append("\tarea as long as it is active.\n");
			frmHelp.txtOutput.append("Clicking on the map (without dragging) while the select tool\n");
			frmHelp.txtOutput.append("\tis active will de-activate the selection area.\n");
			frmHelp.txtOutput.append("Clicking on the current draw tile will bring up the palette\n");
			frmHelp.txtOutput.append("\tof tiles available an allow you to choose a new draw tile.\n");
			frmHelp.txtOutput.append("Clicking on the map while the Fill tool is active will flood-fill\n");
			frmHelp.txtOutput.append("\tthe contiguous area of matching tiles with the current draw tile,\n");
			frmHelp.txtOutput.append("\tlike a paint bucket. If there's an active selection, the fill is\n");
			frmHelp.txtOutput.append("\trestricted to that area.\n\n");
			frmHelp.txtOutput.append("File Menu:\n");
			frmHelp.txtOutput.append("\tNew...  (Ctrl+N):  Creates a new map in memory.\n");
			frmHelp.txtOutput.append("\t\tIf you have unsaved changes, you'll be asked whether to\n");
			frmHelp.txtOutput.append("\t\tsave, discard, or cancel first.\n");
			frmHelp.txtOutput.append("\tOpen...  (Ctrl+O):  Opens a map file from disk.\n");
			frmHelp.txtOutput.append("\t\tIf you have unsaved changes, you'll be asked whether to\n");
			frmHelp.txtOutput.append("\t\tsave, discard, or cancel first.\n");
			frmHelp.txtOutput.append("\tLoad Palette...:  Loads a new palette file from disk.\n");
			frmHelp.txtOutput.append("\tResize...:  Resizes the current map in memory.\n");
			frmHelp.txtOutput.append("\t\tMaking map smaller will delete data.\n");
			frmHelp.txtOutput.append("\tSave  (Ctrl+S):  Saves the current map to disk.\n");
			frmHelp.txtOutput.append("\tSave as...  (Ctrl+Shift+S):  Saves the current map to disk\n");
			frmHelp.txtOutput.append("\t\twith a different name.\n");
			frmHelp.txtOutput.append("\tQuit  (Ctrl+Q):  Exits the program.\n");
			frmHelp.txtOutput.append("\t\tIf you have unsaved changes, you'll be asked whether to\n");
			frmHelp.txtOutput.append("\t\tsave, discard, or cancel first. Closing the window with the\n");
			frmHelp.txtOutput.append("\t\ttitlebar X does the same check.\n");
			frmHelp.txtOutput.append("\tThe title bar shows a * before the file name whenever there\n");
			frmHelp.txtOutput.append("\tare unsaved changes.\n");
			frmHelp.txtOutput.append("Edit Menu:\n");
			frmHelp.txtOutput.append("\tUndo  (Ctrl+Z):  Steps back through your edit history\n");
			frmHelp.txtOutput.append("\t\t(up to the last "+MAX_UNDO_LEVELS+" edits), one step at a time.\n");
			frmHelp.txtOutput.append("\tRedo  (Ctrl+Y):  Steps forward again through edits you've undone.\n");
			frmHelp.txtOutput.append("\t\tMaking a new edit after an Undo clears the Redo history.\n");
			frmHelp.txtOutput.append("\tCopy  (Ctrl+C):  Copies the tiles in the currently active select area.\n");
			frmHelp.txtOutput.append("\tPaste  (Ctrl+V):  Pastes the tiles saved with Copy.\n");
			frmHelp.txtOutput.append("\t\tWill paste the tiles with upper left corner being the upper left\n");
			frmHelp.txtOutput.append("\t\tcorner of the screenthe upper left corner of the currently\n");
			frmHelp.txtOutput.append("\t\tactive selection.\n");
			frmHelp.txtOutput.append("\tClear  (Delete):  Sets all the tiles in the currently active select area\n");
			frmHelp.txtOutput.append("\t\tto the current draw tile.\n");
			frmHelp.txtOutput.append("Scale Menu:\n");
			frmHelp.txtOutput.append("\tUsed to set the current zoom level (100%, 75%, 50%, 25%, 10%, 5%).\n");
			frmHelp.txtOutput.append("\tCtrl + scroll wheel zooms in/out as well.\n");
			frmHelp.txtOutput.append("\tCtrl+= zooms in, Ctrl+- zooms out.\n");
			frmHelp.txtOutput.append("Help Menu:\n");
			frmHelp.txtOutput.append("\tHow to use this program...:  Brings up this window.\n");
			frmHelp.txtOutput.append("\tAbout...:  Brings up version info.\n");
			frmHelp.show();
		}else if (evt.getSource() == frame.miAbout)
		{
			frmHelp.setSize(250,150);
			frmHelp.setTitle("About DuskMapEditor");
			frmHelp.txtOutput.setText("Dusk Map Editor\nVersion 1.0\n\nCreated 08/20/2003\nBy Wildern");
			frmHelp.show();
		}
	}	

	public void adjustmentValueChanged(AdjustmentEvent evt)
	{
		if (!evt.getValueIsAdjusting())
		{
			update();
			frame.pnlGraphics.repaint();
		}
	}

	void thisWindowClosing(WindowEvent e)
	{
		frame.setVisible(false);
	}
	
	boolean isInSelection(int x, int y)
	{
		int x1,
			x2,
			y1,
			y2;
		if (!blnActiveSelection)
		{
			return true;
		}
		x1 = min(selectStartX,selectStopX);
		x2 = max(selectStartX,selectStopX);
		y1 = min(selectStartY,selectStopY);
		y2 = max(selectStartY,selectStopY);
		return ((x1 <= x) && (x <= x2) && (y1 <= y) && (y <= y2));
	}
	
	//Display graphics
	public void updatePalette() {
		Image currentPaletteImage = getCurrentPaletteImage();
		numMapImages = (currentPaletteImage.getWidth(null) / currentPaletteImage.getHeight(null)) - 1;
		frmPalette.setInfoText("Palette: " + numMapImages + " images");

		int intX = 25 * intImageSizePalette;
		int intY = ((numMapImages / 25) + 1) * intImageSizePalette;

		// Set the preferred size for the panel so the scroll pane knows the content size
		frmPalette.pnlGraphics.setPreferredSize(new java.awt.Dimension(intX, intY));

		// Revalidate the panel to trigger the scroll pane to update its layout
		frmPalette.pnlGraphics.revalidate();

		// Create the off-screen image for drawing
		if (imgPalette != null) {
			imgPalette.flush();
		}
		imgPalette = frmPalette.pnlGraphics.createImage(intX, intY);
		if (imgPalette != null) {
			gD_p = imgPalette.getGraphics();
		}

		// Now call the original update to redraw the content
		update();
		frmPalette.pnlGraphics.repaint();
	}

	//Display graphics
	public void update()
	{
		if (!blnLoaded)
		{
			return;
		}
		int x,
			y,
			i,
			i2;

		x=0;
		y=0;
		Image currentPalette = getCurrentPaletteImage();
		gD_p.clearRect(0, 0, imgPalette.getWidth(null), imgPalette.getHeight(null));
		for (i=0; i<=numMapImages; i++)
		{
			gD_p.drawImage(currentPalette,
							x*intImageSizePalette,y*intImageSizePalette,
							(x+1)*intImageSizePalette,(y+1)*intImageSizePalette,
							i*intImageOriginalSize,0,
							(i+1)*intImageOriginalSize,intImageOriginalSize,
							null);
			x++;
			if (x > 24)
			{
				y++;
				x = 0;
			}
		}
		gD_p.setColor(Color.green);
		gD_p.drawRoundRect((int)(pfX*intImageSizePalette),(int)(pfY*intImageSizePalette),
					intImageSizePalette-1,intImageSizePalette-1,intImageSizePalette/3,intImageSizePalette/3);
		gD_f.clearRect(0, 0, intImageOriginalSize, intImageOriginalSize);
		gD_f.drawImage(getCurrentImage(),
							0,0,
							intImageOriginalSize,intImageOriginalSize,
							ForeGroundTile*intImageOriginalSize,0,
							(ForeGroundTile+1)*intImageOriginalSize,intImageOriginalSize,
							null);
		frame.pnlForeground.repaint();
	}

	public void paint(Graphics g) {
		if (blnLoaded && g != null) {
			int sx = frame.scrollPane.getHorizontalScrollBar().getValue();
			int sy = frame.scrollPane.getVerticalScrollBar().getValue();
	
			// Get the visible area of the panel
			Rectangle clip = g.getClipBounds();
	
			// Calculate the range of tiles to draw
			int startX = clip.x / intImageSize;
			int startY = clip.y / intImageSize;
			int endX = (clip.x + clip.width) / intImageSize;
			int endY = (clip.y + clip.height) / intImageSize;
	
			// Constrain to map boundaries
			endX = Math.min(endX, MapColumns - 1);
			endY = Math.min(endY, MapRows - 1);
	
			// Draw the visible tiles
			for (int i = startX; i <= endX; i++) {
				for (int i2 = startY; i2 <= endY; i2++) {
					drawTile(imgMap, g, i, i2, shrMap[i][i2]);
				}
			}
	
			if (blnActiveSelection) {
				Color highlight = new Color(255, 255, 255, 128);
				g.setColor(highlight);
				int startDrawX = min(selectStartX, selectStopX);
				int stopDrawX = max(selectStartX, selectStopX);
				int startDrawY = min(selectStartY, selectStopY);
				int stopDrawY = max(selectStartY, selectStopY);
				g.fillRect(startDrawX * intImageSize, startDrawY * intImageSize,
						(stopDrawX - startDrawX + 1) * intImageSize,
						(stopDrawY - startDrawY + 1) * intImageSize);
			}
			
			// Draw cursor preview
			if (frame.btnToolDraw.isSelected()) {
				int mapX = LastMouseX;
				int mapY = LastMouseY;

				if (mapX >= 0 && mapX < MapColumns && mapY >= 0 && mapY < MapRows) {
					drawTile(getCurrentCursorImage(), g, mapX, mapY, ForeGroundTile);
				}
			}
		}
	}
	
	public void drawTile(Image img, Graphics g, int x, int y, int tile) {
		g.drawImage(img,
				x * intImageSize, y * intImageSize,
				(x + 1) * intImageSize, (y + 1) * intImageSize,
				tile * intImageOriginalSize, 0,
				(tile + 1) * intImageOriginalSize, intImageOriginalSize,
				null);
	}

	public Image getDisplayImage() {
		return null;
	}

	public Image getPaletteImage() {
		return imgPalette;
	}

	public Image getForegroundImage() {
		return imgForeground;
	}

	public int min(int v1, int v2)
	{
		if (v1 <= v2)
		{
			return v1;
		}
		return v2;
	}

	public int max(int v1, int v2)
	{
		if (v1 > v2)
		{
			return v1;
		}
		return v2;
	}

	public short[][] getCurrentMap() {
		return shrMap;
	}

	public short getTile(int x, int y) {
		return getCurrentMap()[x][y];
	}

	public void setTile(int x, int y, short tile) {
		getCurrentMap()[x][y] = tile;
	}

	// Paint-bucket style fill: replaces the contiguous (4-connected) region of
	// matching tiles starting at (startX, startY) with the current draw tile.
	// If there's an active selection, the fill is bounded to that area.
	public void floodFill(int startX, int startY) {
		int minX = 0, maxX = MapColumns - 1, minY = 0, maxY = MapRows - 1;
		if (blnActiveSelection) {
			minX = min(selectStartX, selectStopX);
			maxX = max(selectStartX, selectStopX);
			minY = min(selectStartY, selectStopY);
			maxY = max(selectStartY, selectStopY);
			if (startX < minX || startX > maxX || startY < minY || startY > maxY) return;
		}

		short targetValue = getTile(startX, startY);
		if (targetValue == ForeGroundTile) return; // already the fill tile, nothing to do

		backupUndo();

		Deque<int[]> stack = new ArrayDeque<int[]>();
		stack.push(new int[]{startX, startY});
		setTile(startX, startY, ForeGroundTile);

		while (!stack.isEmpty()) {
			int[] p = stack.pop();
			int px = p[0], py = p[1];

			if (px > minX && getTile(px-1, py) == targetValue) { setTile(px-1, py, ForeGroundTile); stack.push(new int[]{px-1, py}); }
			if (px < maxX && getTile(px+1, py) == targetValue) { setTile(px+1, py, ForeGroundTile); stack.push(new int[]{px+1, py}); }
			if (py > minY && getTile(px, py-1) == targetValue) { setTile(px, py-1, ForeGroundTile); stack.push(new int[]{px, py-1}); }
			if (py < maxY && getTile(px, py+1) == targetValue) { setTile(px, py+1, ForeGroundTile); stack.push(new int[]{px, py+1}); }
		}

		update();
		frame.pnlGraphics.repaint();
	}

	private Deque<short[][]> getUndoStack() {
		return undoStack;
	}

	private Deque<short[][]> getRedoStack() {
		return redoStack;
	}

	private short[][] cloneCurrentMap() {
		short[][] src = getCurrentMap();
		short[][] copy = new short[MapColumns][MapRows];
		for (int x = 0; x < MapColumns; x++) {
			System.arraycopy(src[x], 0, copy[x], 0, MapRows);
		}
		return copy;
	}

	// Call before any edit: saves the pre-edit state so it can be undone,
	// and clears this layer's redo history (a fresh edit invalidates old redos).
	public void backupUndo() {
		Deque<short[][]> undoStack = getUndoStack();
		undoStack.push(cloneCurrentMap());
		while (undoStack.size() > MAX_UNDO_LEVELS) {
			undoStack.removeLast();
		}
		getRedoStack().clear();
		markDirty();
		updateUndoRedoButtons();
	}

	public void restoreUndo() {
		Deque<short[][]> undoStack = getUndoStack();
		if (undoStack.isEmpty()) return;
		getRedoStack().push(cloneCurrentMap());
		short[][] snapshot = undoStack.pop();
		short[][] currentMap = getCurrentMap();
		for (int x = 0; x < MapColumns; x++) {
			System.arraycopy(snapshot[x], 0, currentMap[x], 0, MapRows);
		}
		markDirty();
		updateUndoRedoButtons();
	}

	public void restoreRedo() {
		Deque<short[][]> redoStack = getRedoStack();
		if (redoStack.isEmpty()) return;
		getUndoStack().push(cloneCurrentMap());
		short[][] snapshot = redoStack.pop();
		short[][] currentMap = getCurrentMap();
		for (int x = 0; x < MapColumns; x++) {
			System.arraycopy(snapshot[x], 0, currentMap[x], 0, MapRows);
		}
		markDirty();
		updateUndoRedoButtons();
	}

	public void updateUndoRedoButtons() {
		frame.miUndo.setEnabled(!getUndoStack().isEmpty());
		frame.miRedo.setEnabled(!getRedoStack().isEmpty());
	}

	public void clearUndoRedoHistory() {
		undoStack.clear();
		redoStack.clear();
		updateUndoRedoButtons();
	}

	// --- Unsaved-changes tracking ---

	public void markDirty() {
		blnDirty = true;
		updateTitle();
	}

	public void updateTitle() {
		frame.setTitle("Dusk Map Editor: " + (blnDirty ? "*" : "") + strCurrentFile + " " + MapColumns + "x" + MapRows);
		frame.lblMapSize.setText("Size: " + MapColumns + "x" + MapRows + " ");
	}

	// Returns true if it's safe to proceed (nothing unsaved, or the user chose
	// to save/discard). Returns false if the user cancelled.
	public boolean confirmProceedIfDirty(String actionDescription) {
		if (!blnDirty) return true;
		int choice = JOptionPane.showConfirmDialog(
			frame,
			"You have unsaved changes. Save before " + actionDescription + "?",
			"Unsaved Changes",
			JOptionPane.YES_NO_CANCEL_OPTION,
			JOptionPane.WARNING_MESSAGE
		);
		if (choice == JOptionPane.YES_OPTION) {
			return doSave();
		}
		return choice == JOptionPane.NO_OPTION;
	}

	public void attemptQuit() {
		if (!confirmProceedIfDirty("quitting")) return;
		try
		{
			imgOriginalMap.flush();
			imgMap.flush();
			imgPalette.flush();
			imgForeground.flush();
		}catch(Exception exc) {}
		System.gc();
		System.exit(0);
	}

	// --- Save / Save As ---

	public boolean doSave() {
		String strName = strCurrentFile;
		String strDir = strCurrentDirectory;
		if (strCurrentFile.equals("untitled"))
		{
			FileDialog fileChooser = new FileDialog(frame, "Save map file", FileDialog.SAVE);
			if (strCurrentDirectory != null)
			{
				fileChooser.setDirectory(strCurrentDirectory);
			}
			fileChooser.show();
			strName = fileChooser.getFile();
			strDir = fileChooser.getDirectory();
			if (strName == null) return false;
		}
		return writeMapFile(strDir, strName);
	}

	public boolean doSaveAs() {
		FileDialog fileChooser = new FileDialog(frame, "Save map file", FileDialog.SAVE);
		if (strCurrentDirectory != null)
		{
			fileChooser.setDirectory(strCurrentDirectory);
		}
		if (!strCurrentFile.equals("untitled"))
		{
			fileChooser.setFile(strCurrentFile);
		}
		fileChooser.show();
		String strName = fileChooser.getFile();
		String strDir = fileChooser.getDirectory();
		if (strName == null) return false;
		return writeMapFile(strDir, strName);
	}

	private boolean writeMapFile(String strDir, String strName) {
		String strFileName = strDir + strName;
		boolean success = false;
		frame.pnlGraphics.setCursor(new Cursor(Cursor.WAIT_CURSOR));
		try
		{
			File deleteme = new File(strFileName);
			deleteme.delete();
			DataOutputStream dataOut = new DataOutputStream(new BufferedOutputStream(new FileOutputStream(strFileName), 1 << 20));
			// Matches the exact format the Dusk server reads: cols, rows,
			// then cols*rows raw shorts. No header/magic number, single layer.
			dataOut.writeInt(MapColumns);
			dataOut.writeInt(MapRows);
			for (int i=0;i<MapColumns;i++)
			{
				for (int i2=0;i2<MapRows;i2++)
				{
					dataOut.writeShort(shrMap[i][i2]);
				}
			}
			dataOut.close();
			strCurrentFile = strName;
			strCurrentDirectory = strDir;
			blnDirty = false;
			updateTitle();
			success = true;
		}
		catch (Exception e) {
			System.err.println("Failed to save map file: " + strFileName);
			e.printStackTrace();
		}
		frame.pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
		return success;
	}

	public Image getCurrentImage() {
		return imgMap;
	}

	public Image getCurrentCursorImage() {
		return imgCursorMap;
	}

	public Image getCurrentPaletteImage() {
		return imgOriginalMap;
	}

	public void mouseWheelMoved(MouseWheelEvent e) {
        if (e.isControlDown()) {
            if (e.getWheelRotation() < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
            return;
        }
        if (e.isShiftDown()) {
            int notches = e.getWheelRotation();
            int currentValue = frame.scrollPane.getHorizontalScrollBar().getValue();
            int increment = frame.scrollPane.getHorizontalScrollBar().getUnitIncrement();
            frame.scrollPane.getHorizontalScrollBar().setValue(currentValue + (notches * increment));
        }
        // Let the scroll pane handle vertical scrolling by default
    }
}