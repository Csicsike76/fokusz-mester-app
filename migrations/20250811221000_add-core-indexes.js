/* 20250811221000_add-core-indexes.js */

exports.up = async (pgm) => {
  // LOWER(email) index – csak ha van email oszlop
  await pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'email'
      ) THEN
        CREATE INDEX IF NOT EXISTS users_lower_email_idx
        ON public.users (LOWER(email));
      END IF;
    END
    $$;
  `);

  // email_verification_token részindex – csak ha létezik az oszlop
  await pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'email_verification_token'
      ) THEN
        CREATE INDEX IF NOT EXISTS users_email_verification_token_idx
        ON public.users (email_verification_token)
        WHERE email_verification_token IS NOT NULL;
      END IF;
    END
    $$;
  `);

  // password_reset_token részindex – csak ha létezik az oszlop
  await pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_reset_token'
      ) THEN
        CREATE INDEX IF NOT EXISTS users_password_reset_token_idx
        ON public.users (password_reset_token)
        WHERE password_reset_token IS NOT NULL;
      END IF;
    END
    $$;
  `);
};

exports.down = async (pgm) => {
  await pgm.sql(`DROP INDEX IF EXISTS users_lower_email_idx;`);
  await pgm.sql(`DROP INDEX IF EXISTS users_email_verification_token_idx;`);
  await pgm.sql(`DROP INDEX IF EXISTS users_password_reset_token_idx;`);
};
