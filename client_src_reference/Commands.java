/*
 * Decompiled with CFR 0.152.
 */
import java.awt.Point;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.RandomAccessFile;
import java.util.Enumeration;
import java.util.StringTokenizer;
import java.util.Vector;

public class Commands
implements Constants {
    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Unable to fully structure code
     */
    public static String parseCommand(LivingThing lt, DuskEngine engGame, String strStore) throws Exception {
        int ID, count, destX, destY, difX, difY, i, iFromLoc, iInLoc, iLSloc, iSPloc, iToLoc, iWloc, intIndex, intStore, n, num, oldTargetID, quantity, size, targetID, v0, x, y;
        long lngID;
        String returnValue, sContainer, sID, sItem, sKey, sResult, strNewPass, strNewPassRepeat, strOldPass, strStore2;
        File deleteme;
        RandomAccessFile rafHelp;
        StringTokenizer st;
        Container container;
        Door door;
        Item item2, itmStore, key;
        DuskObject objStore, item;
        Merchant mrcStore;
        Player player;
        Prop prpStore;
        Script scrStore;
        Sign sgnStore;
        LivingThing target, thnStore, thnStore2;
        Vector var8_131;
        block322: {
            block323: {
                try {
                    intIndex = strStore.indexOf(" ");
                    if (intIndex == -1) {
                        scrStore = new Script("commands/" + strStore.toLowerCase(), engGame, false);
                        scrStore.varVariables.addVariable("trigger", lt);
                        scrStore.runScript();
                        scrStore.close();
                        return null;
                    }
                    scrStore = new Script("commands/" + strStore.substring(0, intIndex).toLowerCase(), engGame, false);
                    scrStore.varVariables.addVariable("trigger", lt);
                    scrStore.runScript(strStore.substring(intIndex + 1, strStore.length()));
                    scrStore.close();
                    return null;
                }
                catch (Exception e) {
                    if (strStore == null) {
                        return null;
                    }
                    player = null;
                    strStore2 = strStore;
                    strStore = strStore.toLowerCase();
                    if (lt instanceof Player) {
                        player = (Player)lt;
                    }
                    if (strStore.equals("north") || strStore.equals("n")) {
                        if (lt.thnMaster != null) {
                            return "You can't move while you're following someone.";
                        }
                        lt.vctMovement.removeAllElements();
                        lt.vctMovement.addElement("n");
                        return null;
                    }
                    if (strStore.equals("south") || strStore.equals("s")) {
                        if (lt.thnMaster != null) {
                            return "You can't move while you're following someone.";
                        }
                        lt.vctMovement.removeAllElements();
                        lt.vctMovement.addElement("s");
                        return null;
                    }
                    if (strStore.equals("west") || strStore.equals("w")) {
                        if (lt.thnMaster != null) {
                            return "You can't move while you're following someone.";
                        }
                        lt.vctMovement.removeAllElements();
                        lt.vctMovement.addElement("w");
                        return null;
                    }
                    if (strStore.equals("east") || strStore.equals("e")) {
                        if (lt.thnMaster != null) {
                            return "You can't move while you're following someone.";
                        }
                        lt.vctMovement.removeAllElements();
                        lt.vctMovement.addElement("e");
                        return null;
                    }
                    if (strStore.startsWith("goto")) {
                        try {
                            destX = Integer.parseInt(strStore.substring(strStore.indexOf(32) + 1, strStore.lastIndexOf(32)));
                            destY = Integer.parseInt(strStore.substring(strStore.lastIndexOf(32) + 1));
                            lt.goTo(destX, destY);
                        }
                        catch (Exception eGoto) {
                            // empty catch block
                        }
                        return null;
                    }
                    if (strStore.startsWith(";")) {
                        if (Player.isMuted(lt.strName)) {
                            return "You are currently muted and cannot speak.";
                        }
                        iSPloc = 1;
                        if (lt.noChannel != 0) {
                            return "You can not gossip when nochanneled.";
                        }
                        if (iSPloc >= strStore.length()) {
                            return "Gossip what?";
                        }
                        if (!(strStore = strStore2.substring(iSPloc, strStore.length())).equals("")) {
                            engGame.chatMessage(lt.strName + " gossips: " + strStore);
                        }
                        return null;
                    }
                    if (strStore.startsWith("'")) {
                        if (Player.isMuted(lt.strName)) {
                            return "You are currently muted and cannot speak.";
                        }
                        iSPloc = 1;
                        if (strStore.length() <= iSPloc) {
                            return "Say what?";
                        }
                        if (!(strStore = strStore2.substring(iSPloc, strStore.length())).equals("")) {
                            if (lt.isPet()) {
                                engGame.chatMessage("Pet " + lt.strName + " says: " + strStore, lt.intLocX, lt.intLocY);
                            } else if (lt instanceof Mob) {
                                engGame.chatMessage("Mob " + lt.strName + " says: " + strStore, lt.intLocX, lt.intLocY);
                            } else {
                                engGame.chatMessage(lt.strName + " says: " + strStore, lt.intLocX, lt.intLocY);
                            }
                        }
                        return null;
                    }
                    if (strStore.startsWith(":")) {
                        if (Player.isMuted(lt.strName)) {
                            return "You are currently muted and cannot speak.";
                        }
                        if (lt.strClan.equals("none")) {
                            return "You're not in a clan. Use gossip instead";
                        }
                        if (lt.noChannel != 0) {
                            return "You can't do that when nochanneled.";
                        }
                        iSPloc = 1;
                        if (strStore.length() <= iSPloc) {
                            return "Clan what?";
                        }
                        if (!(strStore = strStore2.substring(iSPloc, strStore.length())).equals("")) {
                            engGame.chatMessage(lt.strName + " clans: " + strStore, lt.strClan);
                        }
                        return null;
                    }
                    if (strStore.startsWith("/")) {
                        if (Player.isMuted(lt.strName)) {
                            return "You are currently muted and cannot speak.";
                        }
                        iSPloc = 1;
                        iLSloc = strStore.indexOf(" ");
                        if (strStore.length() <= iLSloc) {
                            return "Tell who what?";
                        }
                        if (lt.noChannel != 0) {
                            return "You can't do that when nochanneled.";
                        }
                        strStore = strStore2.substring(iSPloc, iLSloc);
                        strStore2 = strStore2.substring(iLSloc);
                        thnStore = engGame.getPlayer(strStore);
                        if (thnStore == null) {
                            return "They're not in this world.";
                        }
                        if (strStore2.length() == 0) {
                            return "Tell them what?";
                        }
                        if (Player.isIgnoring(thnStore.strName, lt.strName)) {
                            return "You tell " + strStore + ":" + strStore2;
                        }
                        if (thnStore.strAway != null) {
                            if (thnStore.vctAway.contains(lt.strName)) {
                                lt.chatMessage(thnStore.strName + " is still away, but will be notified you attempted to tell them.\n");
                                return "Their away message still reads: " + thnStore.strAway;
                            }
                            thnStore.vctAway.addElement(lt.strName);
                            lt.chatMessage(thnStore.strName + " is away, but will be notified you attempted to tell them.\n");
                            return "Their away message reads: " + thnStore.strAway;
                        }
                        System.out.println("--" + lt.strName + " tells " + thnStore.strName + " : " + strStore2);
                        thnStore.chatMessage(lt.strName + " tells you:" + strStore2 + "\n");
                        return "You tell " + strStore + ":" + strStore2;
                    }
                    if (strStore.startsWith("emote ")) {
                        if (strStore.length() == 6) {
                            return "Emote what?";
                        }
                        if (lt.noChannel != 0) {
                            return "You can't do that when nochanneled.";
                        }
                        if (!(strStore = strStore2.substring(6, strStore.length())).equals("")) {
                            engGame.chatMessage(lt.strName + " " + strStore, lt.intLocX, lt.intLocY);
                        }
                        return null;
                    }
                    if (strStore.equals("sleep")) {
                        if (lt.blnSleep) {
                            return "You are already asleep";
                        }
                        if (lt.batBattle != null) {
                            return "Not while you're fighting!";
                        }
                        if (lt.thnMaster != null && !lt.thnMaster.blnSleep) {
                            return "You can't sleep if you're following someone who's awake.";
                        }
                        lt.blnSleep = true;
                        lt.updateActions();
                        return "You go to sleep";
                    }
                    if (strStore.equals("wake")) {
                        if (lt.blnSleep) {
                            lt.blnSleep = false;
                            lt.updateActions();
                            return "You wake up";
                        }
                        return "You are already awake";
                    }
                    if (strStore.startsWith("a ")) {
                        iSPloc = 1;
                        if (lt.blnSleep) {
                            return "You can't do that while you're sleeping";
                        }
                        if (lt.isPet()) {
                            return "Pets can not start a fight!";
                        }
                        ID = Integer.parseInt(strStore = strStore.substring(iSPloc).trim());
                        objStore = engGame.getDuskObject(ID);
                        if (objStore == null) {
                            return "You don't see that here.";
                        }
                        if (!(objStore instanceof LivingThing)) {
                            return "You can't fight that.";
                        }
                        difX = lt.intLocX - objStore.intLocX;
                        difY = lt.intLocY - objStore.intLocY;
                        x = difX < 0 ? -difX : difX;
                        v0 = y = difY < 0 ? -difY : difY;
                        if (x > engGame.viewrange || y > engGame.viewrange) {
                            return "They are too far away!";
                        }
                        engGame.initiateBattle(lt, (LivingThing)objStore, lt.getRange() == 1 ? 0 : 1);
                        return null;
                    }
                    if (strStore.equals("flee")) {
                        if (lt.batBattle != null) {
                            lt.vctCommands.insertElementAt("flee", 0);
                            return "You try to flee";
                        }
                        return "You're not fighting anyone";
                    }
                    if (strStore.startsWith("target ")) {
                        if (lt.isPet()) {
                            return "Pets can not target!";
                        }
                        strStore = strStore.substring(7).trim();
                        iSPloc = strStore.indexOf(" ");
                        targetID = Integer.parseInt(strStore.substring(0, iSPloc).trim());
                        oldTargetID = Integer.parseInt(strStore.substring(iSPloc).trim());
                        target = (LivingThing)engGame.getDuskObject(targetID);
                        if (target != null) {
                            target.vctTargetedBy.addElement(lt);
                            lt.targetID = targetID;
                        } else {
                            lt.targetID = -1;
                        }
                        if (oldTargetID > -1 && (target = (LivingThing)engGame.getDuskObject(oldTargetID)) != null) {
                            target.vctTargetedBy.remove(lt);
                        }
                        return null;
                    }
                    if (!strStore.startsWith("get ")) break block322;
                    sContainer = null;
                    container = null;
                    iFromLoc = strStore.indexOf(" from ");
                    if (iFromLoc != -1) break block323;
                    strStore = strStore.substring(4).trim() + " ";
                    iSPloc = strStore.indexOf(" ");
                    sResult = "";
                    while (iSPloc != -1 && strStore.length() > 1) {
                        strStore2 = strStore.substring(0, iSPloc).trim();
                        item = lt.isPet() != false ? lt.getLocalObject(strStore2) : engGame.getDuskObject(Integer.parseInt(strStore2));
                        if (item != null && item instanceof Item) {
                            sResult = sResult + Commands.getItems(lt, engGame, strStore2, (Item)item);
                        }
                        strStore = strStore.substring(iSPloc).trim() + " ";
                        iSPloc = strStore.indexOf(" ");
                    }
                    return sResult;
                }
            }
            sContainer = strStore.substring(iFromLoc + 6).trim();
            strStore = strStore.substring(4, iFromLoc).trim();
            container = lt.isPet() != false ? (Container)lt.items.getItem(sContainer, 0) : (Container)lt.items.getItem(Integer.parseInt(sContainer));
            if (container == null) {
                return "You don't have that!";
            }
            if (strStore.equals("all")) {
                container.getAll(lt);
                lt.updateItems();
                return "You get everything in the bag.";
            }
            item = container.get(strStore);
            if (item == null) {
                return "The " + container.strName + " does not hold the " + strStore;
            }
            lt.items.add(item);
            lt.updateItems();
            return "You get the " + strStore + " from the " + container.strName;
        }
        if (strStore.startsWith("drop ")) {
            if (strStore.length() == 5) {
                return "Drop what?";
            }
            strStore = strStore.substring(5);
            itmStore = lt.isPet() != false ? lt.items.remove(strStore, 0) : lt.items.removeItem(Integer.valueOf(strStore));
            if (itmStore != null) {
                if (itmStore.intCost == 0) {
                    return "The " + itmStore.strName + " vanishes into thin air.";
                }
                itmStore.intLocX = lt.intLocX;
                itmStore.intLocY = lt.intLocY;
                engGame.vctItems.addElement(itmStore);
                engGame.addDuskObject(itmStore);
                lt.updateItems();
                if (itmStore.strOnDropScript != null) {
                    try {
                        scrStore = new Script("scripts/" + itmStore.strOnDropScript, engGame, false);
                        scrStore.varVariables.addVariable("trigger", lt);
                        scrStore.runScript();
                        scrStore.close();
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                }
            }
            return null;
        }
        if (strStore.startsWith("wear ")) {
            if (strStore.length() == 5) {
                return "Wear what?";
            }
            strStore = strStore.substring(5);
            item = lt.isPet() != false ? lt.items.getItem(strStore.trim(), 0) : lt.items.getItem(Integer.valueOf(strStore.trim()));
            if (item == null) {
                return "You don't have that";
            }
            if (!lt.equWorn.wearItem((Item)item)) {
                return "You can't wear that";
            }
            if (lt.isPet()) {
                lt.thnMaster.updateStats();
            }
            if (player != null) {
                player.updateStats();
            }
            lt.equWorn.updateEquipment();
            lt.updateItems();
            return "You equip the " + item.strName;
        }
        if (strStore.startsWith("unwear ") || strStore.startsWith("remove ")) {
            try {
                strStore = strStore.substring(7);
            }
            catch (Exception e) {
                return "Unwear what?";
            }
            return lt.equWorn.unWearItem(strStore);
        }
        if (strStore.startsWith("use ")) {
            if (lt.batBattle == null) {
                strStore = strStore.substring(4);
                lt.useItem(strStore, -1);
            } else {
                lt.vctCommands.addElement(strStore);
            }
            return null;
        }
        if (strStore.startsWith("eat ")) {
            if (lt.batBattle == null) {
                strStore = strStore.substring(4);
                lt.useItem(strStore, 3);
            } else {
                lt.vctCommands.addElement(strStore);
            }
            return null;
        }
        if (strStore.startsWith("drink ")) {
            if (lt.batBattle == null) {
                strStore = strStore.substring(6);
                lt.useItem(strStore, 4);
            } else {
                lt.vctCommands.addElement(strStore);
            }
            return null;
        }
        if (strStore.startsWith("give ")) {
            iToLoc = strStore.indexOf(" to ");
            strStore2 = strStore.substring(iToLoc + 4).trim();
            objStore = lt.isPet() != false ? lt.getLocalObject(strStore2) : engGame.getDuskObject(Integer.parseInt(strStore2));
            if (objStore == null) {
                return "You don't see them here.";
            }
            if (!(objStore instanceof LivingThing)) {
                return "You can't give to that.";
            }
            thnStore = (LivingThing)objStore;
            if (Math.abs(thnStore.intLocX - lt.intLocX) + Math.abs(thnStore.intLocY - lt.intLocY) > 1) {
                return "They're too far away.";
            }
            if ((strStore = strStore.substring(5, iToLoc).trim()).startsWith("gp")) {
                strStore = strStore.substring(2);
                try {
                    intStore = Integer.parseInt(strStore);
                    if (intStore < 0) {
                        return "You can't give negative money!";
                    }
                    if ((long)intStore <= lt.cash) {
                        lt.cash -= (long)intStore;
                        thnStore.cash += (long)intStore;
                        lt.updateStats();
                        thnStore.updateStats();
                        thnStore.chatMessage(lt.strName + " gives you " + intStore + "gp.\n");
                        return "You give " + thnStore.strName + " " + intStore + "gp.";
                    }
                    lt.chatMessage("You don't have that much gp\n");
                }
                catch (Exception exc) {
                    return "That is not a valid amount of gp to give.";
                }
            }
            try {
                itmStore = lt.isPet() ? lt.items.remove(strStore, 0) : lt.items.removeItem(Integer.valueOf(strStore));
            }
            catch (Exception e) {
                return "You do not have that.";
            }
            if (itmStore != null) {
                thnStore.items.add(itmStore);
                thnStore.chatMessage(lt.strName + " gives you a " + itmStore.strName + ".\n");
                if (itmStore.strOnDropScript != null) {
                    try {
                        scrStore = new Script("scripts/" + itmStore.strOnDropScript, engGame, false);
                        scrStore.varVariables.addVariable("trigger", lt);
                        scrStore.runScript();
                        scrStore.close();
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                }
                if (itmStore.strOnGetScript != null) {
                    try {
                        scrStore = new Script("scripts/" + itmStore.strOnGetScript, engGame, false);
                        scrStore.varVariables.addVariable("trigger", thnStore);
                        scrStore.runScript();
                        scrStore.close();
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                }
                thnStore.updateItems();
                lt.updateItems();
                return "You give " + thnStore.strName + " the " + itmStore.strName + ".";
            }
            return "You don't have that.";
        }
        if (strStore.startsWith("put ")) {
            iInLoc = strStore.indexOf(" in ");
            if (iInLoc == -1) {
                return "Put what where?";
            }
            sContainer = strStore.substring(iInLoc + 4).trim();
            item2 = lt.isPet() != false ? lt.items.getItem(sContainer, 0) : lt.items.getItem(Integer.parseInt(sContainer));
            if (!(item2 instanceof Container)) {
                return "The " + item2.strName + " is not a container!";
            }
            container = (Container)item2;
            st = new StringTokenizer(strStore.substring(4, iInLoc).trim() + " ", " ");
            size = st.countTokens();
            while (st.hasMoreTokens()) {
                sItem = st.nextToken();
                item = lt.isPet() != false ? lt.items.getItem(sItem, 0) : lt.items.getItem(Integer.parseInt(sItem));
                if (!container.put((Item)item)) {
                    if (size != 1) continue;
                    return "The " + item.strName + " will not fit in the " + container.strName;
                }
                lt.items.remove(item);
                if (size != 1) continue;
                lt.updateItems();
                return "You put the " + item.strName + " into the " + container.strName;
            }
            lt.updateItems();
            return "You put everything that will fit into the " + container.strName;
        }
        if (strStore.startsWith("closedoor")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc).trim();
            door = (Door)engGame.getDuskObject(Integer.parseInt(sID));
            if (!door.getIsOpen()) {
                return "The door is already closed.";
            }
            x = door.intLocX - lt.intLocX;
            y = door.intLocY - lt.intLocY;
            if (x > -2 && x < 2 && y > -2 && y < 2) {
                door.close();
                lt.send("\u001f" + door.ID + "\n" + door.intImage + "\n");
                return "You close the door";
            }
            return "The door is too far away.";
        }
        if (strStore.startsWith("close ")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc).trim();
            item = lt.items.getItem(Integer.parseInt(sID));
            if (!(item instanceof Container)) {
                return "You can not close the " + item.strName;
            }
            container = (Container)item;
            if (!container.getIsOpen()) {
                return "The " + container.strName + " is already closed.";
            }
            container.close();
            return "You close the " + container.strName;
        }
        if (strStore.startsWith("opendoor")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc).trim();
            door = (Door)engGame.getDuskObject(Integer.parseInt(sID));
            if (door.getIsOpen()) {
                return "The door is already open.";
            }
            if (door.getIsLocked()) {
                return "The door is locked.";
            }
            x = door.intLocX - lt.intLocX;
            y = door.intLocY - lt.intLocY;
            if (x > -2 && x < 2 && y > -2 && y < 2 && door.open()) {
                lt.send("\u001f" + door.ID + "\n" + door.intImage + "\n");
                return "You open the door";
            }
            return "You are not able to open the door";
        }
        if (strStore.startsWith("open ")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc).trim();
            item = lt.items.getItem(Integer.parseInt(sID));
            if (!(item instanceof Container)) {
                return "You can not open the " + item.strName;
            }
            container = (Container)item;
            if (container.getIsLocked()) {
                return "The " + container.strName + " is locked.";
            }
            if (container.getIsOpen()) {
                return "The " + container.strName + " is already open.";
            }
            if (!container.open()) {
                return "You are not able to open the " + container.strName;
            }
            return "You open the " + container.strName;
        }
        if (strStore.startsWith("unlockdoor ")) {
            iSPloc = strStore.indexOf(" ");
            iWloc = strStore.lastIndexOf(" ");
            sID = strStore.substring(iSPloc, iWloc).trim();
            door = (Door)engGame.getDuskObject(Integer.parseInt(sID));
            x = door.intLocX - lt.intLocX;
            y = door.intLocY - lt.intLocY;
            if (x < -1 || x > 1 || y < -1 || y > 1) {
                return "That door is too far away.";
            }
            if (!door.getIsLocked()) {
                return "The door is not locked!";
            }
            sKey = strStore.substring(iWloc).trim();
            key = lt.items.getItem(Integer.parseInt(sKey));
            if (door.unlock(key.strName)) {
                return "You unlock the door";
            }
            return "You are not able to unlock the door with the " + key.strName;
        }
        if (strStore.startsWith("unlock ")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc, iWloc = strStore.lastIndexOf(" ")).trim();
            item = lt.items.getItem(Integer.parseInt(sID));
            if (!(item instanceof Container)) {
                return "You can not unlock the " + item.strName;
            }
            container = (Container)item;
            if (!container.getIsLocked()) {
                return "The " + container.strName + " is not locked!";
            }
            sKey = strStore.substring(iWloc).trim();
            key = lt.items.getItem(Integer.parseInt(sKey));
            if (container.unlock(key.strName)) {
                return "You unlock the " + container.strName;
            }
            return "You are not able to unlock the " + container.strName + " with the " + key.strName;
        }
        if (strStore.startsWith("lockdoor ")) {
            iSPloc = strStore.indexOf(" ");
            iWloc = strStore.lastIndexOf(" ");
            sID = strStore.substring(iSPloc, iWloc).trim();
            door = (Door)engGame.getDuskObject(Integer.parseInt(sID));
            x = door.intLocX - lt.intLocX;
            y = door.intLocY - lt.intLocY;
            if (x < -1 || x > 1 || y < -1 || y > 1) {
                return "That door is too far away.";
            }
            if (door.getIsLocked()) {
                return "The door is already locked!";
            }
            sKey = strStore.substring(iWloc).trim();
            key = lt.items.getItem(Integer.parseInt(sKey));
            if (door.lock(key.strName)) {
                return "You lock the door";
            }
            return "You are not able to lock the door with the " + key.strName;
        }
        if (strStore.startsWith("lock ")) {
            iSPloc = strStore.indexOf(" ");
            sID = strStore.substring(iSPloc, iWloc = strStore.lastIndexOf(" ")).trim();
            item = lt.items.getItem(Integer.parseInt(sID));
            if (!(item instanceof Container)) {
                return "You can not lock the " + item.strName;
            }
            container = (Container)item;
            if (container.getIsLocked()) {
                return "The " + container.strName + " is already locked!";
            }
            sKey = strStore.substring(iWloc).trim();
            key = lt.items.getItem(Integer.parseInt(sKey));
            if (container.lock(key.strName)) {
                return "You lock the " + container.strName;
            }
            return "You are not able to lock the " + container.strName + " with the " + key.strName;
        }
        if (strStore.startsWith("buy ")) {
            if (strStore.length() == 4) {
                return "Buy what?";
            }
            strStore = strStore.substring(4, strStore.length());
            try {
                i = strStore.indexOf(" ");
                quantity = Integer.parseInt(strStore.substring(0, i));
                strStore = strStore.substring(i + 1);
            }
            catch (Exception e) {
                return "How many of what do you want to buy?";
            }
            if (quantity > 100) {
                quantity = 100;
            } else if (quantity < 1) {
                return "You can't buy less than one of something.";
            }
            mrcStore = engGame.overMerchant(lt.intLocX, lt.intLocY);
            if (mrcStore == null) {
                return "Buy from whom?";
            }
            if (lt.thnFollowing != null && lt.thnFollowing.isPet() && strStore.startsWith(lt.thnFollowing.strName + ":")) {
                if (mrcStore.contains(strStore = strStore.substring(lt.thnFollowing.strName.length() + 1, strStore.length())) && strStore.startsWith("train:")) {
                    strStore = strStore.substring(6, strStore.length());
                    mrcStore.train(strStore, quantity, lt.thnFollowing);
                    lt.updateStats();
                    lt.thnFollowing.chatMessage("You train " + strStore + "\n");
                }
                return null;
            }
            if (mrcStore.contains(strStore)) {
                if (strStore.startsWith("train:")) {
                    strStore = strStore.substring(6, strStore.length());
                    mrcStore.train(strStore, quantity, lt);
                    lt.updateStats();
                } else if (strStore.startsWith("pet")) {
                    mrcStore.buyPet(player);
                    player.updateStats();
                } else {
                    itmStore = engGame.getItem(strStore);
                    if (itmStore != null) {
                        if ((long)(itmStore.intCost * quantity) > lt.cash) {
                            return "You can't afford the " + strStore;
                        }
                        lt.cash -= (long)(itmStore.intCost * quantity);
                        lt.items.add(itmStore);
                        i = 1;
                        while (i < quantity) {
                            lt.items.add(engGame.getItem(strStore));
                            ++i;
                        }
                        lt.updateItems();
                        lt.updateStats();
                        return "You bought " + quantity + " " + strStore;
                    }
                }
            }
            return null;
        }
        if (strStore.startsWith("sell ")) {
            if (strStore.length() == 5) {
                return "Sell what?";
            }
            strStore = strStore.substring(5).trim() + " ";
            mrcStore = engGame.overMerchant(lt.intLocX, lt.intLocY);
            if (mrcStore == null) {
                return "Sell that to whom?";
            }
            num = 0;
            itmStore = null;
            while (strStore.length() > 1) {
                iSPloc = strStore.indexOf(" ");
                ID = Integer.valueOf(strStore.substring(0, iSPloc));
                itmStore = lt.items.removeItem(ID);
                ++num;
                if (itmStore == null) break;
                lt.cash += (long)(itmStore.intCost / 2);
                if (itmStore.strOnDropScript != null) {
                    try {
                        scrStore = new Script("scripts/" + itmStore.strOnDropScript, engGame, false);
                        scrStore.varVariables.addVariable("trigger", lt);
                        scrStore.runScript();
                        scrStore.close();
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                }
                strStore = strStore.substring(iSPloc).trim() + " ";
            }
            lt.updateItems();
            lt.updateStats();
            if (itmStore == null) {
                return "You do not have any of those!";
            }
            return "You sell " + num + " " + itmStore.strName;
        }
        if (strStore.startsWith("order ")) {
            if (strStore.length() == 6) {
                return "Order who to do what?";
            }
            intStore = (strStore = strStore.substring(6)).indexOf(" ");
            if (intStore == -1) {
                return "Order them to do what?";
            }
            objStore = engGame.getDuskObject(Integer.parseInt(strStore.substring(0, intStore).trim()));
            if (objStore == null) {
                return "You don't see that here.";
            }
            if (!(objStore instanceof LivingThing)) {
                return "You can't order that.";
            }
            thnStore = (LivingThing)objStore;
            if (thnStore.thnCharmer != lt) {
                return "They don't take orders from you.";
            }
            strStore = strStore2.substring(intStore + 7);
            thnStore.parseCommand(strStore);
            return null;
        }
        if (strStore.equals("nofollow")) {
            if (lt.noFollow) {
                return "You are not allowed to be followed.";
            }
            return "Your can be followed.";
        }
        if (strStore.equals("nofollow off")) {
            lt.noFollow = false;
            return "You can now be followed.";
        }
        if (strStore.equals("nofollow on")) {
            lt.noFollow = true;
            return "You can no longer be followed.";
        }
        if (strStore.startsWith("follow ")) {
            if (strStore.length() == 7) {
                return "Follow who?";
            }
            if (lt.blnSleep) {
                return "You can't do that while you're sleeping";
            }
            objStore = lt.getLocalObject(strStore = strStore.substring(7, strStore.length()));
            if (objStore == null) {
                return "You don't see that here.";
            }
            if (objStore instanceof LivingThing) {
                if (lt.thnMaster != null) {
                    return "You're already following someone. Leave them first.";
                }
                thnStore = (LivingThing)objStore;
                if (Math.abs(lt.intLocX - thnStore.intLocX) + Math.abs(lt.intLocY - thnStore.intLocY) > 1) {
                    return "They're too far away.";
                }
                if (thnStore == lt) {
                    return "You can't follow yourself.";
                }
                if (!(thnStore instanceof Player)) {
                    return "You can only follow players.";
                }
                if (thnStore.noFollow || thnStore.isPet() && thnStore.thnMaster.noFollow) {
                    return "They won't let you follow them.";
                }
                thnStore2 = thnStore;
                while (thnStore2 != null) {
                    if (lt == thnStore2) {
                        return "You're already in that group.";
                    }
                    thnStore2 = thnStore2.thnMaster;
                }
                thnStore.chatMessage("You are now being followed by " + lt.strName + ".\n");
                while (thnStore.thnFollowing != null) {
                    thnStore = thnStore.thnFollowing;
                    if (!(thnStore instanceof Player)) continue;
                    thnStore.chatMessage("You are now being followed by " + lt.strName + ".\n");
                }
                thnStore.thnFollowing = lt;
                lt.thnMaster = thnStore;
                thnStore.updateStats();
                lt.updateStats();
                return "You are now following " + lt.thnMaster.strName + ".";
            }
            return "That's not something you can follow.";
        }
        if (strStore.startsWith("unfollow ")) {
            if (strStore.length() == 9) {
                return "Unfollow who?";
            }
            strStore = strStore.substring(9, strStore.length());
            thnStore = lt.thnFollowing;
            if (thnStore != null && thnStore.isPet()) {
                if (thnStore.strName.equalsIgnoreCase(strStore)) {
                    player.halt();
                    player.chatMessage("Do you really want to permanently erase your pet?\n");
                    try {
                        if (player.bfrSocketIn.readLine().equalsIgnoreCase("yes")) {
                            player.thnFollowing.close();
                            deleteme = new File("pets/" + strStore.toLowerCase());
                            deleteme.delete();
                            deleteme = new File("pets/" + strStore.toLowerCase() + ".backup");
                            deleteme.delete();
                            player.thnFollowing.close();
                            player.thnFollowing = lt.thnFollowing.thnFollowing;
                            player.proceed();
                            return "Your pet has been erased.";
                        }
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                    player.proceed();
                    return null;
                }
                thnStore = thnStore.thnFollowing;
            }
            while (thnStore != null) {
                if (thnStore.strName.equalsIgnoreCase(strStore)) {
                    if (thnStore.isPet()) {
                        thnStore = thnStore.thnMaster;
                    }
                    thnStore.removeFromGroup();
                    return null;
                }
                thnStore = thnStore.thnFollowing;
            }
            return "They're not following you.";
        }
        if (strStore.equals("leave")) {
            if (lt.isPet()) {
                return "You can't leave your owner unless they unfollow you.";
            }
            lt.removeFromGroup();
            return "You are now on your own.";
        }
        if (player != null) {
            if (strStore.startsWith("look ")) {
                iSPloc = strStore.indexOf(" ") + 1;
                if (lt.blnSleep) {
                    return "You can't do that while you're sleeping";
                }
                objStore = engGame.getDuskObject(Integer.parseInt(strStore = strStore.substring(iSPloc, strStore.length())));
                if (objStore == null) {
                    objStore = lt.items.getItem(Integer.valueOf(strStore));
                }
                if (objStore != null) {
                    if (objStore instanceof LivingThing) {
                        thnStore = (LivingThing)objStore;
                        thnStore.chatMessage(lt.strName + " is looking at you.\n");
                        lt.chatMessage(thnStore.strName + " has " + thnStore.getCharacterPoints() + "cp and " + thnStore.attributes.getStat("hp") + "/" + thnStore.attributes.getStat("maxhp") + "hp.\n");
                        if (thnStore.strDescription != null) {
                            lt.chatMessage("Their description is: " + thnStore.strDescription + "\n");
                        }
                        if ((item = thnStore.equWorn.getItem(0)) != null) {
                            lt.chatMessage("They are wielding " + ((Item)item).strDescription + ".\n");
                        }
                        if ((item = thnStore.equWorn.getItem(1)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their arms.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(2)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their legs.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(3)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their torso.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(4)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their waist.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(5)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their neck.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(6)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their skull.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(7)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their eyes.\n");
                        }
                        if ((item = thnStore.equWorn.getItem(8)) != null) {
                            lt.chatMessage("They are wearing " + ((Item)item).strDescription + " on their hands.\n");
                        }
                        return null;
                    }
                    if (objStore instanceof Container) {
                        container = (Container)objStore;
                        lt.chatMessage("You see " + container.strDescription + "\n");
                        lt.chatMessage(container.contents());
                        return null;
                    }
                    if (objStore instanceof Item) {
                        itmStore = (Item)objStore;
                        return "You see " + itmStore.strDescription + ".";
                    }
                    if (objStore instanceof Prop) {
                        prpStore = (Prop)objStore;
                        return "You see " + prpStore.strDescription + ".";
                    }
                    if (objStore instanceof Sign) {
                        sgnStore = (Sign)objStore;
                        return "The sign says " + sgnStore.strMessage + ".";
                    }
                    if (objStore instanceof Merchant) {
                        return "You see a merchant.";
                    }
                }
                return "You don't see that here.";
            }
            if (strStore.startsWith("ignore ")) {
                String strIgnoreName = strStore.substring(7).trim();
                if (strIgnoreName.length() < 1) {
                    return "Ignore who?";
                }
                if (strIgnoreName.equalsIgnoreCase(lt.strName)) {
                    return "You can't ignore yourself.";
                }
                if (!Player.addIgnore(lt.strName, strIgnoreName)) {
                    return "You are already ignoring " + strIgnoreName + ".";
                }
                return "You are now ignoring " + strIgnoreName + ". Their tells will no longer reach you.";
            }
            if (strStore.startsWith("unignore ")) {
                String strUnignoreName = strStore.substring(9).trim();
                if (strUnignoreName.length() < 1) {
                    return "Unignore who?";
                }
                if (!Player.removeIgnore(lt.strName, strUnignoreName)) {
                    return "You are not ignoring " + strUnignoreName + ".";
                }
                return "You are no longer ignoring " + strUnignoreName + ".";
            }
            if (strStore.equals("mail")) {
                Vector vctMail = Player.readAndClearMail(lt.strName);
                if (vctMail.size() == 0) {
                    return "You have no mail.";
                }
                for (int iMail = 0; iMail < vctMail.size(); ++iMail) {
                    lt.chatMessage((String)vctMail.elementAt(iMail) + "\n");
                }
                return "-- End of mail --";
            }
            if (strStore.startsWith("mail ")) {
                String strMailRest = strStore.substring(5).trim();
                int iMailSpace = strMailRest.indexOf(" ");
                if (iMailSpace == -1) {
                    return "Usage: mail <name> <message>";
                }
                String strMailTo = strMailRest.substring(0, iMailSpace);
                String strMailMsg = strMailRest.substring(iMailSpace + 1).trim();
                if (strMailMsg.length() == 0) {
                    return "Mail them what?";
                }
                File filMailUser = new File("users/" + strMailTo.toLowerCase());
                if (!filMailUser.exists()) {
                    return "No such player: " + strMailTo;
                }
                Player.sendMail(lt.strName, strMailTo, strMailMsg);
                LivingThing targetMail = engGame.getPlayer(strMailTo);
                if (targetMail != null) {
                    targetMail.chatMessage("You have new mail from " + lt.strName + "! Type 'mail' to read it.\n");
                }
                return "Mail sent to " + strMailTo + ".";
            }
            if (strStore.equals("away") || strStore.equals("back")) {
                if (player.vctAway == null) {
                    return "Away with what message?";
                }
                player.strAway = null;
                if (player.vctAway.size() > 0) {
                    player.chatMessage("You recieved messages from the following people:\n");
                    i = 0;
                    while (i < player.vctAway.size()) {
                        player.chatMessage((String)player.vctAway.elementAt(i) + "\n");
                        ++i;
                    }
                }
                player.vctAway = null;
                return "Your away message has been removed.";
            }
            if (strStore.startsWith("away ")) {
                player.strAway = strStore = strStore2.substring(4);
                player.vctAway = new Vector(0, 1);
                return "Your away message has been set to \"" + strStore + "\". To remove it, type \"away\" or \"back\"";
            }
            if (strStore.startsWith("help")) {
                DataOutputStream lockObj = player.stmOut;
                synchronized (lockObj) {
                    try {
                        if (strStore.length() < 6) {
                            rafHelp = new RandomAccessFile("help", "r");
                            lt.send("\u0014Help\n");
                        } else {
                            if ((strStore = strStore.substring(5, strStore.length())).indexOf("..") != -1) {
                                return "You cannot view that file.";
                            }
                            rafHelp = new RandomAccessFile("helpFiles/" + strStore, "r");
                            lt.send("\u0014Help on " + strStore + "\n");
                        }
                    }
                    catch (Exception e) {
                        return "There is no help on that subject";
                    }
                    try {
                        strStore = rafHelp.readLine();
                        while (strStore != null) {
                            lt.send(strStore + "\n");
                            strStore = rafHelp.readLine();
                        }
                        lt.send("--EOF--\n");
                    }
                    catch (Exception e) {
                        try {
                            rafHelp.close();
                        }
                        catch (Exception exc) {
                            // empty catch block
                        }
                        return null;
                    }
                    try {
                        rafHelp.close();
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                }
                return null;
            }
            if (strStore.equals("who")) {
                count = 0;
                DataOutputStream lockObj2 = player.stmOut;
                synchronized (lockObj2) {
                    strStore2 = null;
                    thnStore = null;
                    player.chatMessage("\n");
                    player.chatMessage("The following players are online:\n");
                    i = 0;
                    while (i < engGame.vctSockets.size()) {
                        thnStore = (Player)engGame.vctSockets.elementAt(i);
                        if (!((Player)thnStore).wizInvis || thnStore.privs <= player.privs) {
                            strStore2 = "";
                            strStore2 = strStore2 + "\t";
                            strStore2 = strStore2 + thnStore.getCharacterPoints() + "cp ";
                            if (thnStore.strAway != null) {
                                strStore2 = strStore2 + "(away)";
                            }
                            if (thnStore.privs == 1) {
                                strStore2 = strStore2 + "{Clan Leader}";
                            } else if (thnStore.privs == 3) {
                                strStore2 = strStore2 + "{God}";
                            } else if (thnStore.privs == 4) {
                                strStore2 = strStore2 + "{High God}";
                            } else if (thnStore.privs > 4) {
                                strStore2 = strStore2 + "{Master God}";
                            }
                            if (thnStore.noChannel != 0) {
                                strStore2 = strStore2 + "{nochanneled}";
                            }
                            if (!thnStore.strClan.equals("none")) {
                                strStore2 = strStore2 + "<" + thnStore.strClan + "> ";
                            }
                            long lngConnectedMinutes = (System.currentTimeMillis() - ((Player)thnStore).lngSessionStart) / 60000L;
                            strStore2 = thnStore.strTitle == null ? strStore2 + thnStore.strName + "\n" : strStore2 + thnStore.strName + " " + thnStore.strTitle + "\n";
                            strStore2 = strStore2.substring(0, strStore2.length() - 1) + " (connected " + lngConnectedMinutes + "m)\n";
                            player.chatMessage(strStore2);
                            ++count;
                        }
                        ++i;
                    }
                }
                player.chatMessage("There are a total of " + count + " players online.\n");
                return null;
            }
            if (strStore.startsWith("description")) {
                if (strStore.length() < 13) {
                    lt.strDescription = null;
                    return "Your description has been removed.";
                }
                lt.strDescription = strStore2.substring(12, strStore.length());
                return "Your description has been set to:" + lt.strDescription;
            }
            if (strStore.startsWith("title")) {
                if (strStore.length() < 7) {
                    lt.strTitle = null;
                    return "Your title has been removed.";
                }
                player.strTitle = strStore2.substring(6, strStore.length());
                if (player.strTitle.length() > engGame.titlecap) {
                    player.strTitle = player.strTitle.substring(0, engGame.titlecap);
                }
                return "Your title has been set to:" + player.strTitle;
            }
            if (strStore.equals("password")) {
                try {
                    player.halt();
                    player.chatMessage("Enter your current password.\n");
                    strOldPass = player.bfrSocketIn.readLine();
                    if (!Player.verifyPassword(strOldPass, player.strPWord)) {
                        player.proceed();
                        return "Sorry, that is not your password.";
                    }
                    player.chatMessage("Enter a new password.\n");
                    strNewPass = player.bfrSocketIn.readLine();
                    player.chatMessage("Repeat that password.\n");
                    strNewPassRepeat = player.bfrSocketIn.readLine();
                    if (strNewPass == null) {
                        player.proceed();
                        return "Not a valid password.";
                    }
                    if (!strNewPass.equals(strNewPassRepeat)) {
                        player.proceed();
                        return "Sorry, those passwords do not match.";
                    }
                    player.strPWord = Player.createHashedPassword(strNewPass);
                    player.proceed();
                    return "Your password has now been changed.";
                }
                catch (Exception e) {
                    player.proceed();
                }
            }
            if (strStore.equalsIgnoreCase("bind")) {
                Enumeration enumBindPoints = engGame.vctBindPoints.elements();
                while (enumBindPoints.hasMoreElements()) {
                    Point point = (Point)enumBindPoints.nextElement();
                    if (point.getX() != (double)player.intLocX || point.getY() != (double)player.intLocY) continue;
                    player.bindLocX = (int)point.getX();
                    player.bindLocY = (int)point.getY();
                    return "You are now bounded to this spot.";
                }
                return "You can not bind here!";
            }
            if (strStore.startsWith("rement ")) {
                strStore = strStore.substring(7);
                try {
                    lngID = Long.parseLong(strStore);
                }
                catch (Exception e) {
                    return null;
                }
                var8_131 = player.vctEntities;
                synchronized (var8_131) {
                    i = 0;
                    while (i < player.vctEntities.size()) {
                        objStore = (DuskObject)player.vctEntities.elementAt(i);
                        if (lngID == (long)objStore.ID) {
                            player.vctEntities.removeElementAt(i);
                            if (objStore instanceof LivingThing && (LivingThing)objStore instanceof Mob) {
                                --((Mob)objStore).localPlayers;
                                if (((Mob)objStore).localPlayers == 0) {
                                    engGame.vctActiveMobs.removeElement(objStore);
                                }
                            }
                            return null;
                        }
                        ++i;
                    }
                }
                return null;
            }
            if (strStore.equals("audio")) {
                if (player.audioon) {
                    return "Your audio is turned on.";
                }
                return "Your audio is turned off.";
            }
            if (strStore.equals("audio off")) {
                player.audioon = false;
                return "Your audio has been turned off.";
            }
            if (strStore.equals("audio on")) {
                player.audioon = true;
                return "Your audio has been turned on.";
            }
            if (strStore.equals("color")) {
                if (player.coloron) {
                    return "Your color is turned on.";
                }
                return "Your color is turned off.";
            }
            if (strStore.equals("color off")) {
                player.coloron = false;
                return "Your color has been turned off.";
            }
            if (strStore.equals("color on")) {
                player.coloron = true;
                return "Your color has been turned on.";
            }
            if (strStore.equals("appletimages")) {
                lt.updateAppletImages();
                return null;
            }
            if (strStore.equals("applicationimages")) {
                lt.updateApplicationImages();
                return null;
            }
            if (strStore.equals("notdead")) {
                return null;
            }
            if (strStore.equals("quit") || strStore.equals("logout")) {
                lt.close();
                return null;
            }
            if (lt.privs > 0) {
                if (strStore.startsWith("addmember ")) {
                    if (strStore.length() == 10) {
                        return "Add who?";
                    }
                    thnStore = (Player)engGame.getPlayer(strStore = strStore.substring(10));
                    if (thnStore == null) {
                        return "They're not in this world";
                    }
                    if (thnStore.batBattle != null) {
                        thnStore.chatMessage(lt.strName + " has invited you to join their clan, but you are in the middle of a battle\n");
                        return "They're in the middle of a battle. They have been notified that you tried to clan them.";
                    }
                    thnStore.halt();
                    thnStore.stillThere();
                    thnStore.chatMessage(lt.strName + " has invited you to join the clan " + lt.strClan + ". If you accept, type yes.\n");
                    try {
                        if (((Player)thnStore).bfrSocketIn.readLine().equalsIgnoreCase("yes")) {
                            thnStore.strClan = lt.strClan;
                            if (thnStore.privs == 1) {
                                thnStore.privs = 0;
                            }
                            thnStore.chatMessage("You have been added to the clan, " + lt.strClan + "\n");
                            thnStore.proceed();
                            return thnStore.strName + " has accepted your invitation.";
                        }
                    }
                    catch (Exception e) {
                        // empty catch block
                    }
                    thnStore.proceed();
                    return thnStore.strName + " has declined your invitation.";
                }
                if (strStore.equals("unclan")) {
                    if (player.strClan.equals("none")) {
                        return "You're not in a clan.";
                    }
                    if (player.batBattle != null) {
                        return "Wait until you're done battling.";
                    }
                    try {
                        player.halt();
                        player.chatMessage("Are you sure you want to drop out of your clan? If so say yes.\n");
                        if (player.bfrSocketIn.readLine().equalsIgnoreCase("yes")) {
                            player.strClan = "none";
                            if (player.privs == 1) {
                                player.privs = 0;
                            }
                            player.proceed();
                            return "You have been removed from your clan.";
                        }
                    }
                    catch (Exception e) {
                        Log.logError(e, "Error while " + player.strName + " was trying to dropout");
                    }
                    player.proceed();
                    return null;
                }
                if (strStore.startsWith("kick ")) {
                    if (strStore.length() == 5) {
                        return "Kick who?";
                    }
                    thnStore = (Player)engGame.getPlayer(strStore = strStore.substring(5));
                    if (thnStore == null) {
                        return "They're not in this world.";
                    }
                    if (!thnStore.strClan.equalsIgnoreCase(lt.strClan)) {
                        return "They're not in your clan.";
                    }
                    thnStore.chatMessage("You have been kicked out of " + lt.strClan + ".\n");
                    thnStore.strClan = "none";
                    return thnStore.strName + " has been kicked out of your clan.";
                }
                returnValue = Commands.adminCommands(lt, engGame, strStore2);
                if (returnValue != null) {
                    return returnValue.equals("") != false ? null : returnValue;
                }
            }
            if (strStore.startsWith("playerloaded")) {
                n = strStore.indexOf(" ");
                strStore = strStore.substring(n).trim();
                ((Player)lt).isActive = strStore.equals("true");
                return null;
            }
        }
        return "huh?";
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    static String adminCommands(LivingThing lt, DuskEngine engGame, String strStore) throws Exception {
        Player player = (Player)lt;
        String strStore2 = strStore;
        strStore = strStore.toLowerCase();
        if (lt.privs > 2) {
            String sName;
            int iSPloc;
            if (strStore.equals("wizinvis off")) {
                player.wizInvis = false;
                return "You are now visible to players.";
            }
            if (strStore.equals("wizinvis on")) {
                player.wizInvis = true;
                return "You are now invisible to players.";
            }
            if (strStore.equals("wizinvis")) {
                if (player.wizInvis) {
                    return "You are invisible to players.";
                }
                return "You are visible to players.";
            }
            if (strStore.startsWith("changerace ")) {
                String sCommand = strStore.substring(11).trim();
                int iSLoc = strStore.indexOf(" ");
                int iLLoc = strStore.lastIndexOf(" ");
                if (iSLoc < 0 || iLLoc < 0) {
                    return "Turn who into what?";
                }
                String sName2 = strStore.substring(iSLoc, iLLoc).trim();
                String sRace = strStore.substring(iLLoc).trim();
                LivingThing targetPlayer = engGame.getPlayer(sName2);
                if (targetPlayer == null) {
                    return "There was trouble in locating " + sName2 + " in order to turn them into a " + sRace;
                }
                RaceManager raceCollection = engGame.getRaceCollection();
                if (raceCollection.changeRace(targetPlayer, sRace)) {
                    targetPlayer.updateStats();
                    targetPlayer.savePlayer();
                    targetPlayer.chatMessage(lt.strName + " has changed you into a(n) " + sRace + "\n");
                    lt.updateMap();
                    return targetPlayer.strName + " has been turned into a " + sRace;
                }
                return targetPlayer.strName + " could not be turned into a " + sRace;
            }
            if (strStore.startsWith("callplayer ")) {
                int iSPloc2 = strStore.indexOf(" ");
                if ((strStore = strStore.substring(iSPloc2).trim()).length() < 1) {
                    return "Call who?";
                }
                LivingThing targetPlayer = engGame.getPlayer(strStore);
                if (targetPlayer == null) {
                    return "That player is not in the game.";
                }
                targetPlayer.intLocX = lt.intLocX;
                targetPlayer.intLocY = lt.intLocY;
                targetPlayer.updateMap();
                lt.updateMap();
                return "";
            }
            if (strStore.startsWith("whois ")) {
                String strWhoisName = strStore.substring(6).trim();
                if (strWhoisName.length() < 1) {
                    return "Whois who?";
                }
                LivingThing targetWhois = engGame.getPlayer(strWhoisName);
                if (targetWhois == null || !(targetWhois instanceof Player)) {
                    return "That player is not online.";
                }
                Player plrWhois = (Player)targetWhois;
                long lngConnectedMinutes = (System.currentTimeMillis() - plrWhois.lngSessionStart) / 60000L;
                return plrWhois.strName + " | IP: " + plrWhois.sckConnection.getInetAddress().getHostAddress() + " | privs: " + plrWhois.privs + " | connected " + lngConnectedMinutes + "m";
            }
            if (strStore.startsWith("kickplayer ")) {
                String sKickName = strStore.substring(11).trim();
                if (sKickName.length() < 1) {
                    return "Kick who?";
                }
                LivingThing targetKick = engGame.getPlayer(sKickName);
                if (targetKick == null) {
                    return "That player is not in the game.";
                }
                targetKick.chatMessage(lt.strName + " has kicked you from the server.\n");
                targetKick.close();
                Log.logEvent(lt.strName + " kicked " + targetKick.strName + " from the server.");
                return targetKick.strName + " has been kicked.";
            }
            if (strStore.startsWith("ban ")) {
                String sBanName = strStore.substring(4).trim();
                if (sBanName.length() < 1) {
                    return "Ban who?";
                }
                if (!Player.addBanned(sBanName)) {
                    return sBanName + " is already banned.";
                }
                LivingThing targetBan = engGame.getPlayer(sBanName);
                String strIpNote = "";
                if (targetBan != null) {
                    if (targetBan instanceof Player) {
                        String strTargetIP = ((Player)targetBan).sckConnection.getInetAddress().getHostAddress();
                        if (Player.addBannedIP(strTargetIP)) {
                            strIpNote = " Their current IP (" + strTargetIP + ") has also been banned.";
                        }
                    }
                    targetBan.chatMessage(lt.strName + " has banned you from the server.\n");
                    targetBan.close();
                }
                Log.logEvent(lt.strName + " banned account: " + sBanName);
                return sBanName + " has been banned." + strIpNote;
            }
            if (strStore.startsWith("unban ")) {
                String sUnbanName = strStore.substring(6).trim();
                if (sUnbanName.length() < 1) {
                    return "Unban who?";
                }
                if (!Player.removeBanned(sUnbanName)) {
                    return sUnbanName + " is not currently banned.";
                }
                Log.logEvent(lt.strName + " unbanned account: " + sUnbanName);
                return sUnbanName + " has been unbanned.";
            }
            if (strStore.startsWith("banip ")) {
                String sBanIP = strStore.substring(6).trim();
                if (sBanIP.length() < 1) {
                    return "Ban what IP?";
                }
                if (!Player.addBannedIP(sBanIP)) {
                    return sBanIP + " is already banned.";
                }
                Log.logEvent(lt.strName + " banned IP: " + sBanIP);
                return sBanIP + " has been banned.";
            }
            if (strStore.startsWith("unbanip ")) {
                String sUnbanIP = strStore.substring(8).trim();
                if (sUnbanIP.length() < 1) {
                    return "Unban what IP?";
                }
                if (!Player.removeBannedIP(sUnbanIP)) {
                    return sUnbanIP + " is not currently banned.";
                }
                Log.logEvent(lt.strName + " unbanned IP: " + sUnbanIP);
                return sUnbanIP + " has been unbanned.";
            }
            if (strStore.startsWith("mute ")) {
                String sMuteName = strStore.substring(5).trim();
                if (sMuteName.length() < 1) {
                    return "Mute who?";
                }
                if (!Player.addMuted(sMuteName)) {
                    return sMuteName + " is already muted.";
                }
                LivingThing targetMute = engGame.getPlayer(sMuteName);
                if (targetMute != null) {
                    targetMute.chatMessage(lt.strName + " has muted you.\n");
                }
                Log.logEvent(lt.strName + " muted account: " + sMuteName);
                return sMuteName + " has been muted.";
            }
            if (strStore.startsWith("unmute ")) {
                String sUnmuteName = strStore.substring(7).trim();
                if (sUnmuteName.length() < 1) {
                    return "Unmute who?";
                }
                if (!Player.removeMuted(sUnmuteName)) {
                    return sUnmuteName + " is not currently muted.";
                }
                LivingThing targetUnmute = engGame.getPlayer(sUnmuteName);
                if (targetUnmute != null) {
                    targetUnmute.chatMessage(lt.strName + " has unmuted you.\n");
                }
                Log.logEvent(lt.strName + " unmuted account: " + sUnmuteName);
                return sUnmuteName + " has been unmuted.";
            }
            if (strStore.equals("playtime") || strStore.startsWith("playtime ")) {
                String sPlaytimeName = strStore.equals("playtime") ? lt.strName : strStore.substring(9).trim();
                if (sPlaytimeName.length() < 1) {
                    sPlaytimeName = lt.strName;
                }
                long lngPlaytimeMillis;
                LivingThing targetPlaytime = engGame.getPlayer(sPlaytimeName);
                if (targetPlaytime != null && targetPlaytime instanceof Player) {
                    Player plrTarget = (Player)targetPlaytime;
                    lngPlaytimeMillis = plrTarget.lngTotalPlaytime + (System.currentTimeMillis() - plrTarget.lngSessionStart);
                } else {
                    File filUserStat = new File("users/" + sPlaytimeName.toLowerCase());
                    if (!filUserStat.exists()) {
                        return "No such player: " + sPlaytimeName;
                    }
                    lngPlaytimeMillis = 0L;
                    try {
                        RandomAccessFile rafStat = new RandomAccessFile(filUserStat, "r");
                        rafStat.readLine();
                        String strStatLine;
                        while ((strStatLine = rafStat.readLine()) != null) {
                            if (strStatLine.equalsIgnoreCase("totalplaytime")) {
                                lngPlaytimeMillis = Long.parseLong(rafStat.readLine());
                                break;
                            }
                        }
                        rafStat.close();
                    }
                    catch (Exception e) {
                        return "Error reading playtime for " + sPlaytimeName + ".";
                    }
                }
                long lngHours = lngPlaytimeMillis / 3600000L;
                long lngMinutes = lngPlaytimeMillis % 3600000L / 60000L;
                return sPlaytimeName + " has played for " + lngHours + "h " + lngMinutes + "m total.";
            }
            if (strStore.startsWith("loginhistory ")) {
                String sHistoryName = strStore.substring(13).trim().toLowerCase();
                if (sHistoryName.length() < 1) {
                    return "Look up login history for who?";
                }
                Vector vctMatches = new Vector();
                try {
                    BufferedReader bfrHistory = new BufferedReader(new java.io.FileReader("logs/login_history.log"));
                    String strLine;
                    while ((strLine = bfrHistory.readLine()) != null) {
                        if (strLine.indexOf("] " + sHistoryName + " logged in from") != -1) {
                            vctMatches.addElement(strLine);
                        }
                    }
                    bfrHistory.close();
                }
                catch (Exception e) {
                    return "No login history found.";
                }
                if (vctMatches.size() == 0) {
                    return "No login history found for " + sHistoryName + ".";
                }
                int intStart = vctMatches.size() > 10 ? vctMatches.size() - 10 : 0;
                for (int i = intStart; i < vctMatches.size(); ++i) {
                    lt.chatMessage((String)vctMatches.elementAt(i) + "\n");
                }
                return "Showing last " + (vctMatches.size() - intStart) + " login(s) for " + sHistoryName + ".";
            }
            if (lt.privs > 3 && strStore.startsWith("raisestat ")) {
                try {
                    strStore = strStore.substring(10).trim();
                    iSPloc = strStore.indexOf(" ");
                    if (iSPloc < 0) {
                        return "Raise who's stats??";
                    }
                    sName = strStore.substring(0, iSPloc).trim();
                    if ((iSPloc = (strStore = strStore.substring(iSPloc).trim()).indexOf(" ")) < 0) {
                        return "Raise what stat?";
                    }
                    String sStat = strStore.substring(0, iSPloc).trim();
                    int value = Integer.parseInt(strStore.substring(iSPloc).trim());
                    Player player2 = (Player)engGame.getPlayer(sName);
                    if (player2 == null) {
                        return "They're not in this world.";
                    }
                    player2.attributes.raiseStat(sStat, value);
                    return "Raised " + sName + "'s " + sStat + " by " + value + ".";
                }
                catch (Exception e) {
                    return "You were not able to raise their stats.";
                }
            }
            if (lt.privs > 4) {
                if (strStore.startsWith("makegod")) {
                    iSPloc = strStore.indexOf(" ");
                    if (iSPloc < 0) {
                        return "Make who a god?";
                    }
                    if ((iSPloc = (strStore = strStore.substring(iSPloc).trim()).indexOf(" ")) < 0) {
                        return "Make them what level of a god?";
                    }
                    sName = strStore.substring(0, iSPloc).trim();
                    int level = Integer.parseInt(strStore.substring(iSPloc).trim());
                    LivingThing thnStore = engGame.getPlayer(sName);
                    if (thnStore == null) {
                        return "They're not in this world.";
                    }
                    thnStore.privs = level;
                }
                if (strStore.equals("reloadprefs")) {
                    engGame.loadPrefs();
                    return "Preferences reloaded";
                }
                if (strStore.equals("resizemap")) {
                    engGame.resizeMap(lt.intLocX, lt.intLocY);
                    return "Map resized";
                }
                if (strStore.startsWith("announce ")) {
                    String strAnnounce = strStore.substring(9).trim();
                    if (strAnnounce.length() < 1) {
                        return "Announce what?";
                    }
                    engGame.chatMessage("[ANNOUNCEMENT] " + strAnnounce);
                    Log.logEvent(lt.strName + " announced: " + strAnnounce);
                    return "Announcement sent.";
                }
                if (strStore.equals("shutdown") || strStore.startsWith("shutdown ")) {
                    int intShutdownDelay = 30;
                    if (strStore.length() > 9) {
                        try {
                            intShutdownDelay = Integer.parseInt(strStore.substring(9).trim());
                        }
                        catch (Exception e) {
                            // keep the default delay if the argument wasn't a valid number
                        }
                    }
                    Log.logEvent(lt.strName + " has initiated a server shutdown in " + intShutdownDelay + " seconds.");
                    engGame.chatMessage("The server is going down in " + intShutdownDelay + " seconds. Please finish up what you're doing.");
                    Thread.sleep(intShutdownDelay * 1000L);
                    Log.logEvent(lt.strName + " has shut down the server.");
                    engGame.chatMessage("The server is going down now.");
                    engGame.removeFromTracker();
                    int i = 0;
                    while (i < engGame.vctSockets.size()) {
                        try {
                            Player thnStore = (Player)engGame.vctSockets.elementAt(i);
                            if (thnStore != lt) {
                                thnStore.close();
                            }
                        }
                        catch (Exception e) {
                            // empty catch block
                        }
                        ++i;
                    }
                    ((Player)lt).savePlayer();
                    System.gc();
                    System.exit(0);
                }
            }
            if (strStore.equals("save")) {
                engGame.saveMap();
                return "Game settings saved";
            }
            if (strStore.equals("backup")) {
                engGame.backupMap();
                return "Game settings backed up";
            }
            if (strStore.startsWith("list")) {
                if (strStore.length() < 6) {
                    return "What do you want to list?";
                }
                if ((strStore = strStore.substring(5)).equals("items")) {
                    File filList = new File("defItems");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Items:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing items";
                }
                if (strStore.equals("conf")) {
                    File filList = new File("conf");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Conf files:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing conf files";
                }
                if (strStore.equals("mobs")) {
                    File filList = new File("defMobs");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Mobiles:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing mobs";
                }
                if (strStore.equals("commands")) {
                    File filList = new File("commands");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Custom commands:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing commands";
                }
                if (strStore.equals("races")) {
                    File filList = new File("defRaces");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Races:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing races";
                }
                if (strStore.equals("pets")) {
                    File filList = new File("defPets");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Pets:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing pets";
                }
                if (strStore.equals("factions")) {
                    File filList = new File("factions");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Factions:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing factions";
                }
                if (strStore.equals("conditions")) {
                    File filList = new File("defConditions");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Conditions:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing conditions";
                }
                if (strStore.equals("help")) {
                    File filList = new File("helpFiles");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Help Files:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing help files";
                }
                if (strStore.equals("scripts")) {
                    File filList = new File("scripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing scripts";
                }
                if (strStore.equals("props")) {
                    File filList = new File("defProps");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Props:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing props";
                }
                if (strStore.equals("move actions")) {
                    File filList = new File("defMoveActions");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Move Action Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing move actions";
                }
                if (strStore.equals("can move")) {
                    File filList = new File("defCanMoveScripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Can Move Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing move scripts";
                }
                if (strStore.equals("can see")) {
                    File filList = new File("defCanSeeScripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Can See Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing see scripts";
                }
                if (strStore.equals("tile actions")) {
                    File filList = new File("defTileActionScripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Tile Action Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing tile action scripts";
                }
                if (strStore.equals("tile move")) {
                    File filList = new File("defTileScripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Can Move Tile Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing tile scripts";
                }
                if (strStore.equals("tile see")) {
                    File filList = new File("defTileSeeScripts");
                    String[] strResult = filList.list();
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        lt.send("\u0014Tile See Scripts:\n");
                        int i = 0;
                        while (i < strResult.length) {
                            lt.send(strResult[i] + "\n");
                            ++i;
                        }
                        lt.send("--EOF--\n");
                    }
                    return "Finished showing tile see scripts";
                }
                return "You can't list that.";
            }
            if (strStore.startsWith("view")) {
                if (strStore.length() < 6) {
                    return "What do you want to view?";
                }
                if ((strStore = strStore.substring(5)).indexOf("..") != -1) {
                    return "You don't have permission to access that file.";
                }
                RandomAccessFile rafView = null;
                if (strStore.startsWith("user ")) {
                    if (lt.privs < 5) {
                        return "You don't have enough privelages to edit a user file.";
                    }
                    try {
                        rafView = new RandomAccessFile("users/" + strStore.substring(5), "r");
                        rafView.readLine();
                    }
                    catch (Exception e) {
                        return "You can't view a character file for a user that doesn't exist.";
                    }
                }
                if (strStore.startsWith("item ")) {
                    try {
                        rafView = new RandomAccessFile("defItems/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("conf ")) {
                    try {
                        rafView = new RandomAccessFile("conf/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("mob ")) {
                    try {
                        rafView = new RandomAccessFile("defMobs/" + strStore.substring(4), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("command ")) {
                    try {
                        rafView = new RandomAccessFile("commands/" + strStore.substring(8), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("race ")) {
                    try {
                        rafView = new RandomAccessFile("defRaces/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("pet ")) {
                    try {
                        rafView = new RandomAccessFile("defPets/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("faction")) {
                    return "You cannot view faction files.";
                }
                if (strStore.startsWith("condition ")) {
                    try {
                        rafView = new RandomAccessFile("defConditions/" + strStore.substring(10), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("help ")) {
                    try {
                        rafView = new RandomAccessFile("helpFiles/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("script ")) {
                    try {
                        rafView = new RandomAccessFile("scripts/" + strStore.substring(7), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("prop ")) {
                    try {
                        rafView = new RandomAccessFile("defProps/" + strStore.substring(5), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("move action ")) {
                    try {
                        rafView = new RandomAccessFile("defMoveActions/" + strStore.substring(12), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("can move ")) {
                    try {
                        rafView = new RandomAccessFile("defCanMoveScripts/" + strStore.substring(9), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("can see ")) {
                    try {
                        rafView = new RandomAccessFile("defCanSeeScripts/" + strStore.substring(8), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("tile action ")) {
                    try {
                        rafView = new RandomAccessFile("defTileActionScripts/" + strStore.substring(12), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("tile move ")) {
                    try {
                        rafView = new RandomAccessFile("defTileScripts/" + strStore.substring(10), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (strStore.startsWith("tile see ")) {
                    try {
                        rafView = new RandomAccessFile("defTileSeeScripts/" + strStore.substring(9), "r");
                    }
                    catch (Exception e) {
                        lt.send('\u0012' + strStore + "\n");
                        lt.send("--EOF--\n");
                        return "";
                    }
                }
                if (rafView == null) {
                    return "";
                }
                try {
                    DataOutputStream e = player.stmOut;
                    synchronized (e) {
                        strStore2 = rafView.readLine();
                        lt.send('\u0012' + strStore + "\n");
                        while (strStore2 != null) {
                            lt.send(strStore2 + "\n");
                            strStore2 = rafView.readLine();
                        }
                        lt.send("--EOF--\n");
                    }
                }
                catch (Exception e) {
                    Log.logError(e, "Error while viewing file " + strStore);
                }
                try {
                    rafView.close();
                }
                catch (Exception e) {
                    // empty catch block
                }
                return "";
            }
            if (strStore.startsWith("submit")) {
                if (strStore.length() < 7) {
                    return "What do you want to submit?";
                }
                if (lt.privs < 4) {
                    return "You are not allowed to submit files.";
                }
                strStore = strStore2.substring(7);
                if (strStore.indexOf("..") != -1) {
                    return "You don't have permission to access that file.";
                }
                boolean compile = false;
                boolean user = false;
                File filView = null;
                RandomAccessFile rafView = null;
                if (strStore.startsWith("user ")) {
                    try {
                        if (lt.privs < 5) {
                            return "You don't have enough privelages to edit a user file.";
                        }
                        if (engGame.getPlayer(strStore.substring(5)) != null) {
                            return "You cannot submit a file for an active user.";
                        }
                        filView = new File("users/" + strStore.substring(5));
                        user = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that user.";
                    }
                }
                if (strStore.startsWith("item ")) {
                    try {
                        filView = new File("defItems/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot submit that item.";
                    }
                }
                if (strStore.startsWith("conf ")) {
                    try {
                        filView = new File("conf/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot submit that conf file.";
                    }
                }
                if (strStore.startsWith("mob ")) {
                    try {
                        filView = new File("defMobs/" + strStore.substring(4));
                    }
                    catch (Exception e) {
                        return "Cannot submit that mob.";
                    }
                }
                if (strStore.startsWith("command ")) {
                    try {
                        filView = new File("commands/" + strStore.substring(8));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that command.";
                    }
                }
                if (strStore.startsWith("race ")) {
                    try {
                        filView = new File("defRaces/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot submit that race.";
                    }
                }
                if (strStore.startsWith("pet ")) {
                    try {
                        filView = new File("defPets/" + strStore.substring(4));
                    }
                    catch (Exception e) {
                        return "Cannot submit that pet.";
                    }
                }
                if (strStore.startsWith("faction")) {
                    return "You cannot submit faction files.";
                }
                if (strStore.startsWith("condition ")) {
                    try {
                        filView = new File("defConditions/" + strStore.substring(10));
                    }
                    catch (Exception e) {
                        return "Cannot submit that condition.";
                    }
                }
                if (strStore.startsWith("help ")) {
                    try {
                        filView = new File("helpFiles/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot submit that help file.";
                    }
                }
                if (strStore.startsWith("script ")) {
                    try {
                        filView = new File("scripts/" + strStore.substring(7));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that script file.";
                    }
                }
                if (strStore.startsWith("prop ")) {
                    try {
                        filView = new File("defProps/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot submit that prop file.";
                    }
                }
                if (strStore.startsWith("move action ")) {
                    try {
                        filView = new File("defMoveActions/" + strStore.substring(12));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that move action file.";
                    }
                }
                if (strStore.startsWith("can move ")) {
                    try {
                        filView = new File("defCanMoveScripts/" + strStore.substring(9));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that can move file.";
                    }
                }
                if (strStore.startsWith("can see ")) {
                    try {
                        filView = new File("defCanSeeScripts/" + strStore.substring(8));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that can see file.";
                    }
                }
                if (strStore.startsWith("tile action ")) {
                    try {
                        filView = new File("defTileActionScripts/" + strStore.substring(12));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that tile action file.";
                    }
                }
                if (strStore.startsWith("tile move ")) {
                    try {
                        filView = new File("defTileScripts/" + strStore.substring(10));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that tile can move file.";
                    }
                }
                if (strStore.startsWith("tile see ")) {
                    try {
                        filView = new File("defTileSeeScripts/" + strStore.substring(9));
                        compile = true;
                    }
                    catch (Exception e) {
                        return "Cannot submit that tile can see file.";
                    }
                }
                if (filView == null) {
                    return "You can't submit that.";
                }
                try {
                    filView.delete();
                    rafView = new RandomAccessFile(filView, "rw");
                    if (user) {
                        rafView.readLine();
                    }
                    strStore = player.bfrSocketIn.readLine();
                    while (!strStore.equals("--EOF--")) {
                        rafView.writeBytes(strStore + "\n");
                        strStore = player.bfrSocketIn.readLine();
                    }
                    rafView.close();
                    if (compile) {
                        Script scrStore = new Script(filView.getPath(), engGame, true);
                        scrStore.close();
                    }
                }
                catch (Exception e) {
                    Log.logError(e, "Error while submitting file " + strStore);
                }
                return "Submitted";
            }
            if (strStore.startsWith("delete")) {
                if (strStore.length() < 8) {
                    return "What do you want to delete?";
                }
                if ((strStore = strStore.substring(7)).indexOf("..") != -1) {
                    return "You don't have permission to access that file.";
                }
                File filDelete = null;
                if (strStore.startsWith("item ")) {
                    try {
                        filDelete = new File("defItems/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot delete that item.";
                    }
                }
                if (strStore.startsWith("conf ")) {
                    try {
                        filDelete = new File("conf/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot delete that conf file.";
                    }
                }
                if (strStore.startsWith("mob ")) {
                    try {
                        filDelete = new File("defMobs/" + strStore.substring(4));
                    }
                    catch (Exception e) {
                        return "Cannot delete that mob.";
                    }
                }
                if (strStore.startsWith("command ")) {
                    try {
                        filDelete = new File("commands/" + strStore.substring(8));
                    }
                    catch (Exception e) {
                        return "Cannot delete that command.";
                    }
                }
                if (strStore.startsWith("race ")) {
                    try {
                        filDelete = new File("defRaces/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot delete that race.";
                    }
                }
                if (strStore.startsWith("pet ")) {
                    try {
                        filDelete = new File("defRaces/" + strStore.substring(4));
                    }
                    catch (Exception e) {
                        return "Cannot delete that pet.";
                    }
                }
                if (strStore.startsWith("faction")) {
                    return "You cannot delete faction files.";
                }
                if (strStore.startsWith("condition ")) {
                    try {
                        filDelete = new File("defConditions/" + strStore.substring(8));
                    }
                    catch (Exception e) {
                        return "Cannot delete that condition.";
                    }
                }
                if (strStore.startsWith("help ")) {
                    try {
                        filDelete = new File("helpFiles/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot delete that help file.";
                    }
                }
                if (strStore.startsWith("script ")) {
                    try {
                        filDelete = new File("scripts/" + strStore.substring(7));
                    }
                    catch (Exception e) {
                        return "Cannot delete that script file.";
                    }
                }
                if (strStore.startsWith("prop ")) {
                    try {
                        filDelete = new File("defProps/" + strStore.substring(5));
                    }
                    catch (Exception e) {
                        return "Cannot delete that prop file.";
                    }
                }
                if (strStore.startsWith("move action ")) {
                    try {
                        filDelete = new File("defMoveActions/" + strStore.substring(12));
                    }
                    catch (Exception e) {
                        return "Cannot delete that move action file.";
                    }
                }
                if (strStore.startsWith("can move ")) {
                    try {
                        filDelete = new File("defCanMoveScripts/" + strStore.substring(9));
                    }
                    catch (Exception e) {
                        return "Cannot delete that can move file.";
                    }
                }
                if (strStore.startsWith("can see ")) {
                    try {
                        filDelete = new File("defCanSeeScripts/" + strStore.substring(8));
                    }
                    catch (Exception e) {
                        return "Cannot delete that can see file.";
                    }
                }
                if (strStore.startsWith("tile action ")) {
                    try {
                        filDelete = new File("defTileActionScripts/" + strStore.substring(12));
                    }
                    catch (Exception e) {
                        return "Cannot delete that tile action file.";
                    }
                }
                if (strStore.startsWith("tile move ")) {
                    try {
                        filDelete = new File("defTileScripts/" + strStore.substring(10));
                    }
                    catch (Exception e) {
                        return "Cannot delete that tile can move file.";
                    }
                }
                if (strStore.startsWith("tile see ")) {
                    try {
                        filDelete = new File("defTileSeeScripts/" + strStore.substring(9));
                    }
                    catch (Exception e) {
                        return "Cannot delete that tile can see file.";
                    }
                }
                if (filDelete == null) {
                    return "You can't delete that.";
                }
                filDelete.delete();
                filDelete = new File(filDelete.getName() + ".dsko");
                if (filDelete.exists()) {
                    filDelete.delete();
                }
                return "deleted.";
            }
            if (strStore.startsWith("clanleader")) {
                if (strStore.length() == 11) {
                    return "Clanleader who?";
                }
                Player thnStore = (Player)engGame.getPlayer((strStore = strStore.substring(11)).substring(0, strStore.indexOf(32)));
                if (thnStore == null) {
                    return "They're not in this world";
                }
                if (strStore.length() < thnStore.strName.length() + 2) {
                    return "What clan?";
                }
                if (thnStore.privs > 1 && lt.privs < 5) {
                    return "You can't clanleader them.";
                }
                thnStore.strClan = strStore = strStore.substring(thnStore.strName.length() + 1);
                if (strStore.equals("none")) {
                    thnStore.privs = 0;
                    ((LivingThing)thnStore).chatMessage("You are now clanless.\n");
                } else {
                    thnStore.privs = 1;
                    ((LivingThing)thnStore).chatMessage("You are now a member of the " + strStore + " clan.\n");
                }
                return thnStore.strName + " is now a leader of the " + strStore + " clan.";
            }
            if (strStore.startsWith("boot ")) {
                if (strStore.length() == 5) {
                    return "Boot who?";
                }
                LivingThing thnStore = engGame.getPlayer(strStore = strStore.substring(5, strStore.length()));
                if (thnStore == null) {
                    return "They're not in this world.";
                }
                if (thnStore.privs >= lt.privs) {
                    thnStore.chatMessage(lt.strName + " attempted to boot you.\n");
                    return "You do not have high enough privelages to boot them.";
                }
                thnStore.chatMessage("You have been booted.");
                thnStore.close();
                return "Player has been booted";
            }
            if (strStore.startsWith("nochannel ")) {
                int duration;
                LivingThing thnStore;
                if (strStore.length() == 10) {
                    return "nochannel who for how long?";
                }
                strStore = strStore.substring(10);
                try {
                    thnStore = engGame.getPlayer(strStore.substring(0, strStore.indexOf(" ")));
                    duration = Integer.parseInt(strStore.substring(strStore.indexOf(" ") + 1));
                }
                catch (Exception e) {
                    return "nochannel who for how long?";
                }
                if (thnStore == null) {
                    return "They're not in this world.";
                }
                if (thnStore.privs >= lt.privs) {
                    thnStore.chatMessage(lt.strName + " attempted to nochannel you.\n");
                    return "You do not have high enough privelages to nochannel them.";
                }
                thnStore.chatMessage("You have been nochanneled.\n");
                thnStore.noChannel = duration;
                return "You have nochanneled " + thnStore.strName;
            }
            if (strStore.startsWith("allowchannel ")) {
                if (strStore.length() == 13) {
                    return "allowchannel who?";
                }
                LivingThing thnStore = engGame.getPlayer(strStore = strStore.substring(13, strStore.length()));
                if (thnStore == null) {
                    return "They're not in this world.";
                }
                thnStore.chatMessage("Your nochannel status has been removed.\n");
                thnStore.noChannel = 0;
                return thnStore.strName + "'s nochannel status has been removed.";
            }
            if (strStore.startsWith("gecho ")) {
                if (strStore.length() == 6) {
                    return "G-Echo what?";
                }
                System.out.println(lt.strName + " gecho's:");
                engGame.chatMessage(strStore2.substring(6, strStore.length()));
                return "";
            }
            if (strStore.startsWith("teleport ")) {
                if (strStore.length() == 9) {
                    return "Teleport to where?";
                }
                try {
                    strStore = strStore.substring(9);
                    int destX = Integer.parseInt(strStore.substring(0, strStore.lastIndexOf(32)));
                    int destY = Integer.parseInt(strStore.substring(strStore.lastIndexOf(32) + 1));
                    lt.changeLocBypass(destX, destY);
                }
                catch (Exception e) {
                    LivingThing thnStore = engGame.getPlayer(strStore);
                    if (thnStore == null) {
                        return "Teleport to where?";
                    }
                    lt.changeLocBypass(thnStore.intLocX, thnStore.intLocY);
                }
                return "";
            }
            if (strStore.startsWith("unset ")) {
                if (strStore.length() == 6) {
                    return "unset what?";
                }
                DuskObject objStore = engGame.getDuskObject(Integer.parseInt(strStore = strStore.substring(6)));
                if (objStore != null) {
                    if (objStore instanceof LivingThing) {
                        LivingThing thnStore = (LivingThing)objStore;
                        if (thnStore instanceof Mob) {
                            thnStore.close();
                            return "Object unset.";
                        }
                        return "You can't unset players/pets.";
                    }
                    if (objStore instanceof Item) {
                        engGame.vctItems.removeElement(objStore);
                        engGame.removeDuskObject(objStore);
                        return "Object unset.";
                    }
                    if (objStore instanceof Sign) {
                        engGame.vctSigns.removeElement(objStore);
                        engGame.removeDuskObject(objStore);
                        return "Object unset.";
                    }
                    if (objStore instanceof Prop) {
                        engGame.vctProps.removeElement(objStore);
                        engGame.removeDuskObject(objStore);
                        return "Object unset.";
                    }
                    if (objStore instanceof Merchant) {
                        engGame.vctMerchants.removeElement(objStore);
                        engGame.removeDuskObject(objStore);
                        return "Object unset.";
                    }
                    if (objStore instanceof Door) {
                        engGame.vctDoors.removeElement(objStore);
                        engGame.removeDuskObject(objStore);
                        return "Object unset.";
                    }
                }
                return "You don't see that here.";
            }
            if (strStore.startsWith("changeclan ")) {
                if (strStore.length() == 11) {
                    return "ChangeClan who?";
                }
                LivingThing thnStore = engGame.getPlayer((strStore = strStore.substring(11)).substring(0, strStore.indexOf(32)));
                if (thnStore == null) {
                    return "They're not in this world";
                }
                if (strStore.length() < thnStore.strName.length() + 2) {
                    return "What clan?";
                }
                thnStore.strClan = strStore = strStore.substring(thnStore.strName.length() + 1);
                if (thnStore.privs == 1) {
                    thnStore.privs = 0;
                }
                if (strStore.equals("none")) {
                    thnStore.chatMessage("You are now a member of no clan.\n");
                } else {
                    thnStore.chatMessage("You are now a member of the " + strStore + " clan.\n");
                }
                return thnStore.strName + " has been added to the " + strStore + " clan";
            }
            if (strStore.equals("checkmerchants")) {
                StringBuffer sbResult = new StringBuffer();
                int intFlagged = 0;
                int i = 0;
                while (i < engGame.vctMerchants.size()) {
                    Merchant mrcCheck = (Merchant)engGame.vctMerchants.elementAt(i);
                    Enumeration enumWares = mrcCheck.getAllItems();
                    Vector vctBadWares = new Vector();
                    while (enumWares.hasMoreElements()) {
                        String strWare = (String)enumWares.nextElement();
                        if (strWare.equals("pet")) {
                            continue;
                        }
                        if (engGame.getItem(strWare) != null) {
                            continue;
                        }
                        if (strWare.startsWith("train:")) {
                            String strStat = strWare.substring(6).toLowerCase().trim();
                            if (strStat.equals("stre") || strStat.equals("inte") || strStat.equals("dext") || strStat.equals("cons") || strStat.equals("wisd") || strStat.equals("hp") || strStat.equals("mp") || strStat.equals("dodge") || strStat.equals("double attack") || strStat.equals("triple attack") || strStat.equals("quadruple attack")) {
                                continue;
                            }
                        }
                        vctBadWares.addElement(strWare);
                    }
                    if (vctBadWares.size() > 0) {
                        ++intFlagged;
                        sbResult.append("(" + mrcCheck.intLocX + "," + mrcCheck.intLocY + "): ");
                        int j = 0;
                        while (j < vctBadWares.size()) {
                            sbResult.append((String)vctBadWares.elementAt(j));
                            if (j < vctBadWares.size() - 1) {
                                sbResult.append(", ");
                            }
                            ++j;
                        }
                        sbResult.append("\n");
                    }
                    ++i;
                }
                if (intFlagged == 0) {
                    return "Checked " + engGame.vctMerchants.size() + " merchants - all wares recognized.";
                }
                return "Checked " + engGame.vctMerchants.size() + " merchants, " + intFlagged + " have unrecognized wares:\n" + sbResult.toString();
            }
            if (strStore.startsWith("madd ")) {
                if (strStore.length() == 5) {
                    return "Madd what?";
                }
                strStore = strStore.substring(5);
                Merchant mrcStore = engGame.overMerchant(lt.intLocX, lt.intLocY);
                mrcStore.add(strStore);
                engGame.refreshEntities(lt);
                return strStore + " has been added to merchant";
            }
            if (strStore.startsWith("mremove ")) {
                if (strStore.length() == 8) {
                    return "Mremove what?";
                }
                strStore = strStore.substring(8);
                Merchant mrcStore = engGame.overMerchant(lt.intLocX, lt.intLocY);
                mrcStore.remove(strStore);
                engGame.refreshEntities(lt);
                return strStore + " has been removed from the merchant";
            }
            if (strStore.equals("activemobs")) {
                return "There are currently " + engGame.vctActiveMobs.size() + " active mobs.";
            }
            if (strStore.startsWith(">")) {
                if ((strStore = strStore.substring(1)).equals("s")) {
                    engGame.saveMap();
                    return "Game settings saved";
                }
                try {
                    engGame.changeMap(lt.intLocX, lt.intLocY, Short.parseShort(strStore));
                    lt.changeLocBypass(lt.intLocX, lt.intLocY);
                    return "";
                }
                catch (Exception e) {
                    Log.logError(e, "Exception at priv >");
                    return "error adding tile";
                }
            }
            if (strStore.startsWith("<")) {
                if ((strStore = strStore.substring(1)).equals("s")) {
                    engGame.saveMap();
                    return "Game settings saved";
                }
                if (strStore.toLowerCase().startsWith("merchant")) {
                    if (engGame.overMerchant(lt.intLocX, lt.intLocY) != null) {
                        return "There's already a merchant there.";
                    }
                    Merchant mrcStore = strStore.length() > 8 ? new Merchant(engGame, strStore2.substring(9).trim()) : new Merchant(engGame);
                    mrcStore.intLocX = lt.intLocX;
                    mrcStore.intLocY = lt.intLocY;
                    engGame.vctMerchants.addElement(mrcStore);
                    engGame.addDuskObject(mrcStore);
                    return "";
                }
                if (strStore.startsWith("prop ")) {
                    if (strStore.length() == 5) {
                        return "Add what prop?";
                    }
                    Prop prpStore = engGame.getProp(strStore = strStore.substring(5));
                    if (prpStore != null) {
                        prpStore.intLocX = lt.intLocX;
                        prpStore.intLocY = lt.intLocY;
                        engGame.vctProps.addElement(prpStore);
                        engGame.addDuskObject(prpStore);
                    }
                    return "";
                }
                if (strStore.startsWith("sign ")) {
                    if (strStore.length() == 5) {
                        return "What should the sign say?";
                    }
                    Sign sgnStore = new Sign("sign", strStore2.substring(5), lt.intLocX, lt.intLocY, engGame);
                    engGame.vctSigns.addElement(sgnStore);
                    engGame.addDuskObject(sgnStore);
                    return "";
                }
                if (strStore.startsWith("door ")) {
                    if (strStore.length() == 5) {
                        return "Need more detail on that door, Ralph!";
                    }
                    try {
                        strStore = strStore.substring(5).trim();
                        int iSPloc3 = strStore.indexOf(" ");
                        int intOpenImage = Integer.parseInt(strStore.substring(0, iSPloc3).trim());
                        strStore = strStore.substring(iSPloc3).trim();
                        iSPloc3 = strStore.indexOf(" ");
                        int intClosedImage = Integer.parseInt(strStore.substring(0, iSPloc3).trim());
                        strStore = strStore.substring(iSPloc3).trim();
                        iSPloc3 = strStore.indexOf(" ");
                        boolean isOpen = strStore.startsWith("true");
                        strStore = strStore.substring(iSPloc3).trim();
                        iSPloc3 = strStore.indexOf(" ");
                        boolean isLocked = strStore.startsWith("true");
                        strStore = strStore.substring(iSPloc3).trim();
                        iSPloc3 = strStore2.indexOf("desc:");
                        String sKey = null;
                        if (strStore.startsWith("key:")) {
                            sKey = strStore.substring(4, iSPloc3).trim();
                        }
                        String strDescription = strStore2.substring(iSPloc3 + 5).trim();
                        Door doorStore = new Door(engGame, intOpenImage, intClosedImage, isOpen, isLocked, sKey);
                        doorStore.strDescription = strDescription;
                        doorStore.intLocX = lt.intLocX;
                        doorStore.intLocY = lt.intLocY;
                        engGame.vctDoors.addElement(doorStore);
                        engGame.addDuskObject(doorStore);
                    }
                    catch (Exception e) {
                        return "Bad door details!";
                    }
                    return "";
                }
                Item itmStore = engGame.getItem(strStore);
                if (itmStore != null) {
                    itmStore.intLocX = lt.intLocX;
                    itmStore.intLocY = lt.intLocY;
                    engGame.vctItems.addElement(itmStore);
                    engGame.addDuskObject(itmStore);
                    return "";
                }
                int iSPloc4 = strStore.indexOf("lev:");
                int level = 0;
                try {
                    if (iSPloc4 > 0) {
                        level = Integer.parseInt(strStore.substring(iSPloc4 + 5).trim());
                        strStore = strStore.substring(0, iSPloc4).trim();
                    }
                    Mob thnStore = new Mob(strStore, lt.intLocX, lt.intLocY, engGame);
                    thnStore.changeLocBypass(lt.intLocX, lt.intLocY);
                    if (level > 0) {
                        thnStore.level = level;
                    }
                }
                catch (Exception e) {
                    Log.logError(e, "Error while creating mob", false);
                }
                return "";
            }
        }
        return null;
    }

    private static String getItems(LivingThing lt, DuskEngine engGame, String strStore, Item objStore) {
        Item itmStore = objStore;
        if (Math.abs(lt.intLocX - itmStore.intLocX) + Math.abs(lt.intLocY - itmStore.intLocY) >= 2) {
            return "That's too far away.";
        }
        lt.items.add(itmStore);
        lt.updateItems();
        engGame.removeDuskObject(itmStore);
        if (itmStore.strOnGetScript != null) {
            try {
                Script scrStore = new Script("scripts/" + itmStore.strOnGetScript, engGame, false);
                scrStore.varVariables.addVariable("trigger", lt);
                scrStore.runScript();
                scrStore.close();
            }
            catch (Exception e) {
                // empty catch block
            }
        }
        return "You get the " + itmStore.strName + ".  ";
    }
}
