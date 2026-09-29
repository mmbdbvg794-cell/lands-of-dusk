/*
 * Decompiled with CFR 0.152.
 */
class Bookmark {
    String strAddress;
    int port;
    boolean keep;

    Bookmark(String inAddress, int inport) {
        this.strAddress = inAddress;
        this.port = inport;
    }

    public String toString() {
        return String.valueOf(String.valueOf(new StringBuffer(String.valueOf(String.valueOf(this.strAddress))).append(":").append(this.port)));
    }
}

