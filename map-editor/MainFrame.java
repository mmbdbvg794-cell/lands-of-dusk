import java.awt.*;
import java.awt.event.*;
import javax.swing.*;
import javax.swing.border.EtchedBorder;

public class MainFrame extends JFrame {

    DuskMapEditor appParent;

    // --- UI Components ---
    // Panels
    JPanel pnlButtons = new JPanel();
    JPanel pnlGraphics; // Will be a custom inner class to override paintComponent
    JPanel pnlForeground;

    // Buttons
    CustomButton btnToolDraw = new CustomButton();
    CustomButton btnToolSelect = new CustomButton();
    CustomButton btnToolZoom = new CustomButton();
    CustomButton btnToolFill = new CustomButton();
    ButtonGroup grpTools = new ButtonGroup();

    // Other controls
    JScrollPane scrollPane;
    JSplitPane splitPane;
    JPanel pnlPaletteDock = new JPanel(new BorderLayout());
    JLabel lblLocation = new JLabel();
    JLabel lblMapSize = new JLabel();

    // Menu Bar
    JMenuBar menuBar = new JMenuBar();
    JMenu mFile = new JMenu("File");
    JMenuItem miNew = new JMenuItem("New...");
    JMenuItem miResize = new JMenuItem("Resize...");
    JMenuItem miOpen = new JMenuItem("Open...");
    JMenuItem miOpenPalette = new JMenuItem("Load Palette...");
    JMenuItem miSave = new JMenuItem("Save");
    JMenuItem miSaveAs = new JMenuItem("Save as...");
    JMenuItem miQuit = new JMenuItem("Quit");

    JMenu mEdit = new JMenu("Edit");
    JMenuItem miUndo = new JMenuItem("Undo");
    JMenuItem miRedo = new JMenuItem("Redo");
    JMenuItem miCopy = new JMenuItem("Copy");
    JMenuItem miPaste = new JMenuItem("Paste");
    JMenuItem miClear = new JMenuItem("Clear");

    JMenu mScale = new JMenu("Scale");
    JRadioButtonMenuItem cbmi100 = new JRadioButtonMenuItem("100%");
    JRadioButtonMenuItem cbmi75 = new JRadioButtonMenuItem("75%");
    JRadioButtonMenuItem cbmi50 = new JRadioButtonMenuItem("50%");
    JRadioButtonMenuItem cbmi25 = new JRadioButtonMenuItem("25%");
    JRadioButtonMenuItem cbmi10 = new JRadioButtonMenuItem("10%");
    JRadioButtonMenuItem cbmi5 = new JRadioButtonMenuItem("5%");
    
    JMenu mHelp = new JMenu("Help");
    JMenuItem miHelpHowTo = new JMenuItem("How to use this program...");
    JMenuItem miAbout = new JMenuItem("About DuskMapEditor...");
    
    Cursor zoomCursor = null;

    public MainFrame(DuskMapEditor inParent) {
        appParent = inParent;
    }

    public void initComponents() throws Exception {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            System.err.println("Could not set system look and feel.");
        }

        pnlGraphics = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                appParent.paint(g);
            }
        };
        pnlForeground = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                super.paintComponent(g);
                if (appParent != null && appParent.getForegroundImage() != null) {
                    g.drawImage(appParent.getForegroundImage(), 0, 0, this);
                }
            }
        };
        pnlGraphics.setBackground(new Color(140, 140, 140));
        pnlGraphics.setCursor(new Cursor(Cursor.WAIT_CURSOR));

        pnlButtons.setLayout(new FlowLayout(FlowLayout.LEFT));
        pnlButtons.setBorder(new EtchedBorder(EtchedBorder.LOWERED));

        grpTools.add(btnToolDraw);
        grpTools.add(btnToolSelect);
        grpTools.add(btnToolZoom);
        grpTools.add(btnToolFill);

        pnlButtons.add(btnToolDraw);
        pnlButtons.add(btnToolSelect);
        pnlButtons.add(btnToolZoom);
        pnlButtons.add(btnToolFill);
        pnlButtons.add(new JSeparator(SwingConstants.VERTICAL));

        pnlForeground.setPreferredSize(new Dimension(appParent.intImageOriginalSize, appParent.intImageOriginalSize));
        pnlForeground.setBackground(Color.BLACK);
        pnlButtons.add(pnlForeground);

        lblLocation.setText("Loc: 0000,0000 ");
        pnlButtons.add(lblLocation);

        lblMapSize.setText("Size: 25x25 ");
        pnlButtons.add(lblMapSize);

        miNew.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_N, InputEvent.CTRL_DOWN_MASK));
        miOpen.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_O, InputEvent.CTRL_DOWN_MASK));
        miSave.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_S, InputEvent.CTRL_DOWN_MASK));
        miSaveAs.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_S, InputEvent.CTRL_DOWN_MASK | InputEvent.SHIFT_DOWN_MASK));
        miQuit.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_Q, InputEvent.CTRL_DOWN_MASK));
        miUndo.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_Z, InputEvent.CTRL_DOWN_MASK));
        miRedo.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_Y, InputEvent.CTRL_DOWN_MASK));
        miCopy.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_C, InputEvent.CTRL_DOWN_MASK));
        miPaste.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_V, InputEvent.CTRL_DOWN_MASK));
        miClear.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_DELETE, 0));

        mFile.add(miNew);
        mFile.add(miOpen);
        mFile.add(miOpenPalette);
        mFile.addSeparator();
        mFile.add(miResize);
        mFile.addSeparator();
        mFile.add(miSave);
        mFile.add(miSaveAs);
        mFile.addSeparator();
        mFile.add(miQuit);
        menuBar.add(mFile);

        miUndo.setEnabled(false);
        miRedo.setEnabled(false);
        miCopy.setEnabled(false);
        miPaste.setEnabled(false);
        miClear.setEnabled(false);

        mEdit.add(miUndo);
        mEdit.add(miRedo);
        mEdit.addSeparator();
        mEdit.add(miCopy);
        mEdit.add(miPaste);
        mEdit.addSeparator();
        mEdit.add(miClear);
        menuBar.add(mEdit);

        ButtonGroup scaleGroup = new ButtonGroup();
        scaleGroup.add(cbmi100);
        scaleGroup.add(cbmi75);
        scaleGroup.add(cbmi50);
        scaleGroup.add(cbmi25);
        scaleGroup.add(cbmi10);
        scaleGroup.add(cbmi5);
        
        mScale.add(cbmi100);
        mScale.add(cbmi75);
        mScale.add(cbmi50);
        mScale.add(cbmi25);
        mScale.add(cbmi10);
        mScale.add(cbmi5);
        menuBar.add(mScale);
        cbmi100.setSelected(true);

        mHelp.add(miHelpHowTo);
        mHelp.addSeparator();
        mHelp.add(miAbout);
        menuBar.add(mHelp);

        setJMenuBar(menuBar);

        Container contentPane = getContentPane();
        contentPane.setLayout(new BorderLayout());
        contentPane.add(pnlButtons, BorderLayout.NORTH);
        // contentPane.add(scrollVert, BorderLayout.EAST);
        // contentPane.add(scrollHorz, BorderLayout.SOUTH);
        // contentPane.add(pnlGraphics, BorderLayout.CENTER);
        scrollPane = new JScrollPane(pnlGraphics);

        // Placeholder height so the split pane reserves sensible space before
        // the palette panel itself is created and docked in (see DuskMapEditor.startUp()).
        pnlPaletteDock.setPreferredSize(new Dimension(1, 170));
        splitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT, scrollPane, pnlPaletteDock);
        splitPane.setResizeWeight(0.8);
        splitPane.setOneTouchExpandable(true);
        contentPane.add(splitPane, BorderLayout.CENTER);

        addListeners();

        setTitle("Dusk Map Editor: " + appParent.strCurrentFile + " " + appParent.MapColumns + "x" + appParent.MapRows);
        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent evt) {
                appParent.attemptQuit();
            }
        });
        setSize(new Dimension(924, 680));
        setLocationRelativeTo(null);

        getRootPane().registerKeyboardAction(e -> appParent.zoomIn(),
            KeyStroke.getKeyStroke(KeyEvent.VK_EQUALS, InputEvent.CTRL_DOWN_MASK),
            JComponent.WHEN_IN_FOCUSED_WINDOW);
        getRootPane().registerKeyboardAction(e -> appParent.zoomIn(),
            KeyStroke.getKeyStroke(KeyEvent.VK_ADD, InputEvent.CTRL_DOWN_MASK),
            JComponent.WHEN_IN_FOCUSED_WINDOW);
        getRootPane().registerKeyboardAction(e -> appParent.zoomOut(),
            KeyStroke.getKeyStroke(KeyEvent.VK_MINUS, InputEvent.CTRL_DOWN_MASK),
            JComponent.WHEN_IN_FOCUSED_WINDOW);
        getRootPane().registerKeyboardAction(e -> appParent.zoomOut(),
            KeyStroke.getKeyStroke(KeyEvent.VK_SUBTRACT, InputEvent.CTRL_DOWN_MASK),
            JComponent.WHEN_IN_FOCUSED_WINDOW);
    }

    private void addListeners() {
        miNew.addActionListener(appParent);
        miResize.addActionListener(appParent);
        miSave.addActionListener(appParent);
        miSaveAs.addActionListener(appParent);
        miOpen.addActionListener(appParent);
        miOpenPalette.addActionListener(appParent);
        miQuit.addActionListener(appParent);
        miUndo.addActionListener(appParent);
        miRedo.addActionListener(appParent);
        miCopy.addActionListener(appParent);
        miPaste.addActionListener(appParent);
        miClear.addActionListener(appParent);
        miHelpHowTo.addActionListener(appParent);
        miAbout.addActionListener(appParent);

        ActionListener scaleListener = e -> {
            JRadioButtonMenuItem source = (JRadioButtonMenuItem) e.getSource();
            if (source.isSelected()) {
                int percent = 100;
                if (source == cbmi100) percent = 100;
                else if (source == cbmi75) percent = 75;
                else if (source == cbmi50) percent = 50;
                else if (source == cbmi25) percent = 25;
                else if (source == cbmi10) percent = 10;
                else if (source == cbmi5) percent = 5;

                appParent.setZoomPercent(percent);
            }
        };
        cbmi100.addActionListener(scaleListener);
        cbmi75.addActionListener(scaleListener);
        cbmi50.addActionListener(scaleListener);
        cbmi25.addActionListener(scaleListener);
        cbmi10.addActionListener(scaleListener);
        cbmi5.addActionListener(scaleListener);

        ActionListener toolListener = e -> {
            if (btnToolDraw.isSelected()) {
                pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
            } else if (btnToolSelect.isSelected()) {
                pnlGraphics.setCursor(new Cursor(Cursor.CROSSHAIR_CURSOR));
                miCopy.setEnabled(false);
            } else if (btnToolZoom.isSelected()) {
                Toolkit tk = getToolkit();
		        zoomCursor = tk.createCustomCursor(tk.getImage("zoomCursor.png"), new Point(10, 10), "zoom cursor");
                pnlGraphics.setCursor(zoomCursor);
                miCopy.setEnabled(false);
            } else if (btnToolFill.isSelected()) {
                pnlGraphics.setCursor(new Cursor(Cursor.DEFAULT_CURSOR));
            }
            appParent.update();
            appParent.frame.pnlGraphics.repaint();
        };
        btnToolDraw.addActionListener(toolListener);
        btnToolSelect.addActionListener(toolListener);
        btnToolZoom.addActionListener(toolListener);
        btnToolFill.addActionListener(toolListener);
    }
}