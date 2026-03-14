"""
Brainify — Professional Clinical PDF Report Generator
Clean white medical-grade design. Sections, metrics, recommendations, signatures.
"""
import io, base64
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, Image as RLImage, KeepTogether
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.pdfgen import canvas
    REPORTLAB = True
except ImportError:
    REPORTLAB = False

# Colours
NAVY    = '#0f2044'; BLUE  = '#1d4ed8'; BLUE2 = '#2563eb'
BLT     = '#3b82f6'; BPAL  = '#dbeafe'; BXP   = '#eff6ff'
SLATE   = '#334155'; MUTED = '#64748b'; LIGHT = '#94a3b8'
BORDER  = '#e2e8f0'; ROWALT= '#f8fafc'; WHITE = '#ffffff'
OFFWH   = '#f1f5f9'; BLACK = '#0f172a'
GREEN   = '#15803d'; GREENBG='#f0fdf4'; GREENBR='#bbf7d0'
RED     = '#dc2626'; REDBG ='#fef2f2'; REDBR ='#fecaca'
AMBER   = '#b45309'; AMBBG ='#fffbeb'; AMBBR ='#fde68a'
ORANGE  = '#c2410c'; ORGBG ='#fff7ed'; ORGBR ='#fed7aa'

SEV = {
    'normal':   (GREEN,  GREENBG, GREENBR, '#166534'),
    'mild':     (BLUE2,  BXP,     BPAL,    '#1e3a8a'),
    'moderate': (AMBER,  AMBBG,   AMBBR,   '#78350f'),
    'severe':   (ORANGE, ORGBG,   ORGBR,   '#7c2d12'),
    'critical': (RED,    REDBG,   REDBR,   '#7f1d1d'),
}

def hx(h): return colors.HexColor(h)
def P(txt, **kw): return Paragraph(txt, ParagraphStyle('_', **kw))


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw); self._pages = []
    def showPage(self):
        self._pages.append(dict(self.__dict__)); self._startPage()
    def save(self):
        N = len(self._pages)
        for i, pg in enumerate(self._pages, 1):
            self.__dict__.update(pg); self._hf(i, N); super().showPage()
        super().save()
    def _hf(self, n, total):
        W, H = A4
        # Header bar
        self.setFillColor(hx(NAVY)); self.rect(0, H-20*mm, W, 20*mm, fill=1, stroke=0)
        self.setFillColor(hx(BLT));  self.rect(0, H-20*mm, 3*mm, 20*mm, fill=1, stroke=0)
        # Logo square
        self.setFillColor(hx(BLUE2)); self.roundRect(12*mm, H-14.5*mm, 7*mm, 7*mm, 1.5*mm, fill=1, stroke=0)
        self.setFillColor(hx(WHITE)); self.setFont('Helvetica-Bold', 7)
        self.drawCentredString(15.5*mm, H-11.2*mm, 'B')
        # Brand
        self.setFillColor(hx(WHITE)); self.setFont('Helvetica-Bold', 13)
        self.drawString(22*mm, H-11*mm, 'BRAINIFY')
        self.setFillColor(hx(BLT)); self.setFont('Helvetica', 7.5)
        self.drawString(22*mm, H-16*mm, 'AI Radiology Platform')
        # Right labels
        self.setFillColor(hx(LIGHT)); self.setFont('Helvetica', 7.5)
        self.drawRightString(W-12*mm, H-9*mm,  'Brain MRI Segmentation Report')
        self.setFont('Helvetica', 7)
        self.drawRightString(W-12*mm, H-14.5*mm, 'CONFIDENTIAL — FOR CLINICAL USE ONLY')
        # Footer
        self.setFillColor(hx(OFFWH)); self.rect(0, 0, W, 11*mm, fill=1, stroke=0)
        self.setStrokeColor(hx(BORDER)); self.setLineWidth(0.4); self.line(0, 11*mm, W, 11*mm)
        self.setFillColor(hx(MUTED)); self.setFont('Helvetica', 6.5)
        self.drawString(12*mm, 4*mm, 'AI-generated report. Must be reviewed by a qualified radiologist before any clinical decision.')
        self.setFillColor(hx(SLATE)); self.setFont('Helvetica-Bold', 7)
        self.drawRightString(W-12*mm, 4*mm, f'Page {n} of {total}')


def bimg(b64, wm, hm):
    try:
        return RLImage(io.BytesIO(base64.b64decode(b64)), width=wm*mm, height=hm*mm)
    except: return None


def sec(title, story, accent=NAVY):
    story.append(Spacer(1, 5*mm))
    t = Table([[P(f'<b>{title}</b>',
        fontSize=9, fontName='Helvetica-Bold', textColor=hx(WHITE), leading=12)]], colWidths=[175*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),hx(accent)),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),9),
    ]))
    story.append(t); story.append(Spacer(1, 3*mm))


def info_tbl(rows, story, cw=None):
    if cw is None: cw = [42*mm, 47*mm, 42*mm, 44*mm]
    lS = dict(fontSize=8,  fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11)
    vS = dict(fontSize=9,  fontName='Helvetica',      textColor=hx(BLACK), leading=12)
    data = []
    for row in rows:
        r = []
        for i, cell in enumerate(row):
            r.append(P(str(cell), **(lS if i%2==0 else vS)))
        data.append(r)
    t = Table(data, colWidths=cw)
    t.setStyle(TableStyle([
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[hx(WHITE),hx(ROWALT)]),
        ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(t)


def grade(v, thr):
    for t, l in thr:
        if v >= t: return l
    return '—'


def area_interp(a):
    if a < 0.01: return 'Not detected — normal limits'
    if a < 1.0:  return 'Microlesion — investigate further'
    if a < 3.5:  return 'Moderate — clinically significant'
    if a < 7.0:  return 'Extensive — high-grade lesion likely'
    return 'Critical — immediate intervention required'


def who_label(sev):
    return {'normal':'N/A','mild':'Grade I (if neoplastic)',
            'moderate':'Grade II','severe':'Grade III–IV','critical':'Grade IV (GBM)'}.get(sev,'—')


def generate_pdf_report(scan, result, user):
    if not REPORTLAB: return _plain(scan, result, user)
    buf = io.BytesIO()
    W = 175*mm
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm, topMargin=26*mm, bottomMargin=16*mm)
    story = []
    now = datetime.now()
    rid = f'RPT-{str(scan.id)[:8].upper()}'

    story.append(Spacer(1, 4*mm))
    info_tbl([
        ('Report Date',    now.strftime('%d %B %Y,  %H:%M UTC'),
         'Report ID',      rid),
        ('Reviewing User', user.get_full_name() or user.username,
         'Status',         scan.status.upper()),
    ], story)
    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width='100%', thickness=0.4, color=hx(BORDER)))

    sec('1.   PATIENT INFORMATION', story)
    scan_type = scan.get_scan_type_display() if hasattr(scan,'get_scan_type_display') else scan.scan_type
    info_tbl([
        ('Patient Name',  scan.patient_name,           'Patient ID',   scan.patient_id),
        ('Age',           f'{scan.patient_age} years' if scan.patient_age else 'Not recorded',
         'Gender',        scan.patient_gender or 'Not recorded'),
        ('Scan Type',     scan_type,                   'Priority',     scan.priority.capitalize()),
        ('File',          scan.original_filename,       'File Size',    f'{scan.file_size_mb:.2f} MB'),
        ('Upload Date',   scan.upload_date.strftime('%d %b %Y  %H:%M UTC'),
         'Uploaded By',   user.get_full_name() or user.username),
    ], story)

    if not result:
        story.append(Spacer(1,8*mm))
        story.append(P('Analysis result not yet available. The scan may still be processing.',
            fontSize=9, fontName='Helvetica', textColor=hx(MUTED), leading=14))
        doc.build(story, canvasmaker=NumberedCanvas); buf.seek(0); return buf.read()

    # Classify
    from core.ml_model import classify_tumor
    cl, sv, who, desc, loc, recs = classify_tumor(
        result.tumour_area, result.confidence_score, result.tumor_detected)
    sev = result.severity or sv or 'normal'
    sc_txt, sc_bg, sc_br, sc_dark = SEV.get(sev, SEV['normal'])
    detected = result.tumor_detected

    sec('2.   AI DIAGNOSIS SUMMARY', story, accent=RED if detected else GREEN)

    # Status banner
    label = '⚠   ABNORMALITY DETECTED' if detected else '✓   NO SIGNIFICANT ABNORMALITY DETECTED'
    banner = Table([[P(f'<b>{label}</b>',
        fontSize=13, fontName='Helvetica-Bold',
        textColor=hx(RED if detected else GREEN), leading=17, alignment=TA_CENTER)]],
        colWidths=[W])
    banner.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),hx(REDBG if detected else GREENBG)),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
        ('LINEABOVE',(0,0),(-1,0),1.5,hx(REDBR if detected else GREENBR)),
        ('LINEBELOW',(0,-1),(-1,-1),1.5,hx(REDBR if detected else GREENBR)),
    ]))
    story.append(banner); story.append(Spacer(1, 3*mm))

    # Classification row
    diag = Table([
        [P('<b>Classification</b>', fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11),
         P('<b>WHO Grade</b>',      fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11),
         P('<b>Severity</b>',       fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11),
         P('<b>AI Confidence</b>',  fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11)],
        [P(result.classification,  fontSize=8.5, fontName='Helvetica',      textColor=hx(BLACK), leading=12),
         P(who_label(sev),         fontSize=8.5, fontName='Helvetica',      textColor=hx(BLUE2), leading=12),
         P(f'<b>{sev.upper()}</b>',fontSize=9,   fontName='Helvetica-Bold', textColor=hx(sc_txt),leading=12),
         P(f'<b>{result.confidence_score:.1f}%</b>',
           fontSize=13, fontName='Helvetica-Bold', textColor=hx(BLUE2), leading=16, alignment=TA_CENTER)],
    ], colWidths=[68*mm, 33*mm, 30*mm, 44*mm])
    diag.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),hx(OFFWH)),
        ('BACKGROUND',(0,1),(-1,1),hx(WHITE)),
        ('BACKGROUND',(2,1),(2,1),hx(sc_bg)),
        ('BOX',(2,1),(2,1),1,hx(sc_br)),
        ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(diag); story.append(Spacer(1, 4*mm))

    # Clinical description block
    desc_items = [
        P('<b>Clinical Description</b>',
          fontSize=8.5, fontName='Helvetica-Bold', textColor=hx(NAVY), leading=12),
        Spacer(1, 2*mm),
        P(desc, fontSize=8.5, fontName='Helvetica', textColor=hx(SLATE), leading=14, alignment=TA_JUSTIFY),
    ]
    if loc and loc != 'N/A':
        desc_items += [
            Spacer(1, 3*mm),
            P(f'<b>Probable Location:</b>  {loc}',
              fontSize=8.5, fontName='Helvetica', textColor=hx(SLATE), leading=13),
        ]
    dt = Table([[ desc_items ]], colWidths=[W])
    dt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),hx(BXP)),
        ('LINEALL',(0,0),(-1,-1),0.4,hx(BPAL)),
        ('LINEBEFORE',(0,0),(0,-1),3,hx(BLT)),
        ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),
        ('LEFTPADDING',(0,0),(-1,-1),11),('RIGHTPADDING',(0,0),(-1,-1),11),
    ]))
    story.append(dt)

    sec('3.   QUANTITATIVE AI METRICS', story)
    f1 = getattr(result, 'f1_score', 0) or 0
    mhdr = [P(t, fontSize=8.5, fontName='Helvetica-Bold', textColor=hx(WHITE), leading=11)
            for t in ['Metric', 'Value', 'Clinical Reference Range', 'Interpretation']]
    mrows = [mhdr]
    for metric, val, ref, interp in [
        ('Dice Coefficient',     f'{result.dice_score:.4f}',
         '> 0.70 Good   |   > 0.85 Excellent',
         grade(result.dice_score,  [(0.85,'Excellent'),(0.70,'Good'),(0.50,'Acceptable'),(0,'Poor')])),
        ('IoU (Jaccard) Score',  f'{result.iou_score:.4f}',
         '> 0.60 Good   |   > 0.75 Excellent',
         grade(result.iou_score,   [(0.75,'Excellent'),(0.60,'Good'),(0.40,'Acceptable'),(0,'Poor')])),
        ('Pixel Accuracy',       f'{result.accuracy:.2f}%',
         '> 90% Clinical Grade',
         grade(result.accuracy,    [(95,'Excellent'),(90,'Clinical Grade'),(80,'Acceptable'),(0,'Below Standard')])),
        ('Precision',            f'{result.precision:.4f}',
         '> 0.75 Good',
         grade(result.precision,   [(0.90,'Excellent'),(0.75,'Good'),(0.60,'Acceptable'),(0,'Low')])),
        ('Recall / Sensitivity', f'{result.recall:.4f}',
         '> 0.70 Good — lesion completeness',
         grade(result.recall,      [(0.90,'Excellent'),(0.70,'Good'),(0.55,'Acceptable'),(0,'Low')])),
        ('F1 Score',             f'{f1:.4f}',
         '> 0.72 Good — harmonic mean P/R',
         grade(f1,                 [(0.88,'Excellent'),(0.72,'Good'),(0.55,'Acceptable'),(0,'Poor')])),
        ('Tumour Area',          f'{result.tumour_area:.3f}%',
         '< 0.01% Absent   |   > 5% Extensive',
         area_interp(result.tumour_area)),
        ('Tumour Pixel Count',   f'{result.tumor_pixel_count:,} px',
         '< 100 px  Absent',
         'Detected' if result.tumor_pixel_count > 100 else 'Not significant'),
    ]:
        mrows.append([
            P(metric, fontSize=8.5, fontName='Helvetica',      textColor=hx(SLATE), leading=12),
            P(f'<b>{val}</b>', fontSize=9, fontName='Helvetica-Bold', textColor=hx(BLUE2), leading=12),
            P(ref,    fontSize=8,   fontName='Helvetica',      textColor=hx(LIGHT), leading=11),
            P(interp, fontSize=8.5, fontName='Helvetica',      textColor=hx(BLACK), leading=12),
        ])
    mt = Table(mrows, colWidths=[52*mm, 24*mm, 52*mm, 47*mm])
    mt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),hx(NAVY)),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[hx(WHITE),hx(ROWALT)]),
        ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(mt)

    sec('4.   SEGMENTATION IMAGES', story)

    IW, IH = 52, 50
    specs = [
        (result.original_b64,  'Fig. 1 — Original MRI',
         'Unprocessed grayscale input as received from scanner.'),
        (result.segmented_b64, 'Fig. 2 — Segmentation Mask',
         'CNN-predicted tumour region rendered in plasma colourmap.'),
        (result.overlay_b64,   'Fig. 3 — Tumour Overlay',
         'Predicted mask overlaid on original anatomy for context.'),
    ]
    valid = [(bimg(b,IW,IH), cap, dsc) for b, cap, dsc in specs if b]

    if valid:
        cw = [W / len(valid)] * len(valid)
        img_row  = [x[0]                                                           for x in valid]
        cap_row  = [P(f'<b>{x[1]}</b>', fontSize=7.5, fontName='Helvetica-Bold',
                      textColor=hx(NAVY), alignment=TA_CENTER, leading=11)         for x in valid]
        desc_row = [P(x[2], fontSize=7,  fontName='Helvetica',
                      textColor=hx(MUTED), alignment=TA_CENTER, leading=10)        for x in valid]
        it = Table([img_row, cap_row, desc_row], colWidths=cw)
        it.setStyle(TableStyle([
            ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('BACKGROUND',(0,0),(-1,0),hx('#f9fafb')),
            ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
            ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ]))
        story.append(it)

    # Heatmap (full-width with explanation)
    if result.heatmap_b64:
        story.append(Spacer(1, 3*mm))
        hm = bimg(result.heatmap_b64, 88, 55)
        if hm:
            hmt = Table([[hm, [
                P('<b>Fig. 4 — Confidence Heatmap</b>',
                  fontSize=8.5, fontName='Helvetica-Bold', textColor=hx(NAVY), leading=12),
                Spacer(1, 3*mm),
                P('Warmer colours (white → yellow → red) indicate regions where the '
                  'CNN assigns high confidence to tumour presence. Cool/dark areas '
                  'represent normal tissue or regions below the 0.30 detection threshold. '
                  'Generated from the sigmoid activation of the final decoder layer.',
                  fontSize=8, fontName='Helvetica', textColor=hx(SLATE),
                  leading=13, alignment=TA_JUSTIFY),
            ]]], colWidths=[92*mm, 83*mm])
            hmt.setStyle(TableStyle([
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('BACKGROUND',(0,0),(0,-1),hx('#f9fafb')),
                ('BACKGROUND',(1,0),(1,-1),hx(BXP)),
                ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
                ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),
                ('LEFTPADDING',(1,0),(1,-1),11),('RIGHTPADDING',(1,0),(1,-1),11),
            ]))
            story.append(hmt)

    sec('5.   CLINICAL RECOMMENDATIONS', story, accent=RED if detected else GREEN)

    for i, rec in enumerate(recs, 1):
        urgent = any(w in rec.upper() for w in ['⚠','URGENT','EMERGENCY','IMMEDIATE','STAT'])
        rbg  = hx(REDBG)  if urgent else hx(WHITE if i%2 else ROWALT)
        rcol = hx(RED)    if urgent else hx(BLUE2)
        tcol = hx(RED)    if urgent else hx(BLACK)
        rt = Table([[
            P(f'<b>{i:02d}</b>', fontSize=9, fontName='Helvetica-Bold',
              textColor=rcol, alignment=TA_CENTER, leading=12),
            P(rec, fontSize=8.5, fontName='Helvetica', textColor=tcol, leading=13),
        ]], colWidths=[13*mm, 162*mm])
        rt.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),rbg),
            ('LINEABOVE',(0,0),(-1,0),0.3,hx(BORDER)),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
            ('LEFTPADDING',(0,0),(0,-1),0),('LEFTPADDING',(1,0),(1,-1),10),
        ]))
        story.append(rt)

    sec('6.   RADIOLOGIST / CLINICIAN NOTES', story, accent=SLATE)
    notes = (result.radiologist_notes or scan.notes or
             'No notes added by the reviewing clinician at time of report generation.')
    nt = Table([[P(notes, fontSize=9, fontName='Helvetica', textColor=hx(SLATE),
                   leading=15, alignment=TA_JUSTIFY)]], colWidths=[W])
    nt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),hx(ROWALT)),
        ('LINEALL',(0,0),(-1,-1),0.4,hx(BORDER)),
        ('LINEBEFORE',(0,0),(0,-1),3,hx(SLATE)),
        ('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11),
        ('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),13),
        ('MINROWHEIGHT',(0,0),(-1,-1),22*mm),
    ]))
    story.append(nt)

    # Signature row
    story.append(Spacer(1, 5*mm))
    sig = Table([
        [P('<b>Reviewing Clinician</b>', fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11),
         P('<b>Date of Review</b>',      fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11),
         P('<b>Digital Signature</b>',   fontSize=8, fontName='Helvetica-Bold', textColor=hx(MUTED), leading=11)],
        [P('________________________________', fontSize=9, fontName='Helvetica', textColor=hx(BORDER), leading=20),
         P('________________________________', fontSize=9, fontName='Helvetica', textColor=hx(BORDER), leading=20),
         P('________________________________', fontSize=9, fontName='Helvetica', textColor=hx(BORDER), leading=20)],
        [P(user.get_full_name() or user.username,
           fontSize=8, fontName='Helvetica', textColor=hx(SLATE), leading=11),
         P(now.strftime('%d %B %Y'),
           fontSize=8, fontName='Helvetica', textColor=hx(SLATE), leading=11),
         P('AI-Assisted — Requires Human Countersign',
           fontSize=7.5, fontName='Helvetica', textColor=hx(LIGHT), leading=11)],
    ], colWidths=[W/3]*3)
    sig.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),hx(OFFWH)),
        ('GRID',(0,0),(-1,-1),0.3,hx(BORDER)),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),10),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(sig)

    story.append(Spacer(1, 6*mm))
    dis = Table([[P(
        '<b>IMPORTANT MEDICAL DISCLAIMER</b><br/>'
        'This report is produced by the Brainify AI platform and is a <b>decision-support tool only</b>. '
        'It does not constitute a formal clinical diagnosis. All findings, classifications, and '
        'recommendations must be independently reviewed by a qualified radiologist, neuroradiologist, '
        'or neurosurgeon before any clinical action is taken. AI models may produce false positives or '
        'negatives. Brainify and its developers accept no liability for clinical decisions made solely '
        'on the basis of this report without appropriate specialist review.',
        fontSize=7.5, fontName='Helvetica', textColor=hx(AMBER),
        leading=12, alignment=TA_JUSTIFY)]], colWidths=[W])
    dis.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),hx(AMBBG)),
        ('LINEALL',(0,0),(-1,-1),0.5,hx(AMBBR)),
        ('LINEBEFORE',(0,0),(0,-1),3,hx(AMBER)),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
        ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),
    ]))
    story.append(dis)

    doc.build(story, canvasmaker=NumberedCanvas)
    buf.seek(0); return buf.read()


def _plain(scan, result, user):
    lines = ['BRAINIFY CLINICAL REPORT','='*60,
             f'Patient: {scan.patient_name}  |  ID: {scan.patient_id}',
             f'Age: {scan.patient_age}  |  Gender: {scan.patient_gender}']
    if result:
        lines += [f'Classification: {result.classification}',
                  f'Severity: {result.severity}  |  Confidence: {result.confidence_score:.1f}%',
                  f'Dice: {result.dice_score:.4f}  IoU: {result.iou_score:.4f}']
    lines += ['','AI-generated. Requires specialist review.']
    return '\n'.join(lines).encode()
