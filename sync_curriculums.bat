@echo off
SETLOCAL

REM --- Adatbázis csatlakozás ---
SET PGHOST=dpg-d2bkb19r0fns73fpld6g-a.frankfurt-postgres.render.com
SET PGPORT=5432
SET PGDATABASE=matektanar_db_kl7b
SET PGUSER=matektanar_db_kl7b_user
SET PGPASSWORD=R79aDYRcB18IlsinBO6aM7UZZW9o8dZi
SET PGSSLMODE=require

echo.
echo Frissítjük a curriculums_category_check constraint-et...
psql -c "BEGIN;
ALTER TABLE curriculums DROP CONSTRAINT IF EXISTS curriculums_category_check;
ALTER TABLE curriculums ADD CONSTRAINT curriculums_category_check
CHECK (category IN (
'free_lesson','free_tool','premium_course','premium_tool',
'lesson','practice','exam','workshop','premium_lesson','hub_page'
));
COMMIT;"

echo.
echo Töröljük a curriculums és helparticles táblákat...
psql -c "TRUNCATE TABLE curriculums, helparticles RESTART IDENTITY CASCADE;"

echo.
echo Ellenőrizzük a constraint-eket...
psql -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'curriculums'::regclass;"

echo.
echo ✅ Kész! Nyomj egy gombot a kilépéshez...
pause
ENDLOCAL
