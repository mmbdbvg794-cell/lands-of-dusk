"""A small Markdown -> .docx writer (no packages needed): headings,
paragraphs, bullet lists, pipe tables, code blocks, **bold** and `code`,
and CSV files appended as landscape tables.

  python3 tools/md2docx.py out.docx doc.md [Title=file.csv ...]
"""
import csv, re, sys, zipfile
from xml.sax.saxutils import escape

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'


def runs(text, size=None, bold=False, mono=False):
    out = []
    # **bold** and `code` inside a line.
    for part in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text):
        if not part:
            continue
        b, m, t = bold, mono, part
        if part.startswith('**') and part.endswith('**'):
            b, t = True, part[2:-2]
        elif part.startswith('`') and part.endswith('`'):
            m, t = True, part[1:-1]
        rpr = ''
        if b: rpr += '<w:b/>'
        if m: rpr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>'
        if size: rpr += f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
        out.append(f'<w:r>{"<w:rPr>" + rpr + "</w:rPr>" if rpr else ""}<w:t xml:space="preserve">{escape(t)}</w:t></w:r>')
    return ''.join(out)


def para(text, style=None, size=None, bold=False, mono=False):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ''
    return f'<w:p>{ppr}{runs(text, size, bold, mono)}</w:p>'


SHD = '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>'


def table(rows, size=18):
    cells = lambda r, head: ''.join(
        f'<w:tc><w:tcPr>{SHD if head else ""}</w:tcPr>{para(c, size=size, bold=head)}</w:tc>'
        for c in r)
    width = max(len(r) for r in rows)
    rows = [r + [''] * (width - len(r)) for r in rows]
    body = ''.join(f'<w:tr>{"<w:trPr><w:tblHeader/></w:trPr>" if i == 0 else ""}{cells(r, i == 0)}</w:tr>' for i, r in enumerate(rows))
    borders = ''.join(f'<w:{s} w:val="single" w:sz="4" w:space="0" w:color="999999"/>' for s in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
    return f'<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>{borders}</w:tblBorders><w:tblLayout w:type="autofit"/></w:tblPr>{body}</w:tbl>{para("")}'


def markdown(text):
    out, lines, i = [], text.split('\n'), 0
    while i < len(lines):
        l = lines[i]
        if l.startswith('```') or l.startswith('    ') and l.strip():
            block = []
            if l.startswith('```'):
                i += 1
                while i < len(lines) and not lines[i].startswith('```'):
                    block.append(lines[i]); i += 1
                i += 1
            else:
                while i < len(lines) and lines[i].startswith('    '):
                    block.append(lines[i][4:]); i += 1
            out += [para(b, mono=True, size=19) for b in block]
            continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            out.append(table(rows, 19))
            continue
        m = re.match(r'(#+) (.*)', l)
        if m:
            out.append(para(m.group(2), f'Heading{min(3, len(m.group(1)))}'))
        elif re.match(r'\s*[-*] ', l):
            out.append(para(re.sub(r'^\s*[-*] ', '', l), 'ListBullet'))
        elif l.strip():
            # Join a paragraph's wrapped lines.
            p = [l.strip()]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r'(#|\s*[-*] |\||```|    )', lines[i + 1]):
                i += 1; p.append(lines[i].strip())
            out.append(para(' '.join(p)))
        i += 1
    return out


STYLES = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles {W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2F5496"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>
</w:styles>'''
NUMBERING = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering {W}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'''
PORTRAIT = '<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>'
LANDSCAPE = '<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>'


def main(out, md, *csvs):
    body = markdown(open(md, encoding='utf-8').read())
    # The doc so far is portrait; the CSV appendix pages landscape.
    if csvs:
        body.append(f'<w:p><w:pPr><w:sectPr>{PORTRAIT}</w:sectPr></w:pPr></w:p>')
        for spec in csvs:
            title, path = spec.split('=', 1)
            body.append(para(title, 'Heading1'))
            body.append(table(list(csv.reader(open(path, encoding='utf-8'))), 15))
        final = LANDSCAPE
    else:
        final = PORTRAIT
    doc = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {W}><w:body>{"".join(body)}<w:sectPr>{final}</w:sectPr></w:body></w:document>'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>')
        z.writestr('word/styles.xml', STYLES)
        z.writestr('word/numbering.xml', NUMBERING)
        z.writestr('word/document.xml', doc)


if __name__ == '__main__':
    main(*sys.argv[1:])
