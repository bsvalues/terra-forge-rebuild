@echo off
cd /d "c:\Users\bsval\terra-forge-rebuild"
echo y | npx supabase db push --db-url "postgresql://postgres:%SB_DB_PASS%@db.udjoodlluygvlqccwade.supabase.co:5432/postgres" > scripts\push-result.txt 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> scripts\push-result.txt
