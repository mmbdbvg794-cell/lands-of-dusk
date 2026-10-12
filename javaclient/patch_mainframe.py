"""Adds the Help button to the CFR decompile of the Java client's MainFrame:
under Equipment, with Quit moved to the bottom. Exact replacements that
must match once, so a different MainFrame fails loudly.

  python3 patch_mainframe.py <MainFrame.java>
"""
import sys

p = sys.argv[1]
s = open(p).read()
EDITS = [
    ("    Button btnEquipment = new Button();\n",
     "    Button btnEquipment = new Button();\n    Button btnHelp = new Button();\n"),
    ("        this.pnlStats.add(this.btnEquipment);\n",
     "        this.pnlStats.add(this.btnEquipment);\n        this.pnlStats.add(this.btnHelp);\n"),
    ("        this.btnQuit.setLocation(new Point(10, 280));\n",
     "        this.btnQuit.setLocation(new Point(10, 304));\n"),
    ("        this.btnEquipment.setSize(new Dimension(160, 20));\n",
     "        this.btnEquipment.setSize(new Dimension(160, 20));\n"
     "        this.btnHelp.setLabel(\"Help\");\n"
     "        this.btnHelp.setLocation(new Point(10, 280));\n"
     "        this.btnHelp.setVisible(true);\n"
     "        this.btnHelp.setSize(new Dimension(160, 20));\n"),
    ("        this.btnEquipment.addActionListener(this.appParent);\n",
     "        this.btnEquipment.addActionListener(this.appParent);\n"
     "        this.btnHelp.addActionListener(new java.awt.event.ActionListener() {\n"
     "            public void actionPerformed(java.awt.event.ActionEvent e) {\n"
     "                HelpFrame.show(MainFrame.this.appParent.strRCAddress);\n"
     "            }\n"
     "        });\n"),
]
for old, new in EDITS:
    n = s.count(old)
    if n != 1:
        sys.exit("MainFrame.java: expected 1 of:\n%s\nfound %d" % (old, n))
    s = s.replace(old, new)
open(p, "w").write(s)
print("patched", p)
