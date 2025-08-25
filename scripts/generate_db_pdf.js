/**
 * generate_db_pdf.js
 * 
 * PDF generálás az adatbázis sémáról.
 * Használat: node generate_db_pdf.js
 */

import { Client } from 'pg';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // ha kell SSL
  });

  await client.connect();

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  doc.pipe(fs.createWriteStream('db_schema.pdf'));

  doc.fontSize(20).text('Adatbázis séma', { align: 'center' });
  doc.moveDown();

  // Lekérdezzük a táblákat
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' 
    ORDER BY table_name
  `);

  for (const table of tablesRes.rows) {
    const tableName = table.table_name;
    doc.addPage();
    doc.fontSize(16).fillColor('blue').text(`Tábla: ${tableName}`, { underline: true });
    doc.moveDown();

    // Oszlopok
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    doc.fontSize(12).fillColor('black').text('Oszlopok:', { bold: true });
    columnsRes.rows.forEach(col => {
      doc.text(`• ${col.column_name} | ${col.data_type} | nullable: ${col.is_nullable} | default: ${col.column_default}`);
    });
    doc.moveDown();

    // Constraint-ek
    const constraintsRes = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = $1::regclass
    `, [tableName]);

    if (constraintsRes.rows.length) {
      doc.text('Constraint-ek:');
      constraintsRes.rows.forEach(c => {
        const type = c.contype === 'p' ? 'PRIMARY KEY' :
                     c.contype === 'f' ? 'FOREIGN KEY' :
                     c.contype === 'u' ? 'UNIQUE' :
                     c.contype === 'c' ? 'CHECK' : c.contype;
        doc.text(`• ${c.conname} | típus: ${type}`);
      });
      doc.moveDown();
    }

    // Indexek
    const indexesRes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = $1
    `, [tableName]);

    if (indexesRes.rows.length) {
      doc.text('Indexek:');
      indexesRes.rows.forEach(idx => {
        doc.text(`• ${idx.indexname}`);
      });
      doc.moveDown();
    }

    // Triggerek
    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = $1
    `, [tableName]);

    if (triggersRes.rows.length) {
      doc.text('Triggerek:');
      triggersRes.rows.forEach(tr => {
        doc.text(`• ${tr.trigger_name} | Timing: ${tr.action_timing} | Event: ${tr.event_manipulation}`);
      });
      doc.moveDown();
    }
  }

  doc.end();
  await client.end();
  console.log('PDF elkészült: db_schema.pdf');
}

main().catch(err => {
  console.error('Hiba a PDF generálás során:', err);
});
