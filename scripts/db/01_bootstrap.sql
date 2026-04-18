-- Crea/ajusta el usuario de aplicación.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pgi') THEN
        CREATE ROLE pgi LOGIN PASSWORD 'CristoVive1205';
    ELSE
        ALTER ROLE pgi WITH LOGIN PASSWORD 'CristoVive1205';
    END IF;
END
$$;
