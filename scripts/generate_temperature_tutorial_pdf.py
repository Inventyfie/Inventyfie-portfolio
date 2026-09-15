from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'Tutorials' / 'data' / 'llm-temperature-article.md'
OUTPUT = ROOT / 'public' / 'llm-temperature-tutorial.pdf'


def clean_inline(value: str) -> str:
    value = escape(value)
    value = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
    value = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', value)
    return value.replace('—', '-').replace('–', '-').replace('→', '->').replace('…', '...')


def table_cells(line: str) -> list[str]:
    return [clean_inline(cell.strip()) for cell in line.split('|')[1:-1]]


def main() -> None:
    styles = getSampleStyleSheet()
    title = ParagraphStyle('Title', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=24, leading=29, textColor=colors.HexColor('#10223a'), spaceAfter=10)
    subtitle = ParagraphStyle('Subtitle', parent=styles['BodyText'], fontSize=12, leading=18, textColor=colors.HexColor('#31516f'), spaceAfter=18)
    h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=23, textColor=colors.HexColor('#10223a'), spaceBefore=18, spaceAfter=10)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#0a7180'), spaceBefore=14, spaceAfter=8)
    body = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=10.5, leading=15, textColor=colors.HexColor('#1f2937'), spaceAfter=8)
    code = ParagraphStyle('Code', parent=styles['Code'], fontName='Courier', fontSize=8.5, leading=12, backColor=colors.HexColor('#edf4f7'), borderColor=colors.HexColor('#c9dde5'), borderWidth=0.5, borderPadding=7, spaceBefore=5, spaceAfter=10)
    caption = ParagraphStyle('Caption', parent=body, fontSize=8.5, leading=11, textColor=colors.HexColor('#526b7b'), alignment=1, spaceAfter=12)
    callout = ParagraphStyle('Callout', parent=body, leftIndent=10, borderColor=colors.HexColor('#00bcd4'), borderWidth=2, borderPadding=8, backColor=colors.HexColor('#eefbfc'), spaceBefore=5, spaceAfter=10)

    source = SOURCE.read_text(encoding='utf-8')
    source = re.sub(r'^---[\s\S]*?---\s*', '', source)
    lines = source.splitlines()
    story = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith('# '):
            story.append(Paragraph(clean_inline(line[2:]), title))
            index += 1
            continue
        if line.startswith('## '):
            story.append(Paragraph(clean_inline(line[3:]), h1))
            index += 1
            continue
        if line.startswith('### '):
            story.append(Paragraph(clean_inline(line[4:]), h2))
            index += 1
            continue
        if line.startswith('```'):
            code_lines = []
            index += 1
            while index < len(lines) and not lines[index].startswith('```'):
                code_lines.append(escape(lines[index]))
                index += 1
            story.append(Paragraph('<br/>'.join(code_lines), code))
            index += 1
            continue
        image_match = re.match(r'!\[[^\]]*\]\(([^)]+)\)', line)
        if image_match:
            image_path = ROOT / 'public' / image_match.group(1).lstrip('/')
            index += 1
            while index < len(lines) and not lines[index].strip():
                index += 1
            caption_text = ''
            if index < len(lines) and lines[index].strip().startswith('*'):
                caption_text = lines[index].strip().strip('*')
                index += 1
            if image_path.exists():
                image = Image(str(image_path))
                image._restrictSize(6.7 * inch, 4.9 * inch)
                story.append(image)
                if caption_text:
                    story.append(Paragraph(clean_inline(caption_text), caption))
            continue
        if line.startswith('|') and index + 1 < len(lines) and '---' in lines[index + 1]:
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                table_lines.append(lines[index].strip())
                index += 1
            data = [table_cells(table_lines[0])] + [table_cells(row) for row in table_lines[2:]]
            table = Table(data, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#123f5a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8.5),
                ('LEADING', (0, 0), (-1, -1), 11),
                ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#a8c2cf')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5fafc')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            story.extend([table, Spacer(1, 10)])
            continue
        if line.startswith('> '):
            story.append(Paragraph(clean_inline(line[2:]), callout))
            index += 1
            continue
        if re.match(r'^[-*] ', line) or re.match(r'^\d+\. ', line):
            items = []
            while index < len(lines) and (re.match(r'^[-*] ', lines[index].strip()) or re.match(r'^\d+\. ', lines[index].strip())):
                items.append(re.sub(r'^(?:[-*]|\d+\.)\s+', '', lines[index].strip()))
                index += 1
            story.append(Paragraph('<br/>'.join(f'• {clean_inline(item)}' for item in items), body))
            continue
        paragraph = []
        while index < len(lines) and lines[index].strip() and not lines[index].startswith(('```', '![', '|', '>', '#')) and not re.match(r'^(?:[-*]|\d+\.)\s+', lines[index].strip()):
            paragraph.append(lines[index].strip())
            index += 1
        if paragraph:
            story.append(Paragraph(clean_inline(' '.join(paragraph)), body))
        else:
            index += 1

    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=48, bottomMargin=48, title='How AI Chooses Its Next Word')
    doc.build(story)


if __name__ == '__main__':
    main()
