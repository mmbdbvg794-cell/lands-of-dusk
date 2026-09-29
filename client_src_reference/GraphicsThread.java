/*
 * Decompiled with CFR 0.152.
 */
import java.applet.AudioClip;
import java.awt.MediaTracker;
import java.awt.Toolkit;
import java.lang.reflect.Array;
import java.net.URL;
import java.util.Vector;

public class GraphicsThread
implements Runnable {
    Dusk appParent;
    Thread thread;
    Vector vctToMove;

    GraphicsThread(Dusk inParent) {
        this.appParent = inParent;
        this.vctToMove = new Vector(0, 5);
    }

    void addEntityToMove(Entity entStore, int direction) {
        entStore.intTicks = 12;
        entStore.intMoveDirection = direction;
        this.vctToMove.addElement(entStore);
    }

    public void run() {
        String prefix = "";
        int i = 0;
        System.err.println("DEBUG: strRCAddress = [" + this.appParent.strRCAddress + "]");
        if (this.appParent.strRCAddress != null && this.appParent.strRCAddress.length() > 0) {
            try {
                System.err.println("DEBUG: fetching " + this.appParent.strRCAddress + "images/map.gif");
                this.appParent.imgOriginalMap = Toolkit.getDefaultToolkit().getImage(new URL(this.appParent.strRCAddress + "images/map.gif"));
                this.appParent.imgOriginalPlayers = Toolkit.getDefaultToolkit().getImage(new URL(this.appParent.strRCAddress + "images/players.gif"));
                this.appParent.imgOriginalSprites = Toolkit.getDefaultToolkit().getImage(new URL(this.appParent.strRCAddress + "images/sprites.gif"));
            }
            catch (Exception e) {
                System.err.println("Error loading images: ".concat(String.valueOf(String.valueOf(e.toString()))));
            }
        } else {
            prefix = "c:\\rc";
            this.appParent.imgOriginalMap = Toolkit.getDefaultToolkit().getImage(String.valueOf(String.valueOf(prefix)).concat("\\images\\map.gif"));
            this.appParent.imgOriginalPlayers = Toolkit.getDefaultToolkit().getImage(String.valueOf(String.valueOf(prefix)).concat("\\images\\players.gif"));
            this.appParent.imgOriginalSprites = Toolkit.getDefaultToolkit().getImage(String.valueOf(String.valueOf(prefix)).concat("\\images\\sprites.gif"));
        }
        try {
            MediaTracker mdtTracker = new MediaTracker(this.appParent.frame);
            mdtTracker.addImage(this.appParent.imgOriginalMap, 0);
            mdtTracker.addImage(this.appParent.imgOriginalPlayers, 0);
            mdtTracker.addImage(this.appParent.imgOriginalSprites, 0);
            mdtTracker.waitForAll();
            System.err.println("DEBUG: waitForAll() returned. isErrorAny=" + mdtTracker.isErrorAny());
        }
        catch (Exception e) {
            System.err.println("Error while waiting for images: ".concat(String.valueOf(String.valueOf(e.toString()))));
        }
        int mapW = this.appParent.imgOriginalMap.getWidth(null);
        int mapH = this.appParent.imgOriginalMap.getHeight(null);
        int plyW = this.appParent.imgOriginalPlayers.getWidth(null);
        int plyH = this.appParent.imgOriginalPlayers.getHeight(null);
        int sprW = this.appParent.imgOriginalSprites.getWidth(null);
        int sprH = this.appParent.imgOriginalSprites.getHeight(null);
        System.err.println("DEBUG: map=" + mapW + "x" + mapH + " players=" + plyW + "x" + plyH + " sprites=" + sprW + "x" + sprH);
        if (mapH <= 0 || plyH <= 0 || sprH <= 0) {
            this.appParent.addText("Error: one or more images failed to load (map=" + mapW + "x" + mapH + " players=" + plyW + "x" + plyH + " sprites=" + sprW + "x" + sprH + ").\n");
            this.appParent.numMapImages = 0;
            this.appParent.numPlayerImages = 0;
            this.appParent.numSpriteImages = 0;
        } else {
            this.appParent.numMapImages = mapW / mapH - 1;
            this.appParent.numPlayerImages = plyW / plyH / 8 - 1;
            this.appParent.numSpriteImages = sprW / sprH - 1;
        }
        this.appParent.addText(String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.appParent.numMapImages + this.appParent.numPlayerImages + this.appParent.numSpriteImages))).append(" image files loaded.\n"))));
        if (this.appParent.frame.pnlEditorGraphics != null && this.appParent.numMapImages != 0) {
            int height = this.appParent.frame.pnlEditorGraphics.getBounds().height;
            this.appParent.intEditorImageSize = (int)Math.sqrt(height * height / this.appParent.numMapImages);
        }
        this.appParent.scaleImages();
        if (!this.appParent.blnApplet) {
            prefix = String.valueOf(String.valueOf(new StringBuffer("file:").append(System.getProperty("user.dir")).append(prefix)));
        }
        if (this.appParent.blnApplet) {
            this.appParent.addText("Loading audio.\n");
            Vector<AudioClip> vctStore = new Vector<AudioClip>(0);
            try {
                i = 0;
                URL urlStore = new URL(String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.appParent.strRCAddress))).append("audio/sfx/").append(i).append(".au"))));
                while (urlStore.openStream() != null) {
                    vctStore.addElement(this.appParent.appShell.getAudioClip(urlStore));
                    urlStore = new URL(String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.appParent.strRCAddress))).append("audio/sfx/").append(++i).append(".au"))));
                }
            }
            catch (Exception exception) {
                // empty catch block
            }
            this.appParent.audSFX = new AudioClip[vctStore.size()];
            try {
                for (i = 0; i < vctStore.size(); ++i) {
                    this.appParent.audSFX[i] = (AudioClip)vctStore.elementAt(i);
                }
            }
            catch (Exception e) {
                System.err.println("Error loading audio: ".concat(String.valueOf(String.valueOf(e.toString()))));
                this.appParent.addText(String.valueOf(String.valueOf(new StringBuffer("Error loading audio: ").append(e.toString()).append("\n"))));
                return;
            }
            this.appParent.addText(String.valueOf(String.valueOf(Array.getLength(this.appParent.audSFX))).concat(" audio files loaded.\n"));
        }
        this.appParent.update();
        this.appParent.frame.pnlGraphics.setVisible(true);
        this.appParent.setPlayerLoaded(true);
        int timer = 0;
        while (true) {
            try {
                Thread.sleep(10L);
            }
            catch (Exception exception) {
                // empty catch block
            }
            ++timer;
            Vector vector = this.appParent.vctEntities;
            synchronized (vector) {
                for (i = 0; i < this.vctToMove.size(); ++i) {
                    Entity entStore;
                    Entity entity = entStore = (Entity)this.vctToMove.elementAt(i);
                    synchronized (entity) {
                        if (entStore.intTicks == 0) {
                            this.vctToMove.removeElement(entStore);
                            switch (entStore.intMoveDirection) {
                                case 0: {
                                    entStore.intLocY -= 0.5;
                                    if (entStore.intStep == -1) break;
                                    entStore.intStep = 0;
                                    break;
                                }
                                case 1: {
                                    entStore.intLocY += 0.5;
                                    if (entStore.intStep == -1) break;
                                    entStore.intStep = 2;
                                    break;
                                }
                                case 2: {
                                    entStore.intLocX -= 0.5;
                                    if (entStore.intStep == -1) break;
                                    entStore.intStep = 4;
                                    break;
                                }
                                case 3: {
                                    entStore.intLocX += 0.5;
                                    if (entStore.intStep == -1) break;
                                    entStore.intStep = 6;
                                    break;
                                }
                            }
                            entStore.intMoveDirection = -1;
                            this.appParent.reloadChoiceAttack();
                            this.appParent.update();
                            this.appParent.paint();
                        } else {
                            --entStore.intTicks;
                        }
                        continue;
                    }
                }
            }
            if (timer != 25) continue;
            this.appParent.paint();
            timer = 0;
        }
    }
}

