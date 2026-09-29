/*
 * Decompiled with CFR 0.152.
 */
public class Entity {
    String strName;
    double intLocX;
    double intLocY;
    boolean hideName;
    int intType;
    int intNum = 0;
    int intStep = -1;
    int intImage = 0;
    int intTicks;
    int hp;
    int maxhp;
    int intMoveDirection = -1;
    int intFlag = 0;
    int ID;
    Entity entNext = null;

    public Entity(String instrName, int inID, double inintLocX, double inintLocY, int inImage, int inStep, int inintType, String blnHideName) {
        this.strName = instrName;
        this.ID = inID;
        this.intLocX = inintLocX;
        this.intLocY = inintLocY;
        this.intImage = inImage;
        this.intStep = inStep;
        this.intType = inintType;
        this.hideName = blnHideName.trim().equalsIgnoreCase("true");
        this.hp = 0;
        this.maxhp = 0;
    }

    public Entity(String inStrName, int inID, int inIntType) {
        this.strName = inStrName;
        this.ID = inID;
        this.intType = inIntType;
        this.intLocY = -1.0;
        this.intLocX = -1.0;
        this.hideName = false;
        this.hp = 0;
        this.maxhp = 0;
    }

    public String getDisplayName() {
        return this.intNum == 0 ? this.strName : String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.intNum))).append(".").append(this.strName)));
    }
}

