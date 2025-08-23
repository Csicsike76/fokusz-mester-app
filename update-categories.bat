@echo off
REM ===== PostgreSQL automatikus kategória ellenőrzés és frissítés =====
REM Futtatás: dupla kattintás vagy CMD-ben: update-categories.bat

REM Belépés a Render PostgreSQL adatbázisba
psql "host=dpg-d2bkb19r0fns73fpld6g-a.frankfurt-postgres.render.com port=5432 dbname=matektanar_db_kl7b user=matektanar_db_kl7b_user password=R79aDYRcB18IlsinBO6aM7UZZW9o8dZi sslmode=require" -c "
-- Tranzakció kezdése
BEGIN;

-- Ellenőrzés: milyen kategóriák vannak a constraint-ben
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'curriculums'::regclass;

-- Constraint frissítése, ha új kategóriák kellenek
ALTER TABLE curriculums
  DROP CONSTRAINT IF EXISTS curriculums_category_check;

ALTER TABLE curriculums
  ADD CONSTRAINT curriculums_category_check
  CHECK (category IN (
    'free_lesson','free_tool','premium_course','premium_tool',
    'lesson','practice','exam','workshop','premium_lesson'
  ));

-- Tranzakció lezárása
COMMIT;
"
echo ✅ Kész, a curriculums táblában a kategória constraint ellenőrizve és frissítve.
pause
