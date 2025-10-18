-- Create email validation function for EA MT5 integration
-- AI Cash Revolution - User Authentication System

-- Function to validate user email and return user_id
CREATE OR REPLACE FUNCTION validate_email_api_key(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- First try to find user by email in auth.users
    SELECT id INTO user_record
    FROM auth.users
    WHERE email = LOWER(email_input)
    LIMIT 1;

    -- If found in auth.users, return the user_id
    IF user_record.id IS NOT NULL THEN
        RETURN user_record.id;
    END IF;

    -- Fallback: try to find user by checking if they have any signals
    SELECT user_id INTO user_record
    FROM mt5_signals
    WHERE client_id = LOWER(email_input)
    LIMIT 1;

    -- If found in mt5_signals, return the user_id
    IF user_record.user_id IS NOT NULL THEN
        RETURN user_record.user_id;
    END IF;

    -- If no user found, return NULL
    RETURN NULL;
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION validate_email_api_key(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_email_api_key(TEXT) TO service_role;

-- Create a simpler function for email validation (returns boolean)
CREATE OR REPLACE FUNCTION is_valid_user_email(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT validate_email_api_key(email_input) IS NOT NULL);
END;
$$;

-- Grant permissions for the boolean function
GRANT EXECUTE ON FUNCTION is_valid_user_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_user_email(TEXT) TO service_role;

-- Create helper function to get user info by email
CREATE OR REPLACE FUNCTION get_user_info_by_email(email_input TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.created_at,
        u.last_sign_in_at
    FROM auth.users u
    WHERE u.email = LOWER(email_input)
    LIMIT 1;

    -- If no user found, return empty result
    IF NOT FOUND THEN
        RETURN;
    END IF;
END;
$$;

-- Grant permissions for the user info function
GRANT EXECUTE ON FUNCTION get_user_info_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_info_by_email(TEXT) TO service_role;