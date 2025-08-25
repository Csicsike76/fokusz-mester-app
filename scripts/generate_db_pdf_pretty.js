import PDFDocument from 'pdfkit';
import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const doc = new PDFDocument({ margin: 30, size: 'A4' });
const outputFile = 'db_schema_pretty_table.pdf';
doc.pipe(fs.createWriteStream(outputFile));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function drawTable(headers, rows) {
  const startX = doc.x;
  const startY = doc.y;
  const colWidths = [150, 100, 80, 150]; // oszlopok szélessége

  // Fejléc
  doc.font('Helvetica-Bold').fontSize(11);
  headers.forEach((header, i) => {
    doc.fillColor('#ffffff')
       .rect(startX + colWidths.slice(0, i).reduce((a,b)=>a+b,0), startY, colWidths[i], 20)
       .fill('#34495E')
       .fillColor('#ffffff')
       .text(header, startX + colWidths.slice(0, i).reduce((a,b)=>a+b,0) + 5, startY + 5, { width: colWidths[i]-10 });
  });

  // Sorok
  doc.font('Helvetica').fontSize(10);
  rows.forEach((row, rowIndex) => {
    const y = startY + 20 + rowIndex * 20;
    const bgColor = rowIndex % 2 === 0 ? '#ECF0F1' : '#FFFFFF';
    headers.forEach((header, colIndex) => {
      doc.fillColor(bgColor)
         .rect(startX + colWidths.slice(0, colIndex).reduce((a,b)=>a+b,0), y, colWidths[colIndex], 20)
         .fill(bgColor)
         .fillColor('#000000')
         .text(row[colIndex], startX + colWidths.slice(0, colIndex).reduce((a,b)=>a+b,0) + 5, y + 5, { width: colWidths[colIndex]-10 });
    });
  });
  doc.moveDown();
}

async function generatePDF() {
  doc.fontSize(20).fillColor('#2E86C1').text('Adatbázis Séma', { align: 'center' });
  doc.moveDown();

  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    for (const tableRow of tablesRes.rows) {
      const tableName = tableRow.table_name;
      doc.addPage();
      doc.fontSize(16).fillColor('#1B2631').text(`Tábla: ${tableName}`, { underline: true });
      doc.moveDown(0.5);

      // Oszlopok
      const columnsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      const headers = ['Oszlop', 'Típus', 'Nullable', 'Alapértelmezett'];
      const rows = columnsRes.rows.map(col => [
        col.column_name,
        col.data_type,
        col.is_nullable,
        col.column_default || 'NULL'
      ]);

      await drawTable(headers, rows);

      // Constraints
      const constraintsRes = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = $1;
      `, [tableName]);

      if (constraintsRes.rows.length) {
        doc.fillColor('#D35400').text('Constraints:', { underline: true });
        constraintsRes.rows.forEach(c => {
          doc.text(`• ${c.constraint_name} | Type: ${c.constraint_type}`);
        });
        doc.moveDown(0.5);
      }

      // Indexek
      const indexesRes = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = $1;
      `, [tableName]);

      if (indexesRes.rows.length) {
        doc.fillColor('#27AE60').text('Indexek:', { underline: true });
        indexesRes.rows.forEach(idx => {
          doc.text(`• ${idx.indexname}`);
        });
        doc.moveDown(0.5);
      }

      // Triggerek
      const triggersRes = await client.query(`
        SELECT trigger_name, action_timing, event_manipulation
        FROM information_schema.triggers
        WHERE event_object_table = $1;
      `, [tableName]);

      if (triggersRes.rows.length) {
        doc.fillColor('#9B59B6').text('Triggerek:', { underline: true });
        triggersRes.rows.forEach(tr => {
          doc.text(`• ${tr.trigger_name} | Timing: ${tr.action_timing} | Event: ${tr.event_manipulation}`);
        });
        doc.moveDown(0.5);
      }
    }

    doc.end();
    console.log(`Profi PDF elkészült: ${outputFile}`);
  } catch (err) {
    console.error('Hiba PDF generálás közben:', err);
  } finally {
    client.release();
  }
}

generatePDF();
