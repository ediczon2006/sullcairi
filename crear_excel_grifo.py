import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import CellIsRule

def create_fuel_control_excel():
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # STYLES & PALETTE (Professional Petroleum / Gas Station Theme)
    # -------------------------------------------------------------
    font_family = "Segoe UI"
    header_fill = PatternFill(start_color="1E4620", end_color="1E4620", fill_type="solid") # Dark Forest Green (Grifo)
    header_font = Font(name=font_family, size=10, bold=True, color="FFFFFF")
    
    sub_fill = PatternFill(start_color="2D6A4F", end_color="2D6A4F", fill_type="solid")
    sub_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")

    card_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid") # Light emerald
    card_border = Border(
        left=Side(style='thin', color='B8E2C8'),
        right=Side(style='thin', color='B8E2C8'),
        top=Side(style='thin', color='B8E2C8'),
        bottom=Side(style='thin', color='B8E2C8')
    )
    
    thin_border = Border(
        left=Side(style='thin', color='E0E0E0'),
        right=Side(style='thin', color='E0E0E0'),
        top=Side(style='thin', color='E0E0E0'),
        bottom=Side(style='thin', color='E0E0E0')
    )
    
    total_fill = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
    total_font = Font(name=font_family, size=10, bold=True, color="1B5E20")

    # =============================================================
    # SHEET 1: CONTROL DE VALES DE CRÉDITO
    # =============================================================
    ws1 = wb.active
    ws1.title = "Control de Vales"
    ws1.views.sheetView[0].showGridLines = True

    # Title Banner — now 15 columns (A:O) with FECHA_RECOJO added
    ws1.merge_cells("A1:O1")
    ws1["A1"] = "ESTACIÓN DE SERVICIOS - REGISTRO Y CONTROL DE VALES DE CRÉDITO"
    ws1["A1"].font = Font(name=font_family, size=14, bold=True, color="FFFFFF")
    ws1["A1"].fill = PatternFill(start_color="14361B", end_color="14361B", fill_type="solid")
    ws1["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[1].height = 32

    # KPI summary cards in rows 3-4
    # Columns shifted: FECHA_RECOJO is now col C; data starts at col E onwards
    kpis = [
        ("B3", "C3", "B4", "C4", "TOTAL VALES REGISTRADOS", "=COUNTA(E8:E100)", "0"),
        ("E3", "F3", "E4", "F4", "TOTAL DIESEL (GLN)",
         '=SUMIFS(J8:J100, I8:I100, "DIESEL B5", N8:N100, "<>ANULADO")', '#,##0.00 "Gln"'),
        ("H3", "I3", "H4", "I4", "TOTAL PREMIUM (GLN)",
         '=SUMIFS(J8:J100, I8:I100, "PREMIUM", N8:N100, "<>ANULADO")', '#,##0.00 "Gln"'),
        ("K3", "L3", "K4", "L4", "IMPORTE TOTAL (S/.)",
         '=SUMIF(N8:N100, "<>ANULADO", L8:L100)', '"S/." #,##0.00'),
        ("M3", "N3", "M4", "N4", "VALES ANULADOS",
         '=COUNTIF(N8:N100, "ANULADO")', '0 "Vales"')
    ]

    for t_tl, t_br, v_tl, v_br, title, formula, num_fmt in kpis:
        ws1.merge_cells(f"{t_tl}:{t_br}")
        cell_t = ws1[t_tl]
        cell_t.value = title
        cell_t.font = Font(name=font_family, size=8, bold=True, color="555555")
        cell_t.alignment = Alignment(horizontal="center", vertical="center")
        cell_t.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        ws1.merge_cells(f"{v_tl}:{v_br}")
        cell_v = ws1[v_tl]
        cell_v.value = formula
        cell_v.font = Font(name=font_family, size=12, bold=True, color="1E4620")
        cell_v.alignment = Alignment(horizontal="center", vertical="center")
        cell_v.fill = card_fill
        cell_v.number_format = num_fmt

    # Headers for Table — 15 columns, FECHA_RECOJO inserted after FECHA
    headers = [
        "ITEM",              # A - col 1
        "FECHA EMISIÓN",     # B - col 2
        "FECHA RECOJO",      # C - col 3  ← NEW
        "TURNO",             # D - col 4
        "N° VALE",           # E - col 5
        "CLIENTE / EMPRESA", # F - col 6
        "PLACA",             # G - col 7
        "CONDUCTOR",         # H - col 8
        "PRODUCTO",          # I - col 9
        "CANTIDAD (GLN)",    # J - col 10
        "PRECIO (S/)",       # K - col 11
        "TOTAL (S/)",        # L - col 12
        "GRIFERO / ISLA",    # M - col 13
        "ESTADO",            # N - col 14
        "N° FACTURA / DOC"   # O - col 15
    ]

    ws1.row_dimensions[7].height = 24
    for col_idx, header in enumerate(headers, 1):
        cell = ws1.cell(row=7, column=col_idx)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Sample data — 15 values per row.
    # (ITEM, FECHA_EMISION, FECHA_RECOJO, TURNO, N_VALE, CLIENTE, PLACA,
    #  CONDUCTOR, PRODUCTO, CANTIDAD, PRECIO, TOTAL_formula, GRIFERO, ESTADO, FACTURA)
    sample_data = [
        (1,  "2026-08-17", "2026-08-17", "T1", 377, "Transportes Andina S.A.C.", "A1B-823", "Carlos Rojas",  "PREMIUM",   8.0,  19.50, "=J8*K8",   "Juan P.",  "FACTURADO", "F001-00452"),
        (2,  "2026-08-17", "2026-08-18", "T1", 378, "Constructora del Sur",      "C4F-912", "Manuel Vega",   "PREMIUM",   3.0,  19.50, "=J9*K9",   "Juan P.",  "FACTURADO", "F001-00455"),
        (3,  "2026-08-18", "2026-08-18", "T2", 379, "-",                          "-",       "-",             "-",         0.0,   0.0,  "=J10*K10", "Pedro M.", "ANULADO",   "ERROR LLENADO"),
        (4,  "2026-08-19", "2026-08-20", "T1", 380, "Distribuidora Lima",         "T6U-711", "Jorge Quispe",  "DIESEL B5", 10.0, 16.80, "=J11*K11", "Luis G.",  "FACTURADO", "F001-00460"),
        (5,  "2026-08-19", "2026-08-19", "T2", 381, "Transportes Andina S.A.C.", "A1B-823", "Carlos Rojas",  "PREMIUM",   4.0,  19.50, "=J12*K12", "Pedro M.", "PENDIENTE", "-"),
        (6,  "2026-08-17", "2026-08-20", "T3", 382, "Minera Horizonte",           "V7X-551", "Alonso Ruiz",   "PREMIUM",   1.0,  19.50, "=J13*K13", "Mario S.", "PENDIENTE", "-"),
        (7,  "2026-08-20", "2026-08-20", "T1", 383, "Constructora del Sur",       "C4F-912", "Manuel Vega",   "PREMIUM",   4.0,  19.50, "=J14*K14", "Juan P.",  "PENDIENTE", "-"),
        (8,  "2026-08-21", "2026-08-22", "T1", 384, "Distribuidora Lima",         "T6U-711", "Jorge Quispe",  "PREMIUM",   7.0,  19.50, "=J15*K15", "Luis G.",  "PENDIENTE", "-"),
        (9,  "2026-08-21", "2026-08-21", "T2", 385, "Agropecuaria San José",      "B8K-102", "Raúl Castro",   "PREMIUM",   8.0,  19.50, "=J16*K16", "Pedro M.", "PENDIENTE", "-"),
        (10, "2026-08-22", "2026-08-22", "T1", 386, "-",                           "-",       "-",             "-",         0.0,   0.0,  "=J17*K17", "Juan P.",  "ANULADO",   "VALE ROTO"),
        (11, "2026-08-25", "2026-08-26", "T1", 387, "Distribuidora Lima",          "T6U-711", "Jorge Quispe",  "DIESEL B5", 11.0, 16.80, "=J18*K18", "Luis G.",  "PENDIENTE", "-"),
        (12, "2026-08-25", "2026-08-25", "T2", 388, "Transportes Andina S.A.C.",  "A1B-823", "Carlos Rojas",  "PREMIUM",   4.0,  19.50, "=J19*K19", "Pedro M.", "PENDIENTE", "-"),
        (13, "2026-08-26", "2026-08-27", "T1", 389, "Constructora del Sur",        "C4F-912", "Manuel Vega",   "PREMIUM",   4.0,  19.50, "=J20*K20", "Juan P.",  "PENDIENTE", "-"),
        (14, "2026-08-27", "2026-08-27", "T1", 390, "Agropecuaria San José",       "B8K-102", "Raúl Castro",   "PREMIUM",   8.0,  19.50, "=J21*K21", "Luis G.",  "PENDIENTE", "-"),
        (15, "2026-08-31", "2026-09-01", "T2", 391, "Transportes Andina S.A.C.",  "B3M-442", "Felipe Díaz",   "PREMIUM",   7.0,  19.50, "=J22*K22", "Pedro M.", "PENDIENTE", "-"),
        (16, "2026-08-31", "2026-08-31", "T3", 392, "-",                            "-",       "-",             "-",         0.0,   0.0,  "=J23*K23", "Mario S.", "ANULADO",   "CORRELATIVO SALTADO"),
        (17, "2026-08-31", "2026-08-31", "T3", 393, "-",                            "-",       "-",             "-",         0.0,   0.0,  "=J24*K24", "Mario S.", "ANULADO",   "EXTRAVIO"),
        (18, "2026-09-01", "2026-09-02", "T1", 394, "Distribuidora Lima",           "T6U-711", "Jorge Quispe",  "DIESEL B5", 6.0,  16.80, "=J25*K25", "Luis G.",  "PENDIENTE", "-"),
        (19, "2026-09-02", "2026-09-03", "T2", 395, "Minera Horizonte",             "V7X-551", "Alonso Ruiz",   "PREMIUM",  12.0,  19.50, "=J26*K26", "Pedro M.", "PENDIENTE", "-"),
        (20, "2026-09-02", "2026-09-02", "T3", 396, "-",                             "-",       "-",             "-",         0.0,   0.0,  "=J27*K27", "Mario S.", "ANULADO",   "ERROR EN PLACA"),
    ]

    red_fill = PatternFill(start_color="FDE8E8", end_color="FDE8E8", fill_type="solid")
    red_font = Font(name=font_family, size=9, color="9B1C1C", bold=True)

    start_row = 8
    for i, row in enumerate(sample_data):
        r = start_row + i
        ws1.row_dimensions[r].height = 20
        is_anulado = (row[13] == "ANULADO")  # index 13 = ESTADO (0-based)

        for c, val in enumerate(row, 1):
            cell = ws1.cell(row=r, column=c)
            cell.value = val
            cell.font = Font(name=font_family, size=9)
            cell.border = thin_border

            # Alignments — updated column indices for new layout
            if c in (1, 2, 3, 4, 5, 7, 9, 13, 14, 15):  # ITEM, dates, TURNO, N_VALE, PLACA, PRODUCTO, GRIFERO, ESTADO, FACTURA
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c in (10, 11, 12):  # CANTIDAD, PRECIO, TOTAL
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

            # Number formats
            if c == 10:   # Cantidad (GLN)
                cell.number_format = '#,##0.00'
            elif c == 11:  # Precio
                cell.number_format = '"S/." #,##0.00'
            elif c == 12:  # Total
                cell.number_format = '"S/." #,##0.00'

            if is_anulado:
                cell.fill = red_fill
                cell.font = red_font

    # Total Row
    tot_row = start_row + len(sample_data)
    ws1.row_dimensions[tot_row].height = 22
    ws1.merge_cells(f"A{tot_row}:I{tot_row}")
    ws1[f"A{tot_row}"] = "TOTALES GENERALES:"
    ws1[f"A{tot_row}"].font = total_font
    ws1[f"A{tot_row}"].alignment = Alignment(horizontal="right", vertical="center")
    ws1[f"A{tot_row}"].fill = total_fill

    ws1[f"J{tot_row}"] = f"=SUM(J{start_row}:J{tot_row-1})"
    ws1[f"J{tot_row}"].number_format = '#,##0.00 "Gln"'
    ws1[f"J{tot_row}"].font = total_font
    ws1[f"J{tot_row}"].fill = total_fill
    ws1[f"J{tot_row}"].alignment = Alignment(horizontal="right", vertical="center")

    ws1[f"K{tot_row}"].fill = total_fill

    ws1[f"L{tot_row}"] = f"=SUM(L{start_row}:L{tot_row-1})"
    ws1[f"L{tot_row}"].number_format = '"S/." #,##0.00'
    ws1[f"L{tot_row}"].font = total_font
    ws1[f"L{tot_row}"].fill = total_fill
    ws1[f"L{tot_row}"].alignment = Alignment(horizontal="right", vertical="center")

    for col_c in ["M", "N", "O"]:
        ws1[f"{col_c}{tot_row}"].fill = total_fill

    # =============================================================
    # SHEET 2: KARDEX DIARIO DE COMBUSTIBLE (TANQUES Y COMPRAS)
    # (Esto resuelve lo que intentaban poner en las columnas G-K)
    # =============================================================
    ws2 = wb.create_sheet(title="Kardex Tanques")
    ws2.views.sheetView[0].showGridLines = True

    ws2.merge_cells("A1:K1")
    ws2["A1"] = "CONTROL DIARIO DE TANQUES - VARILLAJE Y COMPRAS DE COMBUSTIBLE (KARDEX)"
    ws2["A1"].font = Font(name=font_family, size=13, bold=True, color="FFFFFF")
    ws2["A1"].fill = PatternFill(start_color="14361B", end_color="14361B", fill_type="solid")
    ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 30

    kardex_headers = [
        "FECHA",               # A
        "PRODUCTO",            # B
        "STOCK INICIAL (GLN)", # C
        "COMPRAS / CISTERNA",  # D
        "N° GUÍA REMISIÓN",    # E
        "VENTAS CONTÓMETRO",   # F
        "VENTAS VALES",        # G
        "STOCK TEÓRICO (GLN)", # H (=Inicial + Compras - Ventas)
        "STOCK FÍSICO VARILLA",# I
        "DIFERENCIA / MERMA",  # J (=Físico - Teórico)
        "OBSERVACIONES"        # K
    ]

    ws2.row_dimensions[3].height = 24
    for idx, h in enumerate(kardex_headers, 1):
        cell = ws2.cell(row=3, column=idx)
        cell.value = h
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    sample_kardex = [
        ("2026-08-17", "PREMIUM", 1200.0, 1500.0, "GR-002341", 450.0, 11.0, "=C4+D4-(F4+G4)", 2235.0, "=I4-H4", "Descarga cisterna 11:00 am"),
        ("2026-08-17", "DIESEL B5", 2500.0, 0.0, "-", 820.0, 0.0, "=C5+D5-(F5+G5)", 1675.0, "=I5-H5", "Normal"),
        ("2026-08-18", "PREMIUM", 2235.0, 0.0, "-", 380.0, 0.0, "=C6+D6-(F6+G6)", 1852.0, "=I6-H6", "Variación normal"),
        ("2026-08-18", "DIESEL B5", 1675.0, 3000.0, "GR-002358", 910.0, 0.0, "=C7+D7-(F7+G7)", 3760.0, "=I7-H7", "Cisterna recibida OK"),
        ("2026-08-19", "PREMIUM", 1852.0, 0.0, "-", 410.0, 4.0, "=C8+D8-(F8+G8)", 1435.0, "=I8-H8", "Normal"),
        ("2026-08-19", "DIESEL B5", 3760.0, 0.0, "-", 980.0, 10.0, "=C9+D9-(F9+G9)", 2768.0, "=I9-H9", "Normal"),
    ]

    for i, row in enumerate(sample_kardex):
        r = 4 + i
        ws2.row_dimensions[r].height = 20
        for c, val in enumerate(row, 1):
            cell = ws2.cell(row=r, column=c)
            cell.value = val
            cell.font = Font(name=font_family, size=9)
            cell.border = thin_border
            if c in (1, 2, 5):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c in (3, 4, 6, 7, 8, 9, 10):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '#,##0.00'
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # =============================================================
    # SHEET 3: RESUMEN DE COBRANZA POR CLIENTE (VALES PENDIENTES)
    # =============================================================
    ws3 = wb.create_sheet(title="Resumen Clientes")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:F1")
    ws3["A1"] = "LIQUIDACIÓN DE VALES POR CLIENTE (PENDIENTE DE FACTURAR)"
    ws3["A1"].font = Font(name=font_family, size=13, bold=True, color="FFFFFF")
    ws3["A1"].fill = PatternFill(start_color="14361B", end_color="14361B", fill_type="solid")
    ws3["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws3.row_dimensions[1].height = 30

    client_headers = [
        "CLIENTE / RAZÓN SOCIAL", # A
        "CANT. VALES PENDIENTES", # B
        "GLN DIESEL",             # C
        "GLN PREMIUM",            # D
        "DEUDA TOTAL (S/.)",      # E
        "ESTADO DE CRÉDITO"       # F
    ]

    ws3.row_dimensions[3].height = 24
    for idx, h in enumerate(client_headers, 1):
        cell = ws3.cell(row=3, column=idx)
        cell.value = h
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    sample_clients = [
        ("Transportes Andina S.A.C.", '=COUNTIFS(\'Control de Vales\'!E$8:E$100, A4, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A4, \'Control de Vales\'!H$8:H$100, "DIESEL B5", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A4, \'Control de Vales\'!H$8:H$100, "PREMIUM", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!K$8:K$100, \'Control de Vales\'!E$8:E$100, A4, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', "Activo / Al día"),
        ("Constructora del Sur", '=COUNTIFS(\'Control de Vales\'!E$8:E$100, A5, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A5, \'Control de Vales\'!H$8:H$100, "DIESEL B5", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A5, \'Control de Vales\'!H$8:H$100, "PREMIUM", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!K$8:K$100, \'Control de Vales\'!E$8:E$100, A5, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', "Activo / Al día"),
        ("Distribuidora Lima", '=COUNTIFS(\'Control de Vales\'!E$8:E$100, A6, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A6, \'Control de Vales\'!H$8:H$100, "DIESEL B5", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A6, \'Control de Vales\'!H$8:H$100, "PREMIUM", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!K$8:K$100, \'Control de Vales\'!E$8:E$100, A6, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', "Por facturar fin de mes"),
        ("Agropecuaria San José", '=COUNTIFS(\'Control de Vales\'!E$8:E$100, A7, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A7, \'Control de Vales\'!H$8:H$100, "DIESEL B5", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A7, \'Control de Vales\'!H$8:H$100, "PREMIUM", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!K$8:K$100, \'Control de Vales\'!E$8:E$100, A7, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', "Activo / Al día"),
        ("Minera Horizonte", '=COUNTIFS(\'Control de Vales\'!E$8:E$100, A8, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A8, \'Control de Vales\'!H$8:H$100, "DIESEL B5", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!I$8:I$100, \'Control de Vales\'!E$8:E$100, A8, \'Control de Vales\'!H$8:H$100, "PREMIUM", \'Control de Vales\'!M$8:M$100, "PENDIENTE")', '=SUMIFS(\'Control de Vales\'!K$8:K$100, \'Control de Vales\'!E$8:E$100, A8, \'Control de Vales\'!M$8:M$100, "PENDIENTE")', "Por facturar fin de mes"),
    ]

    for i, row in enumerate(sample_clients):
        r = 4 + i
        ws3.row_dimensions[r].height = 20
        for c, val in enumerate(row, 1):
            cell = ws3.cell(row=r, column=c)
            cell.value = val
            cell.font = Font(name=font_family, size=9)
            cell.border = thin_border
            if c == 1:
                cell.alignment = Alignment(horizontal="left", vertical="center")
            elif c == 2:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.number_format = '0'
            elif c in (3, 4):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '#,##0.00'
            elif c == 5:
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '"S/." #,##0.00'
            elif c == 6:
                cell.alignment = Alignment(horizontal="center", vertical="center")

    # Auto-adjust column widths for all sheets
    for ws in [ws1, ws2, ws3]:
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = 0
            for cell in col:
                # ignore merged title / KPI rows for ws1
                if cell.row in (1, 2, 3, 4) and ws == ws1 and col_letter in (
                        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"):
                    continue
                if cell.row == 1:
                    continue
                if cell.value:
                    val_str = str(cell.value)
                    if not val_str.startswith("="):
                        max_len = max(max_len, len(val_str))
            ws.column_dimensions[col_letter].width = max(max_len + 5, 12)

    # Specific column widths for Sheet 1 (15 columns A–O)
    ws1.column_dimensions["A"].width = 7   # ITEM
    ws1.column_dimensions["B"].width = 14  # FECHA EMISIÓN
    ws1.column_dimensions["C"].width = 14  # FECHA RECOJO  ← NEW
    ws1.column_dimensions["D"].width = 10  # TURNO
    ws1.column_dimensions["E"].width = 11  # N° VALE
    ws1.column_dimensions["F"].width = 28  # CLIENTE / EMPRESA
    ws1.column_dimensions["G"].width = 12  # PLACA
    ws1.column_dimensions["H"].width = 18  # CONDUCTOR
    ws1.column_dimensions["I"].width = 14  # PRODUCTO
    ws1.column_dimensions["J"].width = 16  # CANTIDAD (GLN)
    ws1.column_dimensions["K"].width = 15  # PRECIO (S/)
    ws1.column_dimensions["L"].width = 16  # TOTAL (S/)
    ws1.column_dimensions["M"].width = 16  # GRIFERO / ISLA
    ws1.column_dimensions["N"].width = 14  # ESTADO
    ws1.column_dimensions["O"].width = 22  # N° FACTURA / DOC

    ws2.column_dimensions["A"].width = 13
    ws2.column_dimensions["B"].width = 14
    ws2.column_dimensions["C"].width = 18
    ws2.column_dimensions["D"].width = 18
    ws2.column_dimensions["E"].width = 18
    ws2.column_dimensions["F"].width = 18
    ws2.column_dimensions["G"].width = 16
    ws2.column_dimensions["H"].width = 18
    ws2.column_dimensions["I"].width = 18
    ws2.column_dimensions["J"].width = 18
    ws2.column_dimensions["K"].width = 25

    ws3.column_dimensions["A"].width = 28
    ws3.column_dimensions["B"].width = 22
    ws3.column_dimensions["C"].width = 16
    ws3.column_dimensions["D"].width = 16
    ws3.column_dimensions["E"].width = 18
    ws3.column_dimensions["F"].width = 22

    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(base_dir, "Control_Vales_y_Combustible_Grifo.xlsx")
    wb.save(output_path)
    print("Excel successfully created at:", output_path)

if __name__ == "__main__":
    create_fuel_control_excel()
