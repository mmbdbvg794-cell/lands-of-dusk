/*
 * The engine's SpellGroup (a group's spells, in order), rebuilt from its
 * decompiled source so that each spell can say what it needs and costs:
 * defSpells/<spell> "unlock <n>" and "mp <n>" (Skills.spellUnlock and
 * Skills.spellCost). Without them a spell needs 100 * place / (spells - 1)
 * group points and costs (110 - (points - that)) / 2 MP, as before.
 *
 * spellList (the "5 mp) mend" lines in the stats) lists every spell the
 * points reach; the old one stopped at the first it didn't, which was the
 * same thing while the order set the unlocks.
 *
 * Part of the browser client project (dusk-browser-client/server).
 */
import java.util.Vector;

public class SpellGroup {
    String strName;
    Vector vctSpells;

    public SpellGroup(String string) {
        this.strName = string;
        this.vctSpells = new Vector(0, 1);
    }

    // The group points a spell needs: its own "unlock", or by its place.
    int unlockAt(int i) {
        int byPlace = i == 0 ? 0 : 100 * i / (this.vctSpells.size() - 1);
        return Skills.spellUnlock(byPlace, this.vctSpells.elementAt(i));
    }

    int getSpellPercent(String string) {
        for (int i = 0; i < this.vctSpells.size(); ++i) {
            if (((String) this.vctSpells.elementAt(i)).equalsIgnoreCase(string)) return unlockAt(i);
        }
        return -1;
    }

    int getSpellNumber(String string) {
        for (int i = 0; i < this.vctSpells.size(); ++i) {
            if (((String) this.vctSpells.elementAt(i)).equalsIgnoreCase(string)) return i;
        }
        return -1;
    }

    String spellList(int n) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < this.vctSpells.size(); ++i) {
            String spell = (String) this.vctSpells.elementAt(i);
            if (spell == null) continue;
            int unlock = unlockAt(i);
            if (n < unlock) continue;
            out.append("  ").append(Skills.spellCost((110 - (n - unlock)) / 2, spell)).append(" mp) ").append(spell).append("\n");
        }
        return out.toString();
    }
}
