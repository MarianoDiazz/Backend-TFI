import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { fechaHoraAR } from '../utils/helpers.js';

/**
 * Genera el mismo reporte en PDF, Excel o CSV.
 * Recibe: titulo, subtitulo, columnas [{ key, header, width }] y filas (array de objetos).
 * Así cualquier reporte nuevo solo arma los datos y reusa esto.
 */

const COLOR = '#1e2a38'; // tinta pizarra, mismo color que el sistema
const ACENTO = '#c13f72'; // rosa lapacho

function valorCelda(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

// ---------------- CSV ----------------
export function generarCSV({ columnas, filas }) {
  const esc = (v) => {
    const s = valorCelda(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columnas.map((c) => esc(c.header)).join(';');
  const body = filas.map((f) => columnas.map((c) => esc(f[c.key])).join(';'));
  // BOM para que Excel lea bien los acentos; separador ; (configuración regional AR)
  return Buffer.from('﻿' + [head, ...body].join('\r\n'), 'utf8');
}

// ---------------- Excel ----------------
export async function generarExcel({ titulo, subtitulo, columnas, filas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema Consultorio';
  const ws = wb.addWorksheet('Reporte');

  ws.mergeCells(1, 1, 1, columnas.length);
  ws.getCell(1, 1).value = titulo;
  ws.getCell(1, 1).font = { size: 14, bold: true, color: { argb: 'FF1E2A38' } };
  ws.mergeCells(2, 1, 2, columnas.length);
  ws.getCell(2, 1).value = subtitulo;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF6B7280' } };

  const header = ws.getRow(4);
  columnas.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2A38' } };
    ws.getColumn(i + 1).width = Math.max(10, Math.round((c.width || 80) / 6));
  });

  filas.forEach((f, idx) => {
    const row = ws.getRow(5 + idx);
    columnas.forEach((c, i) => { row.getCell(i + 1).value = f[c.key] ?? ''; });
  });

  ws.getRow(6 + filas.length).getCell(1).value = `Total de registros: ${filas.length}`;
  ws.getRow(6 + filas.length).getCell(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------- PDF ----------------
export function generarPDF({ titulo, subtitulo, columnas, filas, horizontal = false }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: horizontal ? 'landscape' : 'portrait', margin: 40, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const anchoUtil = doc.page.width - 80;
      const totalW = columnas.reduce((s, c) => s + (c.width || 80), 0);
      const factor = anchoUtil / totalW; // escalo las columnas al ancho de la hoja
      const anchos = columnas.map((c) => (c.width || 80) * factor);

      const encabezado = () => {
        doc.fillColor(COLOR).fontSize(16).font('Helvetica-Bold').text(titulo, 40, 40);
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text(subtitulo, 40, 62);
        doc.moveTo(40, 78).lineTo(40 + anchoUtil, 78).strokeColor(ACENTO).lineWidth(1.5).stroke();
        let x = 40;
        const y = 88;
        doc.rect(40, y - 4, anchoUtil, 18).fill(COLOR);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
        columnas.forEach((c, i) => {
          doc.text(c.header, x + 3, y, { width: anchos[i] - 6, lineBreak: false, ellipsis: true });
          x += anchos[i];
        });
        return y + 20;
      };

      let y = encabezado();
      doc.font('Helvetica').fontSize(8.5);

      filas.forEach((f, idx) => {
        // calculo el alto de la fila según el texto más largo
        const alto = Math.max(
          14,
          ...columnas.map((c, i) => doc.heightOfString(valorCelda(f[c.key]), { width: anchos[i] - 6 }) + 5)
        );
        if (y + alto > doc.page.height - 50) {
          doc.addPage();
          y = encabezado();
          doc.font('Helvetica').fontSize(8.5);
        }
        if (idx % 2 === 0) doc.rect(40, y - 3, anchoUtil, alto).fill('#f5f7f9');
        doc.fillColor('#1f2937');
        let x = 40;
        columnas.forEach((c, i) => {
          doc.text(valorCelda(f[c.key]), x + 3, y, { width: anchos[i] - 6 });
          x += anchos[i];
        });
        y += alto;
      });

      doc.moveDown(1).font('Helvetica-Bold').fillColor('#1f2937')
        .text(`Total de registros: ${filas.length}`, 40, y + 10);

      // pie con número de página
      const rango = doc.bufferedPageRange();
      for (let i = rango.start; i < rango.start + rango.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0; // si no, pdfkit agrega hojas en blanco al escribir el pie
        doc.font('Helvetica').fontSize(7.5).fillColor('#9ca3af').text(
          `Sistema de Gestión de Consultorio Médico · Página ${i + 1} de ${rango.count}`,
          40, doc.page.height - 30, { width: anchoUtil, align: 'center', lineBreak: false }
        );
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Historia clínica: formato tipo ficha, no tabla
export function generarHistoriaPDF(paciente, consultas) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fillColor(COLOR).font('Helvetica-Bold').fontSize(18).text('Historia Clínica');
      doc.moveDown(0.3).fillColor('#1f2937').fontSize(12)
        .text(`${paciente.apellido}, ${paciente.nombre}`);
      doc.font('Helvetica').fontSize(9.5).fillColor('#4b5563')
        .text(`DNI ${paciente.dni} · ${paciente.edad} años · Sexo ${paciente.sexo} · Nac. ${paciente.fecha_nacimiento}`)
        .text(`Obra social: ${paciente.obra_social || 'Particular'}${paciente.nro_afiliado ? ' · Afiliado N° ' + paciente.nro_afiliado : ''}`)
        .text(`Teléfono: ${paciente.telefono || '-'} · Email: ${paciente.email || '-'}`);
      doc.moveDown(0.5);
      doc.moveTo(45, doc.y).lineTo(doc.page.width - 45, doc.y).strokeColor(ACENTO).stroke();
      doc.moveDown(0.8);

      if (consultas.length === 0) {
        doc.fillColor('#6b7280').text('El paciente todavía no tiene consultas registradas.');
      }

      consultas.forEach((c) => {
        if (doc.y > doc.page.height - 160) doc.addPage();
        doc.fillColor(ACENTO).font('Helvetica-Bold').fontSize(11)
          .text(`${c.fecha} ${c.hora.slice(0, 5)} — Dr/a. ${c.medico} (${c.especialidad})`);
        doc.fillColor('#1f2937').font('Helvetica').fontSize(9.5);
        const linea = (label, valor) => {
          if (!valor) return;
          doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(valor));
        };
        linea('Motivo', c.motivo_consulta);
        linea('Diagnóstico', c.diagnostico);
        linea('Tratamiento', c.tratamiento);
        linea('Indicaciones', c.indicaciones);
        const signos = [c.peso_kg ? `Peso ${c.peso_kg} kg` : null, c.presion ? `TA ${c.presion}` : null]
          .filter(Boolean).join(' · ');
        linea('Signos', signos);
        doc.moveDown(0.8);
      });

      const rango = doc.bufferedPageRange();
      for (let i = 0; i < rango.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        doc.fontSize(7.5).fillColor('#9ca3af').text(
          `Documento confidencial · Emitido el ${fechaHoraAR()} · Página ${i + 1}/${rango.count}`,
          45, doc.page.height - 30, { width: doc.page.width - 90, align: 'center', lineBreak: false }
        );
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
